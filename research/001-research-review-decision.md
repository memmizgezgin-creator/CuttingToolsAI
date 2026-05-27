# Research Review Decision
Date: 2026-05-27
Task: 001-review-research-outputs

---

## 1. Hemen Yapılacaklar

**Canonical schema tanımla ve TA_TOOLS'u map et.**
`tooladvisor-product-schema-proposal.json` hazır, `refactor-plan-no-code.md` migration adımlarını tarif ediyor. Bu iş PRODUCT_DB'ye dokunmadan sadece `directory-data.js` üzerinde yapılabilir. Mevcut 36 kayıt yeni şemaya map edilir, synthetic alanlar `estimated: true` ile işaretlenir.

**Trust/confidence objesi ekle.**
Her kayıtta `source_tier`, `validation_status`, `confidence_score`, `last_checked`, `risk_flags` olmalı. Bu sadece veri yapısı değişikliği, UI'a dokunmadan da yapılabilir.

**Category-specific filters kur.**
`filter-model-proposal.json` hazır, universal + category-specific gruplar tanımlı. Mevcut sidebar filter'ın üzerine inşa edilebilir.

---

## 2. Bekleyecekler

**Detail modal yeniden yazma.**
Mimari karar gerektiriyor: quick-view modal mı kalacak, tam sayfa detail route mı açılacak? Bu karara kadar bekle.

**Compare matrix yeniden yazma.**
Schema onaylanmadan compare satırlarını tanımlamak anlamsız. Phase 1 bittikten sonra başla.

**Cross-reference logic.**
Mevcut `equivalents` alanı çok zayıf. Yeni cross-reference sistemi schema-driven olmalı. Phase 1 + 2 beklenmeli.

**Advisor result cards.**
Mevcut widget çalışıyor. Yapısal değişiklik için Phase 1 beklenmeli.

---

## 3. Gereksiz / Riskli Olanlar

**Supabase entegrasyonu şu an.**
`supabase-schema.sql` ve `seed-supabase.js` mevcut ama aktif frontend ile schema drift var. Supabase'i devreye almadan önce canonical schema onaylanmalı. Şu an Supabase'e dokunma.

**Synthetic economics kullanmaya devam.**
`costTier`, `unitPrice`, `valueIndex` gibi synthetic alanlar profesyonel görünüm için risk. Bunları "estimated" olarak etiketlemeden kullanmak güven zararı verir. Gizle veya açıkça işaretle.

**Manufacturer görsel/logo kullanımı.**
"Verified by Sandvik" gibi ifadeler partnership olmadan hukuki risk. "Official catalogue source" formatına geç.

**Bulk scraping / otomatik PDF merge.**
CLOUDFLARE_MIGRATION.md ve TOOLADVISOR_WORKLOG.md bunu açıkça yasaklıyor. Hiç deneme.

---

## 4. İlk Implementation Sırası

1. Canonical schema finalize et ve TA_TOOLS migration map yaz (kod yok, sadece şema kararı)
2. Trust metadata varsayılanlarını mevcut 36 kayda ekle
3. Filter registry kur (filter-model-proposal.json'dan)
4. Category-specific card layout uygula
5. Detail modal'ı category sections ile yeniden yaz
6. Compare matrix schema-driven yap
7. Cross-reference logic yaz

---

## 5. PRODUCT_DB'ye Dokunmadan Yapılabilecekler

- `directory-data.js` üzerinde canonical schema migration (TA_TOOLS zaten burada)
- Trust metadata ekleme (TA_TOOLS kayıtlarına yeni alanlar)
- Filter registry kurma (JSON config dosyası, JS filter logic)
- Card layout güncelleme (UI render değişikliği)
- Confidence/source badge gösterimi
- "Estimated" field uyarıları

---

## 6. PRODUCT_DB Değişikliği Gerektirenler

- Supabase entegrasyonu (schema drift çözümü)
- Canonical schema'dan Supabase tablosuna migration
- Cross-reference DB yeniden yapılandırma
- Bulk product import pipeline (onay gerekli)
- Commercial/availability data ekleme

Bu işlerin hiçbiri şu an onaylı değil.

---

## Genel Değerlendirme

Research dosyaları eksiksiz ve iyi hazırlanmış. Mimari karar net: önce schema, sonra UI. Acele etmeden Phase 1'den başlamak doğru.

En kritik risk: synthetic economics ve zayıf cross-reference logic profesyonel kullanıcı güvenini zedeliyor. Bu ikisi öncelikli olarak giderilmeli.
