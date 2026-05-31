# ToolAdvisor — Agent Dispatcher Protocol

**Version:** 1.0 — 2026-05-27  
**Owner:** Murat Önder  
**Scope:** All AI agent work on `/Users/muratonder/Desktop/ToolAdvisor/`

This is the single source of truth for how natural-language ideas become tasks, which agent handles them, and how results flow back to the owner.

---

## 1. The Flow at a Glance

```
Owner idea (natural language)
        ↓
  Claude Code: convert to task file → tasks/todo/NNN-name.md
        ↓
  Route to agent (Claude Code or Codex)
        ↓
  Agent executes → output files + TOOLADVISOR_WORKLOG.md
        ↓
  Run ta-postflight.sh → PASS / WARN / FAIL
        ↓
  Owner: Approve → merge/push  |  Reject → revise task  |  Revise → new sub-task
```

All work that changes production files must pass `ta-postflight.sh` before owner approval.  
All work must read `CLOUDFLARE_MIGRATION.md` before starting.

---

## 2. Agent Routing Decision

### Use Claude Code when:
- Reading, researching, or auditing files
- Planning, designing, or writing documents
- QA / verification tasks (run app, check output)
- Small, surgical edits to a single file
- Writing task files from natural-language input
- Asking clarifying questions to the owner
- Anything that requires conversational back-and-forth

### Use Codex when:
- Implementing a well-specified task file
- Multi-file edits with a clear schema
- Schema migrations (like Task 002)
- Generating or transforming structured data
- Running scripts and capturing output
- Any task that can run unattended from a task file

### Never use either agent for:
- Deploying to Cloudflare without explicit owner approval
- Modifying `PRODUCT_DB` (directory-data.js base records) without approval
- Modifying `index.html` without explicit approval
- Editing `wrangler.toml`, `functions/proxy.js`, or `advisor-ai-widget.js` line 212 without approval
- Any action listed in CLOUDFLARE_MIGRATION.md under "Neye Dokunma"

---

## 3. Task Type Classification

Every task file must declare its type. The type determines the expected inputs, outputs, and stop conditions.

### 3a. Research Task
- **Purpose:** Audit, analyse, document — no production changes.
- **Inputs:** Existing files, external data.
- **Outputs:** One or more files under `research/`.
- **Stop if:** Needs production change to answer the question.
- **QA required:** No (but a summary in TOOLADVISOR_WORKLOG.md is required).

### 3b. Planning Task
- **Purpose:** Design a solution, define a task sequence, produce a protocol.
- **Inputs:** Research outputs, owner direction.
- **Outputs:** Markdown docs (e.g. AGENT_DISPATCHER.md, tasks/template.md).
- **Stop if:** Requires a production decision the owner hasn't approved.
- **QA required:** No.

### 3c. Implementation Task
- **Purpose:** Edit production files to deliver a specific change.
- **Inputs:** Approved task file with clear spec.
- **Outputs:** Changed production files + worklog entry.
- **Stop if:** Any ambiguity about which files to touch, or if PRODUCT_DB / index.html / wrangler.toml are required.
- **QA required:** Yes — run `ta-postflight.sh`. A paired QA task is recommended.

### 3d. QA Task
- **Purpose:** Verify that a previous implementation task works correctly.
- **Inputs:** The implementation task's output, a running local server.
- **Outputs:** `research/NNN-name-qa.md` with PASS / WARN / FAIL verdict.
- **Stop if:** Cannot start a local server, or production state is ambiguous.
- **QA required:** Self-contained (it is the QA).

### 3e. Data Task
- **Purpose:** Prepare or stage new product data.
- **Inputs:** External source (PDF, web, manufacturer data).
- **Outputs:** Staged file under `research/` or `data/staging/` — NEVER directly to PRODUCT_DB.
- **Stop if:** Any path leads to direct PRODUCT_DB modification.
- **QA required:** Owner review before any merge.

---

## 4. Task File Format

All task files must follow `tasks/template.md`. Key required fields:

```
# Task NNN — Short Title
Status, Type, Created, Approved by
Goal
Read First (context files)
Rules (what must not be touched)
Spec (what to do, step by step)
Output (exact files to create/modify)
Stop If (conditions that require pausing)
Done (post-task checklist)
```

See `tasks/template.md` for the full template.

Task files live in:
- `tasks/todo/` — waiting or in progress
- `tasks/done/` — completed and verified

---

## 5. Stop / Ask Rules

An agent must **stop immediately and report to the owner** if:

