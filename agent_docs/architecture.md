# Architecture

## Deploy Stack
- Frontend: Cloudflare Pages — project name: `cuttingtoolsai-v2`
- API proxy: Cloudflare Worker — name: `cuttingtoolsai-ai-proxy`
- AI: Anthropic API called from Worker (never from frontend directly)
- Env var: `ANTHROPIC_API_KEY` set in Cloudflare dashboard
- Domain: cuttingtoolsai.eu — DNS via TransIP nameservers pointing to Cloudflare
- OLD: Netlify — do NOT deploy here, pending deletion after domain cutover

## Frontend Structure
Single-file HTML/CSS/JS SPA. No build step, no bundler, no SSR.
Each page is a standalone HTML file.

## Files
- `index.html` — landing/redirect
- `ToolAdvisor.html` — main SPA, 7 tabs
- `tools-directory.html` — product listing
- `cross-reference.html` — insert cross-reference tool
- `compare.html` — side-by-side product compare
- `knowledge.html` — knowledge base
- `pro.html` — Pro upgrade page
- `profile.html` — user profile
- `page-switcher.js` — cross-page navigation, URL param handling
- `polish.css` — global style overrides

## CONFIG Object (in ToolAdvisor.html)
Feature flags — check these before assuming anything is active:
```js
CONFIG = {
  stripe: false,       // payment not live yet
  supabase: false,     // DB not connected yet
  claudeAPI: true,     // AI backend active via Worker
  demoMode: false
}
```

## AI Request Flow
Frontend → Cloudflare Worker (`/api/claude`) → Anthropic API
Worker adds auth header with ANTHROPIC_API_KEY.
Never add API key to frontend code.

## Freemium Quota
Currently: localStorage-based (unreliable, resets on clear)
Planned: Supabase for persistent quota tracking
Free tier: 5 queries
Pro: €29/mo, unlimited

## Known Limitations
- localStorage quota = easily bypassed, not production-ready
- Cross-reference DB: ~22 codes only (needs expansion)
- No auth system yet
