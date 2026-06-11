/**
 * CuttingToolsAI — shared library for programmatic SEO builders
 * =============================================================
 * Single source of truth plumbing used by build-ref-pages.js (Phase 1)
 * and build-grade-pages.js (Phase 2). Reads CROSSREF_DB from catalog.html —
 * do NOT copy the data here.
 *
 * KIRILMAZ KURAL check: editorial reference pages that funnel into the AI
 * advisor. No pricing, no stock, no buy links. Equivalents come ONLY from
 * inverting verified CROSSREF_DB relationships — nothing is invented.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const SITE = 'https://cuttingtoolsai.eu';
const BUILD_DATE = new Date().toISOString().slice(0, 10);

// ── Extract CROSSREF_DB from catalog.html ────────────────────────────────────
// Bracket-counting extractor (same approach as seed-supabase.js).
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

function loadCrossrefDB() {
  const catalogHtml = fs.readFileSync(path.join(ROOT, 'catalog.html'), 'utf8');
  const dbBlock = extractJSBlock(catalogHtml, 'CROSSREF_DB');
  if (!dbBlock) { console.error('CROSSREF_DB not found in catalog.html'); process.exit(1); }
  return vm.runInNewContext('(' + dbBlock + ')', {});
}

// Insert designations only: pure ISO codes, no family/cluster keys.
function designationsOf(db) {
  return Object.keys(db)
    .filter(k => /^[A-Z]{4}[0-9T]/.test(k) && !k.includes('-'))
    .sort();
}

// ── Grade extraction ──────────────────────────────────────────────────────────
// A grade is the trailing token of a catalog code ("CNMG 120408 IC8250" → IC8250).
// Brand-aware patterns so geometry/series suffixes (e.g. OSG "AE-VTSS") are
// skipped, never misread as grades. Sandvik prints modern grades without the
// GC prefix ("4325") — normalize to GC4325. H13A (uncoated) keeps its name.
const GRADE_PATTERNS = {
  Sandvik:    /^(GC\d{4}|\d{4}|H13A|H10F|CB\d{4}|CT\d{4}|S05F)$/,
  ISCAR:      /^I[CB]\d{2,4}[A-Z]*$/,
  Kennametal: /^(KC[A-Z]{0,2}\d+[A-Z]*|KD\d+[A-Z]*)$/,
  Walter:     /^W[A-Z]{2}\d{2}[A-Z0-9]*$/,
  Tungaloy:   /^(T\d{4}|AH\d{3,4}|TH\d+|SH\d+|NS\d+|KS\d+)$/,
  Mitsubishi: /^(MC\d+|VP\d+[A-Z]*|UE\d+|US\d+|DX\d+|MP\d+|UTI\d+[A-Z]*)$/,
  Seco:       /^(TP\d+|TM\d+|TH\d+|TK\d+|TS\d+|SD?\d+[A-Z]*|H\d{2}[A-Z]*|CP\d+)$/,
};

function gradeOfRow(row) {
  const pattern = GRADE_PATTERNS[row.brand];
  if (!pattern) return null;
  const token = row.code.trim().split(/\s+/).pop();
  if (!pattern.test(token)) return null;
  if (row.brand === 'Sandvik' && /^\d{4}$/.test(token)) return 'GC' + token;
  return token;
}

// ── Grade model: invert CROSSREF_DB ──────────────────────────────────────────
// For every grade: which designations use it, its coatings / ISO app ranges,
// and which other-brand grades sit in the same designation rows (verified
// equivalence — same geometry, cross-referenced in the catalog).
function buildGradeModel(db, designations) {
  const grades  = new Map();   // grade → model
  const skipped = new Set();   // non-grade trailing tokens, for the build log

  for (const code of designations) {
    const entry = db[code];
    const rowsWithGrades = entry.rows.map(r => ({ row: r, grade: gradeOfRow(r) }));
    for (const { row, grade } of rowsWithGrades) {
      if (!grade) { skipped.add(`${row.brand}: ${row.code}`); continue; }
      let g = grades.get(grade);
      if (!g) {
        g = { grade, brand: row.brand, slug: grade.toLowerCase(),
              coatings: new Set(), isoAreas: new Set(), appRanges: new Set(),
              designations: [], equivalents: new Map() };
        grades.set(grade, g);
      }
      if (g.brand !== row.brand) {
        console.error(`Grade name collision across brands: ${grade} (${g.brand} vs ${row.brand})`);
        process.exit(1);
      }
      if (row.coating) g.coatings.add(row.coating);
      if (row.app) {
        g.appRanges.add(row.app);
        for (const m of row.app.matchAll(/([PMKNSH])\d/g)) g.isoAreas.add(m[1]);
      }
      g.designations.push({ code, desc: entry.desc, app: row.app, coating: row.coating, fullCode: row.code });
      // verified equivalents: other brands' graded rows of the SAME designation
      for (const other of rowsWithGrades) {
        if (!other.grade || other.row.brand === row.brand) continue;
        const key = other.grade;
        let eq = g.equivalents.get(key);
        if (!eq) { eq = { grade: other.grade, brand: other.row.brand, coating: other.row.coating, sharedDesignations: new Set() }; g.equivalents.set(key, eq); }
        eq.sharedDesignations.add(code);
      }
    }
  }

  // deterministic order: brand, then grade
  const list = [...grades.values()].sort((a, b) =>
    a.brand === b.brand ? a.grade.localeCompare(b.grade) : a.brand.localeCompare(b.brand));
  const slugs = new Set();
  for (const g of list) {
    if (slugs.has(g.slug)) { console.error(`Duplicate grade slug: ${g.slug}`); process.exit(1); }
    slugs.add(g.slug);
  }
  return { grades: list, byName: grades, skipped: [...skipped].sort() };
}

// ── HTML helpers + shared editorial chrome ───────────────────────────────────
const esc = s => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const slugOf = code => code.toLowerCase();

// Archivo + IBM Plex Mono, paper/ink tokens, dotted-grid background — same
// language as index.html, self-contained so generated pages need no other CSS.
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
.grp{font-family:var(--exp);font-weight:700;font-size:20px;letter-spacing:-.01em;margin:34px 0 14px}
.grp:first-of-type{margin-top:0}
.gline{font-family:var(--mono);font-size:12.5px;color:var(--ink2);margin:-22px 0 36px}
.gline a{border-bottom:1px solid var(--line);padding-bottom:1px}
.gline a:hover{color:var(--ink);border-color:var(--ink)}
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

function chrome({ title, description, canonical, jsonld, body, section }) {
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
    <div class="brand-tx">CUTTINGTOOLS<span> / ${esc(section || 'reference')}</span></div>
  </a>
  <nav>
    <a href="/ref/">Cross-Ref Index</a>
    <a href="/grade/">Grade Index</a>
    <a href="/material/">Materials</a>
    <a href="/#advisor">AI Advisor</a>
    <a href="/#tools">Tooling</a>
    <a href="/account.html">Account</a>
  </nav>
</div></div></header>
<main><div class="wrap">
${body}
</div></main>
<footer><div class="wrap"><div class="foot">
  <div class="cp">© 2026 CUTTINGTOOLS — drawn for machinists · Brand-neutral reference data, verify on a sample part before production.</div>
  <div class="lk"><a href="/">Advisor</a><a href="/ref/">Cross-Ref Index</a><a href="/grade/">Grade Index</a><a href="/material/">Materials</a><a href="/account.html">Account</a><a href="/terms.html">Terms</a><a href="/privacy.html">Privacy</a></div>
</div></div></footer>
</body>
</html>`;
}

// ── Sitemap (generator-owned: core + /ref/ + /grade/) ────────────────────────
const CORE_URLS = [
  { loc: `${SITE}/`,                      priority: '1.0' },
  { loc: `${SITE}/ToolAdvisor.html`,      priority: '0.9' },
  { loc: `${SITE}/tools-directory.html`,  priority: '0.8' },
  { loc: `${SITE}/cross-reference.html`,  priority: '0.8' },
  { loc: `${SITE}/compare.html`,          priority: '0.7' },
  { loc: `${SITE}/knowledge.html`,        priority: '0.7' },
  { loc: `${SITE}/pro.html`,              priority: '0.6' },
];

// All three builders call this with the same inputs — whichever runs last
// writes an identical sitemap (order-independent). materialSlugs defaults to
// [] when called from the older ref/grade builders without that argument.
function buildSitemap(designations, gradeSlugs, materialSlugs) {
  materialSlugs = materialSlugs || [];
  const urls = CORE_URLS.concat(
    { loc: `${SITE}/ref/`, priority: '0.8' },
    designations.map(code => ({ loc: `${SITE}/ref/${slugOf(code)}/`, priority: '0.7' })),
    { loc: `${SITE}/grade/`, priority: '0.8' },
    gradeSlugs.map(slug => ({ loc: `${SITE}/grade/${slug}/`, priority: '0.7' })),
    materialSlugs.length ? { loc: `${SITE}/material/`, priority: '0.8' } : [],
    materialSlugs.map(slug => ({ loc: `${SITE}/material/${slug}/`, priority: '0.7' })),
  ).flat();
  const entries = urls.map(u => `    <url>
          <loc>${u.loc}</loc>
          <lastmod>${BUILD_DATE}</lastmod>
          <priority>${u.priority}</priority>
    </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function writeSitemap(designations, gradeSlugs, materialSlugs) {
  materialSlugs = materialSlugs || [];
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(designations, gradeSlugs, materialSlugs));
  return CORE_URLS.length + 1 + designations.length + 1 + gradeSlugs.length +
    (materialSlugs.length ? 1 + materialSlugs.length : 0);
}

module.exports = {
  ROOT, SITE, BUILD_DATE,
  loadCrossrefDB, designationsOf, gradeOfRow, buildGradeModel,
  esc, slugOf, chrome, writeSitemap,
};
