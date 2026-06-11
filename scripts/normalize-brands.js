#!/usr/bin/env node
/**
 * CuttingToolsAI — brand normalization for the product DB
 * ========================================================
 * Rewrites the `brand` field of every record in
 * data/extracted-productdb-candidates.json to the canonical spelling from
 * scripts/lib/brand-canonical.js (the single source of truth). The original
 * spelling is preserved in `brand_raw` ONLY on records where it differed.
 *
 * A timestamped backup is written next to the DB file before any change.
 * Idempotent: a second run finds nothing to change.
 *
 * data/ is gitignored — this is a local file operation, not a commit.
 *
 * Usage: node scripts/normalize-brands.js [--dry-run]
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { canonicalBrand } = require('./lib/brand-canonical.js');

const ROOT = path.resolve(__dirname, '..');
const DB   = path.join(ROOT, 'data/extracted-productdb-candidates.json');
const dryRun = process.argv.includes('--dry-run');

const raw = fs.readFileSync(DB, 'utf8');
const db  = JSON.parse(raw);

if (!Array.isArray(db.tools)) {
  console.error('FAIL: unexpected DB shape — expected { total, tools: [...] }');
  process.exit(1);
}

// ── Normalize ────────────────────────────────────────────────────────────────
const changes = {};   // "raw → canonical" → count
let changed = 0;

for (const t of db.tools) {
  const orig  = t.brand;
  const canon = canonicalBrand(orig);
  if (canon !== orig) {
    t.brand_raw = orig;          // traceability: only set where it differed
    t.brand     = canon;
    const key = `${orig} → ${canon}`;
    changes[key] = (changes[key] || 0) + 1;
    changed++;
  }
}

console.log(`records: ${db.tools.length} (total field: ${db.total})`);
if (changed === 0) {
  console.log('no changes — DB already canonical');
} else {
  console.log(`changed: ${changed} record(s)`);
  for (const [key, n] of Object.entries(changes)) console.log(`  ${key}: ${n}`);
}

if (!dryRun && changed > 0) {
  // Backup the pristine pre-run state. Only when something actually changes,
  // and never overwrite an existing backup (collision-safe suffix).
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  let backup = DB.replace(/\.json$/, `.backup-${stamp}.json`);
  for (let n = 1; fs.existsSync(backup); n++) {
    backup = DB.replace(/\.json$/, `.backup-${stamp}-${n}.json`);
  }
  fs.writeFileSync(backup, raw);
  console.log(`backup: ${path.relative(ROOT, backup)}`);

  fs.writeFileSync(DB, JSON.stringify(db, null, 2) + '\n');
  console.log(`written: ${path.relative(ROOT, DB)}`);
} else if (dryRun) {
  console.log('(dry-run: nothing written)');
}
