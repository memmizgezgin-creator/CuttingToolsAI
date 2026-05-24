// ToolAdvisor — Cloudflare Pages Function: Claude API Proxy
// Route: /api/chat  (Cloudflare Pages auto-maps functions/api-chat.js)
// Set ANTHROPIC_API_KEY in Cloudflare Pages environment variables.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'no key' }, { headers: CORS });
  }
  // TEMP DEBUG — remove after confirming key arrives
  return Response.json({ debug: apiKey.substring(0, 10) }, { headers: CORS });

  try {
    const body = await request.json();

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();

    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
}
