# Task 019 — Compare Phase B Dynamic Planning

**Status:** done
**Type:** planning
**Created:** 2026-05-28
**Approved by:** Owner

## Goal
`compare.html` statik yapısından dinamik compare yapısına geçiş planı.

## Output
`research/019-compare-phase-b-dynamic-plan.md` ✅

## Key Findings

### Veri boşluğu (kritik)
5 matrix satırı TA_TOOLS'ta karşılığı olmayan alan kullanıyor:
- Geometry, Coating, Interrupted cut, Risk level, Avoid when

→ Önerilen çözüm: **Hybrid (Seçenek A)** — 13 satır dinamik, 5 satır "—"

### Katalog bağlantısı
`directory-app.jsx` satır 1079'da `compare.html`'e hiç ID geçirilmiyor.
Düzeltme: `?ids=T01,T04,T03` URL parametresi.

### directory-data.js yükleme
compare.html şu an `directory-data.js` yüklemiyor.
Düzeltme: `<script src="directory-data.js">` eklenir.

## Implementation Faz Planı

| Faz | Task | Kapsam | Öncelik |
|-----|------|--------|---------|
| B1 | 020 | URL routing + header cards + 13 matrix satırı dinamik | Yüksek |
| B2 | 021 | SVG operating envelope dinamik | Orta |
| B3 | 022 | Final recommendation algoritması | Düşük |

## Onay Gerektiren Kararlar
- PRODUCT_DB değişikliği YOK → Seçenek A hybrid onaylandı
- Phase B1 kapsam: sadece `compare.html` + `directory-app.jsx`

## Files Changed
| File | Action |
|------|--------|
| `research/019-compare-phase-b-dynamic-plan.md` | created |
| `tasks/done/019-compare-phase-b-dynamic-plan.md` | this file |
| `TOOLADVISOR_WORKLOG.md` | updated |

## Files NOT Changed
- `directory-app.jsx` ✅ (read-only analysis)
- `directory-data.js` ✅ (locked)
- `compare.html` ✅ (read-only analysis)
- `index.html` ✅ (locked)
