# ToolAdvisor Worklog

This file records operational updates for ToolAdvisor.

CLOUDFLARE_MIGRATION.md is the single source of truth for architecture, deployment, data strategy, security rules, working protocol and active project decisions.

All assistants and coding agents must read CLOUDFLARE_MIGRATION.md before doing ToolAdvisor work.

---

## 2026-05-28 — Task 009: Product Card + Detail Modal Implementation v1

### Task
Implement Phase 1 + Phase 2 trust/canonical UI from the Task 008 plan. Changes to `directory-app.jsx` only — no PRODUCT_DB, no `directory-data.js`, no `index.html`.

### Result
COMPLETED — all 7 changes applied and verified locally.

### Changes Made to `directory-app.jsx`

#### 1 — New constants added (before ToolCard)
- `TOOL_TYPE_LABEL` — maps `tool_type` enum values to abbreviated human-readable labels (T-Insert, M-Insert, Tap, Drill, etc.)
- `SOURCE_TIER_LABEL` — maps `source_tier` enum values to readable strings
- `RISK_FLAG_LABEL` — maps `risk_flags` array values to readable warning strings

#### 2 — `TrustBadge` component added (replaces `Confidence` on all cards + modal)
- **Compact form (cards):** confidence bar + % + status icon (verified ✓ / partial ~ / estimated —) + hover tooltip showing source_tier · source_name · last_checked
- **Expanded form (detail modal):** confidence bar + % + status label + Source tier / Source / Checked rows + risk_flags chips (amber, only if non-empty)
- **Graceful fallback:** if `t.trust` is absent, falls back to `t.confidence`, `t.source`, `t.lastVerified`

#### 3 — Tool type chip on grid card (header, right column)
- `{t.tool_type && <span>…{TOOL_TYPE_LABEL[t.tool_type]}</span>}` added below ISO chip
- Only renders if `tool_type` field is present

#### 4 — Economics row: marked as estimated, `weeklyPicks` hidden
- `costPerEdge` now shows `~€{value}/edge` prefix
- `(est.)` label appended when `t.economicsEstimated === true`
- Tooltip updated: "estimated from published data ranges — not commercial pricing"
- `weeklyPicks` trending_up display removed from card (was synthetic data)

#### 5 — Grid card confidence row: `<Confidence>` → `<TrustBadge tool={t} />`
#### 6 — List card confidence: `<Confidence>` → `<TrustBadge tool={t} />`

#### 7 — Detail modal updates
- Eyebrow (brand · family line) extended: now shows `Sandvik · Turning · T-Insert`
- Confidence section: replaced flat `<Confidence>` + source text with `<TrustBadge tool={tool} expanded />`
- Supply section: added economics disclaimer when `tool.economicsEstimated` is true:
  "Cost figures are estimates from published data ranges — not commercial pricing."

### Local QA Result: ✅ PASS

| Check | Result |
|-------|--------|
| 36 records load | ✅ |
| `tool_type` field present on records | ✅ `turning_insert` on T01 |
| `trust` object present on records | ✅ all 7 fields populated |
| `economicsEstimated` flag present | ✅ `true` on all records |
| 12 cards rendered | ✅ |
| Tool type chips visible (12) | ✅ "T-Insert" on first 4 checked |
| `(est.)` labels (12) | ✅ one per card |
| `~€` cost markers (24) | ✅ |
| Status icons on cards (13) | ✅ |
| Detail modal opens | ✅ |
| Eyebrow shows tool type | ✅ "Sandvik · Turning · T-Insert" |
| Trust section: Source tier shown | ✅ "Manufacturer data" |
| Trust section: Checked date shown | ✅ "2024-08-01" |
| Economics disclaimer in modal | ✅ |
| JS errors | ✅ Zero |
| New warnings | ✅ Zero (only pre-existing Tailwind + Babel CDN warnings) |

### Files Changed
- `directory-app.jsx` — modified (new components, card + modal updates)

