# tasks/auto-queue/ — Night Autopilot queue

Drop one markdown file per task here. `scripts/autopilot.sh` (launchd, 03:30
local) executes them **in filename order, strictly one at a time**, each on a
fresh `autopilot/YYYY-MM-DD-NNN` branch. A task merges to `main` only if every
`VERIFY` line in its log says `PASS`; otherwise the run stops, the branch is
left for morning review, and the file moves to `tasks/blocked/`.

## File format

Name: `001-short-name.md` (number prefix controls order).
Content: a full self-contained Claude Code prompt — the same TASK / CONTEXT /
STEPS / VERIFY format we use manually. The VERIFY section **must** be scripted
and print lines containing `VERIFY` plus `PASS` or `FAIL`, e.g.:

```
echo "VERIFY: homepage returns 200 — PASS"
```

No VERIFY lines in the log = the task is treated as FAIL.

## Rails (enforced by autopilot.sh)

- Max **5 tasks per night**; the rest are reported as SKIPPED.
- Repo must be clean before each task, or the run aborts as BLOCKED.
- Forbidden patterns (case-insensitive) get a task blocked without running:
  `DROP TABLE`, `DELETE FROM`, `supabase db reset`, `stripe`, `payment`,
  `rm -rf /`, `secret put`, `secret set`.
- 45-minute hard timeout per task.
- On any FAIL the whole run stops — later tasks may depend on earlier context.

Logs + per-run summary: `logs/autopilot/YYYY-MM-DD/` (summary.md is readable
before the 06:00 UTC daily digest email).
