#!/usr/bin/env node
/**
 * CuttingToolsAI — Programmatic SEO page generator (Phase 1: cross-reference)
 * ===========================================================================
 * Build-time static generator. No client-side rendering: Google sees full HTML.
 *
 *   node scripts/build-ref-pages.js
 *
 * Reads CROSSREF_DB from catalog.html (single source of truth — do NOT copy
 * the data here), then writes:
 *
 *   ref/<designation>/index.html   one page per ISO insert designation
 *   ref/index.html                 index of all designations
 *   sitemap.xml                    regenerated: core pages + all /ref/ pages
 *
 * Family/cluster keys in CROSSREF_DB (TURN-FAMILY-*, THR-*, GRV-*, DRL-*)
 * are skipped in Phase 1 — only real insert designations get pages.
 *
 * KIRILMAZ KURAL check: these are editorial reference pages that funnel into
 * the AI advisor (CTA on every page). No pricing, no stock, no buy links.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const {
  ROOT, SITE, BUILD_DATE,
  loadCrossrefDB, designationsOf, gradeOfRow, buildGradeModel,
  esc, slugOf, chrome, writeSitemap,
} = require('./lib/seo-shared');

const CROSSREF_DB  = loadCrossrefDB();
const DESIGNATIONS = designationsOf(CROSSREF_DB);
const { grades: GRADES } = buildGradeModel(CROSSREF_DB, DESIGNATIONS);

// ── ISO 1832 decode tables ───────────────────────────────────────────────────
const SHAPES = {
  A: '85° parallelogram', B: '82° parallelogram', C: '80° rhombic (diamond)',
  D: '55° rhombic (diamond)', E: '75° rhombic', F: '50° rhombic',
  H: 'hexagonal', K: '55° parallelogram', L: 'rectangular',
  M: '86° rhombic', O: 'octagonal', P: 'pentagonal', R: 'round',
  S: 'square (90°)', T: 'triangular (60°)', V: '35° rhombic (diamond)',
  W: 'trigon (80°)',
};
const CLEARANCES = {
  A: '3°', B: '5°', C: '7°', D: '15°', E: '20°', F: '25°', G: '30°',
  N: '0° (negative insert, double-sided use possible)', P: '11°', O: 'other',
};
const TOLERANCES = {
  M: 'class M — molded, medium tolerance on inscribed circle and corner point (typically ±0.05–0.13 mm depending on size)',
  G: 'class G — ground periphery, close tolerance (±0.025 mm class)',
  E: 'class E — ground, precision tolerance',
  U: 'class U — molded, utility tolerance',
};
const TYPES = {
  A: 'cylindrical fixing hole, no chipbreaker',
  G: 'cylindrical fixing hole, chipbreaker on both faces (double-sided insert)',
  M: 'cylindrical fixing hole, chipbreaker on one face',
  N: 'no fixing hole, no chipbreaker',
  T: 'fixing hole with countersink, chipbreaker on one face (single-sided positive insert)',
  W: 'fixing hole with countersink, no chipbreaker',
  X: 'manufacturer-specific feature',
};
const THICKNESS = {
  '01': '1.59 mm', '02': '2.38 mm', '03': '3.18 mm', 'T3': '3.97 mm',
  '04': '4.76 mm', '05': '5.56 mm', '06': '6.35 mm', '07': '7.94 mm',
  '09': '9.52 mm',
};

function decodeDesignation(code, desc) {
  const letters = code.slice(0, 4);
  const rest    = code.slice(4);
  const steps   = [];

  const shape = SHAPES[letters[0]];
  steps.push({
    pos: `${letters[0]} — shape`,
    text: shape || `manufacturer/special shape (catalog lists it as: ${desc.split('·')[0].trim()})`,
  });
  steps.push({
    pos: `${letters[1]} — clearance angle`,
    text: CLEARANCES[letters[1]] ? `relief angle ${CLEARANCES[letters[1]]}` : 'non-standard clearance code',
  });
  steps.push({
    pos: `${letters[2]} — tolerance`,
    text: TOLERANCES[letters[2]] || `tolerance class ${letters[2]}`,
  });
  steps.push({
    pos: `${letters[3]} — type`,
    text: TYPES[letters[3]] || `type code ${letters[3]}`,
  });

  // Size block: <edge|diameter 2 digits><thickness 2 chars incl. T3><radius 2 digits?><suffix?>
  const m = rest.match(/^(\d{2})(T\d|\d{2})(\d{2})?([A-Z].*)?$/);
  if (m) {
    const [, size, thick, radius, suffix] = m;
    steps.push({
      pos: `${size} — ${letters[0] === 'R' ? 'diameter' : 'cutting edge length / IC'}`,
      text: letters[0] === 'R' ? `${Number(size)} mm insert diameter` : `${Number(size)} mm nominal (inscribed circle / edge length class)`,
    });
    steps.push({
      pos: `${thick} — thickness`,
      text: THICKNESS[thick] ? `insert thickness ${THICKNESS[thick]}` : `thickness code ${thick}`,
    });
    if (radius) {
      steps.push({
        pos: `${radius} — corner radius`,
        text: `Rε = ${(Number(radius) / 10).toFixed(1)} mm nose radius`,
      });
    }
    if (suffix) {
      steps.push({
        pos: `${suffix} — suffix`,
        text: 'manufacturer geometry / edge configuration suffix (chipbreaker style, hand of cut)',
      });
    }
  }
  return steps;
}

// ── HTML helpers live in scripts/lib/seo-shared.js ──────────────────────────
function relatedOf(code) {
  const family = DESIGNATIONS.filter(d => d !== code && d.slice(0, 4) === code.slice(0, 4));
  const others = DESIGNATIONS.filter(d => d !== code && !family.includes(d));
  // family first, then alphabetical neighbours, max 6 links
  const i = others.findIndex(d => d > code);
  const ring = i === -1 ? others : others.slice(i).concat(others.slice(0, i));
  return family.concat(ring).slice(0, 6);
}

// ── Per-designation page ──────────────────────────────────────────────────────
function buildRefPage(code) {
  const entry  = CROSSREF_DB[code];
  const slug   = slugOf(code);
  const url    = `${SITE}/ref/${slug}/`;
  const brands = [...new Set(entry.rows.map(r => r.brand))];
  const title  = `${code} Cross Reference: Equivalent Grades Across ${brands.length} Brands`;
  const description =
    `${code} (${entry.desc.replace(/·/g, ',')}) equivalent inserts from ` +
    `${brands.slice(0, 4).join(', ')}${brands.length > 4 ? ' and more' : ''}. ` +
    `ISO designation decoded, application ranges compared, brand-neutral.`;

  const decode = decodeDesignation(code, entry.desc);
  const related = relatedOf(code);
  const askQuery = `${code} cross reference equivalent grades`;

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
      name: `${code} indexable cutting insert`,
      description: entry.desc,
    },
    author: { '@type': 'Organization', name: 'CuttingToolsAI', url: SITE },
    publisher: { '@type': 'Organization', name: 'CuttingToolsAI', url: SITE },
    mainEntityOfPage: url,
  };

  const tableRows = entry.rows.map(r => `      <tr>
        <td>${esc(r.brand)}</td>
        <td class="code">${esc(r.code)}</td>
        <td>${esc(r.coating)}</td>
        <td class="app">${esc(r.app)}</td>
      </tr>`).join('\n');

  const decodeRows = decode.map(s =>
    `      <dt>${esc(s.pos)}</dt><dd>${esc(s.text)}</dd>`).join('\n');

  const relLinks = related.map(d =>
    `    <a href="/ref/${slugOf(d)}/">${esc(d)}</a>`).join('\n');

  // Grades used on this designation → cross-link into the /grade/ system.
  const gradesUsed = [...new Map(entry.rows
    .map(r => ({ grade: gradeOfRow(r), brand: r.brand }))
    .filter(g => g.grade)
    .map(g => [g.grade, g])).values()];
  const gradesLine = gradesUsed.length ? `
<p class="gline"><span class="kick" style="margin-right:10px">Grades used</span> ${gradesUsed.map(g =>
    `<a href="/grade/${g.grade.toLowerCase()}/">${esc(g.brand)} ${esc(g.grade)}</a>`).join(' · ')}</p>` : '';

  const body = `
<nav class="crumb"><a href="/">CUTTINGTOOLS</a> / <a href="/ref/">CROSS-REF</a> / ${esc(code)}</nav>
<p class="kick">Insert cross-reference · ${esc(entry.desc)}</p>
<h1>${esc(code)} Cross Reference</h1>
<p class="lead">Equivalent ${esc(code)} inserts across ${brands.length} brands — ${esc(brands.join(', '))}.
Same ISO 1832 geometry class; grades, coatings and application windows differ by manufacturer.
Treat equivalents as starting points and verify on a sample part: a cross-reference matches the
geometry, not the process.</p>

<div class="panel">
  <div class="panel-h">Brand equivalents — ${esc(code)}</div>
  <table>
    <thead><tr><th>Brand</th><th>Designation / grade</th><th>Coating</th><th>Application</th></tr></thead>
    <tbody>
${tableRows}
    </tbody>
  </table>
</div>
${gradesLine}
<div class="panel">
  <div class="panel-h">ISO designation decoded — what ${esc(code)} means</div>
  <dl>
${decodeRows}
  </dl>
</div>

<div class="cta">
  <div>
    <div class="t">Ask the AI advisor about ${esc(code)}</div>
    <div class="s">Cutting data, grade choice for your material, and what to check before switching brands —
    the advisor answers with verified reference data plus live search.</div>
  </div>
  <a href="/?ask=${encodeURIComponent(askQuery)}#advisor">Ask the advisor →</a>
</div>

<p class="kick" style="margin-bottom:14px">Related designations</p>
<div class="rel">
${relLinks}
    <a href="/ref/">All designations →</a>
</div>`;

  return chrome({ title, description, canonical: url, jsonld, body });
}

// ── Index page /ref/ ──────────────────────────────────────────────────────────
function buildIndexPage() {
  const url   = `${SITE}/ref/`;
  const title = 'Insert Cross-Reference Index: Equivalent Grades by ISO Designation';
  const description =
    `Brand-neutral cross-reference tables for ${DESIGNATIONS.length} ISO insert designations ` +
    `(CNMG, DNMG, TNMG, WNMG, DCMT, APMT and more). Equivalent grades across Sandvik, ISCAR, ` +
    `Kennametal, Walter, Tungaloy, Seco, Mitsubishi.`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url,
    inLanguage: 'en',
    hasPart: DESIGNATIONS.map(code => ({
      '@type': 'TechArticle',
      headline: `${code} Cross Reference`,
      url: `${SITE}/ref/${slugOf(code)}/`,
    })),
  };

  const cards = DESIGNATIONS.map(code => `    <a href="/ref/${slugOf(code)}/">
      <div class="c">${esc(code)}</div>
      <div class="d">${esc(CROSSREF_DB[code].desc)}</div>
    </a>`).join('\n');

  const body = `
<nav class="crumb"><a href="/">CUTTINGTOOLS</a> / CROSS-REF</nav>
<p class="kick">Reference library · ISO 1832 insert designations</p>
<h1>Insert Cross-Reference Index</h1>
<p class="lead">One page per insert designation: equivalent grades across brands, the ISO code decoded,
and a direct line to the AI advisor. ${DESIGNATIONS.length} designations indexed — turning, milling
and drilling inserts.</p>
<div class="grid-idx">
${cards}
</div>

<div class="cta" style="margin-top:36px">
  <div>
    <div class="t">Don't see your insert?</div>
    <div class="s">The AI advisor decodes any ISO designation and finds the nearest verified equivalent —
    even designations not yet in this index.</div>
  </div>
  <a href="/?ask=${encodeURIComponent('find equivalent grades for my insert')}#advisor">Ask the advisor →</a>
</div>`;

  return chrome({ title, description, canonical: url, jsonld, body });
}

// ── Write everything ──────────────────────────────────────────────────────────
let written = 0;
for (const code of DESIGNATIONS) {
  const dir = path.join(ROOT, 'ref', slugOf(code));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), buildRefPage(code));
  written++;
}
fs.writeFileSync(path.join(ROOT, 'ref', 'index.html'), buildIndexPage());
const sitemapCount = writeSitemap(DESIGNATIONS, GRADES.map(g => g.slug));

console.log(`✓ ${written} designation pages + /ref/ index written`);
console.log(`✓ sitemap.xml regenerated (${sitemapCount} URLs total)`);
console.log(`  designations: ${DESIGNATIONS.join(', ')}`);
