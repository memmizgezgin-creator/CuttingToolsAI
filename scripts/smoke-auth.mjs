// CuttingToolsAI — auth/entitlement chain smoke test
// Node 20+, no npm dependencies, plain fetch.
//
// Required env:
//   SUPABASE_URL               Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY  service role key (admin API + PostgREST)
//   SUPABASE_ANON_KEY          anon/publishable key (password grant sign-in)
// Optional env:
//   SITE_URL                   deployed site (default https://cuttingtoolsai.eu)
//
// Flow: create disposable test user → anon /proxy call → authed free calls
// (usage_daily keyed on user id, increments) → activate subscription → pro
// call (no increment, plan:"pro" in body) → teardown (always, even on fail).
// Touches ONLY rows belonging to the disposable test user. Never logs keys
// or tokens.

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
  return {
    'Content-Type':  'application/json',
    'apikey':        SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    ...extra,
  };
}

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: serviceHeaders(init.headers),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }
  return { ok: res.ok, status: res.status, json, text };
}

const today = new Date().toISOString().slice(0, 10);

// Read the test user's usage_daily count for today (null = no row).
async function userQuotaCount(userId) {
  const r = await rest(
    `/rest/v1/usage_daily?subject_type=eq.user&subject_id=eq.${encodeURIComponent(userId)}` +
    `&day=eq.${today}&select=count`
  );
  if (!r.ok) throw new Error(`usage_daily read failed: ${r.status}`);
  return r.json && r.json.length ? r.json[0].count : null;
}

// Minimal payload matching what functions/proxy.js expects from the widget:
// it reads body.messages (last user turn = query) and strips body.system.
function advisorPayload(tag) {
  return JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 256,
    messages: [{ role: 'user', content: `Smoke test ${tag}: reply with the single word OK. Do not search the web.` }],
  });
}

// Advisor calls run web_search and routinely take 20-50s; allow 90s.
async function callProxy(accessToken, tag) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    const res = await fetch(`${SITE_URL}/proxy`, {
      method: 'POST',
      headers,
      body: advisorPayload(tag),
      signal: ctrl.signal,
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch { /* non-JSON */ }
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

let userId = null;
let allPassed = true;

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
    headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const tokenJson = await tokenRes.json().catch(() => ({}));
  const accessToken = tokenJson.access_token;
  if (!tokenRes.ok || !accessToken) {
    record('1-setup', false, `password grant sign-in failed (HTTP ${tokenRes.status})`);
    return;
  }
  record('1-setup', true, `test user created and signed in (id ${userId})`);

  // ── 2. Anon path ────────────────────────────────────────────────────────────
  const anon = await callProxy(null, 'anon');
  // 429 means this IP/cookie already hit today's free cap — not an auth bug,
  // but the smoke test can't proceed meaningfully on the anon leg.
  const anonOk = anon.ok && typeof anon.json.answer === 'string' && anon.json.answer.length > 0;
  record('2-anon', anonOk,
    anonOk ? `proxy answered without auth header (HTTP ${anon.status})`
           : `expected success, got HTTP ${anon.status} ${JSON.stringify(anon.json.error || '')}`);
  if (anonOk && anon.json.plan !== undefined) {
    record('2-anon-no-plan', false, `anonymous response unexpectedly contains plan:"${anon.json.plan}"`);
  }
  const anonState = await userQuotaCount(userId);
  if (anonState !== null) {
    record('2-anon-isolation', false, `usage_daily already has a user row for test user before any authed call`);
  }

  // ── 3. Free-user path ───────────────────────────────────────────────────────
  const free1 = await callProxy(accessToken, 'free-1');
  const free1Ok = free1.ok && typeof free1.json.answer === 'string';
  const countAfter1 = await userQuotaCount(userId);
  const row1Ok = free1Ok && countAfter1 !== null && countAfter1 >= 1;
  record('3-free-row', row1Ok,
    row1Ok ? `authed call succeeded, usage_daily user row exists (count=${countAfter1}, plan:"${free1.json.plan}")`
           : `HTTP ${free1.status}, usage_daily user count=${countAfter1}`);
  if (free1Ok && free1.json.plan !== 'free') {
    record('3-free-plan', false, `expected plan:"free" in body, got "${free1.json.plan}"`);
  }

  const free2 = await callProxy(accessToken, 'free-2');
  const countAfter2 = await userQuotaCount(userId);
  const incOk = free2.ok && countAfter1 !== null && countAfter2 === countAfter1 + 1;
  record('3-free-increment', incOk,
    incOk ? `second authed call incremented count ${countAfter1} → ${countAfter2}`
          : `HTTP ${free2.status}, count ${countAfter1} → ${countAfter2} (expected +1)`);

  // ── 4. Pro path ─────────────────────────────────────────────────────────────
  const sub = await rest('/rest/v1/subscriptions', {
    method: 'POST',
    headers: { 'Prefer': 'return=minimal' },
    body: JSON.stringify({ user_id: userId, status: 'active' }),
  });
  if (!sub.ok) {
    record('4-pro', false, `subscriptions insert failed (HTTP ${sub.status})`);
    return;
  }

  const countBeforePro = await userQuotaCount(userId);
  const pro = await callProxy(accessToken, 'pro');
  const countAfterPro = await userQuotaCount(userId);
  const proOk =
    pro.ok &&
    pro.json.plan === 'pro' &&
    countAfterPro === countBeforePro;
  record('4-pro', proOk,
    proOk ? `entitled call returned plan:"pro", quota not incremented (count stays ${countAfterPro})`
          : `HTTP ${pro.status}, plan:"${pro.json.plan}", count ${countBeforePro} → ${countAfterPro} (expected unchanged)`);
}

async function teardown() {
  if (!userId) return;
  const steps = [];

  const delSub = await rest(`/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' })
    .catch(() => ({ ok: false, status: 'ERR' }));
  steps.push(`subscriptions ${delSub.ok ? 'deleted' : 'delete FAILED (HTTP ' + delSub.status + ')'}`);

  const delUsage = await rest(
    `/rest/v1/usage_daily?subject_type=eq.user&subject_id=eq.${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  ).catch(() => ({ ok: false, status: 'ERR' }));
  steps.push(`usage_daily ${delUsage.ok ? 'deleted' : 'delete FAILED (HTTP ' + delUsage.status + ')'}`);

  const delUser = await rest(`/auth/v1/admin/users/${userId}`, { method: 'DELETE' })
    .catch(() => ({ ok: false, status: 'ERR' }));
  steps.push(`test user ${delUser.ok ? 'deleted' : 'delete FAILED (HTTP ' + delUser.status + ')'}`);

  const allOk = delSub.ok && delUsage.ok && delUser.ok;
  record('5-teardown', allOk, steps.join(', '));
}

try {
  await main();
} catch (err) {
  record('unexpected-error', false, err.message || String(err));
} finally {
  await teardown();
}

allPassed = results.length > 0 && results.every(r => r.pass);
console.log(allPassed ? '\nALL PASS' : '\nFAILURES PRESENT');
process.exit(allPassed ? 0 : 1);
