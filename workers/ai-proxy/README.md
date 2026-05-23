# tooladvisor-ai-proxy

Cloudflare Worker that proxies AI Advisor requests from `tooladvisor.eu` to Anthropic's API.

Live URL: https://tooladvisor-ai-proxy.memmizgezgin.workers.dev

## Why
GitHub Pages serves only static content; Anthropic API key cannot live in client code. This Worker:
- Validates input (whitelist fields, size limit, ISO group check)
- Rate-limits per IP (20 req/min default)
- Adds CORS for tooladvisor.eu
- Calls Anthropic with the secret key (Worker secret, never in source)

## Endpoints
- `GET /health` -> `{ service, status, time }`
- `POST /api/advisor` -> AI Advisor response

## Deploy
```bash
cd workers/ai-proxy
wrangler secret put ANTHROPIC_API_KEY   # paste key when prompted
wrangler deploy
```

## Local dev
```bash
wrangler dev
```

## Custom domain (later, requires DNS change)
TransIP CNAME: `api.tooladvisor.eu` -> `tooladvisor-ai-proxy.memmizgezgin.workers.dev`
Then in Cloudflare Dashboard -> Workers -> tooladvisor-ai-proxy -> Settings -> Domains add the custom domain.
