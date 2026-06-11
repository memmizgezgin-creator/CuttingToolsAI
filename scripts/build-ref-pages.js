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
const vm   = require('vm');

const ROOT     = path.join(__dirname, '..');
const SITE     = 'https://cuttingtoolsai.eu';
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// ── Extract CROSSREF_DB from catalog.html ────────────────────────────────────
// Bracket-counting extractor (same approach as seed-supabase.js): finds the
// object literal and evaluates it in an isolated VM context.
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

const catalogHtml = fs.readFileSync(path.join(ROOT, 'catalog.html'), 'utf8');
const dbBlock = extractJSBlock(catalogHtml, 'CROSSREF_DB');
if (!dbBlock) { console.error('CROSSREF_DB not found in catalog.html'); process.exit(1); }
const CROSSREF_DB = vm.runInNewContext('(' + dbBlock + ')', {});

// Insert designations only: pure ISO codes, no family/cluster keys.
const DESIGNATIONS = Object.keys(CROSSREF_DB)
  .filter(k => /^[A-Z]{4}[0-9T]/.test(k) && !k.includes('-'))
  .sort();

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

// ── HTML helpers ──────────────────────────────────────────────────────────────
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const slugOf = code => code.toLowerCase();

function relatedOf(code) {
  const family = DESIGNATIONS.filter(d => d !== code && d.slice(0, 4) === code.slice(0, 4));
  const others = DESIGNATIONS.filter(d => d !== code && !family.includes(d));
  // family first, then alphabetical neighbours, max 6 links
  const i = others.findIndex(d => d > code);
  const ring = i === -1 ? others : others.slice(i).concat(others.slice(0, i));
  return family.concat(ring).slice(0, 6);
}

// Shared editorial chrome (Archivo + IBM Plex Mono, paper/ink tokens — same
// language as index.html, self-contained so /ref/ pages need no other CSS).
const BASE_CSS = `
:root{--paper:#ECEAE2;--paper2:#F4F2EC;--card:#F8F7F2;--ink:#17181B;--ink2:#3C3E44;
--mu:#74757B;--line:#19191c1f;--line2:#19191c12;--hair:#19191c0f;
--P:#2F5BD6;--M:#C79400;--K:#C0392B;--N:#1F9D6B;--S:#B85C2C;--H:#5C6066;
--sans:'Archivo',sans-serif;--exp:'Archivo Expanded','Archivo',sans-serif;--mono:'IBM Plex Mono',monospace}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:var(--paper);color:var(--ink);font-family:var(--sans);-webkit-font-smoothing:antialiased;
background-image:radial-gradient(var(--hair) 1px,transparent 1px);background-size:22px 22px}
a{color:inherit;text-decoration:none}
.wrap{max-width:1100px;margin:0 auto;padding:0 40px}
.mono{font-family:var(--mono)}
.kick{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--mu)}
header{position:sticky;top:0;z-index:50;background:rgba(236,234,226,.86);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)}
.mast{display:flex;align-items:center;justify-content:space-between;height:60px}
.brand{display:flex;align-items:center;gap:14px}
.brand-mk{width:22px;height:22px;border:1.5px solid var(--ink);position:relative;display:flex;align-items:center;justify-content:center}
.brand-mk::before{content:'';width:8px;height:8px;background:var(--ink);transform:rotate(45deg)}
.brand-tx{font-family:var(--exp);font-weight:800;font-size:15px}
.brand-tx span{font-weight:600;color:var(--mu)}
.mast nav{display:flex;gap:0}
.mast nav a{font-family:var(--mono);font-size:12px;color:var(--ink2);padding:8px 16px;border-left:1px solid var(--line)}
.mast nav a:hover{background:var(--ink);color:var(--paper)}
main{padding:54px 0 80px}
.crumb{font-family:var(--mono);font-size:11px;color:var(--mu);margin-bottom:28px}
.crumb a:hover{color:var(--ink)}
h1{font-family:var(--exp);font-weight:700;font-size:clamp(30px,4.5vw,52px);line-height:1.02;letter-spacing:-.018em;margin:10px 0 18px;text-wrap:balance}
.lead{font-size:17px;line-height:1.6;color:var(--ink2);max-width:680px;margin-bottom:36px}
.panel{border:1px solid var(--line);background:var(--card);margin-bottom:36px}
.panel-h{padding:14px 20px;border-bottom:1px solid var(--line);font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mu)}
table{width:100%;border-collapse:collapse;font-size:14px}
th{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);text-align:left;padding:12px 20px;border-bottom:1px solid var(--line)}
td{padding:12px 20px;border-bottom:1px solid var(--line2);vertical-align:top}
tr:last-child td{border-bottom:none}
td.code{font-family:var(--mono);font-size:13px;white-space:nowrap}
td.app{font-family:var(--mono);font-size:12px;color:var(--ink2)}
dl{display:grid;grid-template-columns:max-content 1fr;gap:0}
dt{font-family:var(--mono);font-size:12.5px;padding:11px 20px;border-bottom:1px solid var(--line2);white-space:nowrap;color:var(--ink)}
dd{font-size:14px;color:var(--ink2);padding:11px 20px 11px 0;border-bottom:1px solid var(--line2)}
dl dt:last-of-type,dl dd:last-of-type{border-bottom:none}
.cta{border:1px solid var(--ink);background:var(--ink);color:var(--paper);padding:30px;margin-bottom:36px;display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between}
.cta .t{font-family:var(--exp);font-weight:700;font-size:20px;letter-spacing:-.01em}
.cta .s{font-size:14px;color:#c9c7bf;margin-top:6px;max-width:520px}
.cta a{font-family:var(--mono);font-size:13px;background:var(--paper);color:var(--ink);padding:14px 24px;display:inline-block;transition:transform .2s,box-shadow .2s;border:1px solid var(--paper)}
.cta a:hover{transform:translate(-2px,-2px);box-shadow:4px 4px 0 rgba(248,247,242,.4)}
.rel{display:flex;flex-wrap:wrap;gap:10px}
.rel a{font-family:var(--mono);font-size:12.5px;border:1px solid var(--line);background:var(--card);padding:9px 14px;transition:background .2s,color .2s}
.rel a:hover{background:var(--ink);color:var(--paper)}
.grid-idx{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.grid-idx a{border:1px solid var(--line);background:var(--card);padding:16px 18px;transition:transform .18s,box-shadow .18s}
.grid-idx a:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(23,24,27,.08)}
.grid-idx .c{font-family:var(--mono);font-size:14px;font-weight:600}
.grid-idx .d{font-size:12.5px;color:var(--mu);margin-top:6px;line-height:1.45}
footer{border-top:1px solid var(--line);padding:34px 0;margin-top:40px}
.foot{display:flex;flex-wrap:wrap;gap:20px;justify-content:space-between;align-items:center}
.foot .cp{font-family:var(--mono);font-size:11px;color:var(--mu)}
.foot .lk{display:flex;gap:22px}
.foot .lk a{font-family:var(--mono);font-size:12px;color:var(--ink2)}
.foot .lk a:hover{color:var(--ink)}
@media(max-width:640px){.wrap{padding:0 20px}dl{grid-template-columns:1fr}dd{padding-left:20px;padding-top:0;border-bottom:none}dt{border-bottom:none;padding-bottom:2px}}
`.trim();

