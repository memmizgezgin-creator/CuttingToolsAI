#!/usr/bin/env node
/**
 * CuttingToolsAI — Programmatic SEO page generator (Phase 3: ISO material groups)
 * =================================================================================
 * Build-time static generator. No client-side rendering: Google sees full HTML.
 *
 *   node scripts/build-material-pages.js
 *
 * Reads MAT_DB from catalog.html (single source of truth), then writes:
 *
 *   material/<slug>/index.html   one page per ISO material sub-group (26 total)
 *   material/index.html          index grouped by ISO letter
 *   sitemap.xml                  regenerated: core + /ref/ + /grade/ + /material/
 *
 * KIRILMAZ KURAL check: editorial knowledge pages that funnel into the AI
 * advisor. No SKU listings, no prices, no stock, no shop links.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const {
  ROOT, SITE, BUILD_DATE,
  loadCrossrefDB, designationsOf, buildGradeModel,
  esc, slugOf, chrome, writeSitemap,
} = require('./lib/seo-shared');

// ── Load MAT_DB from catalog.html ────────────────────────────────────────────
function extractJSBlock(src, varName) {
  const re = new RegExp('const\\s+' + varName + '\\s*=\\s*(\\{)');
  const m  = re.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0, inStr = false, strChar = '';
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === strChar) inStr = false;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strChar = ch; }
      else if (ch === '{') depth++;
      else if (ch === '}') { if (--depth === 0) return src.slice(start, i + 1); }
    }
  }
  return null;
}

function loadMatDB() {
  const src = fs.readFileSync(path.join(ROOT, 'catalog.html'), 'utf8');
  const block = extractJSBlock(src, 'MAT_DB');
  if (!block) { console.error('MAT_DB not found in catalog.html'); process.exit(1); }
  return vm.runInNewContext('(' + block + ')', {});
}

const MAT_DB = loadMatDB();

// ── Derive flat list of all sub-groups ───────────────────────────────────────
const ISO_ORDER = ['P', 'M', 'K', 'N', 'S', 'H'];

// ISO letter → colour token (matches CSS variable)
const ISO_COLOR = { P: '--P', M: '--M', K: '--K', N: '--N', S: '--S', H: '--H' };

// Human label for ISO group
const ISO_LABEL = {
  P: 'Steel', M: 'Stainless Steel', K: 'Cast Iron',
  N: 'Non-Ferrous', S: 'Superalloys & Titanium', H: 'Hardened Steel',
};

// Extra detail per ISO group for knowledge pages
const ISO_EXTRA = {
  P: 'Steel is the most widely machined material. Carbon and alloy steels are the target material for the majority of turning and milling operations. Hardness ranges from ~125 HB (low-carbon) to 350 HB (high-strength structural). CVD-coated carbide (TiCN/Al₂O₃ multilayer) dominates. Positive geometry for finishing, negative for heavy roughing.',
  M: 'Stainless steel presents work-hardening as the main challenge. Austenitic grades (304, 316L) built-up-edge and notch-wear rapidly. Positive, sharp geometry with high-pressure coolant at 15–20 bar is standard. Consistent depth of cut prevents re-cutting the hardened chip ramp.',
  K: 'Cast iron is abrasive and brittle — short chips, no built-up-edge. CVD alumina (Al₂O₃) coatings resist the high-temperature abrasion. Dry machining is acceptable for grey iron; coolant helps with nodular grades. Main failure mode: flank wear. High-speed machining is effective.',
  N: 'Non-ferrous metals (aluminium, copper, brass, magnesium) are soft and thermally conductive. Uncoated or DLC-coated fine-grain carbide with high positive rake, sharp edges, and polished flutes prevents built-up-edge. PCD inserts excel in high-volume aluminium production. No TiN/TiAlN coatings — aluminium welds to them.',
  S: 'Superalloys and titanium are the most challenging ISO group: low thermal conductivity concentrates heat at the cutting edge, and high strength persists at elevated temperatures. High-pressure coolant (70–100 bar) is mandatory. Low Vc, consistent DOC, and sharp geometry are non-negotiable. Tool life is short — plan changeovers.',
  H: 'Hard turning replaces grinding for many finishing operations on hardened steel above 45 HRC. CBN (cubic boron nitride) and PCBN inserts are required above 55 HRC. Dry machining is preferred — coolant causes thermal shock cracking. Tight radius inserts (rε 0.4–0.8 mm) and low feed rates preserve surface finish.',
};

// Advisor ask query per ISO group
const ISO_ASK_GROUP = {
  P: 'best carbide grade for steel machining',
  M: 'best insert grade for stainless steel turning',
  K: 'carbide recommendations for cast iron machining',
  N: 'best insert for aluminium and non-ferrous machining',
  S: 'tooling recommendations for superalloy and titanium machining',
  H: 'CBN vs carbide for hard turning hardened steel',
};

function slugForSub(letter, name) {
  // "P01 — Low carbon steel" → "p01-low-carbon-steel"
  const bare = name.replace(/^[A-Z]\d+\s*—\s*/, '').trim();
  const code = name.match(/^([A-Z]\d+)/)[1].toLowerCase();
  return code + '-' + bare.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
}