| Condition | Action |
|-----------|--------|
| Task requires modifying PRODUCT_DB | Stop. Report. Do not proceed. |
| Task requires modifying index.html | Stop. Report. Do not proceed. |
| Task requires modifying wrangler.toml | Stop. Report. Explain why. |
| Task requires deploying to Cloudflare | Stop. Report. Do not deploy. |
| Active schema is unclear or contradicts research files | Stop. Report. Request clarification. |
| CLOUDFLARE_MIGRATION.md and a task file contradict each other | CLOUDFLARE_MIGRATION.md wins. Stop and report the conflict. |
| A task file says "do X" but TOOLADVISOR_WORKLOG.md records X was already done | Stop. Report. Ask if re-execution is intended. |
| A required Read First file does not exist | Note it. Do not invent its contents. Continue only if the missing file is not a Stop If condition. |
| Output would touch more than 3 production files not listed in the task | Stop. Report. Get explicit approval for scope expansion. |

---

## 6. GitHub Actions / CI Result Flow

ToolAdvisor uses Cloudflare Pages (auto-deploy on push to `main`).  
There is no separate CI pipeline currently. The flow is:

```
Local change
    → ta-postflight.sh PASS
    → Owner approves
    → git commit + push to main
    → Cloudflare Pages auto-deploys
    → Owner verifies on tooladvisor.eu
```

**Agents never push to git.** Agents prepare the change, run postflight, and report.  
The owner commits and pushes.

If a GitHub Actions workflow is added in the future:
- Agents may read CI results (pass/fail) but may not re-trigger a failed deploy without owner approval.
- CI failure = stop and report, not auto-fix-and-retry.

---

## 7. Worklog Update Rule

Every task — Research, Planning, Implementation, QA, Data — must append an entry to `TOOLADVISOR_WORKLOG.md` before the task is considered done.

A worklog entry must include:
- Date and task number/title
- What was done (one paragraph or bullet list)
- Files changed (list each file; "none" if read-only task)
- Files not changed (explicitly confirm protected files were not touched)
- Deployment status ("Not performed" for all agent tasks)
- Result / verdict (for QA tasks)

`ta-postflight.sh` checks for a worklog update. A task without a worklog entry = incomplete.

---

## 8. Owner Approve / Reject / Revise Flow

After an agent completes a task and postflight passes:

### Approve
Owner reviews the output files and worklog entry.  
If satisfied: `git add <files> && git commit && git push`  
The task file stays in `tasks/done/`.

### Reject
Owner identifies the problem and communicates it.  
The agent reverts (or the owner reverts manually via git).  
A new task file (`tasks/todo/NNN-a-fix.md`) is created to address the issue.  
The original task file is moved back to `tasks/todo/` with `Status: rejected — see NNN-a-fix`.

### Revise
Owner wants changes to scope, not a full rejection.  
A sub-task (`tasks/todo/NNN-b-revision.md`) is created describing the delta.  
The original task stays in `tasks/done/` with `Status: partially complete`.  
The revision task runs and its output supersedes the original where they overlap.

---

## 9. Naming Conventions

| Item | Format | Example |
|------|--------|---------|
| Task files | `NNN-short-slug.md` | `005-filter-ui-rebuild.md` |
| QA task files | `NNN-qa-short-slug.md` | `005-qa-filter-ui.md` |
| Research files | `NNN-description.md` or `.json` | `005-filter-model-v2.md` |
| Revision tasks | `NNN-b-description.md` | `004-b-dispatcher-revision.md` |
| Fix tasks | `NNN-a-fix-description.md` | `004-a-fix-stop-rules.md` |

Task numbers are sequential. Gaps are allowed (reserved for future or cancelled tasks).

---

## 10. Read First — Required Context Files

Every agent task must read these before starting:

| File | Purpose |
|------|---------|
| `CLOUDFLARE_MIGRATION.md` | Architecture, deployment rules, protected files, Codex rules |
| `TOOLADVISOR_WORKLOG.md` | Current state, what has been done, active decisions |
| `AGENT_DISPATCHER.md` | This file — routing, format, stop rules |

Optional but recommended for implementation tasks:
- Relevant `research/` files for the task's domain
- The previous task's worklog entry

---

## Appendix: Protected Files Quick Reference

| File | Protection level | Agent rule |
|------|-----------------|------------|
| `directory-data.js` (PRODUCT_DB records section) | LOCKED | Read-only. Canonical schema additions require explicit task approval. |
| `index.html` | LOCKED | Do not touch. |
| `wrangler.toml` | PROTECTED | Do not modify without explicit approval. |
| `functions/proxy.js` | PROTECTED | Do not modify. Widget depends on it. |
| `advisor-ai-widget.js` line 212 (`API_URL`) | PROTECTED | Do not change the URL. |
| `CNAME` | LOCKED | Do not touch. |
| `CLOUDFLARE_MIGRATION.md` | READ-ONLY for agents | Agents read it, do not overwrite it. |
