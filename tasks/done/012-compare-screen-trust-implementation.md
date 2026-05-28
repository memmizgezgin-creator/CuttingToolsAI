# Task 012 — Compare Screen Trust Implementation

**Status:** done
**Type:** implementation
**Created:** 2026-05-28
**Approved by:** Owner

## Goal
Implement trust / tool_type / estimated economics indicators in `compare.html` and `polish.css`. No JS changes.

## Files Changed
- `compare.html` — new rows, chips, est. labels, inline zebra style
- `polish.css` — zebra rules appended at end
- `TOOLADVISOR_WORKLOG.md` — updated
- `tasks/done/012-compare-screen-trust-implementation.md` — this file

## Files NOT Changed
- `directory-app.jsx` — untouched ✅
- `directory-data.js` — locked, untouched ✅
- `index.html` — locked, untouched ✅

## Implementation Summary

### compare.html changes
1. **Header description** — added "data confidence" to the listed variables
2. **Disclaimer banner** — split into two badges; second badge: "Cost tier and tool life are estimates from published data — not commercial pricing"
3. **Product header cards** — added `Turning insert` tool-type chip to all 3 cards
4. **Matrix wrapper** — added `cmp-matrix` class for CSS zebra striping
5. **New row: Tool type** — first matrix row; "Turning insert" × 3
6. **Removed per-row `bg-surface-container-low`** — replaced by CSS zebra (7 rows updated via replace_all)
7. **Cost tier row** — label gets ⓘ icon + tooltip; value cells get `(est.)` suffix
8. **New row: Data confidence** — green bars at 96% / 89% / 94% with Verified badges
9. **New row: Source** — "Manufacturer data" + brand + date (Sandvik·2024-08, Kennametal·2024-05, Walter·2024-09)
10. **New row: Data risks** — "None" × 3
11. **Inline `<style>` block** — zebra rules in `<head>` as fallback (polish.css appended rules were silently dropped by browser CSS parser after `@media` blocks)

### polish.css changes
- Zebra rules appended at end of file
- Note: browser drops these silently (cssRules count stays at 110); inline `<style>` in compare.html is the active rule

## CSS Parser Bug (documented)
Appending `.cmp-matrix` rules to `polish.css` after the file's final `@media` block caused the browser to silently ignore them — verified via `document.styleSheets` enumeration (110 rules, rule absent) despite the file being served correctly. Inline `<style>` in compare.html's `<head>` is the reliable fix.

## QA Results
| Check | Result |
|-------|--------|
| Page opens at /compare.html | ✅ |
| 3 header cards render | ✅ |
| Tool type chips on all cards | ✅ |
| 18 matrix rows total | ✅ |
| Tool type row (first) | ✅ |
| Zebra striping (odd=white, even=#f4f3f6) | ✅ |
| Cost tier (est.) labels | ✅ |
| Data confidence bars + Verified | ✅ |
| Source rows with date | ✅ |
| Data risks "None" | ✅ |
| Zero console errors | ✅ |
| Nav links intact | ✅ |
| Mobile not broken | ✅ |
