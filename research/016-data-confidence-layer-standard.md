# Research 016 — Data Confidence Layer Standard

**Date:** 2026-05-28
**Type:** Planning
**Scope:** Catalog card / Detail modal / Compare screen — trust/confidence display unification
**Input files:** `directory-app.jsx`, `compare.html`, `research/015-final-regression-qa.md`
**Status:** APPROVED FOR IMPLEMENTATION → see tasks/done/016

---

## 1. Current State Audit

Three surfaces currently display trust/confidence data. Each evolved independently.

### 1a. Catalog card (compact `TrustBadge` — `directory-app.jsx`)

| Element | Current implementation |
|---------|----------------------|
| Bar width | w-14 (56px) |
| Bar height | h-1.5 (6px) |
| Bar track bg | `bg-surface-container-low` |
| Bar fill color | threshold: ≥90% green · ≥80% amber · <80% red |
| Score display | `{score}%` bold |
| Status indicator | Icon only (no text): `verified` / `info` / `help` |
| Tooltip | Dark pill: `{sourceTier} · {sourceName} · Checked: {date}` |
| Risk flags | **Not shown** |
| Economics est. | `(est.)` in text-[9px] text-outline after `~€X/edge` |
| Section label | "Data confidence" (uppercase, tracking-widest, text-outline) |

### 1b. Detail modal (expanded `TrustBadge` — `directory-app.jsx`)

| Element | Current implementation |
|---------|----------------------|
| Bar width | w-24 (96px) |
| Bar height | h-2 (8px) |
| Bar track bg | `bg-surface-container-low` |
| Bar fill color | Same threshold logic as card |
| Score display | `{score}%` bold (text-sm) |
| Status indicator | Icon + text label: "Verified" / "Partial" / "Estimated" |
| Source tier row | "SOURCE TIER" label → `SOURCE_TIER_LABEL[source_tier]` |
| Source name row | "SOURCE" label → `source_name` |
| Checked row | "CHECKED" label → `last_checked` (ISO date) |
| Risk flags | Amber chip list with `warning` icon + `RISK_FLAG_LABEL[flag]` |
| Economics est. | Separate italic disclaimer: "Cost figures are estimates from published data ranges…" |
| Section label | "Data confidence" (uppercase, tracking-widest, text-outline) |

### 1c. Compare screen (static HTML — `compare.html`)

| Element | Current implementation |
|---------|----------------------|
| Bar width | w-16 (64px) — **different from both card and modal** |
| Bar height | h-1.5 (6px) |
| Bar track bg | `bg-border-warm` — **different from card/modal** |
| Bar fill color | **Hardcoded** `bg-iso-n-green` always — **not threshold-driven** |
| Score display | `{score}%` bold ✅ same |
| Status indicator | `verified` icon + "Verified" text — **always Verified, no conditional** |
| Source tier row | **Absent** — no SOURCE TIER row |
| Source name row | "Source" row → "Manufacturer data" hardcoded |
| Checked date | Merged into Source row as `Brand · YYYY-MM` |
| Risk flags | "None" plain text — **no chip component, no conditional** |
| Economics est. | `(est.)` suffix on `X/5` value ✅ same concept |
| Disclaimer | Header badge: "Cost tier and tool life are estimates…" ✅ |
| Data source | **Static HTML — not connected to `window.TA_TOOLS`** |

---

## 2. Divergence Map

| Element | Card | Modal | Compare | Problem |
|---------|------|-------|---------|---------|
| Bar track bg | `bg-surface-container-low` | `bg-surface-container-low` | `bg-border-warm` | ⚠️ Compare off-spec |
| Bar width | 56px | 96px | 64px | ⚠️ No standard size rule |
| Fill color logic | Threshold-driven | Threshold-driven | Always green | ❌ Compare shows wrong state for low-confidence tools |
| Status badge | Icon only | Icon + text | Icon + text always-Verified | ❌ Compare can't show Partial/Estimated |
| Source tier row | Tooltip only | Dedicated row | **Missing** | ⚠️ Compare omits tier |
| Risk flags display | Hidden | Amber chips | "None" text | ⚠️ Inconsistent; compare can't show chip list |
| Economics caveat | `(est.)` inline | Italic disclaimer | `(est.)` inline + header badge | ✅ Functionally consistent — minor wording divergence |
| Label casing | "Data confidence" | "Data confidence" | "DATA CONFIDENCE" | ✅ Acceptable — different context (matrix vs card) |
| Date format | ISO `YYYY-MM-DD` | ISO `YYYY-MM-DD` | `Brand · YYYY-MM` (no day) | ⚠️ Minor — month precision vs day precision |

---

## 3. Proposed Standard

### 3a. Trust status vocabulary (canonical — 3 states)

