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

## Quick Reference
- Local path: ~/Desktop/ToolAdvisor/
- Main SPA: ToolAdvisor.html (7 tabs: AI Advisor, Cross-Reference, ISO Decoder, Calculator, Suppliers, Visual ID PRO, AI Chat PRO)
- Feature flags: CONFIG object in ToolAdvisor.html
- Freemium: 5 queries free / Pro €29/mo

## Agent Docs (read when relevant — do not load all upfront)
- Deploy & infra questions → agent_docs/cloudflare.md
- Database schema, product structure → agent_docs/product-db.md
- Architecture, file map, request flow → agent_docs/architecture.md

## Slash Commands
- /feature [description] — implement new feature
- /fix [description] — fix a bug
- /post [topic] — write LinkedIn post

## Model Selection
- Haiku: file edits, git, log analysis, simple scripts
- Sonnet: new features, architecture, debugging