// Build flat list: { letter, code, name, hardness, tip, slug, groupTitle, color, extra, askQuery }
const SUBS = [];
for (const letter of ISO_ORDER) {
  const group = MAT_DB[letter];
  for (const [name, hardness] of group.subs) {
    const code = name.match(/^([A-Z]\d+)/)[1];
    SUBS.push({
      letter,
      code,
      name,        // full string e.g. "P01 — Low carbon steel"
      label: name.replace(/^[A-Z]\d+\s*—\s*/, '').trim(),   // "Low carbon steel"
      hardness,
      tip: group.tip,
      slug: slugForSub(letter, name),
      groupTitle: group.title,
      color: ISO_COLOR[letter],
      extra: ISO_EXTRA[letter],
      askQuery: `${name.replace(/^[A-Z]\d+\s*—\s*/, '').trim()} (${code}) machining: recommended insert grade and cutting parameters`,
    });
  }
}

// ── Sub-group siblings for "Related materials" links ────────────────────────
function siblingLinks(sub) {
  const sameGroup = SUBS.filter(s => s !== sub && s.letter === sub.letter).slice(0, 4);
  const other = SUBS.filter(s => s.letter !== sub.letter).slice(0, 3);
  return sameGroup.concat(other).slice(0, 6);
}

// ── Per sub-group page ───────────────────────────────────────────────────────
function buildSubPage(sub) {
  const url   = `${SITE}/material/${sub.slug}/`;
  const title = `${sub.code} ${sub.label}: Machining Guide — Cutting Tools & Insert Grades`;
  const description =
    `Machining guide for ${sub.label} (ISO ${sub.code}, ${sub.hardness}): ` +
    `recommended insert grades, coating, cutting speed range, and setup tips. ` +
    `Use the AI advisor for your specific tooling selection.`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: title,
    description,
    url,
    inLanguage: 'en',
    datePublished: BUILD_DATE,
    dateModified: BUILD_DATE,
    about: {
      '@type': 'Thing',
      name: `${sub.label} (ISO ${sub.code})`,
      description: `ISO material group ${sub.code} — ${sub.label}`,
    },
    author: { '@type': 'Organization', name: 'CuttingToolsAI', url: SITE },
    publisher: { '@type': 'Organization', name: 'CuttingToolsAI', url: SITE },
    mainEntityOfPage: url,
  };

  const relLinks = siblingLinks(sub).map(s =>
    `    <a href="/material/${s.slug}/">${esc(s.code)} ${esc(s.label)}</a>`).join('\n');

  const body = `
<nav class="crumb"><a href="/">CUTTINGTOOLS</a> / <a href="/material/">MATERIALS</a> / ${esc(sub.code)}</nav>
<p class="kick" style="color:var(${sub.color})">ISO ${esc(sub.letter)} — ${esc(ISO_LABEL[sub.letter])} · ${esc(sub.code)}</p>
<h1>${esc(sub.code)} — ${esc(sub.label)}</h1>
<p class="lead">Hardness range: <strong>${esc(sub.hardness)}</strong>. Part of the <a href="/material/" style="border-bottom:1px solid var(--line)">${esc(sub.groupTitle)}</a> group. ${esc(sub.extra)}</p>

<div class="panel">
  <div class="panel-h">Material profile — ${esc(sub.code)}</div>
  <dl>
    <dt>ISO designation</dt><dd>${esc(sub.code)} (${esc(sub.groupTitle)})</dd>
    <dt>Material</dt><dd>${esc(sub.label)}</dd>
    <dt>Hardness</dt><dd>${esc(sub.hardness)}</dd>
    <dt>ISO group colour</dt><dd style="display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:14px;height:14px;background:var(${sub.color});border-radius:2px"></span>${esc(ISO_LABEL[sub.letter])}</dd>
  </dl>
</div>

<div class="panel">
  <div class="panel-h">Tooling guidance — ${esc(sub.letter)}-group</div>
  <dl>
    <dt>Group summary</dt><dd>${esc(sub.tip)}</dd>
  </dl>
</div>

<div class="cta">
  <div>
    <div class="t">Get cutting parameters for ${esc(sub.label)}</div>
    <div class="s">The AI advisor maps your specific material condition and operation to a verified insert grade, coating, and Vc/fn range — with live search across the latest tooling catalogs.</div>
  </div>
  <a href="/?ask=${encodeURIComponent(sub.askQuery)}#advisor">Ask the advisor →</a>
</div>

<p class="kick" style="margin-bottom:14px">Related materials</p>
<div class="rel">
${relLinks}
    <a href="/material/">All materials →</a>
</div>`;

  return chrome({ title, description, canonical: url, jsonld, body, section: 'materials' });
}

