# Task 009 — Product Card + Detail Modal Implementation v1

**Status:** done
**Type:** implementation
**Created:** 2026-05-28
**Approved by:** Owner

## Goal
Implement Phase 1 + Phase 2 from the Task 008 plan:
- Add `TrustBadge` component (replaces flat `Confidence` on cards and modal)
- Add `tool_type` chip to product cards
- Mark economics as estimated (`~€`, `(est.)`, hide `weeklyPicks`)
- Expand detail modal trust section (source_tier, source_name, validation_status, last_checked, risk_flags)

## File Changed
`directory-app.jsx`

## Changes Summary

| Change | Location |
|--------|----------|
| New constants: `TOOL_TYPE_LABEL`, `SOURCE_TIER_LABEL`, `RISK_FLAG_LABEL` | Top of file |
| New `TrustBadge` component (compact + expanded) | Before `ToolCard` |
| Tool type chip in grid card header | `ToolCard` grid view |
| Economics row: `~€`/`(est.)` labels, weeklyPicks hidden | `ToolCard` grid view |
| `TrustBadge` on grid card confidence row | `ToolCard` grid view |
| `TrustBadge` on list card | `ToolCard` list view |
| Modal eyebrow: brand · family · tool_type | `DetailModal` |
| Modal trust section: expanded `TrustBadge` | `DetailModal` |
| Modal supply: economics disclaimer | `DetailModal` |

## QA Result
✅ PASS — 36 records, 12 cards, all chips/labels/icons visible, zero JS errors, zero new warnings.

## Files Not Changed
- `directory-data.js` — not touched (PRODUCT_DB locked)
- `index.html` — not touched
- `wrangler.toml` — not touched
- `compare.html` — out of scope (Task 008 Phase 3)