### Files Not Changed
- `directory-data.js` — not touched (PRODUCT_DB locked)
- `index.html` — not touched
- `wrangler.toml` — not touched
- `compare.html` — not touched (out of scope for this task)
- Any other file — not touched

### Deployment
Not performed. Owner must commit and push.

### Suggested Git Commands
```bash
git add directory-app.jsx
git commit -m "feat: add TrustBadge, tool_type chip, economics est. labels (Task 009)"
git push
```

---

## 2026-05-28 — Task 008: Product Card & Detail Modal Implementation Plan

### Task
Create a planning document (`research/008-product-card-detail-plan.md`) covering:
- Which fields are shown on product cards, detail modal, and compare screen
- How trust badge and `economicsEstimated` should be presented to users
- Implementation order (no PRODUCT_DB changes)
- Files that need changing
- Risks

### Result
COMPLETED — planning document created. No code changes made.

### Output
- `research/008-product-card-detail-plan.md` — created ✅

### Summary of Plan

**Current state:** 36 records have canonical schema + trust objects from Task 002. UI has not yet been updated to use these new fields.

**Phase 1 (highest priority — trust & economics):**
- Add `TrustBadge` component using `t.trust.confidence_score`, `t.trust.validation_status`, `t.trust.source_tier`, `t.trust.source_name`, `t.trust.last_checked`, `t.trust.risk_flags`
- Mark economics as estimated: `~€{costPerEdge}/edge`, hide synthetic `weeklyPicks`
- Add economics disclaimer to detail modal

**Phase 2 (tool type + materials):**
- Add `tool_type` chip to card header and modal identity block (human-readable)
- Add `workpiece_materials` chips to detail modal

**Phase 3 (compare cleanup):**
- Remove "Buy" / purchase actions from compare.html
- Add trust row and tool_type row to compare matrix

**Phase 4 (category-aware compare):**
- Cross-category warning
- Category-specific row groups per tool_type

**Files that need changing:** only `directory-app.jsx` (Phase 1–2) and `compare.html` (Phase 3).  
**No PRODUCT_DB changes required** — canonical schema already applied in Task 002.

### Files Changed
- `research/008-product-card-detail-plan.md` — created (planning doc, no code)

### Files Not Changed
- `directory-data.js` — not touched
- `directory-app.jsx` — not touched (plan only)
- `index.html` — not touched
- Any production file — not touched

### Deployment
Not performed.

---

## 2026-05-27 — Task 007: Fix GitHub Guard Workflow

### Task
Fix four issues in `.github/workflows/ta-guard.yml` identified in Task 006.

### Result
COMPLETED — file updated locally, ready to commit/push.

### Changes Made to `.github/workflows/ta-guard.yml`

#### Fix 1 — PRODUCT_DB check now catches `directory-data.js` (HIGH / was broken)

| | Before | After |
|--|--------|-------|
| Pattern | `grep -qi "PRODUCT_DB\|product.db"` | `grep -qiE "^directory-data\.js$\|PRODUCT_DB\|product\.db"` |
| Caught `directory-data.js`? | ❌ Never | ✅ Always |

#### Fix 2 — TA_TOOLS base record detection (new, smarter logic)

The guard now distinguishes between two types of `directory-data.js` changes:

- **Base record edit** (`{ id:'T01', brand: ...}` lines added/removed) → `::error::` → **blocks commit**
- **Canonical/derived field change** (Task 002 style additions) → `::warning::` → alerts but does not block

```bash
TA_DIFF=$(git diff HEAD~1 HEAD -- directory-data.js 2>/dev/null | grep -E "^\+.*\{ id:'T[0-9]+" || true)
if [ -n "$TA_DIFF" ]; then
  echo "::error::TA_TOOLS base records in directory-data.js were modified — NOT allowed without explicit approval"
  FAIL=1
else
  echo "::warning::directory-data.js was modified — non-record change. Review required."
fi
```

#### Fix 3 — `actions/checkout` upgraded from `@v4` to `@v6` (MEDIUM / Node.js 24)