// ── Index page /material/ ─────────────────────────────────────────────────────
function buildIndexPage() {
  const url   = `${SITE}/material/`;
  const title = 'ISO Material Groups: Machining Guides for Steel, Stainless, Cast Iron, and More';
  const description =
    `ISO material group reference: P (steel), M (stainless), K (cast iron), ` +
    `N (non-ferrous), S (superalloys & titanium), H (hardened steel). ` +
    `${SUBS.length} sub-groups with hardness ranges and tooling guidance.`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url,
    inLanguage: 'en',
    hasPart: SUBS.map(s => ({
      '@type': 'TechArticle',
      headline: `${s.code} ${s.label}: Machining Guide`,
      url: `${SITE}/material/${s.slug}/`,
    })),
  };

  const groups = ISO_ORDER.map(letter => {
    const group = MAT_DB[letter];
    const subs  = SUBS.filter(s => s.letter === letter);
    const cards = subs.map(s => `    <a href="/material/${s.slug}/">
      <div class="c" style="color:var(${s.color})">${esc(s.code)}</div>
      <div class="d">${esc(s.label)} · ${esc(s.hardness)}</div>
    </a>`).join('\n');
    return `<h2 class="grp" style="color:var(${ISO_COLOR[letter]})">${esc(group.title)}</h2>
<p class="gline">${esc(group.tip)}</p>
<div class="grid-idx">
${cards}
</div>`;
  }).join('\n\n');

  const body = `
<nav class="crumb"><a href="/">CUTTINGTOOLS</a> / MATERIALS</nav>
<p class="kick">Reference library · ISO material groups</p>
<h1>ISO Material Groups</h1>
<p class="lead">${SUBS.length} material sub-groups across six ISO colour-coded categories.
Each page covers hardness range, tooling guidance, and a direct link into the AI advisor
for your specific cutting parameters. Guidance is drawn from standard machining references —
verify insert selection on a sample part before production.</p>

${groups}

<div class="cta" style="margin-top:36px">
  <div>
    <div class="t">Don't see your material?</div>
    <div class="s">The AI advisor handles exotic alloys, specific tempers, and unlisted sub-grades —
    describe your workpiece and operation, and it will identify the ISO category and suggest a starting point.</div>
  </div>
  <a href="/?ask=${encodeURIComponent('material identification and insert grade recommendation')}#advisor">Ask the advisor →</a>
</div>`;

  return chrome({ title, description, canonical: url, jsonld, body, section: 'materials' });
}

// ── Write everything ──────────────────────────────────────────────────────────
let written = 0;
for (const sub of SUBS) {
  const dir = path.join(ROOT, 'material', sub.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), buildSubPage(sub));
  written++;
}
fs.writeFileSync(path.join(ROOT, 'material', 'index.html'), buildIndexPage());

// Also need designations + grade slugs for a complete sitemap
const CROSSREF_DB  = loadCrossrefDB();
const DESIGNATIONS = designationsOf(CROSSREF_DB);
const { grades: GRADES } = buildGradeModel(CROSSREF_DB, DESIGNATIONS);
const sitemapCount = writeSitemap(DESIGNATIONS, GRADES.map(g => g.slug), SUBS.map(s => s.slug));

console.log(`✓ ${written} material sub-group pages + /material/ index written`);
console.log(`✓ sitemap.xml regenerated (${sitemapCount} URLs total)`);
console.log(`  sub-groups: ${SUBS.map(s => s.code).join(', ')}`);
