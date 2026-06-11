#!/usr/bin/env node
/**
 * CuttingToolsAI — Programmatic SEO page generator (Phase 2: carbide grades)
 * ==========================================================================
 * Build-time static generator. No client-side rendering: Google sees full HTML.
 *
 *   node scripts/build-grade-pages.js
 *
 * Reads CROSSREF_DB from catalog.html via scripts/lib/seo-shared.js (single
 * source of truth — same extraction as build-ref-pages.js), then writes:
 *
 *   grade/<grade>/index.html   one page per distinct carbide grade
 *   grade/index.html           index of all grades, grouped by brand
 *   sitemap.xml                regenerated: core + /ref/ + /grade/ URLs
 *
 * Grades are the trailing tokens of catalog codes (brand-aware patterns —
 * see GRADE_PATTERNS in seo-shared.js). Non-grade tokens are skipped and
 * logged. Equivalents come ONLY from inverting verified CROSSREF_DB rows:
 * two grades are listed as comparable only when the catalog cross-references
 * them under the same insert designation. Nothing is invented.
 *
 * KIRILMAZ KURAL check: editorial reference pages that funnel into the AI
 * advisor (CTA on every page). No pricing, no stock, no buy links.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const {
  ROOT, SITE, BUILD_DATE,
  loadCrossrefDB, designationsOf, buildGradeModel,
  esc, slugOf, chrome, writeSitemap,
} = require('./lib/seo-shared');

const CROSSREF_DB  = loadCrossrefDB();
const DESIGNATIONS = designationsOf(CROSSREF_DB);
const { grades: GRADES, skipped } = buildGradeModel(CROSSREF_DB, DESIGNATIONS);

const ISO_AREA_NAMES = {
  P: 'P — steel', M: 'M — stainless steel', K: 'K — cast iron',
  N: 'N — non-ferrous (aluminium, copper)', S: 'S — superalloys & titanium',
  H: 'H — hardened materials',
};
const ISO_ORDER = ['P', 'M', 'K', 'N', 'S', 'H'];

function isoAreasOf(g) {
  return ISO_ORDER.filter(a => g.isoAreas.has(a));
}

// 4–6 related grade links: same brand first, then same ISO application area.
function relatedGrades(g) {
  const sameBrand = GRADES.filter(o => o !== g && o.brand === g.brand);
  const areas = g.isoAreas;
  const sameArea = GRADES.filter(o =>
    o !== g && o.brand !== g.brand && isoAreasOf(o).some(a => areas.has(a)));
  const rest = GRADES.filter(o => o !== g && !sameBrand.includes(o) && !sameArea.includes(o));
  return sameBrand.concat(sameArea, rest).slice(0, 6);
}

// ── Per-grade page ────────────────────────────────────────────────────────────
function buildGradePage(g) {
  const url   = `${SITE}/grade/${g.slug}/`;
  const title = `${g.brand} ${g.grade}: Applications, ISO Range and Equivalent Grades`;

  const coatings  = [...g.coatings];
  const areas     = isoAreasOf(g);
  const appRanges = [...g.appRanges].sort();
  const desigs    = [...new Set(g.designations.map(d => d.code))].sort();
  const equivs    = [...g.equivalents.values()].sort((a, b) =>
    a.brand === b.brand ? a.grade.localeCompare(b.grade) : a.brand.localeCompare(b.brand));
  const eqBrands  = [...new Set(equivs.map(e => e.brand))];

  const description =
    `${g.brand} ${g.grade} carbide grade: ` +
    (coatings.length ? `${coatings.join(' / ')}, ` : '') +
    (areas.length ? `ISO ${areas.join('/')} application area, ` : '') +
    `used in ${desigs.length} insert designation${desigs.length === 1 ? '' : 's'}. ` +
    `${equivs.length} comparable grades from ${eqBrands.slice(0, 4).join(', ')}` +
    `${eqBrands.length > 4 ? ' and more' : ''}, cross-referenced by geometry.`;

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
      name: `${g.brand} ${g.grade} carbide insert grade`,
      description: coatings.join(' / ') || `${g.brand} carbide grade`,
    },
    author: { '@type': 'Organization', name: 'CuttingToolsAI', url: SITE },
    publisher: { '@type': 'Organization', name: 'CuttingToolsAI', url: SITE },
    mainEntityOfPage: url,
  };

  // Summary block — only fields the DB actually has. (Cutting-speed ranges are
  // not in CROSSREF_DB rows today; the advisor CTA covers cutting data.)
  const summaryRows = [
    ['Brand', g.brand],
    coatings.length ? ['Coating / substrate', coatings.join(' · ')] : null,
    areas.length ? ['ISO application area', areas.map(a => ISO_AREA_NAMES[a]).join(' · ')] : null,
    appRanges.length ? ['Application range (catalog)', appRanges.join(' · ')] : null,
    ['Used in', `${desigs.length} insert designation${desigs.length === 1 ? '' : 's'} in this reference`],
  ].filter(Boolean).map(([dt, dd]) => `    <dt>${esc(dt)}</dt><dd>${esc(dd)}</dd>`).join('\n');

  const eqRows = equivs.map(e => `      <tr>
        <td>${esc(e.brand)}</td>
        <td class="code"><a href="/grade/${esc(e.grade.toLowerCase())}/">${esc(e.grade)}</a></td>
        <td>${esc(e.coating)}</td>
        <td class="app">${[...e.sharedDesignations].sort().map(d =>
          `<a href="/ref/${slugOf(d)}/">${esc(d)}</a>`).join(', ')}</td>
      </tr>`).join('\n');

  const desigRows = g.designations
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(d => `      <tr>
        <td class="code"><a href="/ref/${slugOf(d.code)}/">${esc(d.code)}</a></td>
        <td>${esc(d.desc)}</td>
        <td class="code">${esc(d.fullCode)}</td>
        <td class="app">${esc(d.app)}</td>
      </tr>`).join('\n');

  const relLinks = relatedGrades(g).map(o =>
    `    <a href="/grade/${o.slug}/">${esc(o.brand)} ${esc(o.grade)}</a>`).join('\n');

  const askQuery = `${g.brand} ${g.grade} grade equivalent and cutting data`;

  const body = `
<nav class="crumb"><a href="/">CUTTINGTOOLS</a> / <a href="/grade/">GRADES</a> / ${esc(g.grade)}</nav>
<p class="kick">Carbide grade · ${esc(g.brand)}${areas.length ? ' · ISO ' + esc(areas.join('/')) : ''}</p>
<h1>${esc(g.brand)} ${esc(g.grade)}</h1>
<p class="lead">${esc(g.grade)} is a ${esc(g.brand)} carbide insert grade${coatings.length ? ` (${esc(coatings.join(' / '))})` : ''}${areas.length ? `, applied in the ISO ${esc(areas.join(' and '))} area${areas.length > 1 ? 's' : ''}` : ''}.
In this cross-reference it appears on ${desigs.length} insert designation${desigs.length === 1 ? '' : 's'} with
${equivs.length} comparable grade${equivs.length === 1 ? '' : 's'} from ${esc(eqBrands.join(', '))}.
Equivalents share the insert geometry, not the process — verify on a sample part before switching.</p>

<div class="panel">
  <div class="panel-h">Grade summary — ${esc(g.brand)} ${esc(g.grade)}</div>
  <dl>
${summaryRows}
  </dl>
</div>

${equivs.length ? `<div class="panel">
  <div class="panel-h">Equivalent grades — cross-referenced by shared geometry</div>
  <table>
    <thead><tr><th>Brand</th><th>Grade</th><th>Coating</th><th>Shared designations</th></tr></thead>
    <tbody>
${eqRows}
    </tbody>
  </table>
</div>` : ''}

<div class="panel">
  <div class="panel-h">Insert designations using ${esc(g.grade)}</div>
  <table>
    <thead><tr><th>Designation</th><th>Geometry</th><th>Catalog code</th><th>Application</th></tr></thead>
    <tbody>
${desigRows}
    </tbody>
  </table>
</div>

<div class="cta">
  <div>
    <div class="t">Ask the AI advisor about ${esc(g.grade)}</div>
    <div class="s">Cutting data for your material, when ${esc(g.grade)} is the right call versus its
    equivalents, and what to check before switching — answered with verified reference data plus live search.</div>
  </div>
  <a href="/?ask=${encodeURIComponent(askQuery)}#advisor">Ask the advisor →</a>
</div>

<p class="kick" style="margin-bottom:14px">Related grades</p>
<div class="rel">
${relLinks}
    <a href="/grade/">All grades →</a>
</div>`;

  return chrome({ title, description, canonical: url, jsonld, body, section: 'grades' });
}

// ── Index page /grade/ ────────────────────────────────────────────────────────
function buildIndexPage() {
  const url    = `${SITE}/grade/`;
  const brands = [...new Set(GRADES.map(g => g.brand))];
  const title  = 'Carbide Grade Index: Applications and Equivalents by Brand';
  const description =
    `${GRADES.length} carbide insert grades from ${brands.length} brands ` +
    `(${brands.join(', ')}): coating, ISO application area and verified ` +
    `equivalent grades, cross-referenced by insert geometry.`;

  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url,
    inLanguage: 'en',
    hasPart: GRADES.map(g => ({
      '@type': 'TechArticle',
      headline: `${g.brand} ${g.grade}: Applications, ISO Range and Equivalent Grades`,
      url: `${SITE}/grade/${g.slug}/`,
    })),
  };

  const groups = brands.map(brand => {
    const cards = GRADES.filter(g => g.brand === brand).map(g => {
      const areas = isoAreasOf(g);
      const coat  = [...g.coatings][0] || '';
      return `    <a href="/grade/${g.slug}/">
      <div class="c">${esc(g.grade)}</div>
      <div class="d">${esc(coat)}${areas.length ? ` · ISO ${esc(areas.join('/'))}` : ''} · ${g.equivalents.size} equivalents</div>
    </a>`;
    }).join('\n');
    return `<h2 class="grp">${esc(brand)}</h2>\n<div class="grid-idx">\n${cards}\n</div>`;
  }).join('\n\n');

  const body = `
<nav class="crumb"><a href="/">CUTTINGTOOLS</a> / GRADES</nav>
<p class="kick">Reference library · carbide insert grades</p>
<h1>Carbide Grade Index</h1>
<p class="lead">One page per carbide grade: coating, ISO application area, the insert designations that
carry it, and verified equivalent grades from other brands. ${GRADES.length} grades from
${brands.length} brands, inverted from the same cross-reference data behind the
<a href="/ref/" style="border-bottom:1px solid var(--line)">designation index</a>.</p>

${groups}

<div class="cta" style="margin-top:36px">
  <div>
    <div class="t">Don't see your grade?</div>
    <div class="s">The AI advisor maps any manufacturer grade to its nearest verified equivalent and
    suggests cutting data for your material — even grades not yet in this index.</div>
  </div>
  <a href="/?ask=${encodeURIComponent('find an equivalent for my carbide grade')}#advisor">Ask the advisor →</a>
</div>`;

  return chrome({ title, description, canonical: url, jsonld, body, section: 'grades' });
}

// ── Write everything ──────────────────────────────────────────────────────────
let written = 0;
for (const g of GRADES) {
  const dir = path.join(ROOT, 'grade', g.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), buildGradePage(g));
  written++;
}
fs.writeFileSync(path.join(ROOT, 'grade', 'index.html'), buildIndexPage());
const sitemapCount = writeSitemap(DESIGNATIONS, GRADES.map(g => g.slug));

console.log(`✓ ${written} grade pages + /grade/ index written`);
console.log(`✓ sitemap.xml regenerated (${sitemapCount} URLs total)`);
console.log(`  grades: ${GRADES.map(g => `${g.brand} ${g.grade}`).join(', ')}`);
if (skipped.length) console.log(`  skipped non-grade tokens: ${skipped.join(' | ')}`);
