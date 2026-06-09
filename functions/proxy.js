// ToolAdvisor — Cloudflare Pages Function: Claude API Proxy
// Route: /proxy
//
// Required env (set via Cloudflare Pages dashboard → Settings → Environment Variables → Encrypted):
//   ANTHROPIC_API_KEY          (already exists)
//   SUPABASE_URL               wrangler pages secret put SUPABASE_URL --project-name cuttingtoolsai-v2
//   SUPABASE_SERVICE_ROLE_KEY  wrangler pages secret put SUPABASE_SERVICE_ROLE_KEY --project-name cuttingtoolsai-v2
//   SUPABASE_JWT_SECRET        wrangler pages secret put SUPABASE_JWT_SECRET --project-name cuttingtoolsai-v2
//
// Optional env:
//   ADMIN_IP      comma-separated IPs that bypass quota (e.g. your home IP)
//   SITE_ORIGIN   primary allowed CORS origin (default: https://cuttingtoolsai.eu)

// ── Central limits — change only here ────────────────────────────────────────
const CONFIG = {
  FREE_DAILY:            5,
  IP_DAILY:             20,   // per-IP abuse backstop across all anon users
  PRO_MONTHLY_ADVISOR: 1200,
  PRO_MONTHLY_VISUAL:   150,
};

// ── CORS helpers ─────────────────────────────────────────────────────────────
function getAllowedOrigin(request, env) {
  const primary = (env.SITE_ORIGIN || 'https://cuttingtoolsai.eu').trim();
  const reqOrigin = (request.headers.get('Origin') || '').trim();
  if (
    reqOrigin === primary ||
    reqOrigin.endsWith('.pages.dev') ||
    reqOrigin.startsWith('http://localhost') ||
    reqOrigin.startsWith('http://127.0.0.1')
  ) {
    return reqOrigin;
  }
  return primary;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin':      origin,
    'Access-Control-Allow-Headers':     'Content-Type, Authorization',
    'Access-Control-Allow-Methods':     'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary':                             'Origin',
  };
}

// ── Crypto helpers (Web Crypto — no external library needed) ─────────────────
function base64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (padded.length % 4)) % 4;
  const b64 = padded + '='.repeat(pad);
  const binary = atob(b64);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed jwt');
  const [headerB64, payloadB64, sigB64] = parts;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const valid = await crypto.subtle.verify(
    'HMAC', key,
    base64urlDecode(sigB64),
    new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  );
  if (!valid) throw new Error('invalid signature');

  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('expired');
  return payload;
}

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Cookie helper ─────────────────────────────────────────────────────────────
function parseCookie(cookieStr, name) {
  for (const part of (cookieStr || '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=') || null;
  }
  return null;
}

// ── Supabase REST helpers (service_role only) ─────────────────────────────────
async function supabaseFetch(env, path, init = {}) {
  const url = `${env.SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'apikey':        env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res.json();
}

function callRPC(env, fn, params) {
  return supabaseFetch(env, `/rest/v1/rpc/${fn}`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

function getProfile(env, userId) {
  return supabaseFetch(env,
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=plan,current_period_end&limit=1`,
    { method: 'GET' }
  );
}

// ── 429 helper ────────────────────────────────────────────────────────────────
function quotaExceeded(cors, setCookie, plan, message) {
  const headers = {
    ...cors,
    'Content-Type': 'application/json',
    'X-Plan': plan,
  };
  if (plan === 'free') {
    headers['X-Quota-Remaining'] = '0';
    headers['X-Quota-Limit']     = String(CONFIG.FREE_DAILY);
  }
  if (setCookie) headers['Set-Cookie'] = setCookie;
  return new Response(
    JSON.stringify({ error: 'quota_exceeded', plan, remaining: 0, message }),
    { status: 429, headers }
  );
}

