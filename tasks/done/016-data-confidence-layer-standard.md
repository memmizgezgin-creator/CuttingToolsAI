# Task 016 — Data Confidence Layer Standardization

**Status:** done
**Type:** planning
**Created:** 2026-05-28
**Approved by:** Owner

## Goal
Catalog, detail modal ve compare ekranında kullanılan trust/confidence görüntüleme mantığını tek standart hale getir. Kod yazmadan önce plan çıkar.

## Read First
- CLOUDFLARE_MIGRATION.md ✅
- TOOLADVISOR_WORKLOG.md ✅
- AGENT_PROTOCOL.md ✅
- AGENT_DISPATCHER.md ✅

## Input Files Analysed
- `directory-app.jsx` — TrustBadge (compact + expanded), TOOL_TYPE_LABEL, SOURCE_TIER_LABEL, RISK_FLAG_LABEL
- `compare.html` — DATA CONFIDENCE row, SOURCE row, DATA RISKS row (static HTML)
- `research/015-final-regression-qa.md` — current QA baseline

## Output
- `research/016-data-confidence-layer-standard.md` ✅

## Files Changed
| File | Action |
|------|--------|
| `research/016-data-confidence-layer-standard.md` | created — full standard specification |
| `tasks/done/016-data-confidence-layer-standard.md` | this file |
| `TOOLADVISOR_WORKLOG.md` | updated |

## Files NOT Changed
- `directory-app.jsx` ✅ (read-only analysis)
- `directory-data.js` ✅ (locked)
- `compare.html` ✅ (read-only analysis — Phase A fixes → Task 017)
- `index.html` ✅ (locked)

## Key Findings

### Current divergences in compare.html vs TrustBadge standard
| Element | Standard (card/modal) | Compare (current) | Status |
|---------|----------------------|-------------------|--------|
| Bar track bg | `bg-surface-container-low` | `bg-border-warm` | ⚠️ Fix in Task 017 |
| Bar width | w-14 (56px) | w-16 (64px) | ⚠️ Fix in Task 017 |
| Fill color logic | Threshold-driven | Hardcoded always-green | ❌ Phase B only |
| Status badge | Conditional | Always "Verified" | ❌ Phase B only |
| SOURCE TIER row | Present (modal) | Absent | Phase B only |
| Risk flags | Chips (modal) / hidden (card) | "None" text | Phase B only |

### TrustBadge (directory-app.jsx) is already standard-compliant ✅

### Canonical status vocabulary
- `verified` → "Verified" | icon: `verified` | color: green
- `partially_verified` → "Partial" | icon: `info` | color: amber
- `estimated` → "Estimated" | icon: `help` | color: grey/red

### Bar standard
- Compact: 56×6px, track: `bg-surface-container-low`
- Full: 96×8px, track: `bg-surface-container-low`

## Recommended Next Tasks
- **Task 017** — Apply Phase A bar fixes to compare.html (2 attribute changes)
- **Task 018** — Phase B compare dynamic rewire (separate planning task first)
