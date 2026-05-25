export async function onRequest(context) {
  return new Response(JSON.stringify({
    status: 'Pages Function is working',
    method: context.request.method,
    url: context.request.url,
    hasApiKey: !!context.env.ANTHROPIC_API_KEY
  }, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