| `validation_status` | Display label | Icon | Color token |
|--------------------|---------------|------|-------------|
| `verified` | **Verified** | `verified` (filled) | `text-iso-n-green` / `bg-iso-n-green` |
| `partially_verified` | **Partial** | `info` | `text-iso-m-amber` / `bg-iso-m-amber` |
| `estimated` | **Estimated** | `help` | `text-on-surface-variant` / `bg-iso-k-red` |
| null (fallback) | Score-only | derived from score | threshold: ≥90 → green, ≥80 → amber, <80 → red |

**Rule:** `validation_status` always takes precedence over score-threshold coloring.

---

### 3b. Confidence bar — standard dimensions per context

| Context | Width | Height | Track bg |
|---------|-------|--------|----------|
| Compact (card, list row, compare row) | **56px (w-14)** | **6px (h-1.5)** | `bg-surface-container-low` |
| Full (modal expanded) | **96px (w-24)** | **8px (h-2)** | `bg-surface-container-low` |

**Change needed:** Compare row track bg → change `bg-border-warm` to `bg-surface-container-low`.
**Change needed:** Compare row bar width → change `w-16` to `w-14`.

---

### 3c. Bar fill color — threshold rule

```
isVerified  = validation_status === 'verified'           || (!status && score ≥ 90)
isPartial   = validation_status === 'partially_verified' || (!status && score ≥ 80 && !isVerified)
isEstimated = (everything else)

barCls:
  isVerified  → bg-iso-n-green
  isPartial   → bg-iso-m-amber
  isEstimated → bg-iso-k-red
```

**Change needed:** Compare bar fill → replace `hardcoded bg-iso-n-green` with conditional class (or data attribute-driven via inline style in static HTML).

---

### 3d. Status badge — display rules

**Compact surfaces (card, compare row):**
- Icon (`verified` / `info` / `help`) + **no text label**
- Icon color class from table 3a
- Tooltip on hover (card has it; compare can omit for space)

**Full surface (modal):**
- Icon + text label ("Verified" / "Partial" / "Estimated")
- Icon + label same color class from table 3a

---

### 3e. Source tier → human label mapping (canonical)

```js
SOURCE_TIER_LABEL = {
  manufacturer:           'Manufacturer data',
  authorized_distributor: 'Authorized distributor',
  neutral_data_platform:  'Licensed data platform',
  public_catalog_pdf:     'Public catalogue PDF',
  manual_review:          'Manual review',
  estimated:              'Estimated',
  unknown:                'Unknown source',
}
```

**Display rule:**
- Modal: show SOURCE TIER row → `SOURCE_TIER_LABEL[source_tier]`
- Card tooltip: include `SOURCE_TIER_LABEL[source_tier]` in tooltip string ✅ (already done)
- Compare SOURCE row: show `SOURCE_TIER_LABEL[source_tier]` as primary text (currently hardcoded "Manufacturer data" — acceptable until Phase B dynamic rewire)

---

### 3f. Source display in compare row (current static, pre-Phase B)

```
Primary: SOURCE_TIER_LABEL[source_tier]     e.g. "Manufacturer data"
Secondary: Brand · YYYY-MM                  e.g. "Sandvik · 2024-08"
```
No separate SOURCE TIER row needed in compare (column space is limited). Merge is acceptable.
Phase B: dynamically derived from `t.trust.source_tier` + `t.trust.last_checked`.

---

### 3g. Risk flags — display rules

| Context | Display rule |
|---------|-------------|
| Catalog card | **Hidden** — too much visual noise at card density |
| Detail modal | Full amber chip list with `warning` icon + RISK_FLAG_LABEL text. Empty → no section rendered. |
| Compare row (DATA RISKS) | If empty → plain "None" text (current ✅). If flags exist → amber chips matching modal style. Currently static "None" is acceptable; Phase B should render chips. |

**Chip style (both modal and compare):**
```
bg-iso-m-amber/10 text-iso-m-amber border border-iso-m-amber/25
px-2 py-0.5 rounded-full text-[10px] font-bold
flex items-center gap-1
icon: warning, size 11
```

---

### 3h. Economics estimated display rules

**Rule:** When `economicsEstimated === true`, ALL numeric economics values are marked estimated.

| Surface | Economics est. display |
|---------|----------------------|
| Card | `(est.)` in `text-[9px] text-outline` after cost-per-edge — ✅ current |
| Card cost tier (€€€€) | `title` tooltip on hover stating estimates caveat — ✅ current |
| Modal | Italic disclaimer paragraph: *"Cost figures are estimates from published data ranges — not commercial pricing."* — ✅ current |
| Compare cost tier | `(est.)` suffix after `X/5` — ✅ current |
| Compare header | Disclaimer badge: *"Cost tier and tool life are estimates from published data — not commercial pricing"* — ✅ current |

