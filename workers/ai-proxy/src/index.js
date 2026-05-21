// ToolAdvisor AI Proxy — Cloudflare Worker
// Ports netlify/functions/claude.js to Workers runtime.
// Anthropic API key is stored as a Worker secret (never in source).

const MAX_BODY_BYTES = 8 * 1024;
const MAX_TEXT_LENGTH = 1400;

const allowedFields = new Set([
  'operation', 'materialGroup', 'insertCode', 'toolFamily',
  'coating', 'machine', 'constraints', 'question', 'savedTools'
]);

// Per-isolate rate limit. For multi-isolate accuracy, swap to KV or Durable Object later.
const requestCounts = new Map();

function trimText(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH);
}

function sanitizeBody(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('INVALID_BODY');
  if ('messages' in raw || 'model' in raw || 'system' in raw || 'max_tokens' in raw) throw new Error('RAW_ANTHROPIC_BODY');
  for (const key of Object.keys(raw)) if (!allowedFields.has(key)) throw new Error('UNSUPPORTED_FIELD');

  const operation = trimText(raw.operation || 'advisor');
  const materialGroup = trimText(raw.materialGroup).toUpperCase();
  const question = trimText(raw.question);

  if (!question && !raw.insertCode && !materialGroup) throw new Error('MISSING_CONTEXT');
  if (materialGroup && !['P', 'M', 'K', 'N', 'S', 'H'].includes(materialGroup)) throw new Error('INVALID_MATERIAL_GROUP');

  return {
    operation,
    materialGroup,
    insertCode: trimText(raw.insertCode).toUpperCase(),
    toolFamily: trimText(raw.toolFamily),
    coating: trimText(raw.coating),
    machine: trimText(raw.machine),
    constraints: trimText(raw.constraints),
    question,
    savedTools: Array.isArray(raw.savedTools)
      ? raw.savedTools.slice(0, 10).map(item => trimText(item).slice(0, 160))
      : []
  };
}

function buildAdvisorRequest(input, model) {
  const userContext = [
    `Operation: ${input.operation || 'advisor'}`,
    `ISO material group: ${input.materialGroup || 'not specified'}`,
    `Insert code: ${input.insertCode || 'not specified'}`,
    `Tool family: ${input.toolFamily || 'not specified'}`,
    `Coating: ${input.coating || 'not specified'}`,
    `Machine or setup: ${input.machine || 'not specified'}`,
    `Constraints: ${input.constraints || 'not specified'}`,
    `Saved tools: ${input.savedTools.length ? input.savedTools.join(', ') : 'none provided'}`,
    `Question: ${input.question || 'Provide the safest next recommendation from the supplied context.'}`
  ].join('\n');

  return {
    model,
    max_tokens: 800,
    temperature: 0.2,
    system: [
      'You are ToolAdvisor, a brand-neutral CNC cutting tool decision support assistant.',
      'Cover ISO P, M, K, N, S and H material groups.',
      'Give practical shortlist guidance, key checks and cautions.',
      'Do not claim a manufacturer guarantee. Tell users to verify final cutting data against current manufacturer catalogues, machine limits and shop trials.',
      'Do not request or expose secrets, machine credentials, customer data or export-controlled details.',
      'Return concise English output with sections: Recommendation, Why, Checks, Next step.'
    ].join(' '),
    messages: [{ role: 'user', content: userContext }]
  };
}

function corsHeaders(request, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = request.headers.get('origin') || '';
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0] || '*';
  return {
    allowed: !origin || allowed.includes(origin),
    headers: {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    }
  };
}

function jsonResponse(status, payload, headers) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

function clientIp(request) {
  return request.headers.get('cf-connecting-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || 'unknown';
}

function rateLimit(ip, max, windowMs) {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (entry.resetAt <= now) requestCounts.delete(key);
  }
  const entry = requestCounts.get(ip) || { count: 0, resetAt: now + windowMs };
  entry.count += 1;
  requestCounts.set(ip, entry);
  return entry.count <= max;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    // Health check
    if (url.pathname === '/health' || url.pathname === '/') {
      return jsonResponse(200, {
        service: 'tooladvisor-ai-proxy',
        status: 'ok',
        time: new Date().toISOString()
      }, cors.headers);
    }

    if (url.pathname !== '/api/advisor') {
      return jsonResponse(404, { error: 'Not found.' }, cors.headers);
    }

    if (request.method === 'OPTIONS') {
      return new Response('', { status: cors.allowed ? 204 : 403, headers: cors.headers });
    }
    if (request.method !== 'POST') {
      return jsonResponse(405, { error: 'Method not allowed.' }, cors.headers);
    }
    if (!cors.allowed) {
      return jsonResponse(403, { error: 'Origin not allowed.' }, cors.headers);
    }

    const text = await request.text();
    const bodySize = new TextEncoder().encode(text).length;
    if (bodySize === 0 || bodySize > MAX_BODY_BYTES) {
      return jsonResponse(413, { error: 'Request body is empty or too large.' }, cors.headers);
    }

    const max = parseInt(env.RATE_LIMIT_MAX || '20', 10);
    const windowMs = parseInt(env.RATE_LIMIT_WINDOW_MS || '60000', 10);
    if (!rateLimit(clientIp(request), max, windowMs)) {
      return jsonResponse(429, { error: 'Too many requests. Please try again shortly.' }, cors.headers);
    }

    let advisorRequest;
    try {
      advisorRequest = buildAdvisorRequest(sanitizeBody(JSON.parse(text)), env.ANTHROPIC_MODEL);
    } catch (_) {
      return jsonResponse(400, { error: 'Invalid ToolAdvisor Advisor request.' }, cors.headers);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse(503, { error: 'AI Advisor is not active yet.' }, cors.headers);
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(advisorRequest)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.log('Anthropic error', response.status, errText.slice(0, 200));
        return jsonResponse(502, { error: 'AI Advisor request failed.' }, cors.headers);
      }

      const data = await response.json();
      const answer = Array.isArray(data.content)
        ? data.content.map(part => part && part.type === 'text' ? part.text : '').join('\n').trim()
        : '';

      return jsonResponse(200, {
        answer,
        model: data.model || env.ANTHROPIC_MODEL,
        usage: data.usage || null
      }, cors.headers);
    } catch (err) {
      console.log('Worker error', err.message);
      return jsonResponse(502, { error: 'AI Advisor is temporarily unavailable.' }, cors.headers);
    }
  }
};
