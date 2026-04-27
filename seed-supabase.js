#!/usr/bin/env node
/**
 * ToolAdvisor — Supabase Seed Script
 * Usage: SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=<anon-or-service-key> node seed-supabase.js
 *
 * Seeds:
 *   - products table    (86 entries from PRODUCT_DB)
 *   - cross_references  (all entries from CROSSREF_DB / CROSSREF_SIGNAL_DB)
 *
 * Run once after schema is applied. Safe to re-run — uses upsert.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Set SUPABASE_URL and SUPABASE_KEY environment variables.');
  process.exit(1);
}

// ── Extract data from index.html ──────────────────────────────────────────────
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function extractBlock(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  const end   = html.indexOf(endMarker, start);
  if (start === -1 || end === -1) return null;
  return html.slice(start, end + endMarker.length);
}

// PRODUCT_DB
const prodMatch = html.match(/const PRODUCT_DB=\[([\s\S]*?)\];\s*\nconst CORE_CUTTING/);
if (!prodMatch) { console.error('❌  PRODUCT_DB not found'); process.exit(1); }
let PRODUCT_DB;
try { PRODUCT_DB = eval('[' + prodMatch[1] + ']'); }
catch(e) { console.error('❌  PRODUCT_DB parse error:', e.message); process.exit(1); }

// CROSSREF_DB (both CROSSREF_DB and CROSSREF_SIGNAL_DB)
let CROSSREF_DB = {}, CROSSREF_SIGNAL_DB = {};
try {
  const crMatch = html.match(/const CROSSREF_DB\s*=\s*\{([\s\S]*?)\};\s*\nconst CROSSREF_SIGNAL_DB/);
  const csMatch = html.match(/const CROSSREF_SIGNAL_DB\s*=\s*\{([\s\S]*?)\};\s*\n/);
  if (crMatch) CROSSREF_DB        = eval('({' + crMatch[1]  + '})');
  if (csMatch) CROSSREF_SIGNAL_DB = eval('({' + csMatch[1]  + '})');
} catch(e) {
  console.warn('⚠️   Cross-ref parse warning (non-fatal):', e.message);
}

// ── Supabase REST helper ──────────────────────────────────────────────────────
function supabaseRequest(method, table, body, params = '') {
  return new Promise((resolve, reject) => {
    const url   = new URL(`${SUPABASE_URL}/rest/v1/${table}${params}`);
    const data  = body ? JSON.stringify(body) : null;
    const req   = https.request({
      hostname: url.hostname,
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        method === 'POST' ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(body);
        else reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function upsertBatch(table, rows, chunkSize = 50) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await supabaseRequest('POST', table, chunk, '?on_conflict=id');
    process.stdout.write(`  ${table}: ${Math.min(i + chunkSize, rows.length)}/${rows.length}\r`);
  }
  console.log(`  ✓ ${table}: ${rows.length} rows upserted.`);
}

// ── Map PRODUCT_DB row → DB row ───────────────────────────────────────────────
function mapProduct(p) {
  return {
    id:                      p.id,
    brand:                   p.brand || '',
    product_name:            p.productName || '',
    series:                  p.series || '',
    product_type:            p.productType || 'insert',
    grade:                   p.grade || '',
    coating:                 p.coating || '',
    geometry:                p.geometry || '',
    iso_codes:               Array.isArray(p.isoCodes)            ? p.isoCodes            : [],
    operations:              Array.isArray(p.operations)          ? p.operations          : [],
    materials:               Array.isArray(p.materials)           ? p.materials           : [],
    vc_range:                p.vcRange  || '',
    fn_range:                p.fnRange  || '',
    ap_range:                p.apRange  || '',
    tool_life:               p.toolLife || '',
    application_notes:       p.applicationNotes || '',
    top_for:                 Array.isArray(p.topFor)              ? p.topFor              : [],
    exact_equivalents:       Array.isArray(p.exactEquivalents)    ? p.exactEquivalents    : [],
    functional_alternatives: Array.isArray(p.functionalAlternatives) ? p.functionalAlternatives : [],
    value_alternatives:      Array.isArray(p.valueAlternatives)   ? p.valueAlternatives   : [],
    cutting_data:            p.cuttingData && typeof p.cuttingData === 'object' ? p.cuttingData : {},
    buy_links:               [],
    image_url:               p.imageUrl || '',
  };
}

// ── Map CROSSREF_DB entry → rows ─────────────────────────────────────────────
function mapCrossRefEntries(db) {
  const rows = [];
  let order = 0;
  for (const [insertCode, entry] of Object.entries(db)) {
    if (!entry || !Array.isArray(entry.rows)) continue;
    entry.rows.forEach((r, i) => {
      rows.push({
        insert_code:     insertCode,
        ref_desc:        entry.desc || '',
        brand:           r.brand || '',
        equivalent_code: r.code  || '',
        coating:         r.coating || '',
        application:     r.app    || '',
        apc_class:       r.apc    || '',
        sort_order:      order++,
      });
    });
  }
  return rows;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('🚀  ToolAdvisor Supabase seed starting…');
  console.log(`    URL: ${SUPABASE_URL}`);
  console.log(`    Products found: ${PRODUCT_DB.length}`);

  // Products
  const productRows = PRODUCT_DB.map(mapProduct);
  await upsertBatch('products', productRows);

  // Cross-references (merge both maps)
  const allCR = {
    ...CROSSREF_DB,
    ...CROSSREF_SIGNAL_DB,
  };
  const crRows = mapCrossRefEntries(allCR);
  console.log(`    Cross-ref entries found: ${crRows.length}`);
  if (crRows.length > 0) {
    // cross_references has UUID PK — delete+insert instead of upsert
    await supabaseRequest('DELETE', 'cross_references', null, '?id=not.is.null');
    await upsertBatch('cross_references', crRows, 100);
  }

  console.log('✅  Seed complete.');
})().catch(e => {
  console.error('❌  Seed failed:', e.message);
  process.exit(1);
});
