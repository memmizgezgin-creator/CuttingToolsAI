// ToolAdvisor — Cloudflare Pages Function: waitlist capture
// Route: /waitlist
//
// Accepts POST { email, source }
// Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (same env as proxy.js — never client-visible)

function getAllowedOrigin(request, env) {
  const primary   = (env.SITE_ORIGIN || 'https://cuttingtoolsai.eu').trim();
  const reqOrigin = (request.headers.get('Origin') || '').trim();
  if (
    reqOrigin === primary ||
    reqOrigin.endsWith('.pages.dev') ||
    reqOrigin.startsWith('http://localhost') ||
    reqOrigin.startsWith('http://127.0.0.1')
  ) return reqOrigin;
  return primary;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':  origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function onRequestOptions(context) {
  const origin = getAllowedOrigin(context.request, context.env);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = getAllowedOrigin(request, env);
  const CORS   = corsHeaders(origin);
  const hdrs   = (extra = {}) => ({ ...CORS, 'Content-Type': 'application/json', ...extra });

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: hdrs() });
  }

  const email  = (body.email  || '').trim().toLowerCase();
  const source = String(body.source || 'pro_cta').slice(0, 64);

  if (!EMAIL_RE.test(email)) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 422, headers: hdrs() });
  }

  // Supabase not configured (local dev without secrets) — silently succeed so frontend works
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: hdrs() });
  }

  let res;
  try {
    res = await fetch(`${env.SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Prefer':        'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({ email, source }),
    });
  } catch {
    return new Response(JSON.stringify({ error: 'server_error' }), { status: 502, headers: hdrs() });
  }

  // 201 = new row inserted; 200/204 = duplicate silently ignored — both are success
  if (res.ok || res.status === 409) {
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: hdrs() });
  }

  return new Response(JSON.stringify({ error: 'server_error' }), { status: 502, headers: hdrs() });
}

export async function onRequest() {
  return new Response('Method Not Allowed', { status: 405 });
}