| | Before | After |
|--|--------|-------|
| Action version | `actions/checkout@v4` (Node.js 20, deprecated) | `actions/checkout@v6.0.2` (Node.js 24 compatible) |
| Node deprecation warning | ⚠️ Active | ✅ Resolved |

#### Fix 4 — `AGENT_PROTOCOL.md` added to critical files check (new)

`AGENT_PROTOCOL.md` now exists (created in Task 005) and is required reading for all agents. Added to the "Check critical files exist" step so the Guard fails if it goes missing.

### Files Changed
- `.github/workflows/ta-guard.yml` — updated (created locally; was only on remote)

### Files Not Changed
- `directory-data.js` — not touched
- `index.html` — not touched
- `wrangler.toml` — not touched
- Any other production file — not touched

### Deployment
Not performed. Owner must commit `.github/workflows/ta-guard.yml` and push to trigger the updated Guard run.

### Next Step for Owner
```bash
git add .github/workflows/ta-guard.yml
git commit -m "fix: update Guard workflow — directory-data.js PRODUCT_DB check, TA_TOOLS record detection, checkout@v6, AGENT_PROTOCOL.md"
git push
```

---

## 2026-05-27 — Task 006: GitHub Actions Guard Check

### Task
Read-only audit of GitHub Actions status for `memmizgezgin-creator/ToolAdvisor`.

### Result: ✅ PASS — with 2 findings requiring action

---

### Last Runs (2026-05-27)

| Time (UTC) | Workflow | Commit | Result |
|-----------|---------|--------|--------|
| 14:42:27 | ToolAdvisor Guard | 7ac4217 | ✅ success (7s) |
| 14:42:25 | pages-build-deployment | 7ac4217 | ✅ success (56s) |
| 14:37:51 | ToolAdvisor Guard | c3790e1 | ✅ success (15s) |
| 14:37:49 | pages-build-deployment | c3790e1 | ✅ success (1m30s) |
| 14:28:26 | ToolAdvisor Guard | (CI setup commit) | ✅ success (10s) |

All 10 runs in history: **completed success**. No failures. No skipped runs.

---

### Guard Workflow — What It Checks

The `ToolAdvisor Guard` workflow runs on every push to `main`. Last run (7ac4217):

| Step | Check | Result |
|------|-------|--------|
| Check critical files exist | CLOUDFLARE_MIGRATION.md, TOOLADVISOR_WORKLOG.md, index.html, ToolAdvisor.html, wrangler.toml, functions/proxy.js, advisor-ai-widget.js | ✅ All present |
| Check no Netlify config | netlify.toml must not exist | ✅ Absent |
| Check protected files not modified | wrangler.toml (warn), PRODUCT_DB (error), netlify files (error) | ✅ Changed files: TOOLADVISOR_WORKLOG.md, research/001-research-review-decision.md, tasks/done/001-review-research-outputs.md — none are protected |
| Check WORKLOG updated | TOOLADVISOR_WORKLOG.md must appear in the commit diff | ✅ Updated |
| Summary | Overall guard result | ✅ ToolAdvisor Guard passed. |

---

### ⚠️ Finding 1 — PRODUCT_DB guard pattern does not match the actual file

**Severity:** HIGH  
**The Guard checks for:** `PRODUCT_DB|product.db` (case-insensitive string match against changed filenames)  
**The actual locked file is:** `directory-data.js`

The pattern `PRODUCT_DB` will **never match** `directory-data.js`. If an agent modifies the base records in `directory-data.js`, the Guard will not catch it. The check silently passes.

**Required action:** Update `.github/workflows/tooladvisor-guard.yml` — change the PRODUCT_DB grep pattern to also match `directory-data.js`:

```bash
# Current (broken):
if echo "$CHANGED" | grep -qi "PRODUCT_DB\|product.db"; then

# Fixed:
if echo "$CHANGED" | grep -qi "PRODUCT_DB\|product.db\|directory-data\.js"; then
```

This is a one-line fix. Recommend as Task 007.

---

### ⚠️ Finding 2 — actions/checkout@v4 running on deprecated Node.js 20

