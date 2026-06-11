// CuttingToolsAI — plan-field verification for functions/proxy.js
// Node 20+, no dependencies, no network: imports the Pages function directly
// and mocks the Anthropic upstream. Verifies the plan field rides on every
// response body / X-Plan header with the expected value:
//   - no auth, no admin key (anonymous)  → plan "anon"
//   - X-Admin-Key matching ADMIN_TEST_KEY → plan "pro" (admin renders as pro)
//   - wrong X-Admin-Key                   → plan "anon"
//
// Usage: node scripts/verify-plan-field.mjs

import { onRequestPost } from '../functions/proxy.js';

// Mock upstream: any call to api.anthropic.com returns a minimal valid answer.
// SUPABASE_URL is left unset so the quota gate degrades gracefully (the
// supabaseReady=false path) — quota enforcement is not under test here.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes('api.anthropic.com')) {
    return new Response(JSON.stringify({
      content: [{ type: 'text', text: 'OK (mocked upstream)' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(url, init);
};

const env = {
  ANTHROPIC_API_KEY: 'test-key',
  ADMIN_TEST_KEY:    'test-admin-key',
};

function makeContext(extraHeaders = {}) {
  const request = new Request('https://cuttingtoolsai.eu/proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin':       'https://cuttingtoolsai.eu',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 64,
      messages: [{ role: 'user', content: 'plan field verification' }],
    }),
  });
  return { request, env, waitUntil: () => {} };
}

let allPass = true;
function check(name, pass, detail) {
  if (!pass) allPass = false;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`);
}

async function runCase(name, headers, expectedPlan) {
  const res  = await onRequestPost(makeContext(headers));
  const body = await res.json();
  check(`${name} (body)`, res.status === 200 && body.plan === expectedPlan,
    `HTTP ${res.status}, body plan="${body.plan}" (expected "${expectedPlan}")`);
  check(`${name} (X-Plan header)`, res.headers.get('X-Plan') === expectedPlan,
    `X-Plan="${res.headers.get('X-Plan')}" (expected "${expectedPlan}")`);
}

await runCase('anon-no-admin-key', {}, 'anon');
await runCase('admin-key',         { 'X-Admin-Key': 'test-admin-key' }, 'pro');
await runCase('wrong-admin-key',   { 'X-Admin-Key': 'nope' }, 'anon');

console.log(allPass ? '\nALL PASS' : '\nFAILURES PRESENT');
process.exit(allPass ? 0 : 1);
