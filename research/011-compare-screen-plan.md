# Research 011 — Compare Screen Trust Plan

**Date:** 2026-05-28
**Task:** 011-compare-screen-plan
**Type:** Planning (no code changes)
**Author:** Claude Code
**Input files read:**
- `compare.html` (full audit of current static matrix)
- `research/008-product-card-detail-plan.md` (Phase 3 spec from prior planning)
- `research/product-card-detail-recommendations.md` (category-aware row specs)
- `directory-app.jsx` (TrustBadge component already implemented in Task 009)

---

## Current State Audit

### Architecture fact — compare page is fully static

`compare.html` is **hardcoded static HTML**. It does not load `directory-data.js` or connect to `window.TA_TOOLS`. The three products shown (GC4325 / KCP25C / WPP20S) are sample turning inserts hand-written into the HTML.

This is the most important constraint for this plan. Any change must account for one of two approaches:

| Approach | Description | Risk | Scope |
|----------|-------------|------|-------|
| **A — Static row additions** | Add Trust / tool_type / est. economics rows as hardcoded HTML in the existing matrix. | Low — additive, same pattern as existing rows | Small, safe |
| **B — Dynamic rewire** | Connect compare page to `window.TA_TOOLS` via JS; matrix renders from real data | High — full JS rewrite of compare page | Large, separate task |

**Recommendation: Approach A for the upcoming implementation task (Task 012). Approach B as a later separate task.**

Rationale: Approach B is the right long-term direction but requires designing a compare-selection UX (how users pick which tools to compare), a JS rendering layer, and state management. That's a separate architectural decision. Approach A delivers the trust/transparency layer immediately without that risk.

---

### Existing matrix rows (current)

| Row | Current content | Zebra |
|-----|----------------|-------|
| Geometry | 80° rhomb · negative · CNMG | white |
| Grade | GC4325 / KCP25C / WPP20S + coating description | grey |
| Coating | CVD / CVD / CVD multilayer | white |
| ISO material group | ISO P+M chips / ISO P+M / ISO P | grey |
| Operation | Medium turning / Medium turning / Medium-heavy | white |
| Vc envelope | Range bar visual (scale 150–450 m/min) | grey |
| Feed envelope | Range bar visual (scale 0.10–0.60 mm/rev) | white |
| Depth envelope | Range bar visual (scale 0–6 mm) | grey |
| Interrupted cut | cmp-flag (Good / Acceptable / Good) | white |
| Tool life | 5-pip scale | grey |
| Cost tier | €€ dots | white |
| Risk level | cmp-risk badge | grey |
| Best use case | Text | white |
| Avoid when | Text | grey |

**Missing from current matrix:**
- Tool type (what category of tool this is)
- Trust / data confidence
- Source tier
- Validation status
- Risk flags
- Economics estimated disclaimer

**"Buy" actions:** There are NO buy/purchase buttons in the current compare page. The "Final recommendation" section only has "Export decision PDF (PRO)" and "Cross-reference" links. No action required here.

---

## Rows to Add

### New Row 1 — Tool type (position: after product header cards, before Geometry)

**Purpose:** Immediately visible confirmation of what type of tool is being compared. Prevents mixing categories.

**Content per column:**
- Label cell: "Tool type"
- Value cells: human-readable tool type label + canonical_category
  - Example: "Turning insert" (from `tool_type: turning_insert`)
  - Use the same `TOOL_TYPE_LABEL` mapping from `directory-app.jsx` but with full names (not abbreviated)
  - Full names: `turning_insert` → "Turning insert", `milling_insert` → "Milling insert", etc.

**HTML pattern:**
```html
<!-- Tool type -->
<div class="grid grid-cols-4 gap-0">
  <div class="p-4 border-r border-border-warm font-technical-data text-xs uppercase tracking-widest text-on-surface-variant flex items-center">Tool type</div>
  <div class="p-4 border-r border-border-warm flex items-center">
    <span class="text-sm font-medium text-on-surface">Turning insert</span>
  </div>
  <div class="p-4 border-r border-border-warm flex items-center">
    <span class="text-sm font-medium text-on-surface">Turning insert</span>
  </div>
  <div class="p-4 flex items-center">
    <span class="text-sm font-medium text-on-surface">Turning insert</span>
  </div>
</div>
```

**Zebra:** white (first new row, placed before existing Geometry which is also white → new row takes white, Geometry shifts to grey — see Zebra rebalancing note below)

---

### New Row 2 — Data confidence (position: after "Avoid when", before end of matrix)