**Severity:** MEDIUM / TIME-SENSITIVE  
**Deadline:** GitHub forces Node.js 24 default from **June 2nd, 2026** (6 days from now)  
**Current state:** `actions/checkout@v4` runs on Node.js 20 — GitHub warns this "may not work as expected" after the cutover.

The workflow will likely continue to work (GitHub provides an opt-out env var temporarily), but the warning will persist and the runner will eventually remove Node.js 20 on **September 16th, 2026**.

**Required action:** Update `.github/workflows/tooladvisor-guard.yml`:
```yaml
# Current:
uses: actions/checkout@v4

# Fixed (if v4 has been updated to support Node 24):
uses: actions/checkout@v4  # check for latest patch: actions/checkout@v4.2.x or v5
```

Check the [actions/checkout releases](https://github.com/actions/checkout/releases) for a Node.js 24-compatible version. Recommend as Task 007 alongside Finding 1.

---

### Files Changed
- `tasks/done/006-check-github-actions-guard.md` — created

### Files Not Changed
- `index.html` — not touched
- `wrangler.toml` — not touched
- `directory-data.js` (PRODUCT_DB) — not touched
- `.github/workflows/` — not touched (read-only task)

### Deployment
Not performed.

---

## 2026-05-27 — Task 005: AGENT_PROTOCOL pointer

### Task
Create `AGENT_PROTOCOL.md` — a short mandatory-read file that orients every agent before it starts any task.

### Result
COMPLETED

### Files Changed
- `AGENT_PROTOCOL.md` — created (5 steps, hard rules table, quick reference)

### Files Not Changed
- `index.html` — not touched
- `wrangler.toml` — not touched
- `directory-data.js` (PRODUCT_DB) — not touched
- All other production files — not touched

### Deployment
Not performed.

---

## 2026-05-27 — Task 004: Agent Dispatcher Plan

### Task
Design and document the agent routing protocol, task file standard, and owner approval flow for all ToolAdvisor AI agent work.

### Result
COMPLETED

### Files Changed

| File | Action |
|------|--------|
| `AGENT_DISPATCHER.md` | Created — main routing protocol (10 sections) |
| `tasks/template.md` | Created — standard task file template |
| `research/004-agent-dispatcher-plan.md` | Created — design rationale, decision trees, open questions |
| `tasks/done/004-agent-dispatcher-plan.md` | Task file moved from todo → done |

### Key Decisions Documented

- **Claude Code** = conversational, read/plan/QA, small edits
- **Codex** = unattended implementation from spec, multi-file edits
- **5 task types**: research, planning, implementation, QA, data
- **10 stop conditions** that require owner escalation before proceeding
- **Approve / Reject / Revise** flow with sub-task naming convention (`NNN-a-fix`, `NNN-b-revision`)
- **Worklog entry** is mandatory for every task — enforced by `ta-postflight.sh`
- **Agents never push to git** — owner controls all commits and pushes
- `AGENT_PROTOCOL.md` is still absent; Task 005 should create it as a pointer to `AGENT_DISPATCHER.md`

### Files Not Changed
- `index.html` — not touched
- `wrangler.toml` — not touched
- `directory-data.js` (PRODUCT_DB) — not touched
- `functions/proxy.js` — not touched

### Deployment
Not performed.

---

## 2026-05-27 — Task 003: Canonical Schema QA

### Task
Verify that Task 002 canonical schema additions did not break the site.

### Method
Local HTTP server (`python3 -m http.server 8787`) + automated browser verification (Claude Preview MCP). Read-only — no files modified.

### Result: ✅ PASS

| Check | Result |
|-------|--------|
| tools-directory.html loads | ✅ |
| `window.TA_TOOLS.length === 36` | ✅ |
| Product cards render (12 of 36 shown) | ✅ |
| ISO P filter → 14 tools | ✅ |
| Milling family filter → 8 tools | ✅ |
| Search works | ✅ |
| Product detail modal renders all sections | ✅ |
| compare.html — zero JS errors | ✅ |
| ToolAdvisor.html — zero JS errors | ✅ |
| cross-reference.html — HTTP 200 | ✅ |
| All original flat fields intact on 36 records | ✅ |
| All canonical fields present on 36 records | ✅ |
| All economics flagged `economicsEstimated: true` | ✅ |
| Console errors introduced by Task 002 | 0 |

### Files Changed
- `research/003-canonical-schema-qa.md` — created (QA report)

### Files Not Changed
- `directory-data.js` — not touched
- `index.html` — not touched
- Any other production file — not touched

### Deployment
- Not performed.

---

## 2026-05-27 — Task 002: Canonical Schema Migration

### Task
Map all 36 `TA_TOOLS` records in `directory-data.js` to the canonical product schema (`research/tooladvisor-product-schema-proposal.json`).

### Changes Made

File modified: `directory-data.js`

New canonical fields added to all 36 records (computed at runtime, backward-compatible with existing UI):

| Field                  | Description                                                              |
|------------------------|--------------------------------------------------------------------------|
| `tool_type`            | Canonical enum (turning_insert, milling_insert, tap, reamer, etc.)       |
| `canonical_category`   | Canonical category enum (turning, milling, drilling, threading, tapping, reaming) |
| `product_code`         | Alias for existing `code` field                                          |
| `workpiece_materials`  | Array with primary ISO group, label, and priority                        |
| `trust`                | Object: source_tier, validation_status, confidence_score, source_name, last_checked, risk_flags |
| `economicsEstimated`   | `true` on all records — marks costTier, lifeRel, unitPrice, costPerEdge, weeklyPicks, valueIndex as synthetic |

### Trust Mapping Applied

| Source value              | source_tier  | validation_status  | risk_flags                 |
|---------------------------|--------------|--------------------|----------------------------|
| Manufacturer data (19)    | manufacturer | verified           | []                         |
| Manufacturer + reviewed (14) | manufacturer | partially_verified | [manual_review_required] |
| Generated estimate (3)    | estimated    | estimated          | [estimated_field]          |

### Tool Type Breakdown

| tool_type              | Count |
|------------------------|-------|
| turning_insert         | 18    |
| milling_insert         | 8     |
| threading_insert       | 5     |
| reamer                 | 2     |
| tap                    | 1     |
| solid_drill            | 1     |
| indexable_drill_insert | 1     |

### Data Anomalies Corrected in Canonical Layer (family field unchanged)

- **T07** (`TPMR 220408`): family=`Reaming` is a data error; canonical `tool_type` overridden to `turning_insert`. Flagged in `current-data-model-audit.md`.
- **T14** (`A-TAP 8.5x125`): family=`Drilling` is a data error; canonical `tool_type` overridden to `tap`, `canonical_category` to `tapping`.

### Files Not Changed
- `index.html` — not touched
- PRODUCT_DB / `directory-data.js` existing flat fields — all preserved unchanged
- All other HTML, JS, CSS files — not touched

### Deployment
- Not performed.

### Task File
- Moved: `tasks/todo/002-canonical-schema-migration.md` → `tasks/done/002-canonical-schema-migration.md`

---

## 2026-05-27 — Baseline Standardization

### Decision

The active project root is standardized as:
/Users/muratonder/Desktop/ToolAdvisor/

All other ToolAdvisor-related folders are considered legacy/archive unless explicitly reactivated, including:
- /Users/muratonder/Desktop/tooladvisor-v5-final/
- /Users/muratonder/Desktop/tooladvisor-v5-final/tooladvisor-deploy/
- /Users/muratonder/Desktop/tooladvisor-deploy-v2/
- any tv5 or old ToolAdvisor variants

These legacy folders must not be used for new work unless explicitly approved.

### Single Source of Truth

CLOUDFLARE_MIGRATION.md is the master decision file.
It controls:
- active project root
- deployment rules
- Cloudflare migration status
- architecture decisions
- data strategy
- PRODUCT_DB rules
- research workflow
- security rules
- implementation boundaries
- Codex / Claude Code / ChatGPT working protocol

If a decision is ambiguous or not covered by CLOUDFLARE_MIGRATION.md, work must stop and approval must be requested.
No assumptions are allowed.

### Deployment Rules

Cloudflare Pages / Wrangler is the active deployment path.
Netlify must not be used.
No deployment may be performed unless explicitly approved.

### Data Rules

PRODUCT_DB is locked.
PRODUCT_DB must not be modified in any form without explicit approval, regardless of data source.
This applies to:
- PDF extracted data
- web extracted data
- AI generated data
- manually entered data
- sample/demo data
- small corrections
- schema changes
- cleanup or normalization attempts

No extracted data may be auto-merged into PRODUCT_DB.
All new product data must first go through staging/research/review.

### Research Rules

Research outputs must remain under:
/Users/muratonder/Desktop/ToolAdvisor/research/

Expected research files may include:
- current-data-model-audit.md
- missing-fields-list.json
- category-specific-fields.json
- refactor-plan-no-code.md
- cutting-tool-site-research.md
- tooladvisor-product-schema-proposal.json
- filter-model-proposal.json
- product-card-detail-recommendations.md
- implementation-roadmap.md

If any research file is missing, report it only.
Do not create, regenerate or invent missing research files unless explicitly instructed.

### Production File Rules

Production files are not approved for modification yet.
Do not modify:
- index.html
- JS files
- CSS files
- data files
- PRODUCT_DB
- CROSSREF_DB
- Cloudflare config files
- deployment files

Do not rename, refactor, move, overwrite or clean up existing files during standardization.

### Current State

Research outputs were generated for:
- cutting-tool site structure research
- current data model audit
- filter model proposal
- product schema proposal
- product card/detail recommendations
- no-code refactor plan
- implementation roadmap

No production code change is approved yet.
No PRODUCT_DB change is approved yet.
No deployment is approved yet.

### Next Step

1. Confirm active root contents.
2. Confirm CLOUDFLARE_MIGRATION.md exists in the active root.
3. Confirm this TOOLADVISOR_WORKLOG.md exists in the active root.
4. Confirm /research/ contents.
5. Review research outputs manually.
6. Decide implementation order before any code change.

### Worklog Entry

Status:
- Active project root standardized.
- Legacy folder policy defined.
- Cloudflare-only deployment rule confirmed.
- PRODUCT_DB lock confirmed.
- Research file handling rule confirmed.
- Production modification freeze confirmed.

Files changed:
- TOOLADVISOR_WORKLOG.md created.

Files not changed:
- index.html
- PRODUCT_DB
- JS/CSS/data files
- deployment files

Deployment:
- Not performed.

Risk:
- Active deploy source must still be verified before deleting or archiving legacy folders.
- No legacy folder should be deleted until the active Cloudflare deployment source is confirmed.

---

## 2026-05-27 — Task 001: Research Review

### Task
001-review-research-outputs.md

### Yapılan
Tüm research/ dosyaları okundu ve incelendi:
- current-data-model-audit.md
- cutting-tool-site-research.md
- implementation-roadmap.md
- product-card-detail-recommendations.md
- refactor-plan-no-code.md
- missing-fields-list.json
- tooladvisor-product-schema-proposal.json
- filter-model-proposal.json
- category-specific-fields.json

### Çıktı
research/001-research-review-decision.md oluşturuldu.

### Özet Karar
- Hemen: canonical schema migration, trust metadata, filter registry
- Bekle: detail modal, compare matrix, cross-reference, Supabase
- Yasak: synthetic economics gösterimi, bulk scraping, PRODUCT_DB değişikliği
- İlk implementation sırası: schema → trust → filters → cards → detail → compare → cross-ref

### Dosya Değişiklikleri
- research/001-research-review-decision.md oluşturuldu
- tasks/todo/001-review-research-outputs.md → tasks/done/ taşındı
- TOOLADVISOR_WORKLOG.md güncellendi

### Deploy
Yapılmadı.
