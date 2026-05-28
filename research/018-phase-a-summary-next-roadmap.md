# Research 018 — Phase A Summary & Next Roadmap

**Date:** 2026-05-28
**Scope:** Tasks 008–017 — Trust / Canonical Schema / Compare UI faz özeti
**Type:** Planning

---

## 1. Neler Tamamlandı

### Faz A Hedefi (geriye dönük tanım)
Kullanıcıya veri güvenilirliğini göster: her ürün kartında, detay modalında ve compare ekranında kaynak, doğrulama durumu ve tahmini ekonomi bilgisi standart biçimde sunulsun.

### Task Özeti

| Task | Tür | Başlık | Sonuç |
|------|-----|--------|-------|
| 008 | Planning | Product card + modal trust UI plan | ✅ |
| 009 | Implementation | TrustBadge, tool_type chip, economics est. → `directory-app.jsx` | ✅ |
| 010 | CI/Commit | Task 009 commit + Guard check | ✅ `d078b2d` |
| 011 | Planning | Compare screen architecture analizi + plan | ✅ |
| 012 | Implementation | Compare trust rows, tool type chips, est. labels, zebra → `compare.html` | ✅ |
| 013 | CI/Commit | Task 012 commit + Guard check | ✅ `20faed7` |
| 014 | CI/Commit | Canonical schema runtime additions → `directory-data.js` | ✅ `52ff736` |
| 015 | QA | Tüm site regresyon testi (Tasks 009+012+014) | ✅ PASS |
| 016 | Planning | Data confidence layer standard — 3 surface uyum analizi | ✅ |
| 017 | Implementation | Compare bar: `w-16/bg-border-warm` → `w-14/bg-surface-container-low` | ✅ `ff4c612` |

---

## 2. Değişen Dosyalar

| Dosya | Değişiklik | Task |
|-------|-----------|------|
| `directory-app.jsx` | TrustBadge (compact+expanded), TOOL_TYPE_LABEL, SOURCE_TIER_LABEL, RISK_FLAG_LABEL, tool_type chip, `(est.)` economics labels | 009 |
| `directory-data.js` | Canonical runtime fields: `tool_type`, `canonical_category`, `product_code`, `workpiece_materials`, `trust`, `economicsEstimated` (additive forEach — base records untouched) | 014 |
| `compare.html` | 18 matrix rows, tool type chips, DATA CONFIDENCE row, SOURCE, DATA RISKS, `(est.)` labels, inline zebra `<style>`, bar standard fix | 012 + 017 |
| `polish.css` | Zebra rules appended (served correctly, browser parse note documented) | 012 |
| `TOOLADVISOR_WORKLOG.md` | Task 008–018 girişleri | tümü |
| `research/` | 008, 011, 015, 016, 018 plan/QA dosyaları | tümü |
| `tasks/done/` | 010, 011, 012, 016, 017 task dosyaları | tümü |

**Dokunulmayan (locked) dosyalar:**
- `directory-data.js` base records → ✅ untouched
- `index.html` → ✅ untouched
- `wrangler.toml` / `functions/proxy.js` / `advisor-ai-widget.js` → ✅ untouched

---

## 3. GitHub / Pages Durumu

| Commit | Mesaj | Guard | Pages |
|--------|-------|-------|-------|
| `d078b2d` | feat: TrustBadge, tool_type chip, economics est. (Task 009) | ✅ | ✅ |
| `20faed7` | feat: compare trust rows, chips, est. labels (Task 012) | ✅ | ✅ |
| `52ff736` | feat: canonical schema runtime metadata (Task 014) | ✅ ⚠️ warn | ✅ |
| `750214d` | qa: Task 015 final regression pass | ✅ | ✅ |
| `256d218` | plan: data confidence layer standard (Task 016) | ✅ | ✅ |
| `ff4c612` | fix: compare confidence bar standard (Task 017) | ✅ | ✅ |