**No changes needed** to economics est. display — all three surfaces are functionally consistent.

---

### 3i. Date format standard

**Standard:** `YYYY-MM-DD` everywhere (ISO 8601, day precision).

- Card tooltip: already uses `last_checked` which is `YYYY-MM-DD` (from directory-data.js `trust` block)
- Modal CHECKED row: uses `last_checked` directly (`YYYY-MM-DD`) ✅
- Compare SOURCE row: currently shows `Brand · YYYY-MM` (no day) — **acceptable for Phase A** since hardcoded; Phase B should use `last_checked.substring(0, 7)` for space reasons or full date.

---

## 4. Implementation Surface Map

Changes needed to reach full compliance. Ordered by priority:

### Priority 1 — Bar track background (cosmetic, low risk)

| File | Location | Change |
|------|----------|--------|
| `compare.html` | DATA CONFIDENCE row, 3 value cells | `bg-border-warm` → `bg-surface-container-low` |

### Priority 2 — Bar width (cosmetic, low risk)

| File | Location | Change |
|------|----------|--------|
| `compare.html` | DATA CONFIDENCE row, 3 value cells | `w-16` → `w-14` |

### Priority 3 — Conditional fill color in compare (medium)

Currently hardcoded `bg-iso-n-green`. For Phase A (static HTML) this is acceptable since all 3 hardcoded tools are "verified". **No change needed now** — document as Phase B requirement.

**Phase B requirement:** Bar fill class must be derived from trust data, not hardcoded.

### Priority 4 — Risk flags as chips in compare (low, Phase B only)

Currently "None" for all 3 tools — correct for current hardcoded data. No change needed.

**Phase B requirement:** DATA RISKS row should render amber chips if `t.trust.risk_flags.length > 0`.

### Priority 5 — SOURCE TIER row in compare (Phase B only)

Currently absent from compare matrix. Acceptable for static Phase A.

**Phase B requirement:** Add a SOURCE TIER row above SOURCE row, or merge into SOURCE row as a sub-label.

---

## 5. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Bar track bg change visible in production | Low | Pure cosmetic; `bg-surface-container-low` is slightly lighter than `bg-border-warm`; no layout impact |
| Bar width change shifts layout | Low | 2px narrower (w-14=56px vs w-16=64px); flex layout absorbs it |
| Hardcoded color in compare masks bad data | Medium | Currently all 3 compare tools are verified; becomes a real risk when compare is dynamic (Phase B) |
| SOURCE TIER absence misleads users | Low | Users seeing compare screen get "Manufacturer data" as source name — same info, less meta |
| compare.html changes break zebra/matrix | Low | Only touching inner span sizes inside existing row divs |

---

## 6. Files Affected by Implementation

### Phase A (Priority 1+2 only — cosmetic fixes)
| File | Change |
|------|--------|
| `compare.html` | 3 × `bg-border-warm` → `bg-surface-container-low` in DATA CONFIDENCE row |
| `compare.html` | 3 × `w-16` → `w-14` in DATA CONFIDENCE row |

### Phase B (dynamic rewire — separate task)
| File | Change |
|------|--------|
| `compare.html` | Full rewire to read `window.TA_TOOLS` instead of hardcoded values |
| `directory-app.jsx` | No change — TrustBadge already compliant with this standard |

### No changes needed
| File | Reason |
|------|--------|
| `directory-app.jsx` | TrustBadge (compact + expanded) is already standard-compliant |
| `directory-data.js` | `trust` schema already canonical — no changes |
| `polish.css` | No trust-related CSS needed |

---

## 7. Recommended Next Tasks

| Task | Scope | Effort |
|------|-------|--------|
| **Task 017 — Apply Phase A bar fixes to compare.html** | 2 × attribute changes in compare.html | ~5 min |
| **Task 018 — Phase B compare dynamic rewire** | Full compare.html JS + data binding | Medium (separate planning task first) |

---

## Summary

The Data Confidence layer is **90% consistent** across surfaces today. Two minor visual divergences exist in `compare.html` (bar track color, bar width) that are worth fixing in a small Phase A task. The bigger structural gaps (conditional color, risk chip rendering, source tier row) belong to Phase B dynamic rewire and should not block the current static compare screen.

**The canonical standard for trust display is:**

```
compact:  [bar 56×6px, surface-container-low track] [score%] [status-icon]  (+ tooltip)
expanded: [bar 96×8px, surface-container-low track] [score%] [status-icon + status-label]
          SOURCE TIER | SOURCE | CHECKED | risk-chips
```

`directory-app.jsx` already implements this standard correctly.  
`compare.html` Phase A needs 2 × minor attribute fixes.
