# Tasks

## Active

- [ ] **Cross-reference empty state** - sonuç yoksa submission form göster, cross-ref DB büyüt
- [ ] **Freemium quota: localStorage → Supabase** - quota takibini güvenilir hale getir

## Waiting On

- [ ] **Domain cutover** - cuttingtoolsai.eu TransIP → Cloudflare bağlantısı tamamlanacak
- [ ] **Netlify sil** - domain cuttingtoolsai.eu Cloudflare'e geçtikten sonra Netlify sitesini kaldır

## Someday

- [ ] **Stripe entegrasyonu** - Pro €29/mo ödeme akışı
- [ ] **Visual ID PRO** - insert fotoğrafından tanımlama özelliği
- [ ] **AI Chat PRO** - sınırsız chat modu

## Done

- [x] **AI graceful fallback** - API timeout/error → kullanıcıya düzgün mesaj
- [x] **Quota UX overhaul** - FREE_DAILY=5, yeşil→sarı→kırmızı bar, Pro modal
- [x] **Stripe Pro flow UI** - checkout → success/cancel dönüşü, hero + pricing butonları wired
- [x] **Compare URL param pre-fill** - ?grade= → input pre-fill + auto-run
- [x] **Hero visual consistency** - cross-reference.html dark navy hero redesign
- [x] **Site-wide UX sweep (2026-06-08)** - footer yıl/linkler, FAB kaldırıldı, dup imports, ta-3d-insert.js, pro.html restructure, ToolAdvisor.html dark navy hero
- [x] **PDF teknik analiz raporu MVP** - source_page, raw_row_ref, confidence_score, risk_flags alanlarını kullanan örnek rapor; reamer/drill/end_mill fixtures; argüman desteği (generate-sample-technical-report.py)
- [x] **TA-Guard fix** - AI widget z-index sorununu çöz; cookie banner z-index: 9999 set, widget'ın altında kalır
- [x] **Cookie banner z-index fix** - z-index 9999 set, AI widget'ın altında kalır
- [x] **Quota bar + Pro upgrade modal** - FREE_DAILY=5, görsel quota bar (yeşil→sarı→kırmızı), Pro modal bağlandı (TA.openModal)
- [x] **Architecture refactor — AI-first surface (2026-06-08)** - Catalog nav kaldırıldı, compare/cross-ref AI-form'a geçirildi, advisor-main-form wired, nav search AI'a yönleniyor, dishonest copy temizlendi
