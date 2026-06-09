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

// ── System prompt (server-authoritative; never sent by the client) ────────────
const SYSTEM_PROMPT =
  "You are ToolAdvisor's metalworking AI assistant. Help machinists and engineers " +
  "choose cutting tools across all brands (Sandvik, Kennametal, Seco, Walter, " +
  "Mitsubishi, Iscar, Tungaloy, OSG, Mapal, etc). Use web search to find current " +
  "product information, grades, coatings, and specifications. Be brand-neutral and " +
  "recommend the best tool for the application regardless of manufacturer. Be " +
  "concise, technical, and direct. Cover speeds, feeds, ISO groups, grades, " +
  "coatings, geometry, and troubleshooting.\n\n" +
  "FIELD KNOWLEDGE — judgment layer:\n\n" +
  "- Point angle is never an isolated choice; it is the visible end of a geometry " +
  "package. Material dictates point angle, relief angle, helix, single vs double " +
  "facet relief, and the backward taper of the cutting section together. Never " +
  "recommend a point angle alone — couple it with relief and helix context, and " +
  "warn that regrinding only the point angle on a geometry designed as a package " +
  "degrades the design intent.\n\n" +
  "- The first warning at the machine is sound, not the chip. Diagnostic sequence " +
  "in the field: sound/tone changes first, feed behavior shifts second, chips " +
  "confirm last. When a user reports a problem found via chips or measurement, it " +
  "has been developing for a while — ask \"did the sound change?\" as the first " +
  "diagnostic question.";

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

  const today = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD UTC

  if (!isAdminIP && supabaseReady) {
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

  // ── Forward to Anthropic (25s timeout, one retry on 5xx/network) ────────────
  let body;
  try {
    body = await request.json();
  } catch {
    const hdrs = { ...CORS, 'Content-Type': 'application/json' };
    if (setCookie) hdrs['Set-Cookie'] = setCookie;
    return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: hdrs });
  }

  // Strip any client-supplied system prompt; server is the sole source of truth.
  const { system: _ignored, ...safeBody } = body;
  const enrichedBody = {
    ...safeBody,
    system: SYSTEM_PROMPT,
    tools: [{ type: 'web_search_20250305', name: 'web_search' }],
  };

  const refundQuota = async () => {
    if (subjectType && subjectId && supabaseReady) {
      await callRPC(env, 'refund_daily', {
        p_type: subjectType, p_id: subjectId, p_day: today,
      }).catch(() => {});
    }
  };

  const callAnthropic = async () => {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      return await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta':    'web-search-2025-03-05',
        },
        body: JSON.stringify(enrichedBody),
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const aiErrorResponse = (status, errorCode) => {
    const hdrs = { ...CORS, 'Content-Type': 'application/json' };
    if (setCookie) hdrs['Set-Cookie'] = setCookie;
    return new Response(
      JSON.stringify({ error: errorCode, retryable: true }),
      { status, headers: hdrs }
    );
  };

  let upstream;
  let data = {};

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt === 2) await new Promise(r => setTimeout(r, 800));

    try {
      upstream = await callAnthropic();
    } catch {
      if (attempt < 2) continue;
      await refundQuota();
      return aiErrorResponse(503, 'ai_unavailable');
    }

    if (upstream.ok) break;

    if (upstream.status >= 500) {
      if (attempt < 2) continue;
      await refundQuota();
      return aiErrorResponse(503, 'ai_unavailable');
    }

    // Anthropic 4xx — pass through without retry
    try { data = await upstream.json(); } catch { /* non-JSON */ }
    const hdrs4xx = { ...CORS, 'Content-Type': 'application/json' };
    if (setCookie) hdrs4xx['Set-Cookie'] = setCookie;
    return new Response(JSON.stringify(data), { status: upstream.status, headers: hdrs4xx });
  }

  try { data = await upstream.json(); } catch { /* non-JSON */ }

  // web_search responses contain multiple block types; collect all text blocks
  const textBlocks = (data.content || []).filter(b => b.type === 'text');
  const answer = textBlocks.map(b => b.text).join('\n\n').trim();

  if (!answer) {
    await refundQuota();
    return aiErrorResponse(502, 'ai_empty');
  }

  // ── Build success response ─────────────────────────────────────────────────
  const plan = isPro ? 'pro' : 'free';
  const responseHeaders = {
    ...CORS,
    'Content-Type': 'application/json',
    'X-Plan': plan,
  };

  if (!isPro && !isAdminIP && supabaseReady && quotaRemaining !== null) {
    responseHeaders['X-Quota-Limit']     = String(CONFIG.FREE_DAILY);
    responseHeaders['X-Quota-Remaining'] = String(quotaRemaining);
  }

  if (setCookie) responseHeaders['Set-Cookie'] = setCookie;

  return new Response(JSON.stringify({ ...data, answer }), {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export async function onRequest() {
  return new Response('Method Not Allowed', { status: 405 });
}
