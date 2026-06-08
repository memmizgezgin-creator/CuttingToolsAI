// ToolAdvisor — Cloudflare Pages Function: Claude API Proxy
// Route: /proxy
// Env vars required : ANTHROPIC_API_KEY
// Env vars optional : ADMIN_IP (comma-separated IPs that bypass quota)
// KV binding        : TA_QUOTA  (create namespace + bind in Pages → Settings → Functions)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FREE_DAILY = 5;

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured. Add ANTHROPIC_API_KEY in Cloudflare Pages environment variables.' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }

  // ── Server-side quota via Cloudflare KV ────────────────────────────────────
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const today = new Date().toISOString().slice(0, 10);          // YYYY-MM-DD UTC
  const quotaKey = `quota:${ip}:${today}`;
  const adminIPs = (env.ADMIN_IP || '').split(',').map(s => s.trim()).filter(Boolean);
  const isAdmin  = adminIPs.includes(ip);

  let quotaUsed   = 0;
  let quotaActive = !isAdmin && !!env.TA_QUOTA;

  if (quotaActive) {
    try {
      const usedStr = await env.TA_QUOTA.get(quotaKey);
      quotaUsed = parseInt(usedStr || '0', 10);

      if (quotaUsed >= FREE_DAILY) {
        return new Response(
          JSON.stringify({ error: 'Daily free limit reached. Upgrade to Pro for unlimited access.' }),
          {
            status: 429,
            headers: {
              ...CORS,
              'Content-Type': 'application/json',
              'X-TA-Quota-Remaining': '0',
              'X-TA-Quota-Used': String(quotaUsed),
            },
          }
        );
      }

      // Increment before forwarding — prevents concurrent-request abuse
      quotaUsed += 1;
      await env.TA_QUOTA.put(quotaKey, String(quotaUsed), { expirationTtl: 172800 }); // 48 h auto-expire
    } catch (kvErr) {
      // KV unavailable → degrade gracefully, never block the request
      quotaActive = false;
    }
  }

  // ── Forward to Anthropic ──────────────────────────────────────────────────
  try {
    const body = await request.json();
    const enrichedBody = {
      ...body,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
    };

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify(enrichedBody),
    });

    const data = await upstream.json();
    const remaining = isAdmin ? 999 : Math.max(0, FREE_DAILY - quotaUsed);

    const quotaHeaders = (quotaActive || isAdmin)
      ? { 'X-TA-Quota-Remaining': String(remaining), 'X-TA-Quota-Used': String(quotaUsed) }
      : {};

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { ...CORS, 'Content-Type': 'application/json', ...quotaHeaders },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
}

export async function onRequest() {
  return new Response('Method Not Allowed', { status: 405, headers: CORS });
}
