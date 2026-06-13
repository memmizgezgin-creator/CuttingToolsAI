# Advisor prompt regression harness

Fixed 15-question test set for the production advisor (`POST https://cuttingtoolsai.eu/api/chat`), scored by Haiku on four 1-5 criteria: grounding, judgment, relevance, source-attribution.

## Run

```bash
# validate questions.json + print the set, zero network calls
node tests/regression/run-regression.mjs --dry-run

# full run: 15 prod calls (sequential, 2s apart) + 15 Haiku scoring calls
node tests/regression/run-regression.mjs
```

## Env

- `ANTHROPIC_API_KEY` — required for the full run (Haiku scoring). Read from environment or repo-root `.env`.
- `ADMIN_TEST_KEY` — optional. Sent as `X-Admin-Key` for quota bypass; without it the run consumes free-tier quota.
- `REGRESSION_ENDPOINT` — optional override (default prod `/api/chat`).

## Output

- `tests/regression/results/YYYY-MM-DD.json` — full transcript (question, raw result incl. `plan`/`db_hit`/`sources`, scores).
- `tests/regression/results/YYYY-MM-DD-summary.md` — score table; rows with any score ≤ 2 or no answer are flagged.

Exit code: 0 = all questions answered (scores may still be flagged), 2 = at least one transport failure, 1 = invalid questions.json or missing API key.

## Notes

- Node 20+, ESM, built-ins only — no npm dependencies (KIRILMAZ rule).
- The question set is FIXED: do not edit existing entries when comparing prompt versions, or historical comparisons break. Add a new file if a new set is needed.
- NOT wired to CI yet — that is a later task.
