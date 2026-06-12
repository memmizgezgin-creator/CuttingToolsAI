#!/usr/bin/env node
/**
 * backfill-pages-from-archive.js
 *
 * Builds a lookup from the June 11 staging archive records:
 *   article_number + source_pdf → source_page
 *
 * Then fills source_page on main-DB records where it is null and the
 * article_number + source_pdf key matches an archive entry.
 *
 * Usage:
 *   node scripts/backfill-pages-from-archive.js [--dry-run]
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..');
const DB       = path.join(ROOT, 'data/extracted-productdb-candidates.json');
const ARCHIVE  = path.join(ROOT, 'ingestion/approved-archive');
const DRY      = process.argv.includes('--dry-run');

// ── Build lookup from archive staging records ─────────────────────────────
// Key: article_number|source_pdf → source_page (lowest page wins on collision)
const lookup = new Map();
let archiveTotal = 0;

for (const f of fs.readdirSync(ARCHIVE).filter(f => f.endsWith('__review.json'))) {
  const recs = JSON.parse(fs.readFileSync(path.join(ARCHIVE, f), 'utf8'));
  for (const r of recs) {
    if (r.article_number == null || r.source_page == null) continue;
    const key = String(r.article_number).trim() + '|' + String(r.source_pdf || '').trim();
    if (!lookup.has(key) || r.source_page < lookup.get(key)) {
      lookup.set(key, r.source_page);
    }
    archiveTotal++;
  }
}

console.log(`archive records scanned: ${archiveTotal}`);
console.log(`unique article+source_pdf keys: ${lookup.size}`);

// ── Apply to main DB ──────────────────────────────────────────────────────
const raw   = fs.readFileSync(DB, 'utf8');
const db    = JSON.parse(raw);
const tools = db.tools;

let matched = 0, alreadyHasPage = 0, noKey = 0;

for (const t of tools) {
  if (t.source_page != null) {
    alreadyHasPage++;
    continue;
  }

  // DB records expose the PDF name via source_pdf (pipeline era) or can be
  // inferred from source_file for the GUE batch (short slug → full filename).
  const article = String(t.article || '').trim();
  const srcPdf  = String(t.source_pdf || '').trim();

  if (!article) { noKey++; continue; }

  const key = article + '|' + srcPdf;
  if (lookup.has(key)) {
    if (!DRY) t.source_page = lookup.get(key);
    matched++;
  } else {
    noKey++;
  }
}

console.log(`\nbackfill-pages-from-archive${DRY ? ' (DRY RUN)' : ''}`);
console.log(`  already had source_page: ${alreadyHasPage}`);
console.log(`  source_page backfilled: ${matched}`);
console.log(`  no matching archive key: ${noKey}`);
console.log(`  total: ${tools.length}`);

if (!DRY && matched > 0) {
  fs.writeFileSync(DB, JSON.stringify({ total: tools.length, tools }, null, 2) + '\n');
  console.log(`  written: data/extracted-productdb-candidates.json`);
}
