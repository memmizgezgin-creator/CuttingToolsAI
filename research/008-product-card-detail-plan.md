# Research 008 — Product Card & Detail Modal Implementation Plan

**Date:** 2026-05-28  
**Task:** 008-product-card-detail-plan  
**Type:** Planning (no code changes)  
**Author:** Claude Code  
**Input files read:**
- `research/product-card-detail-recommendations.md`
- `research/001-research-review-decision.md`
- `directory-app.jsx` (current card + modal rendering)
- `research/003-canonical-schema-qa.md` (confirmed canonical fields present on all 36 records)

---

## Current State Audit

### Product Card (grid view) — fields currently rendered

| Field | Source | Notes |
|-------|--------|-------|
| `t.brand` | flat | SANDVIK, MITSUBISHI… |
| `t.code` | flat | product code |
| `t.iso` | flat | single letter P/M/K/N/S/H |
| `t.family` | flat | Turning / Milling / Drilling… |
| `t.op` | flat | Finishing / Medium / Roughing… |
| `t.grade` | flat | GC4325, etc. |
| `t.vcMin/vcMax` | flat | cutting speed range |
| `t.fMin/fMax` | flat | feed range |
| `t.apMin/apMax` | flat | depth of cut range |
| `t.bestFor` | flat | one-line description |
| `t.stability` | flat | chip: "stable stability" |
| `t.coolant` | flat | chip: "wet coolant" |
| `t.costTier` | **synthetic** | rendered as €€€ — NO estimated label |
| `t.costPerEdge` | **synthetic** | rendered as "€0.xx/edge" — NO estimated label |
| `t.weeklyPicks` | **synthetic** | rendered as "N picks" — NO estimated label |
| `t.confidence` | flat | confidence bar |
| `t.source` | flat | tooltip on confidence bar |
| `t.lastVerified` | flat | in tooltip |
| `t.supply` | flat | "N suppliers" |
| `t.equivIds` | flat | equivalents hint |

**Not yet shown on card:** `t.trust`, `t.tool_type`, `t.workpiece_materials`, `t.economicsEstimated`

### Detail Modal — fields currently rendered

Everything from the card header, plus:
- `t.bestFor` (subtitle)
- ISO chip + ISO label (full text: "ISO P · Steel")
- `t.grade`, `t.op`, `t.stability`, `t.coolant` as tags
- Vc/feed/ap as styled `<Spec>` blocks
- `t.confidence` bar + `t.source` · `t.lastVerified` text
- `t.supply` count
- Equivalents list (from `equivIds`)
- Peer picks section (from `peerIds`)
- "Find equivalents" → cross-reference.html
- "Add to compare" → compare.html

**Not shown in modal:** `t.trust` object (source_tier, validation_status, confidence_score, source_name, source_url, last_checked, risk_flags), `t.tool_type`, `t.workpiece_materials`, `t.economicsEstimated`

---

## What Must Change: Field-by-Field Plan

### 1. Product Card

#### Add: tool_type label
- **Source:** `t.tool_type` (canonical, e.g. `"turning_insert"`)
- **Display:** Human-readable chip next to the ISO chip.
  - Mapping: `turning_insert` → "Turning insert", `milling_insert` → "Milling insert", `tap` → "Tap", `solid_drill` → "Solid drill", `indexable_drill_insert` → "Indexable drill", `threading_insert` → "Threading insert", `reamer` → "Reamer"
- **Position:** Header row, after the ISO chip (grid view); after family·op line (list view)

#### Fix: Economics estimated warning
- **Source:** `t.economicsEstimated` (always `true` for all 36 records)
- **Display:** Add a small `~` prefix or `(est.)` label to `costPerEdge` and `costTier`.
- **Exact change in grid view:** `€{t.costPerEdge}/edge` → `~€{t.costPerEdge}/edge (est.)`
- **Tooltip on hover:** "Economics are estimated from published data ranges. Not commercial pricing."
- **WeeklyPicks:** Add `(est.)` or remove entirely in Phase 1 — this is synthetic engagement data, not real analytics. Recommend: hide the "trending_up / N picks" display until real data is available.

#### Add: validation_status badge
- **Source:** `t.trust.validation_status` ("verified" | "partially_verified" | "estimated")
- **Display:** Small icon badge near the confidence bar.
  - `verified` → green checkmark icon, label "Verified"
  - `partially_verified` → amber info icon, label "Partial"
  - `estimated` → grey dash icon, label "Estimated"
