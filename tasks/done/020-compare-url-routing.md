# Task 020 — Compare URL Routing

**Status:** done
**Type:** implementation
**Created:** 2026-05-28
**Approved by:** Owner

## Goal
Catalog CompareDrawer → compare.html navigasyonuna seçili tool ID'lerini URL parametresi olarak geçir.

## Change
**`directory-app.jsx` satır 1079:**
```js
// Önce:
onCompare={() => { window.location.href = 'compare.html'; }}

// Sonra:
onCompare={() => { const ids = [...compare].join(','); window.location.href = `compare.html?ids=${ids}`; }}
```

## Files Changed
| File | Action |
|------|--------|
| `directory-app.jsx` | 1 satır — onCompare handler URL params eklendi |

## Files NOT Changed
- `directory-data.js` ✅ (locked)
- `compare.html` ✅ (Phase B1'de değişecek)
- `index.html` ✅ (locked)

## QA Results

| Check | Result |
|-------|--------|
| 2 araç seçip Compare now → `compare.html?ids=T01,T02` | ✅ |
| Drawer codes → TA_TOOLS ID resolve (T01/T02) | ✅ |
| `compare.html?ids=` (boş) → sayfa normal yükleniyor | ✅ |
| Console errors | ✅ 0 |