// ── Exported handlers ─────────────────────────────────────────────────────────
export async function onRequestOptions(context) {
  const origin = getAllowedOrigin(context.request, context.env);
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = getAllowedOrigin(request, env);
  const CORS   = corsHeaders(origin);

  if (!env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'API key not configured. Add ANTHROPIC_API_KEY in Cloudflare Pages environment variables.' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseReady = !!(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

  // ── Admin bypass ────────────────────────────────────────────────────────────
  const ip        = request.headers.get('CF-Connecting-IP') || 'unknown';
  const adminIPs  = (env.ADMIN_IP || '').split(',').map(s => s.trim()).filter(Boolean);
  const isAdminIP = adminIPs.includes(ip);

  // ── Identity resolution ─────────────────────────────────────────────────────
  let userId     = null;
  let isPro      = false;
  let setCookie  = null;
  let anonId     = null;

  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ') && env.SUPABASE_JWT_SECRET && supabaseReady) {
    try {
      const payload = await verifyJWT(authHeader.slice(7), env.SUPABASE_JWT_SECRET);
      userId = payload.sub;
      const profiles = await getProfile(env, userId);
      if (profiles && profiles.length > 0) {
        const { plan, current_period_end } = profiles[0];
        if (plan === 'pro' && current_period_end && new Date(current_period_end) > new Date()) {
          isPro = true;
        }
      }
    } catch {
      // Invalid/expired JWT → fall through to anon
      userId = null;
    }
  }

  if (!userId) {
    const cookieStr = request.headers.get('Cookie') || '';
    anonId = parseCookie(cookieStr, 'ta_uid');
    if (!anonId) {
      anonId    = crypto.randomUUID();
      setCookie = `ta_uid=${anonId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`;
    }
  }

  // ── Quota gate ──────────────────────────────────────────────────────────────
  let subjectType = null;
  let subjectId   = null;
  let quotaRemaining = null;   // null = unknown (skip header); set for free users

  if (!isAdminIP && supabaseReady) {
    const today        = new Date().toISOString().slice(0, 10);     // YYYY-MM-DD UTC
    const firstOfMonth = today.slice(0, 7) + '-01';

    if (isPro) {
      // Pro: invisible monthly soft cap (never surfaced to client)
      let monthResult;
      try {
        monthResult = await callRPC(env, 'increment_monthly', {
          p_id:          userId,
          p_month:       firstOfMonth,
          p_kind:        'advisor',
          p_advisor_cap: CONFIG.PRO_MONTHLY_ADVISOR,
          p_visual_cap:  CONFIG.PRO_MONTHLY_VISUAL,
        });
      } catch {
        // Supabase unreachable → degrade gracefully, allow through
        monthResult = [{ allowed: true }];
      }
      if (monthResult && monthResult[0] && !monthResult[0].allowed) {
        return quotaExceeded(CORS, setCookie, 'pro',
          'Monthly advisor limit reached. Contact support if you need more.');
      }

    } else {
      // Free: daily per-subject quota + IP abuse backstop
      subjectType = userId ? 'user' : 'anon';
      subjectId   = userId || anonId;

      let subjectResult;
      try {
        subjectResult = await callRPC(env, 'check_and_increment_daily', {
          p_type:  subjectType,
          p_id:    subjectId,
          p_day:   today,
          p_limit: CONFIG.FREE_DAILY,
        });
      } catch {
        subjectResult = null; // Supabase down → degrade gracefully
      }

      if (subjectResult && subjectResult[0] && !subjectResult[0].allowed) {
        return quotaExceeded(CORS, setCookie, 'free',
          'Daily free limit reached. Upgrade to Pro for unlimited access.');
      }

      // Capture remaining for response headers
      if (subjectResult && subjectResult[0]) {
        quotaRemaining = subjectResult[0].remaining;
      }

      // IP abuse backstop (best-effort, do not block on Supabase error)
      try {
        const ipHash   = await sha256hex(`ip:${ip}`);
        const ipResult = await callRPC(env, 'check_and_increment_daily', {
          p_type:  'ip',
          p_id:    ipHash,
          p_day:   today,
          p_limit: CONFIG.IP_DAILY,
        });
        if (ipResult && ipResult[0] && !ipResult[0].allowed) {
          // Refund the subject increment before blocking
          await callRPC(env, 'refund_daily', {
            p_type: subjectType, p_id: subjectId, p_day: today,
          }).catch(() => {});
          return quotaExceeded(CORS, setCookie, 'free',
            'Too many requests from this network. Try again tomorrow.');
        }
      } catch {
        // IP check failed — do not block the user
      }
    }
  }

  // ── Forward to Anthropic ───────────────────────────────────────────────────
  let upstream;
  let anthropicOk = false;

  try {
    const body = await request.json();
    const enrichedBody = {
      ...body,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    };

    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':  'web-search-2025-03-05',
      },
      body: JSON.stringify(enrichedBody),
    });

    anthropicOk = upstream.ok;
  } catch (err) {
    // Network failure calling Anthropic → refund quota
    if (subjectType && subjectId && supabaseReady) {
      const today = new Date().toISOString().slice(0, 10);
      await callRPC(env, 'refund_daily', {
        p_type: subjectType, p_id: subjectId, p_day: today,
      }).catch(() => {});
    }
    const hdrs = { ...CORS, 'Content-Type': 'application/json' };
    if (setCookie) hdrs['Set-Cookie'] = setCookie;
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: hdrs });
  }

  // Refund on Anthropic 5xx (our error, not the user's fault)
  if (!anthropicOk && upstream.status >= 500 && subjectType && subjectId && supabaseReady) {
    const today = new Date().toISOString().slice(0, 10);
    await callRPC(env, 'refund_daily', {
      p_type: subjectType, p_id: subjectId, p_day: today,
    }).catch(() => {});
  }

  let data = {};
  try { data = await upstream.json(); } catch { /* non-JSON body */ }

  // ── Build response ─────────────────────────────────────────────────────────
  const plan = isPro ? 'pro' : 'free';
  const responseHeaders = {
    ...CORS,
    'Content-Type': 'application/json',
    'X-Plan': plan,
  };

  // Only emit quota headers when Supabase is live; when it's not configured
  // the counter is inactive and we must not send stale/stuck values.
  if (!isPro && !isAdminIP && supabaseReady && quotaRemaining !== null) {
    responseHeaders['X-Quota-Limit']     = String(CONFIG.FREE_DAILY);
    responseHeaders['X-Quota-Remaining'] = String(quotaRemaining);
  }

  if (setCookie) responseHeaders['Set-Cookie'] = setCookie;

  return new Response(JSON.stringify(data), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function onRequest() {
  return new Response('Method Not Allowed', { status: 405 });
}
