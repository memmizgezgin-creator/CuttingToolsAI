# Research 004 — Agent Dispatcher Plan

**Date:** 2026-05-27  
**Task:** Design an agent routing workflow for ToolAdvisor that converts natural-language owner ideas into structured, executable task files.

---

## 1. Problem Statement

The owner has ideas in natural language (Turkish or English). Those ideas need to reach an AI agent (Claude Code or Codex) in a form the agent can execute safely, without guessing, without touching protected files, and without needing repeated clarification.

The existing workflow (Tasks 001–003) established a pattern empirically. This document formalises it.

---

## 2. Observed Patterns from Tasks 001–003

### What worked
- **Explicit task files** with Goals, Rules, Stop If, and Output lists prevented scope creep.
- **Preflight / postflight scripts** gave the owner a fast signal: nothing protected was touched.
- **Canonical schema additions** (Task 002) were additive-only — no existing field was removed. This made QA (Task 003) trivial.
- **Read First requirements** in task files meant the agent always had architectural context.

### What was missing
- No standard task file format → each task had slightly different structure.
- No explicit routing rule → owner had to decide verbally whether to use Claude or Codex.
- `AGENT_PROTOCOL.md` was referenced but never existed → agents noted the absence and continued, which is the right behaviour, but the file should exist.
- No formal approve/reject/revise flow documented anywhere.

---

## 3. Design Goals

| Goal | Rationale |
|------|-----------|
| Owner inputs natural language, agent outputs task file | Low friction for idea capture |
| Task files are the single source of work truth | Reproducible, reviewable, auditable |
| Routing rule is simple and deterministic | No ambiguity about which agent to use |
| Protected files are enforced at the task level, not just memory | Codex doesn't have session memory; the file must say it |
| QA is a separate, paired task | Separation of concerns; different agent can run QA |
| Worklog is mandatory, not optional | Owner can always reconstruct what happened |

---

## 4. Agent Routing Decision Tree

```
Is the task conversational or requires back-and-forth?
    YES → Claude Code

Does the task only read files and produce documents?
    YES → Claude Code (research or planning type)

Does the task require running a local server and driving a browser?
    YES → Claude Code (QA type)

Does the task require editing multiple production files from a clear spec?
    YES → Codex (implementation type)

Does the task require schema migration or data transformation?
    YES → Codex (implementation type)

Is the spec ambiguous or incomplete?
    YES → Claude Code first, to refine the task file, then Codex to execute
```

In practice:
- **Claude Code** = think, plan, verify, talk
- **Codex** = execute from a spec, unattended

---

## 5. Task File as the Contract

The task file is the contract between owner and agent. It has three guarantees:

1. **Completeness** — the agent has everything it needs to execute without asking.
2. **Boundaries** — the Stop If section makes protected files explicit, not assumed.
3. **Traceability** — the Done checklist and worklog entry mean every change is explained.

The template (`tasks/template.md`) enforces this structure. Any task file missing Goal, Rules, Output, Stop If, or Done Checklist is incomplete and must not be executed.

---

## 6. Idea-to-Task Conversion Protocol

When the owner gives a natural-language idea, Claude Code should:

1. **Restate the goal** in one sentence to confirm understanding.
2. **Classify the type** (research / planning / implementation / QA / data).
3. **Route to agent** (Claude Code or Codex).
4. **Identify protected files at risk** — which Stop If rules are relevant.
5. **Draft the task file** following `tasks/template.md`.
6. **Ask one clarifying question** if and only if a critical decision is ambiguous.
7. **Create the task file** at `tasks/todo/NNN-name.md`.
8. **Run preflight** before starting execution.

Claude Code must NOT execute the task immediately after creating the file without pausing for owner confirmation, unless the owner explicitly says "create and run" or "approve task NNN."

---

## 7. Task Type Reference

### Research
- Input: existing files
- Output: `research/NNN-*.md` or `.json`
- No production changes
- Example: Task 001 (data model audit), current task (004)

