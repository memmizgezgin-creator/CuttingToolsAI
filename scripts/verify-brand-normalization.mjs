// CuttingToolsAI — brand normalization + retrieval verification
// 1) Data: post-normalization DB has 1202 records, 8 distinct brands, zero
//    non-canonical brand values, brand_raw set exactly on changed records
//    (cross-checked against the newest pre-run backup).
// 2) Retrieval: the REAL retrieveTools from directory-app.jsx (extracted by
//    brace matching, not reimplemented) is run against the normalized DB with
//    one variant spelling per brand; top results must include that brand.
//
// Usage: node scripts/verify-brand-normalization.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalBrand, CANONICAL_DISPLAY } from './lib/brand-canonical.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DB_PATH = path.join(ROOT, 'data/extracted-productdb-candidates.json');

let allPass = true;
function check(name, pass, detail) {
  if (!pass) allPass = false;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

// ── 1. Data assertions ───────────────────────────────────────────────────────
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
check('record count', db.tools.length === 1202 && db.total === 1202,
  `tools=${db.tools.length}, total=${db.total} (expected 1202)`);

const canonicalSet = new Set(Object.values(CANONICAL_DISPLAY));
const distinct = new Set(db.tools.map(t => t.brand));
check('distinct brand count', distinct.size === 8, `${distinct.size} (${[...distinct].join(', ')})`);

const nonCanonical = db.tools.filter(t => !canonicalSet.has(t.brand));
check('zero non-canonical brand values', nonCanonical.length === 0,
  nonCanonical.length ? `${nonCanonical.length} records, e.g. "${nonCanonical[0].brand}"` : 'all 1202 canonical');

const withRaw = db.tools.filter(t => t.brand_raw !== undefined);
const rawConsistent = withRaw.every(t => t.brand_raw !== t.brand && canonicalBrand(t.brand_raw) === t.brand);
check('brand_raw consistency', rawConsistent,
  `${withRaw.length} records carry brand_raw; each differs from brand and canonicalizes to it`);

// Cross-check against the newest backup: every record whose brand changed
// vs the backup must carry brand_raw equal to the backup spelling.
const backups = fs.readdirSync(path.join(ROOT, 'data'))
  .filter(f => /extracted-productdb-candidates\.backup-.*\.json$/.test(f)).sort();
if (backups.length) {
  const before = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', backups[backups.length - 1]), 'utf8'));
  const byIdx = new Map(before.tools.map((t, i) => [i, t]));
  let changed = 0, traced = 0;
  db.tools.forEach((t, i) => {
    const old = byIdx.get(i);
    if (old && old.brand !== t.brand) {
      changed++;
      if (t.brand_raw === old.brand) traced++;
    }
  });
  check('every changed record has brand_raw', changed === traced && changed === withRaw.length,
    `backup ${backups[backups.length - 1]}: ${changed} changed, ${traced} traced, ${withRaw.length} carry brand_raw`);
} else {
  check('every changed record has brand_raw', false, 'no backup file found to cross-check');
}

// ── 2. Retrieval check with the real retrieveTools ──────────────────────────
// Extract the function source from directory-app.jsx (it contains no JSX),
// so the test runs the exact shipped logic against the normalized records.
const jsx = fs.readFileSync(path.join(ROOT, 'directory-app.jsx'), 'utf8');
const start = jsx.indexOf('function retrieveTools(');
if (start < 0) { check('extract retrieveTools', false, 'function not found'); process.exit(1); }
let depth = 0, end = -1;
for (let i = jsx.indexOf('{', start); i < jsx.length; i++) {
  if (jsx[i] === '{') depth++;
  else if (jsx[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const fnSrc = jsx.slice(start, end);

// TOOLS = normalized DB records; FAMILY_MAP stub (only used for UI filter bonus).
const factory = new Function('TOOLS', 'FAMILY_MAP', `${fnSrc}; return retrieveTools;`);
const retrieveTools = factory(db.tools, {});

const VARIANT_QUERIES = {
  'Gühring':    'guhring drill',            // ASCII variant
  'ISCAR':      'iscar insert',             // lowercase
  'Sandvik':    'sandvik coromant insert',  // historical two-word spelling
  'Walter':     'walter drill',            // Walter's records are 135/154 drilling
  'Kennametal': 'kennametal turning',
  'Kyocera':    'kyocera insert',
  'Tungaloy':   'tungaloy insert',
  'YG-1':       'yg1 end mill',             // hyphenless variant
};
for (const [brand, query] of Object.entries(VARIANT_QUERIES)) {
  const top = retrieveTools(query, { family: 'All' });
  const hit = top.some(t => t.brand === brand);
  check(`retrieval "${query}" → ${brand}`, hit,
    hit ? `top ${top.length} includes ${top.filter(t => t.brand === brand).length} ${brand} record(s)`
        : `top ${top.length}: [${[...new Set(top.map(t => t.brand))].join(', ')}]`);
}

console.log(allPass ? '\nALL PASS' : '\nFAILURES PRESENT');
process.exit(allPass ? 0 : 1);