- **Position:** Next to the existing confidence bar, replacing the generic "Data confidence" label
- **Do NOT show:** source_tier, risk_flags on the card (too verbose for compact card)

#### Keep unchanged:
- All flat fields currently shown (brand, code, iso, family, op, grade, Vc/feed/ap, bestFor, stability, coolant, supply, equivIds)
- CardActions (Compare, Shortlist, View Details buttons)

---

### 2. Detail Modal

#### Add: Identity block expansion
- **Add `t.tool_type`** below brand/family line in header.
  - Display: "Turning insert" (human-readable, from mapping above)
- **Add `t.product_code`** if different from `t.code`.
  - Most records: `product_code === code`. Skip if identical.
- **Keep:** code as h2, brand · family as eyebrow, ISO chip + label, grade/op/stability/coolant tags.

#### Add: Trust section (replaces current flat confidence display)
Replace the current "Data confidence" block with a richer trust section:

| Field | Source | Display |
|-------|--------|---------|
| Confidence score | `t.trust.confidence_score` | Same bar — percentage |
| Validation status | `t.trust.validation_status` | "Verified / Partially verified / Estimated" with icon |
| Source tier | `t.trust.source_tier` | Human-readable: "Manufacturer data / Authorized distributor / Public catalogue PDF / Manual review / Estimated" |
| Source name | `t.trust.source_name` | Text |
| Source URL | `t.trust.source_url` | Link if not null |
| Last checked | `t.trust.last_checked` | "Checked: YYYY-MM" |
| Risk flags | `t.trust.risk_flags` | Only show if array is non-empty. Render as amber warning chips. |

**Human-readable source_tier mapping:**
- `manufacturer` → "Manufacturer data"
- `authorized_distributor` → "Authorized distributor"
- `neutral_data_platform` → "Licensed data platform"
- `public_catalog_pdf` → "Public catalogue PDF"
- `manual_review` → "Manual review"
- `estimated` → "Estimated"
- `unknown` → "Unknown source"

**Risk flag labels (for amber chips):**
- `economics_estimated` → "Economics estimated"
- `stale_source` → "Source may be stale"
- `distributor_only` → "Distributor source only"
- `conflicting_sources` → "Conflicting sources"
- `missing_dimensions` → "Dimensions incomplete"
- `missing_grade` → "Grade/coating incomplete"
- `operation_unclear` → "Operation scope unclear"
- `material_unclear` → "Material fit unclear"
- `manual_review_required` → "Manual review required"

#### Add: economicsEstimated disclaimer in modal
In the Supply & availability section, add a note:
> "Cost figures (cost tier, per-edge estimate) are synthetic estimates based on published data ranges, not commercial pricing."

#### Add: workpiece_materials section (if non-empty)
- **Source:** `t.workpiece_materials[]` (array of material group codes, e.g. `["P10","P25","M15"]`)
- **Display:** Label "Workpiece materials", then chips per entry.
- **Skip if empty array** (some records may not have this populated)
- **Position:** Below the Application range tags in the header.

#### Keep unchanged:
- Vc/feed/ap Spec blocks (3-column grid)
- Equivalents section (equivIds)
- Peer picks section (peerIds)
- "Find equivalents" + "Add to compare" footer buttons

---

### 3. Compare Screen

**Current state (compare.html):** Visually strong but hard-coded for turning inserts. Contains "Buy" actions — must be removed.

#### Phase 1 changes (safe, no PRODUCT_DB):
1. **Remove "Buy" / purchase action buttons** — replacing with "View supplier" label only (non-transactional). This is a CLAUDE.md constraint: brand-neutral, no marketplace.
2. **Add trust row** at the bottom of any compare matrix: Confidence %, validation_status, source_tier.
3. **Add tool_type row** in the Identity section of the compare matrix.

#### Phase 2 changes (schema-driven, after Phase 1 verified):
- Category-aware row groups (see section below)
- Cross-category comparison guard (warn if mixing turning_insert vs tap)
- Full row sets per tool_type as defined in `product-card-detail-recommendations.md`

#### Category-aware compare row groups (Phase 2 spec):
Each row group renders only if both/all compared tools share the same `canonical_category`.

**Identity (all categories):**
- Brand, Code, Tool type, ISO material group, Operation

