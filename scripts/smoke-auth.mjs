// CuttingToolsAI — auth/entitlement + quota smoke test
// Node 20+, no npm dependencies, plain fetch.
//
// Required env:
//   SUPABASE_URL               Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY  service role key (admin API + PostgREST + RPC)
//   SUPABASE_ANON_KEY          anon/publishable key (password grant sign-in)
// Optional env:
//   SITE_URL                   deployed site (default https://cuttingtoolsai.eu)
//
// Cost-conscious design: the quota MATH (increment → cap → refund) is tested
// directly against the Supabase RPCs (check_and_increment_daily / refund_daily)
// for $0 — no Anthropic calls. The proxy is exercised only with cheap probe
// queries that the server-side pre-filter short-circuits BEFORE any model/
// web_search call, purely to confirm liveness + plan wiring (anon/free/pro).
//
// NOTE on the new quota semantics (functions/proxy.js): a query only SPENDS
// quota on a real recommendation (db_hit=true). Refuse / material-only answers
// and pre-filtered probes are refunded. That is exactly why quota is now tested
// at the RPC layer rather than by counting proxy answers.

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ANON_KEY     = process.env.SUPABASE_ANON_KEY || '';
const SITE_URL     = (process.env.SITE_URL || 'https://cuttingtoolsai.eu').replace(/\/$/, '');

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
  console.error('FAIL setup: missing env — need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY');
  process.exit(1);
}

