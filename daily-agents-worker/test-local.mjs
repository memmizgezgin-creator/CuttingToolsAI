/**
 * Lokal uçtan uca test — Supabase ve Resend MOCK, Anthropic GERÇEK (.env'den anahtar).
 *
 *   node daily-agents-worker/test-local.mjs        (repo kökünden)
 *
 * Akış: 2 sahte event insert (tech_research'e 1, site_dev'e 1; insertAgentEvents
 * üzerinden — sanitize yolu da test edilir) → evaluation pass → digest build.
 * Digest HTML'i daily-agents-worker/test-digest-output.html'e yazılır.
 * Hiçbir gerçek tabloya/inbox'a dokunmaz.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { insertAgentEvents } from '../agents-shared/departments.js';
import worker from './daily-agents-worker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── .env'den ANTHROPIC_API_KEY ────────────────────────────────────────────
const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf8');
const ANTHROPIC_API_KEY = (envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not found in .env'); process.exit(1); }

// ─── In-memory agent_events (PostgREST'in kullandığımız alt kümesi) ────────
const table = [];

function applyFilters(rows, params) {
  let out = [...rows];
  for (const [k, v] of params) {
    if (['select', 'order', 'limit'].includes(k)) continue;
    if (v.startsWith('eq.'))  out = out.filter(r => String(r[k]) === v.slice(3));
    if (v.startsWith('in.')) {
      const set = v.slice(4, -1).split(',');
      out = out.filter(r => set.includes(String(r[k])));
    }
  }
  const order = params.get('order');
  if (order) {
    const [col, dir] = order.split('.');
    out.sort((a, b) => (a[col] < b[col] ? -1 : 1) * (dir === 'desc' ? -1 : 1));
  }
  const limit = params.get('limit');
  if (limit) out = out.slice(0, Number(limit));
  return out;
}

function mockSupabase(url, init = {}) {
  const u = new URL(url);
  const params = u.searchParams;
  const method = init.method || 'GET';

  if (method === 'POST') {
    const rows = JSON.parse(init.body);
    for (const r of rows) {
      table.push({ id: randomUUID(), created_at: new Date().toISOString(), status: 'new',
                   evaluation: null, recommended_action: null, ...r });
    }
    return new Response(null, { status: 201 });
  }
  if (method === 'PATCH') {
    const matched = applyFilters(table, params);
    const fields = JSON.parse(init.body);
    for (const r of matched) Object.assign(r, fields);
    return new Response(JSON.stringify(matched), { status: 200 });
  }
  // GET — count modu (Prefer: count=exact) content-range ister
  const matched = applyFilters(table, params);
  const headers = { 'Content-Type': 'application/json' };
  if ((init.headers || {})['Prefer']?.includes('count=exact')) {
    headers['content-range'] = `0-0/${matched.length}`;
  }
  return new Response(JSON.stringify(matched), { status: 200, headers });
}

// ─── fetch yönlendirici: Supabase+Resend mock, Anthropic gerçek ────────────
const realFetch = globalThis.fetch;
let capturedEmail = null;

globalThis.fetch = async (url, init) => {
  const href = typeof url === 'string' ? url : url.url;
  if (href.startsWith('https://fake.supabase.local')) return mockSupabase(href, init);
  if (href.startsWith('https://api.resend.com')) {
    capturedEmail = JSON.parse(init.body);
    console.log(`  [resend mock] subject: ${capturedEmail.subject}`);
    return new Response('{"id":"mock"}', { status: 200 });
  }
  return realFetch(url, init);
};

// ─── KV mock ───────────────────────────────────────────────────────────────
const kv = new Map();
const TA_AGENT_BUS = {
  async get(k) { return kv.get(k) ?? null; },
  async put(k, v) { kv.set(k, v); }
};

const env = {
  ANTHROPIC_API_KEY,
  RESEND_API_KEY: 'mock',
  SUPABASE_URL: 'https://fake.supabase.local',
  SUPABASE_SERVICE_ROLE_KEY: 'mock',
  TA_AGENT_BUS
};

// ─── Test akışı ────────────────────────────────────────────────────────────
console.log('1) Inserting 2 fake events via insertAgentEvents()...');
await insertAgentEvents(env, 'market_intel', [{
  to_agent: 'site_dev',
  event_type: 'improvement',
  priority: 'normal',
  title: 'Add a visible "How equivalents are verified" note near cross-reference results',
  body: 'Competitor comparison pages increasingly show methodology notes next to equivalence claims. CuttingToolsAI cross-reference results currently show the equivalent grades without explaining that they come from verified CROSSREF_DB data, which costs trust with skeptical machinists. A one-line provenance note with a link would differentiate against AI tools that hallucinate equivalents.',
  source_ref: 'https://cuttingtoolsai.eu/cross-reference.html'
}]);
await insertAgentEvents(env, 'market_intel', [{
  to_agent: 'tech_research',
  event_type: 'finding',
  priority: 'high',
  title: 'Field report: ceramic insert chipping on Inconel traced to coolant pressure, not speed',
  body: 'A manufacturer technical note describes premature ceramic insert chipping in Inconel 718 turning that was repeatedly misdiagnosed as excessive cutting speed; the actual cause was intermittent high-pressure coolant creating thermal cycling at the edge. The corrective action was constant-pressure coolant or dry cutting with reduced depth, not a speed change. Potential new why-layer principle about thermal cycling masquerading as speed problems.',
  source_ref: 'https://example.com/ceramic-inconel-technote'
}]);
console.log(`   table now has ${table.length} row(s), status: ${table.map(r => r.status).join(', ')}`);

console.log('2) Running evaluation pass (real Claude calls)...');
const evalRes = await worker.fetch(new Request('https://test/run/evaluate', { method: 'POST' }), env, {});
console.log('   ', await evalRes.text());
console.log('   statuses now:', table.map(r => `${r.to_agent}=${r.status}`).join(', '));

console.log('2b) Re-running evaluation pass (idempotency check — must evaluate 0)...');
const evalRes2 = await worker.fetch(new Request('https://test/run/evaluate', { method: 'POST' }), env, {});
const eval2 = JSON.parse(await evalRes2.text());
if (eval2.evaluated + eval2.escalated !== 0) {
  console.error('   FAIL: events were evaluated twice!'); process.exit(1);
}
console.log('   OK: 0 re-evaluations');

console.log('3) Building digest...');
// Departman özeti örneği (normalde collector yazar)
await TA_AGENT_BUS.put(`summary:${new Date().toISOString().slice(0, 10)}:site_dev`,
  'Reviewed the live homepage. Main friction: the advisor CTA below the fold gets no scroll cue, and the /ref/ pages are not linked from the hero. Three suggestions routed to the bus.');
const digestRes = await worker.fetch(new Request('https://test/run/digest', { method: 'POST' }), env, {});
const digest = JSON.parse(await digestRes.text());

const outPath = join(__dirname, 'test-digest-output.html');
writeFileSync(outPath, capturedEmail?.html || digest.html || '');
console.log(`   digest: ${digest.decisions} decision(s), ${digest.routed} evaluated, ${digest.deferred} deferred`);
console.log(`   HTML written to ${outPath}`);

console.log('\nFinal table state:');
for (const r of table) {
  console.log(`  [${r.status}] ${r.from_agent}→${r.to_agent} "${r.title}"`);
  console.log(`     eval: ${(r.evaluation || '').slice(0, 140)}`);
  console.log(`     action: ${(r.recommended_action || '').slice(0, 140)}`);
}
