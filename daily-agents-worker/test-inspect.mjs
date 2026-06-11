/**
 * Quality Inspector — uçtan uca lokal test
 * ==========================================
 * Akış:
 *   1. Mock advisor_queries: 1 iyi yanıt (DB'ye dayalı) + 1 kötü yanıt (uydurma grade)
 *   2. POST /run/inspect  (gerçek Claude çağrısı)
 *   3. Sonuçları doğrula:
 *      - İyi yanıt için issue event'i olmamalı (high-priority yok)
 *      - Kötü yanıt için tech_research'e HIGH priority issue event'i olmalı
 *   4. POST /run/evaluate  (event'leri değerlendir)
 *   5. POST /run/digest    (HTML çıktısı — quality_inspector bölümü kontrol et)
 *   HTML: daily-agents-worker/test-inspect-output.html
 *
 *   node daily-agents-worker/test-inspect.mjs        (repo kökünden çalıştır)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join }              from 'node:path';
import { fileURLToPath }              from 'node:url';
import { randomUUID }                 from 'node:crypto';
import worker                         from './daily-agents-worker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── .env'den ANTHROPIC_API_KEY ────────────────────────────────────────────
const envFile = readFileSync(join(__dirname, '..', '.env'), 'utf8');
const ANTHROPIC_API_KEY = (envFile.match(/^ANTHROPIC_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY not found in .env'); process.exit(1); }

// ─── In-memory tables ──────────────────────────────────────────────────────
const advisorQueries = [
  {
    id: randomUUID(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
    query_text: 'Turning Inconel 718 external finishing, Vc 45 m/min wet, recommend insert',
    ai_answer:
      'For Inconel 718 external finishing at 45 m/min wet, use a CNMG 120408-MF geometry.\n' +
      'INSERT: CNMG 120408-MF\n' +
      'GRADE: GC2135 (PVD TiAlN/TiN multilayer, designed for ISO S superalloys)\n' +
      'GEOMETRY: MF chip-breaker, sharp positive rake\n' +
      'Vc: 40–55 m/min\n' +
      'Fn: 0.10–0.15 mm/rev\n' +
      'CROSS-REF: Kennametal KC5525, Iscar IC807, Walter WKK20\n' +
      'Start at the low end — Inconel work-hardens fast; listen for tone change as first ' +
      'wear indicator, not chip color. If sound becomes higher-pitched before expected tool ' +
      'life, check edge condition before adjusting parameters.',
    db_hit: true,
    matched_records: 3
  },
  {
    id: randomUUID(),
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1h ago
    query_text: 'Milling 316L stainless, shoulder milling, recommend grade',
    ai_answer:
      'For 316L stainless shoulder milling I recommend the XZ9900 grade from GenericCut, ' +
      'which uses their proprietary NanoSteel coating applied at 1200°C for maximum ' +
      'adhesion. Pair it with the APMT1135PDER-XZ insert geometry.\n' +
      'Vc: 180-220 m/min, fz: 0.15 mm/tooth\n' +
      'The XZ9900 grade is specifically engineered for M-group ISO materials and provides ' +
      '40% longer tool life than competitor grades according to GenericCut internal testing.',
    db_hit: false,
    matched_records: 0
  }
];
const agentEvents = [];

// ─── Mock Supabase ─────────────────────────────────────────────────────────
function applyFilters(rows, params) {
  let out = [...rows];
  for (const [k, v] of params) {
    if (['select', 'order', 'limit'].includes(k)) continue;
    if (v.startsWith('eq.'))   out = out.filter(r => String(r[k]) === v.slice(3));
    if (v.startsWith('gte.'))  out = out.filter(r => r[k] >= v.slice(4));
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
  const u      = new URL(url);
  const path   = u.pathname;
  const params = u.searchParams;
  const method = init.method || 'GET';

  // ── advisor_queries (inspector reads) ────────────────────────────────────
  if (path.endsWith('/advisor_queries')) {
    if (method === 'POST') {
      // Inspector inserts are not expected; ignore silently
      return new Response(null, { status: 201 });
    }
    const rows    = applyFilters(advisorQueries, params);
    const headers = { 'Content-Type': 'application/json' };
    return new Response(JSON.stringify(rows), { status: 200, headers });
  }

  // ── agent_events ──────────────────────────────────────────────────────────
  if (path.endsWith('/agent_events')) {
    if (method === 'POST') {
      const rows = JSON.parse(init.body);
      for (const r of rows) {
        agentEvents.push({ id: randomUUID(), created_at: new Date().toISOString(),
                           status: 'new', evaluation: null, recommended_action: null, ...r });
      }
      return new Response(null, { status: 201 });
    }
    if (method === 'PATCH') {
      const matched = applyFilters(agentEvents, params);
      const fields  = JSON.parse(init.body);
      for (const r of matched) Object.assign(r, fields);
      return new Response(JSON.stringify(matched), { status: 200 });
    }
    const matched = applyFilters(agentEvents, params);
    const headers = { 'Content-Type': 'application/json' };
    if ((init.headers || {})['Prefer']?.includes('count=exact')) {
      headers['content-range'] = `0-0/${matched.length}`;
    }
    return new Response(JSON.stringify(matched), { status: 200, headers });
  }

  return new Response('{}', { status: 200 });
}

// ─── fetch router ──────────────────────────────────────────────────────────
const realFetch   = globalThis.fetch;
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

// ─── KV + env ──────────────────────────────────────────────────────────────
const kv = new Map();
const TA_AGENT_BUS = {
  async get(k)       { return kv.get(k) ?? null; },
  async put(k, v)    { kv.set(k, v); }
};

const env = {
  ANTHROPIC_API_KEY,
  RESEND_API_KEY: 'mock',
  SUPABASE_URL:   'https://fake.supabase.local',
  SUPABASE_SERVICE_ROLE_KEY: 'mock',
  TA_AGENT_BUS
};

// ─── Test flow ─────────────────────────────────────────────────────────────
console.log('=== Quality Inspector E2E Test ===\n');
console.log('Mock advisor_queries:');
console.log(`  [GOOD] "${advisorQueries[0].query_text.slice(0, 60)}..." (db_hit=true)`);
console.log(`  [BAD ] "${advisorQueries[1].query_text.slice(0, 60)}..." (invented grade XZ9900, db_hit=false)\n`);

console.log('1) POST /run/inspect (real Claude calls)...');
const inspectRes  = await worker.fetch(new Request('https://test/run/inspect', { method: 'POST' }), env, {});
const inspectData = JSON.parse(await inspectRes.text());
console.log(`   audited=${inspectData.audited} weak=${inspectData.weak} deferred=${inspectData.deferred}`);
inspectData.log?.forEach(l => console.log(`   ${l}`));

console.log(`\n   agent_events after inspect (${agentEvents.length} total):`);
for (const ev of agentEvents) {
  console.log(`   [${ev.from_agent}→${ev.to_agent}] ${ev.priority} · ${ev.event_type} · "${ev.title.slice(0, 80)}"`);
}

// ── Assertions ──────────────────────────────────────────────────────────────
const highIssues = agentEvents.filter(e =>
  e.from_agent === 'quality_inspector' && e.event_type === 'issue' && e.priority === 'high'
);
const inventedIssues = agentEvents.filter(e =>
  e.from_agent === 'quality_inspector' && e.to_agent === 'tech_research' &&
  e.event_type === 'issue' && e.priority === 'high' &&
  (e.title.toLowerCase().includes('invent') || e.title.toLowerCase().includes('fabricat') ||
   e.body.toLowerCase().includes('invented') || e.body.toLowerCase().includes('xz9900'))
);
const summaryEvent = agentEvents.find(e =>
  e.from_agent === 'quality_inspector' && e.to_agent === 'chief_of_staff' && e.event_type === 'finding'
);

console.log('\n── Assertions ──');
let passed = 0, failed = 0;

function assert(condition, msg) {
  if (condition) { console.log(`  ✓ ${msg}`); passed++; }
  else           { console.error(`  ✗ FAIL: ${msg}`); failed++; }
}

assert(inspectData.audited === 2, `audited 2 queries (got ${inspectData.audited})`);
assert(summaryEvent, 'summary finding event emitted to chief_of_staff');
assert(inventedIssues.length >= 1,
  `high-priority issue to tech_research for invented grade (found ${inventedIssues.length})`);
assert(highIssues.length >= 1, `at least 1 high-priority issue event emitted`);

// Good answer should NOT generate invented_data high issue
const goodQueryIssues = agentEvents.filter(e =>
  e.from_agent === 'quality_inspector' && e.event_type === 'issue' && e.priority === 'high' &&
  (e.body || '').toLowerCase().includes('inconel')
);
assert(goodQueryIssues.length === 0, 'good Inconel answer does NOT generate high-priority issue');

if (failed > 0) {
  console.error(`\n${failed} assertion(s) failed — review events above.`);
} else {
  console.log(`\nAll ${passed} assertions passed.`);
}

// ── Evaluation pass ─────────────────────────────────────────────────────────
console.log('\n2) POST /run/evaluate...');
const evalRes  = await worker.fetch(new Request('https://test/run/evaluate', { method: 'POST' }), env, {});
const evalData = JSON.parse(await evalRes.text());
console.log(`   evaluated=${evalData.evaluated} escalated=${evalData.escalated} deferred=${evalData.deferred}`);
console.log('   statuses now:', agentEvents.map(e => `${e.to_agent}=${e.status}`).join(', '));

// ── Digest ──────────────────────────────────────────────────────────────────
console.log('\n3) POST /run/digest...');
const digestRes  = await worker.fetch(new Request('https://test/run/digest', { method: 'POST' }), env, {});
const digestData = JSON.parse(await digestRes.text());
console.log(`   decisions=${digestData.decisions} routed=${digestData.routed} deferred=${digestData.deferred}`);

const html    = capturedEmail?.html || digestData.html || '';
const hasQI   = html.includes('Quality Inspector') || html.includes('quality_inspector');
assert(hasQI, 'digest HTML contains Quality Inspector section');

const outPath = join(__dirname, 'test-inspect-output.html');
writeFileSync(outPath, html);
console.log(`   HTML written to ${outPath}`);

// ── Final summary ───────────────────────────────────────────────────────────
console.log('\n── Final event table ──');
for (const ev of agentEvents) {
  console.log(`  [${ev.status}] ${ev.from_agent}→${ev.to_agent} "${ev.title.slice(0, 80)}"`);
}

console.log(`\n=== ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/${passed + failed} assertions) ===`);
if (failed > 0) process.exit(1);
