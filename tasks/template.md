# Task NNN — Short Title

**Status:** todo | in_progress | done | rejected | partially_complete  
**Type:** research | planning | implementation | qa | data  
**Created:** YYYY-MM-DD  
**Approved by:** Owner  
**Depends on:** *(optional — task NNN must be done first)*  
**Blocks:** *(optional — task NNN cannot start until this is done)*

---

## Goal

One or two sentences. What should be true when this task is done?

---

## Read First

These files must be read before starting work:

- `CLOUDFLARE_MIGRATION.md`
- `TOOLADVISOR_WORKLOG.md`
- `AGENT_DISPATCHER.md`
- *(add any relevant research files for this task)*

---

## Context

*(Optional. Background the agent needs that isn't in the standard files.  
Link to prior task numbers, relevant research files, or design decisions.)*

---

## Rules

What must not be touched during this task:

- [ ] Do not modify `PRODUCT_DB` (directory-data.js base records)
- [ ] Do not modify `index.html`
- [ ] Do not deploy
- [ ] *(add task-specific constraints here)*

---

## Spec

Step-by-step description of what to do. Be specific enough that the agent makes no assumptions.

For **research tasks**: describe what to audit, what questions to answer, where to write output.  
For **planning tasks**: describe the document structure and decisions to cover.  
For **implementation tasks**: list every file to change and what change to make.  
For **QA tasks**: list every check to perform, expected values, and how to run the app.  
For **data tasks**: describe source, transformation rules, staging destination, and review criteria.

### Step 1 — ...

### Step 2 — ...

*(continue as needed)*

---

## Output

Exact list of files to create or modify:

| File | Action | Notes |
|------|--------|-------|
| `path/to/file.md` | create | *(description)* |
| `TOOLADVISOR_WORKLOG.md` | append | worklog entry required |
| `tasks/todo/NNN-name.md` | move to done | mark task complete |

---

## Stop If

The agent must stop and report to the owner if any of these conditions are true:

- Any change requires modifying `PRODUCT_DB`
- Any change requires modifying `index.html`
- Any change requires `wrangler.toml` or `functions/proxy.js`
- The spec is ambiguous and the ambiguity would affect which files are touched
- *(add task-specific stop conditions here)*

See `AGENT_DISPATCHER.md` Section 5 for the full stop/ask rule set.

---

## Done Checklist

Before marking this task complete:

- [ ] All output files created / modified as listed above
- [ ] `ta-postflight.sh` run — result: PASS / WARN / FAIL → *(fill in)*
- [ ] `TOOLADVISOR_WORKLOG.md` updated with worklog entry
- [ ] This task file moved to `tasks/done/`
- [ ] No protected files were modified (index.html, wrangler.toml, PRODUCT_DB)
- [ ] No deployment was performed

---

## Notes

*(Optional. Anything the agent noticed during execution that the owner should know:
anomalies, pre-existing issues, out-of-scope observations, follow-up ideas.)*
