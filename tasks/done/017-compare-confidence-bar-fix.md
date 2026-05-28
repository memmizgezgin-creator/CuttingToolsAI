# Task 017 — Compare Confidence Bar Fix

**Status:** done
**Type:** implementation
**Created:** 2026-05-28
**Approved by:** Owner

## Goal
`compare.html` DATA CONFIDENCE satırındaki bar track background ve genişliği Task 016 standardına uygun hale getir.

## Files Changed
- `compare.html` — 3 bar track: `w-16 bg-border-warm` → `w-14 bg-surface-container-low`

## Files NOT Changed
- `directory-app.jsx` ✅
- `directory-data.js` ✅ (locked)
- `index.html` ✅ (locked)

## Change Detail

```
Before: w-16 h-1.5 bg-border-warm rounded-full overflow-hidden shrink-0
After:  w-14 h-1.5 bg-surface-container-low rounded-full overflow-hidden shrink-0
```

Replaced all 3 occurrences (one per product column) via `replace_all`.

## QA Results

| Check | Result |
|-------|--------|
| 3 bars: className = `w-14 … bg-surface-container-low` | ✅ |
| 3 bars: computedBg = `rgb(244, 243, 246)` | ✅ |
| 3 bars: width = `56px` | ✅ |
| Console errors | ✅ 0 |
| Compare page loads | ✅ |
