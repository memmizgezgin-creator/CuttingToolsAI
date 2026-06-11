// CuttingToolsAI — quota tier verification for functions/proxy.js
// Node 20+, no dependencies, no network: imports the Pages function directly
// and mocks BOTH the Anthropic upstream and Supabase (auth, RPCs, REST).
// Verifies the account-bound free tier contract:
//   - anonymous (device cookie): 1×200 plan:"anon", then 429 upgrade_path:"signin"
//   - signed-in free (user id):  3×200 plan:"free", then 429 upgrade_path:"pro"
//   - admin key:                 unlimited, plan:"pro", no usage rows
//
// Usage: node scripts/verify-quota-tiers.mjs

import { onRequestPost } from '../functions/proxy.js';

const SUPABASE_MOCK = 'https://supabase.mock';
const USER_ID = 'user-1234-5678';
const USER_TOKEN = 'fake-user-token';

// In-memory usage_daily, keyed `${type}:${id}:${day}` — mirrors the
// check_and_increment_daily / refund_daily RPC contract.
const usage = new Map();
function rpcIncrement({ p_type, p_id, p_day, p_limit }) {
  const key = `${p_type}:${p_id}:${p_day}`;
  const count = usage.get(key) || 0;
  if (count >= p_limit) return [{ allowed: false, used: count, remaining: 0 }];
  usage.set(key, count + 1);
  return [{ allowed: true, used: count + 1, remaining: p_limit - count - 1 }];
}
function rpcRefund({ p_type, p_id, p_day }) {
  const key = `${p_type}:${p_id}:${p_day}`;
  usage.set(key, Math.max(0, (usage.get(key) || 0) - 1));
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (u.includes('api.anthropic.com')) {
    return json({ content: [{ type: 'text', text: 'OK (mocked upstream)' }] });
  }
  if (u.startsWith(SUPABASE_MOCK)) {
    if (u.includes('/rest/v1/rpc/check_and_increment_daily')) {
      return json(rpcIncrement(JSON.parse(init.body)));
    }
    if (u.includes('/rest/v1/rpc/refund_daily')) {
      rpcRefund(JSON.parse(init.body));
      return json(null);
    }
    if (u.includes('/auth/v1/user')) {
      const auth = (init && init.headers && init.headers['Authorization']) || '';
      return auth === `Bearer ${USER_TOKEN}` ? json({ id: USER_ID }) : json({ msg: 'invalid' }, 401);
    }
    if (u.includes('/rest/v1/subscriptions')) return json([]);   // free user: no sub
    if (u.includes('/rest/v1/products'))      return json([]);
    if (u.includes('/rest/v1/advisor_queries')) return json(null, 201);
    return json([]);
  }
  return realFetch(url, init);
};

const env = {
  ANTHROPIC_API_KEY:         'test-key',
  ADMIN_TEST_KEY:            'test-admin-key',
  SUPABASE_URL:              SUPABASE_MOCK,
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
};

function makeContext(extraHeaders = {}) {
  const request = new Request('https://cuttingtoolsai.eu/proxy', {
    method: 'POST',
    headers: {
      'Content-Type':     'application/json',
      'Origin':           'https://cuttingtoolsai.eu',
      'CF-Connecting-IP': '203.0.113.7',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 64,
      messages: [{ role: 'user', content: 'quota tier verification' }],
    }),
  });
  return { request, env, waitUntil: () => {} };
}

let allPass = true;
function check(name, pass, detail) {
  if (!pass) allPass = false;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

// ── anonymous: 1 free answer, then 429 upgrade_path:"signin" ─────────────────
const a1 = await onRequestPost(makeContext());
const a1Body = await a1.json();
const cookie = (a1.headers.get('Set-Cookie') || '').match(/ta_uid=[^;]+/)?.[0];
check('anon-1 (200, plan anon)',
  a1.status === 200 && a1Body.plan === 'anon' && a1.headers.get('X-Plan') === 'anon',
  `HTTP ${a1.status}, plan="${a1Body.plan}", X-Plan="${a1.headers.get('X-Plan')}"`);
check('anon-1 (limit headers)',
  a1.headers.get('X-Quota-Limit') === '1' && a1.headers.get('X-Quota-Remaining') === '0',
  `X-Quota-Limit="${a1.headers.get('X-Quota-Limit')}", X-Quota-Remaining="${a1.headers.get('X-Quota-Remaining')}"`);

const a2 = await onRequestPost(makeContext({ 'Cookie': cookie || '' }));
const a2Body = await a2.json();
check('anon-2 (429 upgrade_path signin)',
  a2.status === 429 && a2Body.plan === 'anon' && a2Body.upgrade_path === 'signin',
  `HTTP ${a2.status}, plan="${a2Body.plan}", upgrade_path="${a2Body.upgrade_path}"`);

// ── signed-in free: 3 answers keyed on user id, then 429 upgrade_path:"pro" ──
for (let i = 1; i <= 3; i++) {
  const f = await onRequestPost(makeContext({ 'Authorization': `Bearer ${USER_TOKEN}` }));
  const fBody = await f.json();
  check(`free-${i} (200, plan free)`,
    f.status === 200 && fBody.plan === 'free' && f.headers.get('X-Quota-Limit') === '3' &&
      f.headers.get('X-Quota-Remaining') === String(3 - i),
    `HTTP ${f.status}, plan="${fBody.plan}", remaining="${f.headers.get('X-Quota-Remaining')}" (expected ${3 - i})`);
}
const f4 = await onRequestPost(makeContext({ 'Authorization': `Bearer ${USER_TOKEN}` }));
const f4Body = await f4.json();
check('free-4 (429 upgrade_path pro)',
  f4.status === 429 && f4Body.plan === 'free' && f4Body.upgrade_path === 'pro',
  `HTTP ${f4.status}, plan="${f4Body.plan}", upgrade_path="${f4Body.upgrade_path}"`);
check('free keyed on user id',
  usage.get(`user:${USER_ID}:${new Date().toISOString().slice(0, 10)}`) === 3,
  `usage_daily user:${USER_ID} count=${usage.get(`user:${USER_ID}:${new Date().toISOString().slice(0, 10)}`)} (expected 3)`);

// ── admin key: unlimited, plan pro, never increments ─────────────────────────
const usageSnapshot = new Map(usage);
let adminOk = true, adminDetail = '';
for (let i = 1; i <= 5; i++) {
  const r = await onRequestPost(makeContext({ 'X-Admin-Key': 'test-admin-key' }));
  const rBody = await r.json();
  if (r.status !== 200 || rBody.plan !== 'pro') {
    adminOk = false;
    adminDetail = `call ${i}: HTTP ${r.status}, plan="${rBody.plan}"`;
    break;
  }
}
const usageUnchanged = usage.size === usageSnapshot.size &&
  [...usage].every(([k, v]) => usageSnapshot.get(k) === v);
check('admin (5×200, plan pro)', adminOk, adminOk ? '5 calls, all HTTP 200 plan:"pro"' : adminDetail);
check('admin (no usage increments)', usageUnchanged,
  usageUnchanged ? 'usage_daily untouched by admin calls' : 'usage_daily changed during admin calls');

console.log(allPass ? '\nALL PASS' : '\nFAILURES PRESENT');
process.exit(allPass ? 0 : 1);
