# ToolAdvisor — Agent Rules

All AI agents (Claude Code, Codex, and any future agents) working in this repository must read and follow this file before doing any work.

---

## Project Identity

**ToolAdvisor** is a source-backed cutting tool decision platform.  
It is NOT an AI guessing tool.  
Every claim must be traceable to a real source: manufacturer PDF, datasheet, or published specification.

---

## Active Project Root

`/Users/muratonder/Desktop/ToolAdvisor`

---

## Deployment Target

**Cloudflare Pages only.**  
Netlify is abandoned and must not be referenced, configured, or re-introduced.  
Do not touch `netlify.toml` or create any Netlify configuration.

---

## Current Priority

PDF-based data growth via the local ingestion pipeline.

During ingestion work, agents must NOT drift into:
- UI redesign
- SEO improvements
- Pricing or monetization
- Deployment changes
- Unrelated feature work

---

## Files Agents Must Never Touch (without explicit user approval)

- `directory-data.js` — product database, locked
- `directory-app.jsx` — React catalog app
- `ToolAdvisor.html` — Advisor page
- `index.html` — redirect only, must stay as redirect to ToolAdvisor.html
- `CNAME` — domain config

---

## Ingestion Pipeline Rules

### Data Hierarchy

1. Manufacturer PDF data is the source layer.
2. Raw extracted data must always be preserved.
3. Normalized candidate records are NOT approved products.
4. Human-approved records can later be merged into PRODUCT_DB.
5. AI may classify, normalize, match, and explain.
6. **AI may NOT invent technical values.**
7. If a field is not found in the source PDF/raw row, it must remain `null`.
8. Every product candidate must be traceable to `source_file`, `source_page`, and `raw_row_ref`.
9. AI-inferred fields must be marked clearly in `ai_inferred_fields`.
10. **PRODUCT_DB merge requires explicit manual approval — never auto-merge.**

### Pipeline Phases

| Phase | Who runs it | Output |
|-------|-------------|--------|
| Raw extraction | Codex scripts | raw JSON + report markdown |
| Normalization | AI-assisted | candidate records |
| Validation | Automated rules | validation_status flags |
| Review | Human | approved / rejected decisions |
| Merge | Human-triggered | PRODUCT_DB update |

### Source Traceability

Every candidate record must carry:
- `source_file` — original PDF filename
- `source_page` — page number(s) the data was found on
- `raw_row_ref` — reference to the raw extracted row/table

No candidate may be approved without all three fields populated.

---

## Confidence Rules

- Do not fake confidence.
- Do not create technical claims without source evidence.
- Never overwrite source-backed technical values with AI-inferred values.
- If a value is AI-inferred, add it to `ai_inferred_fields` and lower confidence accordingly.

---

## Nav Links (always use these exact paths)

- Advisor → `ToolAdvisor.html`
- Catalog → `tools-directory.html`
- Cross-Reference → `cross-reference.html`
- Compare → `compare.html`
- Knowledge → `knowledge.html`

---

## When in Doubt

Stop and ask the user rather than guessing or drifting into unrelated work.
