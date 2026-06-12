TASK: First real run of the CI extraction pipeline targeting the weakest category: Grooving (currently only 15 records). Staging only — nothing merges to the live dataset; approval stays with Murat via the ta-review flow. Approved by Murat (autopilot queue, 2026-06-12).

CONTEXT:
- Repo: /Users/muratonder/Desktop/ToolAdvisor. GitHub: memmizgezgin-creator/CuttingToolsAI.
- Pipeline: .github/workflows/ingestion.yml — triggers on push touching ingestion/inbox/** and via workflow_dispatch; runs ingestion/scripts/ci-inbox.js (claude-extract per PDF, ~20 min timeout each); failed PDFs land in ingestion/failed/; the bot commits results back with "[skip ci]". Requires repo secret ANTHROPIC_API_KEY (already configured per TASKS.md).
- Staging output is review.json-style files served by ingestion/serve-review.js — read that script and ingestion/REVIEW_WORKFLOW.md first to learn the exact staging directory and record shape (source_file, source_page fields).
- Candidate PDFs may exist locally (gitignored *.pdf except inbox/failed exceptions) — look in ingestion/input/, ingestion/, and any catalog/pdf directories in the repo.
- You are running on a dedicated branch (autopilot/...). Do NOT push to main. Push your current branch and run the workflow against it.

STEPS:
1. Read ingestion/README.md, ingestion/REVIEW_WORKFLOW.md, ingestion/scripts/ci-inbox.js, ingestion/serve-review.js to confirm inbox path, staging path, and output format. Run `gh auth status` — if gh is not authenticated, stop and report FAIL on the workflow VERIFY line.
2. List unprocessed catalog PDFs (local dirs + ingestion/input/), i.e. PDFs not already represented in staging or in data/extracted-productdb-candidates.json source_file values. Pick the single best Grooving-relevant PDF (any brand — filename/content mentioning grooving, parting, cut-off, recess).
3. Record the BEFORE state: live dataset count (jq length of data/extracted-productdb-candidates.json) and existing staging row count.
4. Copy the chosen PDF into the ingestion inbox, commit on the current branch, push the branch to origin.
5. Trigger the workflow on this branch: `gh workflow run ingestion.yml --ref <current-branch>` (or rely on the push trigger if it fires for this branch — check the workflow's `on.push.branches`). Watch it with `gh run watch` / `gh run list --workflow=ingestion.yml` until it concludes. If it takes longer than ~35 minutes, report the timeout as FAIL and stop.
6. After a green run: `git pull` the current branch to fetch the bot's result commit. Inspect the new staging file(s) for this source_file: report candidate count, distinct source_page values covered, and how many rows are missing source_page.
7. Confirm the live dataset is untouched: data/extracted-productdb-candidates.json count equals the BEFORE count.
8. Print a short report: PDF chosen, workflow run URL, candidate count, pages covered, rows missing source_page.

VERIFY (scripted — run these checks, then your final response MUST contain each line below exactly, ending in PASS or FAIL):
1. gh run conclusion for the triggered ingestion run == success.
   -> VERIFY: ingestion workflow green - PASS|FAIL
2. Staging rows for this source_file > 0.
   -> VERIFY: staging candidates extracted - PASS|FAIL
3. Live dataset count unchanged (data/extracted-productdb-candidates.json BEFORE == AFTER).
   -> VERIFY: live dataset untouched - PASS|FAIL
4. Every new staging row has source_file populated.
   -> VERIFY: source_file populated on all rows - PASS|FAIL
