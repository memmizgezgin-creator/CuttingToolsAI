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

// Provenance non-regression baseline (graceful: a missing/bad file disables the
// guard rather than crashing the sync).
let SYNC_BASELINE = { attributed: 0, total: 0 };
try {
  SYNC_BASELINE = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'sync-baseline.json'), 'utf8'));
} catch { /* no baseline → regression guard is a no-op */ }

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

// Paginated GET: PostgREST caps each response at max-rows (default 1000), so a
// plain `limit=10000` silently truncates. Page with Range headers (stable order)
// until a short page. urlPath must NOT include its own limit/Range.
async function restAll(urlPath) {
  const PAGE = 1000;
  const all = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${SUPABASE_URL}${urlPath}`, {
      headers: authHeaders({ Range: `${from}-${from + PAGE - 1}`, 'Range-Unit': 'items' }),
    });
    if (!res.ok && res.status !== 206) {
      throw new Error(`HTTP ${res.status} ${urlPath}: ${await res.text()}`);
    }
    const rows = JSON.parse((await res.text()) || '[]');
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
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
    material_compat: isoAll || [],
    application:     r.bestFor     ? [r.bestFor] : [],
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

  const withSource = await restAll(
    '/rest/v1/products?select=sku&source_file=not.is.null&source_page=not.is.null&order=sku.asc'
  );
  // Ratio-based floor instead of a brittle fixed count: source-attributed
  // records must be >= 55% of the table. A low floor (not a pin at the current
  // 60.7%) is deliberate — bulk ingestion of new, not-yet-attributed records
  // mechanically dilutes the ratio short-term, and a high pin would block the
  // very growth we want. The floor only catches catastrophic provenance loss.
  const MIN_SOURCE_RATIO = 0.55;
  const sourceRatio = total > 0 ? withSource.length / total : 0;
  check(`source attribution >= ${Math.round(MIN_SOURCE_RATIO * 100)}% of records`,
    sourceRatio >= MIN_SOURCE_RATIO,
    `${withSource.length}/${total} = ${(sourceRatio * 100).toFixed(1)}%`);

  // Non-regression guard: the ratio floor allows ingestion dilution but would
  // miss SILENT DECAY (attributed count quietly dropping with no growth). Guard
  // the absolute attributed count against a committed baseline, with 2% slack so
  // normal dedup churn doesn't flap. Bump scripts/sync-baseline.json after an
  // intentional ingestion. (Catastrophic table collapse is already caught by the
  // total >= 1200 check above.)
  const REGRESSION_TOLERANCE = 0.98;
  const baselineFloor = Math.floor((SYNC_BASELINE.attributed || 0) * REGRESSION_TOLERANCE);
  check(`no provenance regression (attributed >= ${baselineFloor}, baseline ${SYNC_BASELINE.attributed})`,
    withSource.length >= baselineFloor,
    `attributed=${withSource.length}`);
  if (withSource.length > (SYNC_BASELINE.attributed || 0)) {
    console.log(`  INFO: attributed grew to ${withSource.length} — bump scripts/sync-baseline.json`);
  }

  const guhring = await rest('/rest/v1/products?select=sku&brand=eq.Gühring&limit=1');
  check('Gühring records present', guhring.length > 0, guhring.length > 0 ? 'found' : 'MISSING');

  const cnmg = await rest('/rest/v1/products?select=sku&sku=ilike.*CNMG*&limit=1');
  check('curated CNMG records preserved', cnmg.length > 0, cnmg.length > 0 ? 'found' : 'MISSING');

  // ── Nameable-record provenance (the real reliability lever) ────────────────
  // The advisor's hard-stop trusts a record (dbHit) when an ISO designation in
  // the query exact-matches a record's `sku` (see retrieveTools in proxy.js).
  // Those ISO-designation records are exactly the ones the advisor may name as a
  // specific verified product — so a NAMEABLE record with no source attribution
  // is the precise fabrication-adjacent risk the guardrail exists to prevent.
  // Synthetic/numeric SKUs are excluded: they never exact-match an ISO query and
  // are only family-level grounding context, never named.
  // Non-regression ratchet (NOT a fixed floor): the real provenance is ~36%
  // today. These records are real DB entries lacking only a page citation (a
  // traceability gap, not fabrication), so we don't red-line the pipeline over
  // them. Instead we lock the current ratio as a floor: provenance can only hold
  // or improve. TARGET 90% — bump scripts/sync-baseline.json as ingestion raises
  // it. Adding nameable records WITHOUT source attribution will (correctly) fail.
  const allRecs = await restAll('/rest/v1/products?select=sku,source_file,source_page&order=sku.asc');
  const ISO_DESIGNATION_RE = /^[A-Z]{4}\s?\d/;  // e.g. "CNMG 120408", "DNMG150608"
  const nameable = allRecs.filter(r => ISO_DESIGNATION_RE.test(String(r.sku || '').toUpperCase()));
  const nameableWithSrc = nameable.filter(r => r.source_file != null && r.source_page != null);
  const nameableCov = nameable.length ? nameableWithSrc.length / nameable.length : 1;
  console.log(`nameable (ISO-designation) records: ${nameable.length}, with source: ${nameableWithSrc.length} (${(nameableCov * 100).toFixed(1)}%) [target 90%]`);
  const baseNameable    = SYNC_BASELINE.nameable || 0;
  const baseNameableSrc = SYNC_BASELINE.nameableWithSource || 0;
  const baselineCov     = baseNameable > 0 ? baseNameableSrc / baseNameable : 0;
  const nameableFloor   = Math.max(0, baselineCov - 0.02);  // 2% slack, no flap
  check(`nameable provenance no-regression (>= ${(nameableFloor * 100).toFixed(1)}%, baseline ${(baselineCov * 100).toFixed(1)}%)`,
    nameable.length === 0 || nameableCov >= nameableFloor,
    `${(nameableCov * 100).toFixed(1)}%`);
  if (nameableCov > baselineCov + 0.01) {
    console.log(`  INFO: nameable provenance improved to ${(nameableCov * 100).toFixed(1)}% — bump scripts/sync-baseline.json (nameable/nameableWithSource)`);
  }

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