const GTAG = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-LYKHPBW6H0"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-LYKHPBW6H0');</script>`;

function chrome({ title, description, canonical, jsonld, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<link rel="canonical" href="${canonical}"/>
${GTAG}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<style>${BASE_CSS}</style>
</head>
<body>
<header><div class="wrap"><div class="mast">
  <a class="brand" href="/">
    <div class="brand-mk"></div>
    <div class="brand-tx">CUTTINGTOOLS<span> / reference</span></div>
  </a>
  <nav>
    <a href="/ref/">Cross-Ref Index</a>
    <a href="/#advisor">AI Advisor</a>
    <a href="/#tools">Tooling</a>
  </nav>
</div></div></header>
<main><div class="wrap">
${body}
</div></main>
<footer><div class="wrap"><div class="foot">
  <div class="cp">© 2026 CUTTINGTOOLS — drawn for machinists · Brand-neutral reference data, verify on a sample part before production.</div>
  <div class="lk"><a href="/">Advisor</a><a href="/ref/">Cross-Ref Index</a><a href="/terms.html">Terms</a><a href="/privacy.html">Privacy</a></div>
</div></div></footer>
</body>
</html>`;
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

// ── Sitemap ───────────────────────────────────────────────────────────────────
const CORE_URLS = [
  { loc: `${SITE}/`,                      priority: '1.0' },
  { loc: `${SITE}/ToolAdvisor.html`,      priority: '0.9' },
  { loc: `${SITE}/tools-directory.html`,  priority: '0.8' },
  { loc: `${SITE}/cross-reference.html`,  priority: '0.8' },
  { loc: `${SITE}/compare.html`,          priority: '0.7' },
  { loc: `${SITE}/knowledge.html`,        priority: '0.7' },
  { loc: `${SITE}/pro.html`,              priority: '0.6' },
];

function buildSitemap() {
  const refUrls = [
    { loc: `${SITE}/ref/`, priority: '0.8' },
    ...DESIGNATIONS.map(code => ({ loc: `${SITE}/ref/${slugOf(code)}/`, priority: '0.7' })),
  ];
  const all = CORE_URLS.concat(refUrls);
  const entries = all.map(u => `    <url>
          <loc>${u.loc}</loc>
          <lastmod>${BUILD_DATE}</lastmod>
          <priority>${u.priority}</priority>
    </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
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
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap());

console.log(`✓ ${written} designation pages + /ref/ index written`);
console.log(`✓ sitemap.xml regenerated (${CORE_URLS.length} core + ${written + 1} ref URLs)`);
console.log(`  designations: ${DESIGNATIONS.join(', ')}`);