**Guard warnings (non-blocking, tümü beklenen):**
- `52ff736`: `directory-data.js` modified — non-record change (canonical fields)
- `52ff736`: `TOOLADVISOR_WORKLOG.md` not in commit (sonraki commit'te eklendi)

**Tüm deploy'lar başarılı. `tooladvisor.eu` canlı.**

---

## 4. Kalan Riskler

| Risk | Seviye | Detay |
|------|--------|-------|
| `compare.html` statik kaldı | Orta | 3 hardcoded ürün. Yeni ürün eklemek/değiştirmek HTML düzenleme gerektiriyor. Phase B (Task 019) ile çözülecek. |
| Compare bar rengi hardcoded yeşil | Orta | Tüm 3 ürün verified olduğu için görsel olarak doğru; yeni ürün "estimated" ise yanlış renk gösterir. Phase B çözer. |
| Compare status badge always "Verified" | Orta | Aynı senaryo — Phase B çözer. |
| Compare SOURCE TIER satırı yok | Düşük | Source name gösteriliyor; tier Phase B'de eklenebilir. |
| `tasks/done/002-canonical-schema-migration.md` untracked | Düşük | Commit edilmedi; kayıp değil, cleanup task'ı ile eklenebilir. |
| Catalog `confidence` sort mevcut `t.confidence` alanını kullanıyor | Düşük | `t.trust.confidence_score` ile aynı değer — redundant ama işlevsel. Temizlik Phase B'de. |
| CSS parser bug (polish.css @media sonrası kural drop) | Belgelendi | Inline `<style>` fallback aktif. `polish.css` kural hâlâ orada ama aktif değil. Risksiz. |

---

## 5. Sıradaki 5 Task Önerisi

### Task 019 — Compare Phase B: Dynamic Rewire (Planning)
**Öncelik: Yüksek**

`compare.html`'i `window.TA_TOOLS`'a bağla. Hardcoded HTML yerine JS ile render. Ayrı planning task gerekli — kapsam büyük.

Kapsam:
- Product selector (3 slot, herhangi TA_TOOLS kaydı seçilebilir)
- Matrix satırları dinamik veriden render
- TrustBadge mantığı compare satırlarına taşınır
- Bar fill, status badge, risk flags → data-driven

**Bağımlı dosyalar:** `compare.html` (major rewrite), `directory-app.jsx` (TrustBadge import veya duplicate)
**Onay gerekli:** Evet (kapsam genişliği nedeniyle)

---

### Task 020 — Catalog Confidence Sort Fix
**Öncelik: Orta**

Mevcut sort: `'confidence'` key'i `t.confidence` flat alanını kullanıyor. Canonical'a geçince `t.trust.confidence_score` olmalı. Şu an ikisi aynı değer — risk yok ama teknik borç.

Kapsam: `directory-app.jsx` `SORTS` + sort logic → `t.trust?.confidence_score ?? t.confidence`
**Bağımlı dosyalar:** Yalnızca `directory-app.jsx`
**Risk:** Düşük — 1 satır değişiklik

---

### Task 021 — Cleanup: Commit Untracked Task/Research Files
**Öncelik: Düşük-Orta**

Repo'da `git status` untracked olarak görünen eski task/research dosyaları commit edilmemiş:
- `tasks/done/002-canonical-schema-migration.md`
- `tasks/done/004-agent-dispatcher-plan.md`
- `tasks/done/005-agent-protocol-pointer.md`
- `tasks/done/006-check-github-actions-guard.md`
- `tasks/done/008-product-card-detail-plan.md`
- `tasks/done/010-commit-github-actions-check.md`
- `research/003-canonical-schema-qa.md`
- `research/004-agent-dispatcher-plan.md`
- `research/008-product-card-detail-plan.md`

Kapsam: `git add tasks/done/00{2,4,5,6,8} tasks/done/010* research/003* research/004* research/008*`
**Bağımlı dosyalar:** Yalnızca dokümantasyon
**Risk:** Sıfır

---

### Task 022 — Knowledge Page Trust Section
**Öncelik: Orta**

`knowledge.html` şu an var ama içeriği minimal. Trust/confidence standardının açıklandığı bir "How we rate data confidence" bölümü eklenebilir — kullanıcıya şeffaflık sağlar.

Kapsam: `knowledge.html` yeni section
**Bağımlı dosyalar:** Yalnızca `knowledge.html`
**Risk:** Düşük

---

### Task 023 — polish.css Cleanup
**Öncelik: Düşük**

`polish.css` sonundaki `.cmp-matrix` zebra kuralları aktif değil (CSS parser bug, inline fallback aktif). Dosyayı temizle: ya kuralları `@media` bloğunun içine taşı ya da yorum satırıyla belgele.

Kapsam: `polish.css` → kuralları doğru pozisyona taşı veya belgele
**Bağımlı dosyalar:** Yalnızca `polish.css`
**Risk:** Düşük (inline style zaten aktif — bu sadece dosya düzeni)

---

## 6. Öncelik Sırası

```
1. Task 019 — Compare Phase B Planning   (kullanıcı değeri yüksek, planning gerekli)
2. Task 020 — Confidence Sort Fix        (teknik borç, 1 satır)
3. Task 021 — Untracked Files Cleanup    (repo hygiene)
4. Task 022 — Knowledge Page Trust       (UX şeffaflık)
5. Task 023 — polish.css Cleanup         (kozmetik borç)
```

---

## 7. Faz A Verdict

**✅ Faz A Tamamlandı.**

Hedeflenen tüm trust/confidence görsel katmanları uygulandı:
- Katalog kartları: TrustBadge (bar + % + icon + tooltip) ✅
- Detay modali: Genişletilmiş TrustBadge (source tier, source, date, risk chips) ✅
- Compare ekranı: DATA CONFIDENCE row, SOURCE, DATA RISKS, (est.) labels ✅
- Canonical schema: `t.trust`, `t.tool_type`, `t.economicsEstimated` tüm 36 kayıtta ✅
- Display standard: belgelendi (research/016) ve uygulandı (Task 017) ✅
- CI: tüm commitler Guard ✅ + Pages ✅
