// CuttingToolsAI — catalog metrics verification
// Recomputes tool/brand counts from the live product DB mirror and asserts
// they match what the site displays (js/catalog-metrics.js constant AND the
// hardcoded initial values in index.html). Also greps for stale "36"-era
// metric strings. No network, no dependencies.
//
// Brand normalization comes from scripts/lib/brand-canonical.js — the single
// source of truth (case-insensitive; "Sandvik Coromant" counts as Sandvik).
//
// Usage: node scripts/verify-catalog-metrics.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeBrand } from './lib/brand-canonical.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA    = path.join(ROOT, 'data/extracted-productdb-candidates.json');
const METRICS = path.join(ROOT, 'js/catalog-metrics.js');
const INDEX   = path.join(ROOT, 'index.html');

let allPass = true;
function check(name, pass, detail) {
  if (!pass) allPass = false;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

// ── 1. Recompute from the product DB file ────────────────────────────────────
const db = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const tools = db.tools.length;
const brandSet = new Set(db.tools.map(t => normalizeBrand(t.brand)).filter(Boolean));
const brands = brandSet.size;
console.log(`computed from ${path.relative(ROOT, DATA)}: tools=${tools}, brands=${brands} (${[...brandSet].join(', ')})`);

check('db total field consistent', db.total === tools, `total=${db.total}, tools.length=${tools}`);

// ── 2. Constant file matches ─────────────────────────────────────────────────
const metricsSrc = fs.readFileSync(METRICS, 'utf8');
const cTools  = parseInt((metricsSrc.match(/tools:\s*(\d+)/)  || [])[1], 10);
const cBrands = parseInt((metricsSrc.match(/brands:\s*(\d+)/) || [])[1], 10);
check('catalog-metrics.js tools',  cTools === tools,   `displayed=${cTools} computed=${tools}`);
check('catalog-metrics.js brands', cBrands === brands, `displayed=${cBrands} computed=${brands}`);

// ── 3. index.html hardcoded initial values match ─────────────────────────────
const html = fs.readFileSync(INDEX, 'utf8');
const spanValues = { tools: [], brands: [] };
for (const m of html.matchAll(/data-ta-metric="(tools|brands)"[^>]*>([\d,]+)</g)) {
  spanValues[m[1]].push(parseInt(m[2].replace(/,/g, ''), 10));
}
check('index.html tools spans',
  spanValues.tools.length > 0 && spanValues.tools.every(v => v === tools),
  `${spanValues.tools.length} span(s): [${spanValues.tools}] (expected all ${tools})`);
check('index.html brands spans',
  spanValues.brands.length > 0 && spanValues.brands.every(v => v === brands),
  `${spanValues.brands.length} span(s): [${spanValues.brands}] (expected all ${brands})`);

// ── 4. No stale "36 …tools/indexed" metric strings in site files ─────────────
const SITE_FILES = fs.readdirSync(ROOT)
  .filter(f => f.endsWith('.html'))
  .concat(['modals.js', 'advisor-ai-widget.js', 'js/catalog-metrics.js']);
const stale = [];
for (const f of SITE_FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const [i, line] of src.split('\n').entries()) {
    if (/\b36\b[^|\n]{0,40}\b(tools|indexed)\b/i.test(line) || /\b(tools|indexed)\b[^|\n]{0,40}\b36\b/i.test(line)) {
      stale.push(`${f}:${i + 1}: ${line.trim().slice(0, 120)}`);
    }
  }
}
check('no stale "36 tools/indexed" strings', stale.length === 0,
  stale.length ? `\n  ${stale.join('\n  ')}` : 'no hits in site HTML/JS');

console.log(allPass ? '\nALL PASS' : '\nFAILURES PRESENT');
process.exit(allPass ? 0 : 1);
