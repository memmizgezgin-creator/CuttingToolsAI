# ToolAdvisor — Claude Code Context

## Project
AI-powered cutting tool intelligence platform. Brand-neutral recommendation engine.
Stack: single-file HTML/CSS/JS SPA. Deployed on Cloudflare Pages (tooladvisor.eu).
Repo: github.com/memmizgezgin-creator/ToolAdvisor

## UNBREAKABLE RULE
ToolAdvisor is always a recommendation engine. Never drift toward product catalog, SKU database, variant management, or scraping logic. If a feature pushes that way — stop and flag it.

## Anti-Hallucination Protocol
- NEVER speculate about file contents. Open and read the file first, then answer.
- NEVER assume a function, variable, or import exists. Grep or read to confirm.
- If you are not certain, say "I don't know — let me check" and then check.
- Do not invent API endpoints, Cloudflare Worker routes, or environment variable names.
- Before editing any file: read the current state. Stale assumptions break things.

## Architecture (current, verified)
- Frontend: Cloudflare Pages (tooladvisor-v2 project)
- API proxy: Cloudflare Worker (tooladvisor-ai-proxy)
- AI backend: Anthropic API via Worker, ANTHROPIC_API_KEY set as env var in Cloudflare
- Domain: tooladvisor.eu via TransIP nameservers → Cloudflare
- Old deployment: Netlify (pending deletion after domain cutover — do NOT redeploy there)

## Key Files
- index.html — landing page
- ToolAdvisor.html — main SPA (7 tabs: AI Advisor, Cross-Reference, ISO Decoder, Calculator, Suppliers, Visual ID PRO, AI Chat PRO)
- tools-directory.html, cross-reference.html, compare.html, knowledge.html, pro.html, profile.html
- page-switcher.js, polish.css
- CONFIG object in main HTML — toggles for Stripe, Supabase, Claude API

## Design Rules
- Theme: Apple-clean white, 18-20px body text
- ISO group colors: P(blue) M(yellow) K(red) N(green) S(orange) H(gray)
- SVG icons for operations
- Freemium: 5 queries free / Pro €29/mo
- NO dark backgrounds, NO gradients, NO glassmorphism

## Execution Rules
- Complete working code only. No partial snippets.
- Prefer Haiku for: file edits, git, log analysis, simple scripts
- Prefer Sonnet for: new features, architecture decisions, bug debugging
- Never commit secrets or API keys
- Static export only — no SSR

## What to check before any implementation
1. Read the relevant file(s) in full
2. Confirm imports and dependencies actually exist
3. Check CONFIG flags before assuming a feature is active
4. Verify Cloudflare Worker routes match what the frontend calls

## Agent docs (read when relevant)
- For database schema decisions: check existing PRODUCT_DB structure in ToolAdvisor.html
- For AI integration: Anthropic API via Worker, not direct from frontend
- For quota/freemium logic: localStorage-based (known limitation, flagged for Supabase migration)