**Purpose:** Show trust metadata per tool in the matrix, so users can see which tool's specs are most reliable.

**Content per column:**
- Label cell: "Data confidence"
- Value cells: inline confidence bar + % + validation status label

**HTML pattern (no JS — static inline style for bar width):**
```html
<!-- Data confidence -->
<div class="grid grid-cols-4 gap-0 bg-surface-container-low">
  <div class="p-4 border-r border-border-warm font-technical-data text-xs uppercase tracking-widest text-on-surface-variant flex items-center">Data confidence</div>
  <div class="p-4 border-r border-border-warm flex items-center gap-3">
    <div class="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden shrink-0">
      <div class="h-full bg-iso-n-green" style="width:96%;"></div>
    </div>
    <span class="font-technical-data text-sm font-bold text-ink-text">96%</span>
    <span class="flex items-center gap-1 text-xs font-bold text-iso-n-green">
      <span class="material-symbols-outlined" style="font-size:13px;">verified</span> Verified
    </span>
  </div>
  <!-- repeat for cols 2 and 3 -->
</div>
```

**Colour logic (static — hardcoded per score/status):**
- `verified` + score ≥ 85 → `bg-iso-n-green`, `text-iso-n-green`, icon `verified`
- `partially_verified` or score 70–84 → `bg-iso-m-amber`, `text-iso-m-amber`, icon `info`
- `estimated` or score < 70 → `bg-iso-k-red`, `text-on-surface-variant`, icon `help`

---

### New Row 3 — Source tier (position: immediately after Data confidence)

**Purpose:** Show where the data came from. Transparency about manufacturer vs distributor vs estimated.

**Content per column:**
- Label cell: "Source"
- Value cells: source tier label + source name

**HTML pattern:**
```html
<!-- Source -->
<div class="grid grid-cols-4 gap-0">
  <div class="p-4 border-r border-border-warm font-technical-data text-xs uppercase tracking-widest text-on-surface-variant flex items-center">Source</div>
  <div class="p-4 border-r border-border-warm flex flex-col gap-0.5">
    <span class="text-xs font-bold text-on-surface">Manufacturer data</span>
    <span class="text-[10px] text-on-surface-variant">Sandvik catalogue · 2024-08</span>
  </div>
  <!-- repeat for cols 2 and 3 -->
</div>
```

---

### New Row 4 — Risk flags (position: after Source, only rendered if any tool has non-empty risk_flags)

**Purpose:** Surface any data warnings directly in the compare matrix. If all tools have empty risk_flags, this row is omitted entirely (no empty row).

**HTML pattern (with flag chips):**
```html
<!-- Risk flags -->
<div class="grid grid-cols-4 gap-0 bg-surface-container-low">
  <div class="p-4 border-r border-border-warm font-technical-data text-xs uppercase tracking-widest text-on-surface-variant flex items-center">Data risks</div>
  <div class="p-4 border-r border-border-warm flex flex-wrap gap-1 items-center">
    <!-- if no flags: -->
    <span class="text-xs text-on-surface-variant">None</span>
    <!-- if flags present: -->
    <span class="flex items-center gap-1 text-[10px] font-bold bg-iso-m-amber/10 text-iso-m-amber border border-iso-m-amber/25 px-2 py-0.5 rounded-full">
      <span class="material-symbols-outlined" style="font-size:11px;">warning</span> Economics estimated
    </span>
  </div>
  <!-- repeat for cols 2 and 3 -->
</div>
```

---

### Existing Row — Cost tier: add estimated disclaimer

The current "Cost tier" row shows `€€€` dots with a fraction. Add:
- `(est.)` suffix in grey after the fraction label
- Tooltip on the label cell: `title="Estimated from published data ranges — not commercial pricing"`

**Current:**
```html
<span class="text-xs text-on-surface-variant">3/5</span>
```
**New:**
```html
<span class="text-xs text-on-surface-variant">3/5 <span class="text-[10px] text-outline">(est.)</span></span>
```
And on the label cell:
```html
<div class="p-4 ... flex items-center">
  Cost tier
  <span class="material-symbols-outlined ml-1 text-outline" style="font-size:14px;" title="Estimated from published data ranges — not commercial pricing">info</span>
</div>
```

---

## Zebra Rebalancing

Adding a "Tool type" row before Geometry disrupts the existing white/grey alternation. The row order and zebra pattern after all additions:

