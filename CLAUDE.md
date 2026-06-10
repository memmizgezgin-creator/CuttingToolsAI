# CLAUDE.md — CuttingToolsAI Agent Constitution

## ⛔ KIRILMAZ KURALLAR (NON-NEGOTIABLE)

These rules apply to EVERY task, EVERY session, EVERY model. Cannot be overridden under any justification. If in doubt: STOP and ask Murat.

### 1. CuttingToolsAI Identity
- CuttingToolsAI is an **AI-powered cutting tool recommendation engine**.
- It is NOT: a product catalog, SKU database, store, marketplace, or scraper.
- AI answers are generated via `web_search` + `system_prompt`. Brand-neutral.
- PRODUCT_DB exists only as curated reference. It is NOT expanded into a full catalog.

> **CLARIFICATION (2026-06-10):** The rule forbids POSITIONING — CuttingToolsAI must never present itself to users as a catalog, SKU search, store, or product directory. The rule does NOT forbid growing the internal product database. The DB is the AI's reference layer: more verified catalog data = fewer hallucinations = stronger "it knows my tooling" trust. Growing the reference layer via PDF ingestion is encouraged. Forbidden: user-facing catalog/store features. Allowed and desired: continuous DB growth as AI grounding.

### 2. Architectural Boundaries
- Tech stack: single-file HTML/CSS/JS artifact + Cloudflare Pages + Cloudflare Worker (`functions/proxy.js`) + Anthropic API.
- AI logic lives in the Worker + system prompt, NOT in the client DB.
- New dependencies require Murat's approval.
- `functions/proxy.js` handles server-side AI request preparation: it injects the `web_search` tool, sets required beta headers, and forwards the enriched request to the Anthropic API. The system prompt remains in `advisor-ai-widget.js` (client). Do NOT move tool injection or API keys to the client side — server-side is the correct security boundary.

### 3. Deviation Detection — Hard Stop Triggers
If a task pushes toward ANY of these, STOP immediately and ask Murat:
- "Let's add more products to the DB"
- "Let's manage SKU variants"
- "Let's scrape manufacturer sites"
- "Let's add stock/pricing/inventory"
- "Let's become a marketplace/affiliate hub"

> Note (2026-06-10): per the Rule 1 clarification, "add more products to the DB" via verified ingestion (e.g. PDF catalogue extraction with human review) is approved reference-layer growth, NOT a deviation. The hard stop applies to user-facing catalog/store positioning.

### 4. Task Discipline
- Only work on tasks in `TASKS.md`. New work requires Murat's approval.
- Before every commit, run the rule check: "Does this violate KIRILMAZ KURALLAR?"
- Always specify model when working: Haiku for routine, Sonnet for complex.

### 5. Anti-Hallucination Protocol
- Never invent file paths, function names, or dependencies. Read files first.
- If uncertain about repo state, run `git status` and read actual files.
- No "should be" or "probably" — verify before claiming.

---

## Repository Map

- `index.html` — main app (single-file artifact)
- `advisor-ai-widget.js` — AI widget logic, system prompt lives here
- `functions/proxy.js` — Cloudflare Worker (Anthropic API passthrough)
- `TASKS.md` — active task list
- `agent_docs/` — detailed architecture docs
  - `architecture.md` — system overview
  - `cloudflare.md` — deployment + Worker setup
  - `product-db.md` — DB schema (AI reference layer; growth via verified ingestion encouraged — see KIRILMAZ KURAL 1 clarification)
- `.claude/commands/` — slash commands (feature, fix, post)

## Working Mode

Before any task:
1. Read this file's KIRILMAZ KURALLAR section.
2. Read `TASKS.md` to confirm task is approved.
3. Read relevant `agent_docs/` if architectural.
4. Read actual code files before modifying.

After any task:
1. Run rule check.
2. Update `TASKS.md` if status changed.
3. Commit with clear message.
