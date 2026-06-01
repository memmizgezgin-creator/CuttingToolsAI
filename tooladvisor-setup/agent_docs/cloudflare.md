# Cloudflare Setup

## Pages
Project: `tooladvisor-v2`
Connected to: github.com/memmizgezgin-creator/ToolAdvisor (main branch)
Build command: none (static files)
Output directory: / (root)

## Worker
Name: `tooladvisor-ai-proxy`
Route: handles `/api/claude` requests from frontend
Env var: `ANTHROPIC_API_KEY` (set in Cloudflare dashboard, NOT in code)

## Domain
tooladvisor.eu
Registrar: TransIP
DNS: TransIP nameservers pointing to Cloudflare
Status: pending full cutover from Netlify

## Deploy Flow
1. Push to GitHub main branch
2. Cloudflare Pages auto-deploys (no manual step needed)
3. Worker deploys separately via `wrangler publish` or dashboard

## Wrangler Commands
```bash
# Deploy worker
wrangler publish

# Tail worker logs
wrangler tail tooladvisor-ai-proxy

# Set env var via CLI (alternative to dashboard)
wrangler secret put ANTHROPIC_API_KEY
```

## Do NOT
- Deploy to Netlify (credits exhausted, migration in progress)
- Put ANTHROPIC_API_KEY in any frontend file
- Use `netlify dev` for local testing — use `wrangler dev` instead