**Geometry — turning_insert:**
- Insert shape, ISO/ANSI code, Clearance angle, Tolerance, Size/IC, Corner radius, Chipbreaker

**Geometry — tap:**
- Thread size + pitch, Thread standard, Tap type, Hole type, Flute type, Chamfer form, Tolerance

**Geometry — solid_drill / indexable_drill_insert:**
- Diameter, Flute length, L/D ratio, Point angle, Shank type, Coolant-through

**Grade/coating (all categories):**
- Grade, Coating, Tool material

**Application fit (all categories):**
- ISO P/M/K/N/S/H suitability chips, Operation envelope, Workpiece materials

**Cutting envelope (all categories where verified):**
- Vc range, Feed range, ap/ae range — label all as estimated where `economicsEstimated: true`

**Trust/source (all categories):**
- Confidence score, Validation status, Source tier, Last checked, Risk flags

---

### 4. Trust Badge Display — Design Spec

A **TrustBadge** component replaces the current `<Confidence>` component on cards and modal.

**Compact form (card use):**
```
[▬▬▬▬▬] 92%  ✓ Verified
         ↑ hover tooltip shows source_tier + source_name + last_checked
```
- Color: green for verified (score ≥ 85 + validation_status = verified), amber for partially_verified, grey for estimated
- Icon: ✓ (verified) / ~ (partially_verified) / — (estimated)
- Tooltip: "Source: Manufacturer data · Sandvik · Checked 2024-08"

**Expanded form (modal use):**
```
Data Confidence: 92%      [✓ VERIFIED]
Source: Manufacturer data — Sandvik catalogue
Checked: 2024-08
[⚠ Economics estimated]   [⚠ Manual review required]   ← only if risk_flags non-empty
```

**Score thresholds:**
| Range | Color | Icon | Label |
|-------|-------|------|-------|
| 85–100 + verified | Green | ✓ | Verified |
| 70–84 or partially_verified | Amber | ~ | Partial |
| <70 or estimated | Grey | — | Estimated |

---

### 5. economicsEstimated — User Display Spec

All 36 records have `economicsEstimated: true`. This must be communicated clearly.

**On product card:**
- `costTier` (€€€) → render unchanged, but add a small grey `est.` label beneath: "Cost tier (estimated)"
- `costPerEdge` → prepend `~`: "~€0.43/edge"
- `weeklyPicks` → **hide in Phase 1**. Replace with nothing or a neutral "Popular" label if present. Synthetic engagement data should not appear as real signal.

**On detail modal:**
- In the Supply & availability section, add a grey italic line: "Cost estimates are derived from published data ranges. Not commercial pricing."
- costTier rendered as: "€€€ (estimated)" with tooltip explaining derivation

**On compare matrix:**
- Cutting envelope row group labelled: "Cutting Envelope (estimated data)"
- Economics rows (costTier, costPerEdge): grey out or add "(est.)" suffix

---

## Implementation Order (no PRODUCT_DB changes)

All steps below touch only `directory-app.jsx`. No other locked file changes.

### Phase 1 — Trust & Economics corrections (highest priority, lowest risk)
1. **Add TrustBadge component** replacing `<Confidence>` everywhere
   - Sources: `t.trust.confidence_score`, `t.trust.validation_status`, `t.trust.source_tier`, `t.trust.source_name`, `t.trust.last_checked`
   - Backward-compatible: falls back to `t.confidence` / `t.source` if `t.trust` missing
2. **Mark economics as estimated** on product card
   - `~€{t.costPerEdge}/edge` with tooltip
   - Hide `weeklyPicks` trending display
3. **Add economics disclaimer** to detail modal supply section
4. **Add risk_flags chips** to detail modal trust section (only when non-empty)

### Phase 2 — Tool type + workpiece materials display
5. **Add tool_type chip** to card header and modal identity block
6. **Add workpiece_materials chips** to modal (below ISO chip row)

### Phase 3 — Compare cleanup
7. **Remove "Buy" / purchase actions** from compare.html
8. **Add trust row** to existing compare matrix
9. **Add tool_type row** to identity section of compare

### Phase 4 — Category-aware compare (requires Phase 1–3 verified)
10. **Cross-category warning** in compare (warn if mixing canonical_categories)
11. **Category-specific row groups** in compare matrix per tool_type
    - Start with turning_insert (18 records — largest group)
    - Then tap (5 records), threading_insert (5 records), milling_insert (8 records)