const results = [];
function record(step, pass, detail) {
  results.push({ step, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${step}: ${detail}`);
}

function serviceHeaders(extra = {}) {
  return { 'Content-Type': 'application/json', apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, ...extra };
}

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers: serviceHeaders(init.headers) });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, json, text };
}

// PostgREST RPC: returns the function result (check_and_increment_daily yields
// [{ allowed, remaining }]; refund_daily yields null/[]).
async function rpc(fn, body) {
  return rest(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(body) });
}
const allowedOf = (r) => Array.isArray(r.json) && r.json[0] ? r.json[0].allowed : undefined;

const today = new Date().toISOString().slice(0, 10);

// Cheap proxy probe: the pre-filter short-circuits this BEFORE any model call,
// so it costs ~nothing. Used only to confirm the proxy is up and resolves the
// caller's plan (anon/free/pro). `cookie` replays the ta_uid device cookie.
async function probeProxy(accessToken, tag, cookie) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    if (cookie) headers['Cookie'] = cookie;
    const res = await fetch(`${SITE_URL}/proxy`, {
      method: 'POST',
      headers,
      // "reply with the single word OK / do not search" trips the pre-filter →
      // canned redirect, no model, no quota spent.
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 64,
        messages: [{ role: 'user', content: `Smoke test ${tag}: reply with the single word OK. Do not search the web.` }],
      }),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch { /* non-JSON */ }
    return { ok: res.ok, status: res.status, json, plan: res.headers.get('x-plan') };
  } finally {
    clearTimeout(timer);
  }
}

let userId = null;
const anonSubjectId = `smoke-anon-${crypto.randomUUID()}`;

async function main() {
  // ── 1. SETUP: disposable user + password-grant session ─────────────────────
  const email = `smoke+${Date.now()}@cuttingtoolsai.eu`;
  const password = crypto.randomUUID() + 'Aa1!';

  const created = await rest('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (!created.ok || !created.json?.id) {
    record('1-setup', false, `admin create user failed (HTTP ${created.status})`);
    return;
  }
  userId = created.json.id;

  const tokenRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  const accessToken = tokenJson.access_token;
  if (!tokenRes.ok || !accessToken) {
    record('1-setup', false, `password grant sign-in failed (HTTP ${tokenRes.status})`);
    return;
  }
  record('1-setup', true, `test user created and signed in (id ${userId})`);

  // ── 2. QUOTA MATH via RPC ($0, no Anthropic) ───────────────────────────────
  // Anonymous subject, limit 1: first allowed, second blocked, refund restores.
  const a1 = await rpc('check_and_increment_daily', { p_type: 'anon', p_id: anonSubjectId, p_day: today, p_limit: 1 });
  const a2 = await rpc('check_and_increment_daily', { p_type: 'anon', p_id: anonSubjectId, p_day: today, p_limit: 1 });
  const anonCapOk = allowedOf(a1) === true && allowedOf(a2) === false;
  record('2-anon-quota', anonCapOk,
    anonCapOk ? 'anon limit 1: 1st allowed, 2nd blocked'
              : `1st allowed=${allowedOf(a1)}, 2nd allowed=${allowedOf(a2)} (expected true,false)`);

  // Refund the cap (this is the new "refuse/db_hit=false does not spend quota"
  // mechanism) → the same subject is allowed again.
  await rpc('refund_daily', { p_type: 'anon', p_id: anonSubjectId, p_day: today });
  const a3 = await rpc('check_and_increment_daily', { p_type: 'anon', p_id: anonSubjectId, p_day: today, p_limit: 1 });
  const refundOk = allowedOf(a3) === true;
  record('2-refund-restores', refundOk,
    refundOk ? 'after refund_daily the quota is available again (the free question survives a refuse)'
             : `post-refund allowed=${allowedOf(a3)} (expected true)`);

  // User subject, limit 3: three allowed, fourth blocked.
  let userAllowed = 0;
  for (let i = 0; i < 3; i++) {
    if (allowedOf(await rpc('check_and_increment_daily', { p_type: 'user', p_id: userId, p_day: today, p_limit: 3 })) === true) userAllowed++;
  }
  const u4 = await rpc('check_and_increment_daily', { p_type: 'user', p_id: userId, p_day: today, p_limit: 3 });
  const freeCapOk = userAllowed === 3 && allowedOf(u4) === false;
  record('3-free-quota', freeCapOk,
    freeCapOk ? 'free limit 3: 3 allowed, 4th blocked'
              : `allowed ${userAllowed}/3, 4th allowed=${allowedOf(u4)} (expected 3 and false)`);

  // ── 3. PROXY WIRING (cheap probes, plan resolution) ────────────────────────
  const anon = await probeProxy(null, 'anon');
  const anonOk = anon.ok && typeof anon.json.answer === 'string' && anon.json.answer.length > 0 && (anon.plan === 'anon' || anon.json.plan === 'anon');
  record('4-proxy-anon', anonOk,
    anonOk ? `proxy live, no auth → plan:"anon" (HTTP ${anon.status})`
           : `HTTP ${anon.status}, plan:"${anon.plan}", answer len ${(anon.json.answer || '').length}`);

  const free = await probeProxy(accessToken, 'free');
  const freeOk = free.ok && (free.plan === 'free' || free.json.plan === 'free');
  record('4-proxy-free', freeOk,
    freeOk ? `authed (no subscription) → plan:"free" (HTTP ${free.status})`
           : `HTTP ${free.status}, plan:"${free.plan}" (expected free)`);

  // Activate subscription → entitled → plan resolves to pro.
  const sub = await rest('/rest/v1/subscriptions', {
    method: 'POST', headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ user_id: userId, status: 'active' }),
  });
  if (!sub.ok) {
    record('5-pro', false, `subscriptions insert failed (HTTP ${sub.status})`);
    return;
  }
  const pro = await probeProxy(accessToken, 'pro');
  const proOk = pro.ok && (pro.plan === 'pro' || pro.json.plan === 'pro');
  record('5-pro', proOk,
    proOk ? `active subscription → plan:"pro" (HTTP ${pro.status})`
          : `HTTP ${pro.status}, plan:"${pro.plan}" (expected pro)`);
}

async function teardown() {
  const steps = [];
  // Anon RPC test rows (always, even if user setup failed).
  const delAnon = await rest(`/rest/v1/usage_daily?subject_type=eq.anon&subject_id=eq.${encodeURIComponent(anonSubjectId)}`, { method: 'DELETE' })
    .catch(() => ({ ok: false, status: 'ERR' }));
  steps.push(`anon usage_daily ${delAnon.ok ? 'deleted' : 'delete FAILED (HTTP ' + delAnon.status + ')'}`);

  if (userId) {
    const delSub = await rest(`/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' })
      .catch(() => ({ ok: false, status: 'ERR' }));
    steps.push(`subscriptions ${delSub.ok ? 'deleted' : 'delete FAILED (HTTP ' + delSub.status + ')'}`);

    const delUsage = await rest(`/rest/v1/usage_daily?subject_type=eq.user&subject_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' })
      .catch(() => ({ ok: false, status: 'ERR' }));
    steps.push(`user usage_daily ${delUsage.ok ? 'deleted' : 'delete FAILED (HTTP ' + delUsage.status + ')'}`);

    const delUser = await rest(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
      .catch(() => ({ ok: false, status: 'ERR' }));
    steps.push(`test user ${delUser.ok ? 'deleted' : 'delete FAILED (HTTP ' + delUser.status + ')'}`);
  }
  record('6-teardown', steps.every(s => !s.includes('FAILED')), steps.join(', '));
}

try {
  await main();
} catch (err) {
  record('unexpected-error', false, err.message || String(err));
} finally {
  await teardown();
}

const allPassed = results.length > 0 && results.every(r => r.pass);
console.log(allPassed ? '\nALL PASS' : '\nFAILURES PRESENT');
process.exit(allPassed ? 0 : 1);
