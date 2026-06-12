#!/usr/bin/env node
/**
 * CuttingToolsAI — sync 1202-record local JSON dataset into Supabase products
 * ============================================================================
 * Upserts all records from data/extracted-productdb-candidates.json into the
 * Supabase products table. Safe to run multiple times (upsert, not truncate).
 * The 36 curated records (different SKU format) are preserved unchanged.
 *
 * Duplicate articles: first occurrence wins; later duplicates are skipped.
 * Records without an article receive a synthetic SKU (SYNTH-BRAN-FAMI-hash8).
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/sync-products-from-json.js
 *   Add --dry-run to preview without writing.
 *
 * Env:
 *   SUPABASE_URL               Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  service role key (eyJ… JWT)
 */

'use strict';

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DRY_RUN      = process.argv.includes('--dry-run');
const BATCH_SIZE   = 50;

const DATA_FILE = path.resolve(__dirname, '../data/extracted-productdb-candidates.json');

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: missing env — need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function authHeaders(extra = {}) {
  return {
    'Content-Type':  'application/json',
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    ...extra,
  };
}

async function rest(urlPath, opts = {}) {
  const { headers: extraHeaders = {}, ...restOpts } = opts;
  const res = await fetch(`${SUPABASE_URL}${urlPath}`, {
    ...restOpts,
    headers: authHeaders(extraHeaders),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status} ${urlPath}: ${body}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── Row construction ──────────────────────────────────────────────────────────
function syntheticSku(r, index) {
  const brand = (r.brand || 'UNK').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
  const fam   = (r.family || 'UNK').replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase().padEnd(4, 'X');
  const hash  = crypto.createHash('md5')
    .update(`${r.brand || ''}|${r.code || ''}|${r.bestFor || ''}|${index}`)
    .digest('hex').slice(0, 8);
  return `SYNTH-${brand}-${fam}-${hash}`;
}

function buildRow(r, sku) {
  const isoAll = Array.isArray(r.iso_all) && r.iso_all.length
    ? r.iso_all
    : (r.iso ? [r.iso] : null);

  const noteParts = [];
  if (r.vcMin != null && r.vcMax != null) noteParts.push(`Vc: ${r.vcMin}–${r.vcMax} m/min`);
  if (r.fMin  != null && r.fMax  != null) noteParts.push(`f: ${r.fMin}–${r.fMax} mm/rev`);

  return {
    sku,
    brand:           r.brand       || null,
    family:          r.family      || null,
    type_geometry:   r.code        ? String(r.code).slice(0, 200) : null,
    coating:         r.grade       || null,
    material_compat: isoAll,
    application:     r.bestFor     ? [r.bestFor] : null,
    notes:           noteParts.length ? noteParts.join(', ') : null,
    source_file:     r.source_file || null,
    source_page:     r.source_page != null ? Number(r.source_page) : null,
  };
}

// ── Upsert ────────────────────────────────────────────────────────────────────
async function upsertBatch(rows) {
  await rest('/rest/v1/products', {
    method: 'POST',
    headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const { tools } = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  console.log(`Loaded ${tools.length} records from JSON`);

  const rows         = [];
  const seenArticles = new Set();
  let dupCount = 0, syntheticCount = 0, noSourceCount = 0;

  for (let i = 0; i < tools.length; i++) {
    const r = tools[i];
    let sku;
    if (!r.article) {
      sku = syntheticSku(r, i);
      syntheticCount++;
    } else {
      const art = String(r.article).trim();
      if (seenArticles.has(art)) { dupCount++; continue; }
      seenArticles.add(art);
      sku = art;
    }
    const row = buildRow(r, sku);
    if (!row.source_file || row.source_page == null) noSourceCount++;
    rows.push(row);
  }

  console.log(`\nRecords to upsert: ${rows.length}`);
  console.log(`  Duplicates skipped:        ${dupCount}`);
  console.log(`  Synthetic SKUs generated:  ${syntheticCount}`);
  console.log(`  Missing source attribution: ${noSourceCount}`);

  // Brand summary
  const brands = {};
  for (const r of rows) brands[r.brand || '(null)'] = (brands[r.brand || '(null)'] || 0) + 1;
  console.log('\nBrand breakdown:');
  for (const [b, n] of Object.entries(brands).sort((a, b_) => b_[1] - a[1])) {
    console.log(`  ${b.padEnd(22)} ${n}`);
  }

  if (DRY_RUN) {
    console.log('\n(dry-run: nothing written)');
    console.log('\nSample row [0]:');
    console.log(JSON.stringify(rows[0], null, 2));
    return;
  }

  console.log(`\nUpserting ${rows.length} rows in batches of ${BATCH_SIZE}...`);
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await upsertBatch(batch);
    done += batch.length;
    if (done % 250 === 0 || done === rows.length) {
      console.log(`  ${done}/${rows.length}`);
    }
  }
  console.log('Upsert complete.');
}

// ── Verify ────────────────────────────────────────────────────────────────────
async function verify() {
  console.log('\n── VERIFY ──');
  let allPass = true;

  function check(name, pass, detail) {
    if (!pass) allPass = false;
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
  }

  const countRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=sku`, {
    headers: { ...authHeaders(), 'Prefer': 'count=exact' },
  });
  const range = countRes.headers.get('content-range') || '';
  const total = parseInt(range.split('/')[1] || '0', 10);
  check('total records >= 1200', total >= 1200, `count=${total}`);

  const withSource = await rest(
    '/rest/v1/products?select=sku&source_file=not.is.null&source_page=not.is.null'
  );
  check('records with source attribution >= 750',
    withSource.length >= 750, `count=${withSource.length}`);

  const guhring = await rest('/rest/v1/products?select=sku&brand=eq.Gühring&limit=1');
  check('Gühring records present', guhring.length > 0, guhring.length > 0 ? 'found' : 'MISSING');

  const cnmg = await rest('/rest/v1/products?select=sku&sku=ilike.*CNMG*&limit=1');
  check('curated CNMG records preserved', cnmg.length > 0, cnmg.length > 0 ? 'found' : 'MISSING');

  console.log(allPass ? '\nALL PASS' : '\nFAILURES PRESENT');
  return allPass;
}

main()
  .then(async () => {
    if (DRY_RUN) return process.exit(0);
    const ok = await verify();
    process.exit(ok ? 0 : 1);
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
