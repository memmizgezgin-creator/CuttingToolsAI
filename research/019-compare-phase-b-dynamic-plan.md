# Research 019 — Compare Phase B: Dynamic Rewire Plan

**Date:** 2026-05-28
**Type:** Planning
**Scope:** `compare.html` statik → dinamik geçiş
**Input:** `compare.html`, `directory-app.jsx`, `directory-data.js`

---

## 1. Neden Statik?

`compare.html` Faz A'da tamamen elle yazılmış statik HTML olarak oluşturuldu. Bunun nedenleri:

1. **Hız:** Faz A hedefi trust/confidence görselini hızlı şekilde göstermekti — JS mimarisi planlama gerektiriyor.
2. **Bağlantı eksikliği:** `compare.html` şu an `directory-data.js` yüklemiyor → `window.TA_TOOLS` erişilemez.
3. **Katalog geçişi parametresiz:** `directory-app.jsx` CompareDrawer → `onCompare` handler:
   ```js
   // directory-app.jsx satır 1079
   onCompare={() => { window.location.href = 'compare.html'; }}
   ```
   Hiçbir tool ID geçirilmiyor. Compare sayfası seçili araçları bilmiyor.
4. **Veri boşluğu:** Compare matrisi `TA_TOOLS`'ta olmayan alanlar içeriyor (aşağıda §3).

---

## 2. `window.TA_TOOLS` ile Bağlantı Nasıl Kurulur

### 2a. Adım 1 — `directory-data.js`'i compare.html'e ekle

`directory-data.js` son satırında `window.TA_TOOLS = TOOLS` atamasını yapıyor (satır ~209). Yüklenmesi yeterli:

```html
<!-- compare.html <head> içine eklenecek, tw-config.js'den sonra -->
<script src="directory-data.js"></script>
```

Bu tek satır `window.TA_TOOLS` (36 kayıt + canonical fields) erişilebilir kılar.

### 2b. Adım 2 — URL parametresiyle tool ID geçişi

**Seçilen yöntem: URL query string**

Avantajlar: Paylaşılabilir link, geri tuşu çalışır, localStorage bağımlılığı yok.

```
compare.html?ids=T01,T04,T03
```

**`directory-app.jsx` değişikliği (1 satır):**
```js
// Önce:
onCompare={() => { window.location.href = 'compare.html'; }}

// Sonra:
onCompare={() => {
  const ids = [...compare].join(',');
  window.location.href = `compare.html?ids=${ids}`;
}}
```

**`compare.html` JS parse:**
```js
const params = new URLSearchParams(window.location.search);
const ids = (params.get('ids') || '').split(',').filter(Boolean);
const selectedTools = ids
  .map(id => (window.TA_TOOLS || []).find(t => t.id === id))
  .filter(Boolean)
  .slice(0, 3); // Max 3 col
```