---

## Files That Need Changing

| File | Phase | Changes |
|------|-------|---------|
| `directory-app.jsx` | 1–4 | Add TrustBadge, economics labels, tool_type chip, workpiece_materials, compare cleanup |
| `compare.html` | 3 | Remove Buy actions; add trust + tool_type rows |

**Files that do NOT need changing for any of the above:**
- `directory-data.js` — canonical schema already applied by Task 002 ✅
- `index.html` — locked, no changes
- `wrangler.toml` — no deployment changes
- `functions/proxy.js` — widget unchanged
- `ToolAdvisor.html` — no advisor UI changes in this plan

---

## Risks

### Risk 1: `t.trust` missing on older / not-yet-migrated records
- **Likelihood:** Low — Task 002 applied canonical fields to all 36 records, confirmed by Task 003 QA.
- **Mitigation:** TrustBadge component must fallback: `const score = t.trust?.confidence_score ?? t.confidence`. Never crash if `trust` is undefined.

### Risk 2: economics display change feels like a step backwards
- **Likelihood:** Medium — users/owner may feel that adding "est." warnings makes the site look less polished.
- **Mitigation:** Design the estimated label as small grey italic suffix, not a banner warning. The goal is honest communication, not alarmism. Present it as a professional transparency choice.

### Risk 3: weeklyPicks removal breaks existing UI layout
- **Likelihood:** Low — the trending_up row is an independent `<div>` block in the card; removing it just shifts the remaining elements down within the economics row.
- **Mitigation:** Review card height after removal. May need a small bottom padding adjustment.

### Risk 4: Compare page "Buy" removal breaks user flow
- **Likelihood:** Low — the "Buy" action in compare was never functional (links to external but product is brand-neutral). Removal does not remove product comparison functionality.
- **Mitigation:** Confirm with owner before removal. The compare.html file is not locked but is UI-critical.

### Risk 5: tool_type chip overloads the card header row
- **Likelihood:** Medium — the header row already has brand, code, ISO chip. Adding "Turning insert" chip makes it crowded on small screens.
- **Mitigation:** Use abbreviated labels on card: "T-insert", "M-insert", "Tap", "Drill", "Thread". Full label only in detail modal. Or show as a smaller secondary badge below the header row.

### Risk 6: workpiece_materials chips empty for some records
- **Likelihood:** Low — Task 002 mapped all 36 records. But if any record has `workpiece_materials: []`, the section must not render.
- **Mitigation:** Render section only if `t.workpiece_materials?.length > 0`.

### Risk 7: directory-app.jsx is a single 1200+ line file
- **Likelihood:** Certain — this is a known constraint (in-browser Babel, no build step, single JSX file).
- **Mitigation:** All changes are additive (new components, new prop reads). Avoid large refactors. Add TrustBadge and any new components as standalone functions at the top of the components section (before ToolCard). Test locally with preview server before any commit.

---

## Pre-implementation Checklist (for the implementation agent)

Before starting any code change:
- [ ] Run `./scripts/ta-preflight.sh` — must PASS
- [ ] Read `CLOUDFLARE_MIGRATION.md`
- [ ] Read `TOOLADVISOR_WORKLOG.md` (last 10 entries)
- [ ] Start local preview server (`python3 -m http.server 8787`) and confirm 36 records load
- [ ] Confirm `window.TA_TOOLS[0].trust` exists in browser before writing trust-dependent code

Do not:
- [ ] Touch `directory-data.js` base records
- [ ] Touch `index.html`
- [ ] Touch `wrangler.toml`
- [ ] Deploy
- [ ] Add Netlify config

---

## Summary

The canonical schema from Task 002 is already in place on all 36 records. The data is ready. The implementation work is entirely in `directory-app.jsx` (and one small cleanup in `compare.html`).

**Most critical Phase 1 changes:**
1. Replace flat confidence display with trust object fields (validation_status, source_tier, risk_flags)
2. Mark economics as estimated — users should not mistake synthetic cost figures for real commercial pricing
3. Show tool_type as a human-readable chip

These three changes make the UI honest about data quality, which is the platform's competitive claim as a brand-neutral professional tool.

Phase 2–4 are well-defined but should not block Phase 1 shipment.