### Planning
- Input: research outputs + owner direction
- Output: protocol documents, architecture docs
- No production changes
- Example: Task 004 (this task)

### Implementation
- Input: approved task file with clear spec
- Output: changed production files
- Always paired with a QA task
- Example: Task 002 (canonical schema migration)

### QA
- Input: implementation output + local server
- Output: `research/NNN-qa.md` with PASS/WARN/FAIL
- No production changes
- Example: Task 003 (schema QA)

### Data
- Input: external source (PDF, web, manufacturer data)
- Output: staged file in `research/` or `data/staging/`
- NEVER direct PRODUCT_DB modification
- Requires owner review before any merge

---

## 8. Approve / Reject / Revise Decision Guide

```
Owner reviews task output
    ↓
Output correct and complete?
    YES → Approve → git commit + push → done
    NO  ↓
        Is the problem fixable with a small delta?
            YES → Revise → create NNN-b-revision.md → run it
            NO  → Reject → create NNN-a-fix.md → revert + re-run
```

### Approve
- No new task needed
- Owner commits and pushes to main
- Cloudflare Pages auto-deploys

### Revise
- New sub-task `NNN-b-*.md` describing only the delta
- Original task stays in `tasks/done/` as `partially_complete`
- Revision is a full task with its own worklog entry

### Reject
- Original task moved back to `tasks/todo/` with `Status: rejected`
- New fix task `NNN-a-fix-*.md` created
- Git revert may be needed — agent reports files changed, owner decides whether to revert

---

## 9. GitHub Actions Integration (Future State)

Currently: manual push → Cloudflare Pages auto-deploy.

When a CI pipeline is added:

| Event | Agent action |
|-------|-------------|
| CI passes | Report PASS. No action unless owner asks. |
| CI fails | Report FAIL with error summary. Stop. Do not auto-fix. |
| CI passes but deploy fails | Report both. Do not retry. |
| Owner asks agent to fix CI failure | Create new task file for the fix. Do not modify files inline. |

**Agents never push to git.** This rule does not change with CI.

---

## 10. Worklog Entry Standard

Every task must append this structure to `TOOLADVISOR_WORKLOG.md`:

```markdown
## YYYY-MM-DD — Task NNN: Task Title

### Task
One sentence description.

### Result
PASS / WARN / FAIL / COMPLETED (for non-QA tasks)

### Files Changed
- `path/to/file` — what changed

### Files Not Changed
- `index.html` — not touched
- `wrangler.toml` — not touched
- PRODUCT_DB — not touched

### Deployment
Not performed.

### Notes
*(optional)*
```

---

## 11. Implementation Roadmap for This System

The dispatcher system is now defined. The order for bringing it fully online:

1. ✅ `AGENT_DISPATCHER.md` — created (Task 004)
2. ✅ `tasks/template.md` — created (Task 004)
3. ✅ `research/004-agent-dispatcher-plan.md` — this file (Task 004)
4. ⬜ `AGENT_PROTOCOL.md` — create as a short alias/pointer to AGENT_DISPATCHER.md (Task 005)
5. ⬜ `scripts/ta-task-create.sh` — shell helper: takes a task number + title, creates todo file from template
6. ⬜ `scripts/ta-task-done.sh` — shell helper: moves task from todo/ to done/, runs postflight

Items 5 and 6 are optional quality-of-life improvements. Items 1–4 are the functional minimum.

---

## 12. Open Questions for Owner

These do not block Task 004 but should be decided before the next implementation task:

| Question | Options |
|----------|---------|
| Should Codex tasks run fully unattended, or always pause for owner approval before first file write? | Unattended (current) / Pause before first write |
| Should QA tasks always be a separate task, or can implementation tasks self-verify? | Separate (safer) / Self-verify (faster) |
| Should `tasks/todo/` be monitored by a cron that auto-assigns to Codex? | Manual dispatch (current) / Auto-assign |
| What is the max number of production files an agent may touch in a single task without explicit approval? | 1 / 3 / 5 / unlimited |
