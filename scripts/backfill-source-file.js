#!/usr/bin/env node
/**
 * backfill-source-file.js
 *
 * For every record in data/extracted-productdb-candidates.json where
 * source_pdf is set but source_file is empty/undefined, copy source_pdf
 * into source_file.
 *
 * Records that already have source_file (e.g. manual short slugs like
 * "guhring_catalogue") are left untouched.
 *
 * Usage:
 *   node scripts/backfill-source-file.js [--dry-run]
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const DB     = path.resolve(__dirname, '../data/extracted-productdb-candidates.json');
const DRY    = process.argv.includes('--dry-run');

const raw = fs.readFileSync(DB, 'utf8');
const db  = JSON.parse(raw);
const tools = db.tools;

let filled = 0, already = 0, noPdf = 0;

for (const t of tools) {
  const hasSF  = t.source_file && t.source_file !== '';
  const hasPDF = t.source_pdf  && t.source_pdf  !== '';

  if (hasSF) {
    already++;
  } else if (hasPDF) {
    if (!DRY) t.source_file = t.source_pdf;
    filled++;
  } else {
    noPdf++;
  }
}

console.log(`backfill-source-file${DRY ? ' (DRY RUN)' : ''}`);
console.log(`  source_file already present: ${already}`);
console.log(`  source_file backfilled from source_pdf: ${filled}`);
console.log(`  no source_pdf to copy from: ${noPdf}`);
console.log(`  total: ${tools.length}`);

if (!DRY && filled > 0) {
  fs.writeFileSync(DB, JSON.stringify({ total: tools.length, tools }, null, 2) + '\n');
  console.log(`  written: data/extracted-productdb-candidates.json`);
}