| # | Row | Zebra |
|---|-----|-------|
| 1 | **[NEW] Tool type** | white |
| 2 | Geometry | grey |
| 3 | Grade | white |
| 4 | Coating | grey |
| 5 | ISO material group | white |
| 6 | Operation | grey |
| 7 | Vc envelope | white |
| 8 | Feed envelope | grey |
| 9 | Depth envelope | white |
| 10 | Interrupted cut | grey |
| 11 | Tool life | white |
| 12 | Cost tier | grey |
| 13 | Risk level | white |
| 14 | Best use case | grey |
| 15 | Avoid when | white |
| 16 | **[NEW] Data confidence** | grey |
| 17 | **[NEW] Source** | white |
| 18 | **[NEW] Risk flags** | grey (only if non-empty) |

The existing matrix alternates `bg-surface-container-low` on even rows. Adding Tool type at position 1 means all existing row zebra classes must flip. **This is the most tedious part of the change** — every existing `bg-surface-container-low` line must be toggled.

**Implementation options:**
1. **Remove all zebra classes and use CSS `:nth-child(even)`** — cleaner, but requires a wrapper class and a small CSS rule in `polish.css`
2. **Manually flip all existing zebra classes** — mechanical, but safe (no CSS change)
3. **Accept off-by-one zebra for one row** — not recommended (looks broken)

**Recommendation: Option 1** — add a `.cmp-matrix` class to the outer `<div>` wrapper, then in `polish.css`:
```css
.cmp-matrix > div:nth-child(even) { background: var(--color-surface-container-low); }
.cmp-matrix > div:nth-child(odd)  { background: white; }
```
And remove all individual `bg-surface-container-low` from the row divs. This makes adding/removing rows in the future painless.

---

## Full New Matrix Row Order (implementation spec)

Inside the `<div class="bg-white rounded-2xl border border-border-warm card-shadow overflow-hidden">`:

```
[NEW] Tool type             ← insert before Geometry
Geometry
Grade
Coating
ISO material group
Operation
Vc envelope
Feed envelope
Depth envelope
Interrupted cut
Tool life
Cost tier                  ← modify: add (est.) + info icon on label
Risk level
Best use case
Avoid when
[NEW] Data confidence       ← append after Avoid when
[NEW] Source                ← append after Data confidence
[NEW] Risk flags            ← append last (omit if all empty)
```

---

## Product Header Cards: Add tool_type badge

Each of the three product header cards (top section) should show a small tool type chip to make the type immediately visible before the user even reaches the matrix.

**Current header card (simplified):**
```html
<p class="font-technical-data text-xs ...">Sandvik Coromant</p>
<h3 class="font-product-grade text-primary text-xl">GC4325</h3>
<p class="font-technical-data text-sm ...">CNMG 120408-PM</p>
```

**New (add one line below the product code):**
```html
<p class="font-technical-data text-xs ...">Sandvik Coromant</p>
<h3 class="font-product-grade text-primary text-xl">GC4325</h3>
<p class="font-technical-data text-sm ...">CNMG 120408-PM</p>
<span class="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-surface-container-low border border-border-warm text-[10px] font-technical-data uppercase tracking-widest text-on-surface-variant">
  Turning insert
</span>
```

---

## Page Header Description Update

The current header description says:
> "Match three inserts on the variables that actually drive a decision: geometry, grade, ISO coverage, operation envelope, tool life, cost tier and risk."

Proposed update (additive only — add data confidence):
> "Match three inserts on the variables that actually drive a decision: geometry, grade, ISO coverage, operation envelope, tool life, cost tier, risk and **data confidence**."

Also the disclaimer banner:
> "Sample comparison — always verify on a sample part before production"

Add a second line to make the data-quality caveat visible:
> "Cost tier and tool life figures are estimates from published data. Verify cutting data with manufacturer documentation."

---

## Files That Need Changing

| File | Change type | Description |
|------|-------------|-------------|
| `compare.html` | modify | Add 3 new matrix rows; add tool_type chips to header cards; add `(est.)` to cost tier; update header description; add `.cmp-matrix` class to outer div; update disclaimer banner |
| `polish.css` | modify | Add `.cmp-matrix` zebra CSS rule (5 lines) |

**Files that do NOT change:**
- `directory-app.jsx` — no change (TrustBadge is already there for card/modal use; compare.html uses static HTML, not React)
- `directory-data.js` — not touched (PRODUCT_DB locked)
- `index.html` — not touched
- `wrangler.toml` — not touched

---

## Implementation Scope Summary

Total changes:
- **`compare.html`**: ~80 lines added/modified across the matrix section and header cards
- **`polish.css`**: ~5 lines added (`.cmp-matrix` zebra rule)

