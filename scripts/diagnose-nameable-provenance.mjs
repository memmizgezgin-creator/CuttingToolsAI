#!/usr/bin/env node
/**
 * Diagnostic: why is live nameable-record provenance (35.7%) far below the
 * source JSON (83%)? Disambiguates the four hypotheses in one pass:
 *   - dedup/sync STRIPPED source  (JSON has source, live doesn't, same sku)
 *   - records VANISHED            (nameable in JSON, absent from live)
 *   - legacy DOMINANCE            (nameable in live, absent from JSON = curated/legacy)
 *   - broken DENOMINATOR          (nameable counts diverge for another reason)
 *
 * Read-only. Writes nothing. Run with Supabase service-role creds:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/diagnose-nameable-provenance.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Same "nameable" rule the verify + advisor dbHit rely on: sku is an ISO insert
// designation (4 letters then digits, e.g. "CNMG 120408").
const ISO_DESIGNATION_RE = /^[A-Z]{4}\s?\d/;
const isNameable = (sku) => ISO_DESIGNATION_RE.test(String(sku || '').toUpperCase());
const hasSource  = (r) => r.source_file != null && r.source_page != null;
// Join key: uppercase, strip all whitespace (Supabase stores "CNMG 120408-PM",
// JSON article may differ only by spacing).
const norm = (sku) => String(sku || '').toUpperCase().replace(/\s+/g, '').trim();

async function fetchAllLive() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=sku,source_file,source_page&limit=10000`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

function loadJsonNameable() {
  const data = JSON.parse(readFileSync(resolve(__dirname, '../data/extracted-productdb-candidates.json'), 'utf8'));
  const recs = data.tools || [];
  // Mirror the sync: a record's sku is its `article`. Synthetic SKUs (no article)
  // never match the ISO regex, so article is the right field for nameable.
  return recs
    .map(r => ({ sku: r.article, source_file: r.source_file, source_page: r.source_page }))
    .filter(r => isNameable(r.sku));
}

function pct(n, d) { return d ? `${(n / d * 100).toFixed(1)}%` : 'n/a'; }

(async () => {
  const live = await fetchAllLive();
  const liveNameable = live.filter(r => isNameable(r.sku));
  const jsonNameable = loadJsonNameable();

  const liveByKey = new Map(liveNameable.map(r => [norm(r.sku), r]));
  const jsonByKey = new Map(jsonNameable.map(r => [norm(r.sku), r]));

  const liveSourced = liveNameable.filter(hasSource).length;
  const jsonSourced = jsonNameable.filter(hasSource).length;

  console.log('=== NAMEABLE PROVENANCE DIAGNOSTIC ===');
  console.log(`live total records:      ${live.length}`);
  console.log(`live nameable:           ${liveNameable.length}  (sourced ${liveSourced} = ${pct(liveSourced, liveNameable.length)})`);
  console.log(`json nameable:           ${jsonNameable.length}  (sourced ${jsonSourced} = ${pct(jsonSourced, jsonNameable.length)})`);

  // 1. VANISHED: nameable in JSON, absent from live
  const vanished = [...jsonByKey.keys()].filter(k => !liveByKey.has(k));
  // 2. LEGACY/CURATED: nameable in live, absent from JSON
  const liveOnly = [...liveByKey.keys()].filter(k => !jsonByKey.has(k));
  // 3. STRIPPED (smoking gun): in both, JSON sourced but live not
  const stripped = [...jsonByKey.keys()].filter(k => {
    const l = liveByKey.get(k);
    return l && hasSource(jsonByKey.get(k)) && !hasSource(l);
  });
  // breakdown of live UNSOURCED nameable: do they have a sourced JSON twin?
  const liveUnsourced = liveNameable.filter(r => !hasSource(r));
  let unsourced_jsonHasSource = 0, unsourced_jsonNoSource = 0, unsourced_noJsonMatch = 0;
  for (const r of liveUnsourced) {
    const j = jsonByKey.get(norm(r.sku));
    if (!j) unsourced_noJsonMatch++;
    else if (hasSource(j)) unsourced_jsonHasSource++;
    else unsourced_jsonNoSource++;
  }

  const sample = (keys, n = 10) => keys.slice(0, n).join(', ') || '(none)';

  console.log('\n--- 1. VANISHED (nameable in JSON, missing from live) ---');
  console.log(`count: ${vanished.length}`);
  console.log(`samples: ${sample(vanished)}`);

  console.log('\n--- 2. LIVE-ONLY (nameable in live, not in JSON = legacy/curated) ---');
  console.log(`count: ${liveOnly.length}`);
  console.log(`samples: ${sample(liveOnly)}`);

  console.log('\n--- 3. STRIPPED (in both, JSON has source but LIVE does not) <-- dedup/sync smoking gun ---');
  console.log(`count: ${stripped.length}`);
  console.log(`samples: ${sample(stripped)}`);

  console.log('\n--- live UNSOURCED nameable, by JSON twin status ---');
  console.log(`total live unsourced nameable: ${liveUnsourced.length}`);
  console.log(`  JSON twin HAS source (fixable by dedup/sync): ${unsourced_jsonHasSource}`);
  console.log(`  JSON twin has NO source (needs real ingestion): ${unsourced_jsonNoSource}`);
  console.log(`  no JSON twin (legacy/curated only):             ${unsourced_noJsonMatch}`);

  console.log('\n=== VERDICT HINT ===');
  if (unsourced_jsonHasSource >= unsourced_noJsonMatch && unsourced_jsonHasSource >= unsourced_jsonNoSource) {
    console.log('-> Most live-unsourced records HAVE a sourced JSON twin: dedup/sync is dropping source. Fix the pipeline (prefer sourced on conflict), do NOT hand-source.');
  } else if (unsourced_noJsonMatch >= unsourced_jsonHasSource) {
    console.log('-> Most live-unsourced records have NO JSON twin: legacy/curated dominance. Decide whether to ingest source for them or exclude curated from the gate.');
  } else {
    console.log('-> Most have a JSON twin that ALSO lacks source: genuine ingestion gap. The source data itself is missing.');
  }
  if (vanished.length > 5) console.log(`-> NOTE: ${vanished.length} nameable JSON records are missing from live entirely — investigate the upsert, not just source columns.`);
})().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
