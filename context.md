# ToolAdvisor - Product Context

## What It Is

ToolAdvisor (tooladvisor.eu) is a brand-neutral AI-powered cutting tool intelligence platform.
It is NOT a product catalog or SKU database. It is a recommendation engine that helps CNC machinists
and manufacturing engineers find the right cutting tool for their specific application — without
needing to know brand names or part numbers upfront.

Core positioning: "The Çimri/Idealo of cutting tools" — AI-driven, application-first.

## Who It's For

- CNC machinists and programmers (job shops, tier suppliers)
- Manufacturing engineers and process planners
- Tooling specialists at OEMs
- Technical sales in cutting tool distribution

Primarily European market (Netherlands base), English UI.

## Inviolable Product Rule

ToolAdvisor must always remain an AI-powered recommendation engine.
Any move toward product catalog, SKU database, variant management, or scraping is wrong.
The value is in the intelligence layer, not the data layer.

## Business Model

Freemium:
- Free: 5 AI queries/day, Cross-Reference, ISO Decoder, Calculator
- Pro (€29/mo): Visual ID, AI Chat (unlimited), all tools unlimited

Monetization stack: Stripe (Pro subscriptions), Gumroad (PDF lead magnets)

## Current Tech Stack

- Frontend: Multi-page static site (HTML/CSS/JS)
- Hosting: Cloudflare Pages (project: tooladvisor-v2)
- AI backend: Cloudflare Worker (tooladvisor-ai-proxy) → Anthropic API (claude-haiku / claude-sonnet)
- Auth/DB: Supabase (planned, quota currently localStorage)
- Domain: tooladvisor.eu (TransIP → Cloudflare cutover pending)
- Repo: github.com/memmizgezgin-creator/ToolAdvisor

## Pages / Features

| Page | Status | Notes |
|------|--------|-------|
| AI Advisor (index / ToolAdvisor.html) | Live | 3-step guided + free text |
| Cross-Reference | Live | Empty state fix pending |
| ISO Decoder | Live | |
| Calculator | Live | Includes kc1/eta |
| Tools Directory | Live | Sidebar filters functional (AND logic) |
| Knowledge | Live | Filter tab bug pending fix |
| Visual ID PRO | Planned | Pro feature |
| AI Chat PRO | Planned | Pro feature |

## Active Development (as of June 2026)

### In Progress
- AI graceful fallback — quota/error states need proper UI messaging
- Cross-reference empty state — when no match found, show submission form
- Freemium quota — migrate from localStorage to Supabase

### Waiting On
- Domain cutover (tooladvisor.eu → Cloudflare, currently on TransIP)
- Netlify deletion (migrated away, credit limit exceeded)

### Recently Completed
- Cookie banner z-index fix
- PDF technical analysis report MVP
- ta-guard fix
- Quota bar + Pro upgrade modal

## Product Database (Current)

53 products across 5 operations and 10 brands:
Sandvik, ISCAR, Kennametal, Walter, Tungaloy, Mitsubishi, OSG, Gühring, Seco, Kyocera

ISO material groups covered: P (steel), M (stainless), K (cast iron), N (non-ferrous), S (superalloys), H (hardened)

Cross-reference DB: CNMG120408, WNMG080408, DCMT11T304, SNMG120408, APMT1604PDER with 7-8 brand equivalents each.

## Design Spec

- Apple-clean white theme, UX-first
- 18-20px body text
- SVG operation icons (Gühring-style white line-art on dark circular badges)
- ISO P/M/K/N/S/H color cards
- English UI

## Founder Context

Murat Onder — Cutting Tools Specialist, Technical Operations & Production Manager.
Background: Gühring KG, TaeguTec, Machine Total (Netherlands).
Deep domain expertise: ISO insert codes, toolholder systems, grinding wheel geometries, material groups.
Active LinkedIn presence in precision manufacturing/CNC space.
