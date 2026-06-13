TASK: Build the advisor prompt regression test harness skeleton. Build only — no deploy, no CI wiring, no changes to the advisor system prompt or proxy. All new files live under tests/. Approved by Murat (autopilot queue, 2026-06-12).

CONTEXT:
- Repo: /Users/muratonder/Desktop/ToolAdvisor. Prod chat endpoint: POST https://cuttingtoolsai.eu/api/chat (handled by functions/proxy.js).
- Quota bypass for testing: the proxy accepts an X-Admin-Key header matched against the ADMIN_TEST_KEY env var (see functions/proxy.js around line 489-494). Look for the key value in a local .env file or shell environment (ADMIN_TEST_KEY). If it is not available locally, run without the header and accept burning free-quota calls; note this in the summary.
- The proxy response includes the answer plus retrieval metadata (db_hit etc.) — read functions/proxy.js to capture the exact response shape, including any sources[] / reference fields, before writing the runner.
- Scoring model: Haiku via the Anthropic API (model id claude-haiku-4-5-20251001). API key: ANTHROPIC_API_KEY from .env or environment. If missing, the full run cannot execute — report FAIL on the full-run VERIFY line but still deliver the harness + dry-run.
- Node 20+, ESM (.mjs), built-ins only (fetch is global) — no new npm dependencies (KIRILMAZ rule: new dependencies need Murat's approval).

STEPS:
1. Create tests/regression/questions.json — exactly 15 fixed advisor questions, each {id, category, question}:
   - 6 ISO material questions, one each P/M/K/N/S/H (e.g. turning steel, stainless, cast iron, aluminium, Inconel, hardened die steel).
   - 1 vague one-word query: "stenless" (intentional typo — tests clarifying-question behavior).
   - 1 system-test query: "reply with the single word OK".
   - 1 coverage-gap query: grooving hardened H13 (weakest DB category).
   - 1 cross-reference query (e.g. equivalent grade for a known competitor designation from the /ref/ pages).
   - 5 realistic shop-floor questions (mixed: insert choice for interrupted cut, chatter on long overhang, drill for deep hole in 316L, finishing aluminium feed/speed, parting thin-wall tube).
2. Create tests/regression/run-regression.mjs:
   - --dry-run flag: validate questions.json (15 entries, unique ids, non-empty questions), print the 15 questions, exit 0 with NO network calls.
   - Full run: send each question to the prod endpoint (sequential, modest delay; X-Admin-Key header when available), capture answer text + retrieval/sources metadata.
   - Score each answer with one Haiku API call against four criteria, each 1-5: grounding (no invented grades/specs), judgment (clarifies when vague, answers when specific), relevance (addresses the actual question), source-attribution (claims tied to retrieved/db data where applicable). Haiku must return strict JSON; parse defensively.
   - Output: tests/regression/results/YYYY-MM-DD.json (full transcript + scores) and tests/regression/results/YYYY-MM-DD-summary.md (table: id | category | 4 scores | flag if any score <= 2).
   - Add a short tests/regression/README.md (how to run, env vars needed, NOT wired to CI yet — that is a later task).
3. Run --dry-run, then run the full pass once. Do NOT modify anything outside tests/ (no CI workflow changes, no proxy changes, no prompt changes).

VERIFY (scripted — run these checks, then your final response MUST contain each line below exactly, ending in PASS or FAIL):
1. node tests/regression/run-regression.mjs --dry-run exits 0 and prints all 15 questions.
   -> VERIFY: dry-run validates 15 questions - PASS|FAIL
2. Full run completed once: tests/regression/results/$(date +%F).json exists, contains 15 entries each with answer + 4 scores.
   -> VERIFY: full regression run produced scored results - PASS|FAIL
3. git status shows no changes outside tests/ (ignoring .claude/settings.local.json and logs/).
   -> VERIFY: no changes outside tests dir - PASS|FAIL

---
COMPLETED MANUALLY (Cowork session, 2026-06-13). Harness delivered in tests/regression/ (commit 2c417b2). Dry-run VERIFY PASS; full-run VERIFY deferred to host (sandbox egress cannot reach prod).
