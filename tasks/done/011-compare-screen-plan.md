# Task 011 — Compare Screen Trust Plan

**Status:** done
**Type:** planning
**Created:** 2026-05-28
**Approved by:** Owner

## Goal
Plan how to add trust, tool_type, and estimated economics indicators to the compare screen.

## File Created
`research/011-compare-screen-plan.md`

## Key Finding
`compare.html` is fully static HTML — not connected to `window.TA_TOOLS`. Recommended Phase A approach is static HTML additions only.

## Plan Summary
- Add "Tool type" row at top of matrix
- Add "Data confidence" row at end of matrix
- Add "Source" row after confidence
- Add "Risk flags" row (conditional — omit if empty)
- Modify "Cost tier" row: `(est.)` suffix + info tooltip
- Add tool_type chip to product header cards
- Update page description + disclaimer
- Add `.cmp-matrix` CSS class for automatic zebra striping

## Files for Task 012
- `compare.html` — ~80 lines
- `polish.css` — ~5 lines

## Files Not Changed
- `directory-app.jsx` — not touched
- `directory-data.js` — locked, not touched
- `index.html` — locked, not touched
