#!/usr/bin/env node
/**
 * Strategy probe (read-only, writes nothing): reads recent advisor_queries and
 * classifies the db_hit=FALSE ones by INTENT TYPE, to answer the core question:
 * are users hitting a CATALOG gap (they ask for a specific code/grade the DB
 * lacks) or a JUDGMENT gap (troubleshooting / why-layer questions a catalog
 * can't answer anyway)? That split decides whether to feed the DB or to invest
 * in the why-layer instead.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/probe-db-misses.mjs
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('FAIL: need SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

async function q(path, extraHeaders = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { headers: { ...H, ...extraHeaders } });
  if (!res.ok && res.status !== 206) throw new Error(`${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { rows: JSON.parse((await res.text()) || '[]'), cr: res.headers.get('content-range') };
}

// ── intent classifiers (heuristic, directional) ─────────────────────────────
const ISO_CODE   = /\b[a-z]{4}\s?\d{2}\d{0,4}\b/i;            // CNMG120408, DNMG 1506...
const GRADE_TOK  = /\b(gc|tp|kc|ic|cp|ap)\s?\d{2,4}\b/i;      // GC4325, TP2501, KCP25, IC907...
const NAME_INTENT= /\b(which|recommend|best|grade for|insert for|tool for|equivalent|cross[\s-]?ref|alternative to|part\s?number|sku|catalog)\b/i;
const JUDGMENT   = /\b(chatter|vibrat|wear|tool life|burr|smear|built[\s-]?up|\bbue\b|finish|breaking|broke|deflect|rubbing|squeal|noise|why|troubleshoot|problem|issue|fail|too fast|too slow|work[\s-]?harden|chip control|coolant|runout|stall)\b/i;
const MATERIAL   = /\b(steel|stainless|316|304|303|4140|42crmo|alumin|titanium|ti6al4v|inconel|cast iron|gg25|brass|bronze|hardened|hrc|17-4|15-5|duplex|2205|tool steel|d2|h13)\b/i;
const OPERATION  = /\b(turn|turning|mill|milling|drill|drilling|tap|thread|ream|bore|groov|face|slot|pocket|finish|rough)\b/i;

function classify(text) {
  const t = (text || '').trim();
  if (!t) return 'EMPTY';
  if (ISO_CODE.test(t) || GRADE_TOK.test(t)) return 'CODE';            // catalog gap: specific code/grade
  if (JUDGMENT.test(t)) return 'JUDGMENT';                              // why-layer: troubleshooting/process
  if (NAME_INTENT.test(t) && (MATERIAL.test(t) || OPERATION.test(t))) return 'NAME_REC'; // wants a named pick
  if (MATERIAL.test(t) || OPERATION.test(t)) return 'MATERIAL_REC';    // material/op, could go either way
  return 'OTHER';
}

(async () => {
  // Overall db_hit rate (the real "it knows my tooling" metric).
  const tot   = await q('/advisor_queries?select=db_hit', { Prefer: 'count=exact', Range: '0-0' });
  const total = parseInt((tot.cr || '/0').split('/')[1] || '0', 10);
  const hitC  = await q('/advisor_queries?select=db_hit&db_hit=is.true', { Prefer: 'count=exact', Range: '0-0' });
  const hits  = parseInt((hitC.cr || '/0').split('/')[1] || '0', 10);

  console.log('=== DB-MISS INTENT PROBE ===');
  console.log(`total logged queries: ${total}`);
  console.log(`db_hit TRUE: ${hits} (${total ? (hits / total * 100).toFixed(1) : 0}%)  |  db_hit FALSE: ${total - hits} (${total ? ((total - hits) / total * 100).toFixed(1) : 0}%)`);

  // Last 200 misses, classified by intent.
  const { rows } = await q('/advisor_queries?select=query_text,matched_records,created_at&db_hit=is.false&order=created_at.desc&limit=200');
  console.log(`\nanalyzing last ${rows.length} db_hit=FALSE queries by intent:\n`);

  const buckets = { CODE: [], JUDGMENT: [], NAME_REC: [], MATERIAL_REC: [], OTHER: [], EMPTY: [] };
  for (const r of rows) buckets[classify(r.query_text)].push(r.query_text);

  const order = ['CODE', 'NAME_REC', 'MATERIAL_REC', 'JUDGMENT', 'OTHER', 'EMPTY'];
  const label = {
    CODE:        'CODE        (asks a specific designation/grade -> CATALOG gap)',
    NAME_REC:    'NAME_REC    (material/op + "which/recommend" -> wants a named pick)',
    MATERIAL_REC:'MATERIAL_REC(material/op, no code -> recommendation, catalog may help)',
    JUDGMENT:    'JUDGMENT    (troubleshooting/process/why -> WHY-LAYER, catalog cannot answer)',
    OTHER:       'OTHER       (off-domain / unclear)',
    EMPTY:       'EMPTY',
  };
  for (const k of order) {
    const n = buckets[k].length;
    if (!n && k === 'EMPTY') continue;
    console.log(`${label[k]}: ${n} (${rows.length ? (n / rows.length * 100).toFixed(0) : 0}%)`);
  }

  console.log('\n--- samples per bucket (up to 6) ---');
  for (const k of order) {
    if (!buckets[k].length) continue;
    console.log(`\n[${k}]`);
    for (const s of buckets[k].slice(0, 6)) console.log(`  • ${String(s).slice(0, 90)}`);
  }

  const catalogGap = buckets.CODE.length + buckets.NAME_REC.length;
  const whyLayer   = buckets.JUDGMENT.length;
  console.log('\n=== VERDICT HINT ===');
  if (catalogGap > whyLayer * 1.5) {
    console.log('-> Misses are mostly CATALOG-shaped (specific codes/named picks). Feeding the DB on these recurring families is justified.');
  } else if (whyLayer > catalogGap * 1.5) {
    console.log('-> Misses are mostly JUDGMENT-shaped. A bigger catalog will NOT fix them — invest in the why-layer, not ingestion.');
  } else {
    console.log('-> Mixed. Do both small: ingest the few recurring CODE families AND sharpen the why-layer for the JUDGMENT cluster.');
  }
  console.log('(Heuristic classification — read the samples above to sanity-check the split.)');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
