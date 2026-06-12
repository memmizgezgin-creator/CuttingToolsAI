#!/usr/bin/env node
// Regenerate functions/source-lookup.js from the local product DB.
// Run after any ingestion merge that adds new source_file/source_page data:
//   node scripts/gen-source-lookup.js
//
// Output: functions/source-lookup.js — imported by functions/proxy.js.
// Keyed by article (= Supabase sku). Only records with BOTH source_file
// and source_page contribute; records missing either field are skipped.

const fs   = require('fs');
const path = require('path');

const DATA_FILE   = path.resolve(__dirname, '../data/extracted-productdb-candidates.json');
const OUTPUT_FILE = path.resolve(__dirname, '../functions/source-lookup.js');

const { tools } = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));

const lookup = {};
let skipped = 0;
for (const r of tools) {
  if (!r.source_file || !r.source_page || !r.article) { skipped++; continue; }
  lookup[r.article.trim()] = { file: r.source_file, page: r.source_page };
}

const js =
  '// Auto-generated — do not edit by hand.\n' +
  '// Regenerate: node scripts/gen-source-lookup.js\n' +
  '// Keyed by product SKU (matches Supabase `sku` column).\n' +
  'export const SOURCE_LOOKUP = ' + JSON.stringify(lookup, null, 0) + ';\n';

fs.writeFileSync(OUTPUT_FILE, js);
console.log(`Written ${Object.keys(lookup).length} entries (${skipped} skipped) to ${OUTPUT_FILE}`);
