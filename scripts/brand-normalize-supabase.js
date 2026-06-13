#!/usr/bin/env node
/**
 * CuttingToolsAI — brand normalization for the Supabase products table
 * =====================================================================
 * Rewrites the `brand` field of every record in the Supabase `products`
 * table to the canonical spelling from scripts/lib/brand-canonical.js.
 *
 * Idempotent: a second run detects no changes and prints ALREADY NORMALIZED.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/brand-normalize-supabase.js
 *   Add --dry-run to preview changes without writing.
 *
 * Env:
 *   SUPABASE_URL               Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  service role key (PostgREST write access)
 */

'use strict';

const { canonicalBrand } = require('./lib/brand-canonical.js');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DRY_RUN      = process.argv.includes('--dry-run');
const BATCH_SIZE   = 50;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: missing env — need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

function headers() {
  return {
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=minimal',
  };
}

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: headers(),
    ...opts,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${path}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Paginated GET: PostgREST caps each response at max-rows (default 1000), so a
// plain `limit=10000` silently truncates and we'd miss records (and brand
// variants) past row 1000. Page with Range headers until a short page. `path`
// must NOT include limit/Range; include a stable &order=.
async function restAll(path) {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
      headers: { ...headers(), Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' },
    });
    if (!res.ok && res.status !== 206) {
      throw new Error(`HTTP ${res.status} ${path}: ${await res.text()}`);
    }
    const rows = JSON.parse((await res.text()) || '[]');
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

async function main() {
  // ── 1. Count records before ──────────────────────────────────────────────
  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=sku`, {
    headers: { ...headers(), 'Prefer': 'count=exact' },
  });
  const rangeBefore = countRes.headers.get('content-range') || '';
  const totalBefore = parseInt(rangeBefore.split('/')[1] || '0', 10);
  console.log(`records before: ${totalBefore}`);

  // ── 2. Fetch all records (brand + sku) ───────────────────────────────────
  const records = await restAll('/products?select=sku,brand&order=sku.asc');
  console.log(`fetched: ${records.length} records`);

  // ── 3. Build canonical mapping & print it ────────────────────────────────
  const distinctBefore = [...new Set(records.map(r => r.brand))].sort();
  console.log(`\ndistinct brands (${distinctBefore.length}):`);

  const mappingLines = [];
  for (const b of distinctBefore) {
    const canon = canonicalBrand(b);
    const status = canon === b ? '✓' : `→ "${canon}"`;
    console.log(`  ${JSON.stringify(b).padEnd(30)} ${status}`);
    if (canon !== b) mappingLines.push({ raw: b, canon });
  }

  // ── 4. Idempotency check ─────────────────────────────────────────────────
  if (mappingLines.length === 0) {
    // Also check for case/whitespace duplicates among canonical values
    const lower = distinctBefore.map(b => b.trim().toLowerCase());
    const hasDupes = lower.length !== new Set(lower).size;
    if (!hasDupes) {
      console.log('\nALREADY NORMALIZED');
      return { alreadyNormalized: true, totalBefore };
    }
  }

  console.log(`\nchanges needed: ${mappingLines.length} brand variant(s)`);
  mappingLines.forEach(m => console.log(`  "${m.raw}" → "${m.canon}"`));

  if (DRY_RUN) {
    console.log('\n(dry-run: nothing written)');
    return { alreadyNormalized: false, totalBefore };
  }

  // ── 5. PATCH by old brand value (one PATCH per distinct old brand) ───────
  // Filtering by brand=eq.<old> avoids SKU-space encoding issues entirely.
  for (const { raw, canon } of mappingLines) {
    const count = records.filter(r => r.brand === raw).length;
    console.log(`\nupdating "${raw}" → "${canon}" (${count} records)...`);
    await rest(`/products?brand=eq.${encodeURIComponent(raw)}`, {
      method: 'PATCH',
      body: JSON.stringify({ brand: canon }),
    });
    console.log(`  done`);
  }

  // ── 6. Re-count to confirm total unchanged ───────────────────────────────
  const countResAfter = await fetch(`${SUPABASE_URL}/rest/v1/products?select=sku`, {
    headers: { ...headers(), 'Prefer': 'count=exact' },
  });
  const rangeAfter = countResAfter.headers.get('content-range') || '';
  const totalAfter = parseInt(rangeAfter.split('/')[1] || '0', 10);

  console.log(`\nrecords after:  ${totalAfter}`);

  return { alreadyNormalized: false, totalBefore, totalAfter, mappingLines };
}

// ── VERIFY ───────────────────────────────────────────────────────────────────
async function verify(state) {
  console.log('\n── VERIFY ──');
  let allPass = true;

  function check(name, pass, detail) {
    if (!pass) allPass = false;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  }

  // Re-query distinct brands
  const after = await restAll('/products?select=brand&order=sku.asc');
  const distinct = [...new Set(after.map(r => r.brand))].sort();
  console.log(`distinct brands after: ${distinct.join(', ')}`);

  // No two values differ only by case/whitespace
  const lower = distinct.map(b => b.trim().toLowerCase());
  const noDupes = lower.length === new Set(lower).size;
  check('no case/whitespace duplicates', noDupes,
    noDupes ? `${distinct.length} distinct, all unique when lowercased` : `duplicates: ${distinct.filter((b,i) => lower.indexOf(b.trim().toLowerCase()) !== i).join(', ')}`);

  // Total unchanged
  if (!state.alreadyNormalized) {
    const countOk = state.totalAfter === state.totalBefore;
    check('total record count unchanged', countOk,
      `before=${state.totalBefore}, after=${state.totalAfter}`);
  }

  // Spot check: Sandvik count >= expected (11 records in baseline)
  const sandvikCount = after.filter(r => r.brand === 'Sandvik').length;
  check('Sandvik canonical count >= 11', sandvikCount >= 11,
    `Sandvik: ${sandvikCount}`);

  // Spot check: no "Iscar" remaining
  const iscarOld = after.filter(r => r.brand === 'Iscar').length;
  check('no "Iscar" (non-canonical casing) remaining', iscarOld === 0,
    iscarOld === 0 ? 'clean' : `${iscarOld} records still have "Iscar"`);

  // Spot check: no "Mitsubishi" remaining (only "Mitsubishi Materials")
  const mitsuOld = after.filter(r => r.brand === 'Mitsubishi').length;
  check('no bare "Mitsubishi" remaining', mitsuOld === 0,
    mitsuOld === 0 ? 'clean' : `${mitsuOld} records still have "Mitsubishi"`);

  console.log(allPass ? '\nALL PASS' : '\nFAILURES PRESENT');
  return allPass;
}

main().then(async (state) => {
  const ok = await verify(state);
  process.exit(ok ? 0 : 1);
}).catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