**Fallback (no params):** Hardcoded T01/T04/T03 göster (Faz A'dakiyle aynı).

---

## 3. Veri Boşluğu Analizi — Kritik Bulgu

Bu Phase B'nin en önemli kısıtı.

### 3a. TA_TOOLS'ta OLAN alanlar (render edilebilir)

| Matrix satırı | TA_TOOLS alanı | Durum |
|---------------|---------------|-------|
| Tool type | `t.tool_type` | ✅ tam |
| Grade | `t.grade` | ✅ tam |
| ISO material group | `t.iso` | ✅ tam |
| Operation | `t.op` | ✅ tam |
| Vc envelope | `t.vcMin`, `t.vcMax` | ✅ tam |
| Feed envelope | `t.fMin`, `t.fMax` | ✅ tam |
| Depth envelope | `t.apMin`, `t.apMax` | ✅ tam |
| Tool life | `t.lifeRel` (1-5 pips) | ✅ tam |
| Cost tier | `t.costTier` + `t.economicsEstimated` | ✅ tam |
| Data confidence | `t.trust` (score, status, flags) | ✅ tam |
| Source | `t.trust.source_tier` + `t.trust.last_checked` | ✅ tam |
| Data risks | `t.trust.risk_flags` | ✅ tam |
| Best use case | `t.bestFor` (kısmen) | ⚠️ kısmen |

### 3b. TA_TOOLS'ta OLMAYAN alanlar (veri boşluğu)

| Matrix satırı | Mevcut veri | Durum |
|---------------|------------|-------|
| Geometry | Yalnızca `shape` kodu (C/D/S/W) | ❌ yok — "80° rhomb · negative · CNMG" üretilemez |
| Coating | Yok | ❌ yok — "CVD", "CVD multilayer" |
| Interrupted cut | Yok | ❌ yok — "Good", "Acceptable" |
| Risk level | Yok | ❌ yok — "Low", "Low-Medium" |
| Avoid when | Yok | ❌ yok — "Heavy interrupted cuts" |

**5 satır veri boşluğu** → Tam dinamik render mümkün değil, sadece kısmi.

---

## 4. Implementation Seçenekleri

### Seçenek A — Hybrid (Önerilen) ⭐

TA_TOOLS'tan türetilebilen satırları dinamik render et; boş alanları "—" veya gizle.

**Dinamik render edilecekler (13 satır):**
Tool type · Grade · ISO group · Operation · Vc envelope · Feed envelope · Depth envelope · Tool life · Cost tier · Data confidence · Source · Data risks · Best use case (bestFor)

**Statik kalacaklar (5 satır) veya gizlenecekler:**
Geometry · Coating · Interrupted cut · Risk level · Avoid when → Veri yoksa satır ya `"—"` gösterir ya da gizlenir.

**Avantaj:** Çalışıyor, veri doğru, tek commit.
**Dezavantaj:** Geometry/Coating satırları boş ya da eksik.

---

### Seçenek B — Tam Dinamik (TA_TOOLS genişletmesi gerektirir)

TA_TOOLS'a eksik alanlar eklenir:

```js
// directory-data.js — yeni alanlar (her kayıt için)
coating: 'CVD',                     // string
geometry: 'C · 80° · negative',     // string
interruptedCut: 'good',             // 'good' | 'ok' | 'poor'
riskLevel: 'low',                   // 'low' | 'medium' | 'high'
avoidWhen: 'Heavy interrupted cuts' // string
```

**Dezavantaj:** `directory-data.js` base records değiştirilmesi gerekir → **PRODUCT_DB approval gerektirir**. 36 kayıt × 5 alan = 180 değer manüel girilmeli.
**Avantaj:** Tam veri bütünlüğü.

---

### Seçenek C — Minimal Dinamik (URL routing + header cards)

Sadece URL routing + 3 header card dinamik render. Matrix statik kalır (Faz A).

**Avantaj:** En az risk, en hızlı.
**Dezavantaj:** Matrix hâlâ hardcoded. Farklı araçlar seçildiğinde matrix yanlış veri gösterir.

---

### Öneri: Seçenek A (Hybrid)

Seçenek A en dengeli yaklaşım:
- `directory-data.js` base records'a dokunmak gerekmez
- 13/18 satır doğru veriyle render edilir
- 5 eksik satır için "—" gösterilir (dürüst)
- SVG operating envelope `TA_TOOLS`'tan türetilebilir (vcMin/vcMax/fMin/fMax var)
- Final recommendation → dinamik türetme algoritması (lifeRel, costTier, iso ile)

---

## 5. Aşamalı Implementation Planı

### Phase B1 — URL Routing + Header Cards + Temel Matrix (Task 020)

**Değişen dosyalar:** `compare.html`, `directory-app.jsx`

**Adımlar:**
1. `compare.html` `<head>`'e `<script src="directory-data.js"></script>` ekle
2. `compare.html` `<body>` sonuna JS bloğu ekle:
   - URL params parse
   - 3 header card dinamik render
   - 13 matrix satırı dinamik render (TA_TOOLS kaynaklı)
   - 5 eksik satır → "—" veya hidden
   - Trust badge (TrustBadge mantığı vanilla JS ile)
3. `directory-app.jsx` onCompare handler → `?ids=T01,T04,T03` URL

**Fallback:** `?ids` parametresi yoksa T01, T04, T03 (Faz A'dakine eşdeğer) göster.

---

### Phase B2 — SVG Operating Envelope (Task 021 — opsiyonel)

**Değişen dosyalar:** `compare.html`

SVG koordinatları `vcMin/vcMax/fMin/fMax`'tan türetilebilir.

**Koordinat dönüşümü:**
```js
// Vc: 100-450 → SVG y: 290-24 (ters)
const VC_MIN = 100, VC_MAX = 450;
const SVG_Y_TOP = 24, SVG_Y_BOT = 290;
const vcToY = (vc) => SVG_Y_BOT - ((vc - VC_MIN) / (VC_MAX - VC_MIN)) * (SVG_Y_BOT - SVG_Y_TOP);

// Feed: 0.05-0.65 → SVG x: 70-540
const F_MIN = 0.05, F_MAX = 0.65;
const SVG_X_LEFT = 70, SVG_X_RIGHT = 540;
const fToX = (f) => SVG_X_LEFT + ((f - F_MIN) / (F_MAX - F_MIN)) * (SVG_X_RIGHT - SVG_X_LEFT);
```

Renk paleti: tool 0→`#123356`, tool 1→`#F59E0B`, tool 2→`#10B981` (Faz A'dakiyle aynı sıra).

**Zorluk:** Medium. SVG element render + label konumlandırma.
**Bağımlılık:** Phase B1 tamamlanmış olmalı.

---

### Phase B3 — Final Recommendation Algoritması (Task 022 — opsiyonel)

**Değişen dosyalar:** `compare.html`

Mevcut hardcoded öneriler yerine `lifeRel`, `costTier`, `iso`, `trust.confidence_score`'dan türetilen kurallar:

```js
const picks = {
  bestProductivity: tools.reduce((a, b) => b.lifeRel > a.lifeRel ? b : a),
  bestCost:         tools.reduce((a, b) => b.costTier < a.costTier ? b : a),
  bestConfidence:   tools.reduce((a, b) => b.trust.confidence_score > a.trust.confidence_score ? b : a),
  safestChoice:     tools.reduce((a, b) => (b.lifeRel - b.costTier) > (a.lifeRel - a.costTier) ? b : a),
};
```

**Zorluk:** Low-Medium. Pure JS, no DOM complexity.
**Bağımlılık:** Phase B1.

---

## 6. QA Planı (Phase B1)

| Test | Yöntem | Pass kriterleri |
|------|--------|----------------|
| URL param olmadan açılış | `compare.html` (no params) | T01/T04/T03 (fallback) render |
| 2 tool ile açılış | `compare.html?ids=T02,T08` | 2 kart + matrix doğru |
| 3 tool ile açılış | `compare.html?ids=T01,T04,T03` | Mevcut Faz A'ya eşdeğer |
| Geçersiz ID | `compare.html?ids=T99,T01` | T99 skip edilir, T01 render |
| Catalog → Compare nav | Catalog'da 3 araç seç → "Compare now" | URL'de ids parametresi |
| Trust badge rengi | estimated araç seç | Amber/kırmızı bar (threshold-driven) |
| Risk flags | risk_flags olan araç | DATA RISKS satırında chip |
| Console error | — | 0 error |
| Guard PASS | push sonrası | Guard ✅ |

---

## 7. Rollback Planı

Phase B1 tek commit'te yayınlanmalı. Rollback:

```bash
git revert HEAD
git push
```

veya:
```bash
git checkout d078b2d -- compare.html   # Faz A'ya dön
git checkout d078b2d -- directory-app.jsx
git push
```

**Rollback süresi:** < 2 dakika. Risk: Düşük.

---

## 8. Kapsam Sınırı / Stop Kuralı

Phase B1 aşağıdaki durumda durur ve owner onayı bekler:

| Durum | Aksiyon |
|-------|---------|
| `directory-data.js` base records değişikliği gerekirse | Dur, raporla |
| compare.html + directory-app.jsx dışında başka dosya gerekirse | Dur, raporla |
| SVG plot JS 50 satırı aşarsa | B2'ye ertele |
| Final recommendation logic 30 satırı aşarsa | B3'e ertele |

---

## 9. Dosya Değişim Özeti

### Phase B1 (Minimum Viable Dynamic Compare)
| Dosya | Değişiklik | Risk |
|-------|-----------|------|
| `compare.html` | `<script src="directory-data.js">` + URL parse JS + dynamic render | Orta |
| `directory-app.jsx` | `onCompare` handler: +6 satır (URL params) | Düşük |
| `directory-data.js` | **Dokunulmaz** | — |
| `index.html` | **Dokunulmaz** | — |

### Phase B2 (SVG Envelope)
| Dosya | Değişiklik |
|-------|-----------|
| `compare.html` | SVG element generate JS |

### Phase B3 (Final Recommendation)
| Dosya | Değişiklik |
|-------|-----------|
| `compare.html` | Recommendation cards generate JS |

---

## 10. Özet Karar

| Karar | Seçim |
|-------|-------|
| Veri bağlantı yöntemi | URL query string (`?ids=T01,T04`) |
| `directory-data.js` yükleme | `<script src="directory-data.js">` compare.html'e eklenir |
| Eksik alanlar (coating, geometry vb.) | `"—"` veya gizle — base records değiştirilmez |
| SVG envelope | Phase B2'ye ertele |
| Final recommendation | Phase B3'e ertele |
| Fallback | `?ids` yoksa → T01, T04, T03 (Faz A eşdeğer) |
| Rollback | `git revert HEAD` (< 2 dk) |
| **PRODUCT_DB approval gerekli mi?** | **Hayır** — Seçenek A hybrid |

**Bu plan owner onaylıysa Task 020 (Phase B1 implementation) başlayabilir.**