No JavaScript changes. No new dependencies. All changes are pure HTML/CSS.

---

## Risks

### Risk 1: Static data diverges from TA_TOOLS
- **What:** The compare page shows GC4325/KCP25C/WPP20S — these are from `window.TA_TOOLS` (T01, T05 approximately) but the confidence scores, source tiers, and risk flags written into the static HTML may not exactly match what's in the trust objects.
- **Impact:** Low — users see the right *structure* and *pattern* of trust data, but the specific numbers may differ from the catalog records.
- **Mitigation:** For static Approach A, use the actual values from `directory-data.js` trust objects for T01 (Sandvik GC4325, 96%, verified, manufacturer) and look up the Kennametal and Walter records to use real numbers. If those products aren't in TA_TOOLS by those exact names, use representative values clearly labelled.

### Risk 2: Zebra rebalancing breaks existing visual rhythm
- **What:** Adding a row at the top of the matrix shifts all existing row zebra positions by one.
- **Impact:** Medium — if using Option 1 (CSS nth-child), all hardcoded `bg-surface-container-low` classes must be removed from existing rows. Missing one will create a double-stripe.
- **Mitigation:** Do a global search-replace of `bg-surface-container-low` within the matrix div only. Test visually before committing.

### Risk 3: `polish.css` already defines `.cmp-matrix` (namespace collision)
- **What:** The `.cmp-matrix` class name might already be used.
- **Impact:** Low — unlikely given the file is project-internal.
- **Mitigation:** `grep "cmp-matrix" polish.css` before adding the rule.

### Risk 4: Compare page is disconnected from TA_TOOLS — data maintenance burden
- **What:** Every time a product's trust data changes in `directory-data.js`, the compare page hardcoded values won't update automatically.
- **Impact:** Medium-term technical debt.
- **Mitigation:** Accept this for Phase 1 (static approach). Document the disconnect clearly in the HTML as a comment. The long-term fix is Phase B (dynamic compare), which is a separate task.

### Risk 5: `BASELINE` / `NEAR EQV.` / `PREMIUM` badges become misleading
- **What:** The current header cards show "BASELINE", "NEAR EQV.", "PREMIUM" badges for the three hardcoded tools. These are subjective editorial labels, not derived from data.
- **Impact:** Low risk for this task (not changing these badges), but worth noting.
- **Recommendation:** Leave these as-is for Task 012. Flag them as a future editorial decision.

---

## Implementation Checklist (for Task 012 agent)

Before starting:
- [ ] Run `./scripts/ta-preflight.sh` — must PASS
- [ ] Read `CLOUDFLARE_MIGRATION.md`, `TOOLADVISOR_WORKLOG.md`
- [ ] Check `grep "cmp-matrix" polish.css` returns empty
- [ ] Check exact trust values from `window.TA_TOOLS` for T01 (Sandvik) to use real numbers
- [ ] Confirm `compare.html` loads cleanly in browser before any changes

Do not:
- [ ] Touch `directory-data.js`
- [ ] Touch `index.html`
- [ ] Touch `wrangler.toml`
- [ ] Touch `directory-app.jsx`
- [ ] Deploy

Stop if:
- Any change requires JS rewrite of compare page (that's Phase B, not this task)
- `cmp-matrix` is already defined in `polish.css` with conflicting rules
- Visual layout breaks in local preview

---

## Deferred: Phase B — Dynamic Compare (separate future task)

When the time comes to make compare fully dynamic, the approach would be:
1. Load `directory-data.js` in `compare.html` (`<script src="directory-data.js">`)
2. Add JS that reads URL params or localStorage for selected tool IDs
3. Build the matrix rows dynamically from `window.TA_TOOLS` records
4. Use the existing `TrustBadge` logic (from `directory-app.jsx`) ported to vanilla JS or a shared module
5. The catalog "Add to compare" → compare page flow must pass selected IDs via URL or localStorage

This is a significant UX architecture decision (how tools are selected for compare) and is out of scope for Task 012.

---

## Summary

Phase 1 (Task 012): Static additions to `compare.html` + `polish.css`.
- Add tool type row (top of matrix)
- Add Data confidence row (end of matrix)
- Add Source row
- Add Risk flags row (conditional)
- Modify Cost tier row: `(est.)` suffix + info tooltip
- Add tool_type chip to product header cards
- Update page description and disclaimer
- CSS zebra fix via `.cmp-matrix` wrapper class

Files: `compare.html` + `polish.css` only.
No JS. No PRODUCT_DB. No deploy.
