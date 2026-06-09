# Tasks

## Active

## Waiting On

- [ ] **Stripe integration** - blocked until July 2026, waitlist collecting emails until then
- [ ] **Domain cutover** - cuttingtoolsai.eu TransIP → Cloudflare bağlantısı tamamlanacak
- [ ] **Netlify sil** - domain cuttingtoolsai.eu Cloudflare'e geçtikten sonra Netlify sitesini kaldır

## Someday

- [ ] **Stripe entegrasyonu** - Pro €29/mo ödeme akışı
- [ ] **Visual ID PRO** - insert fotoğrafından tanımlama özelliği
- [ ] **AI Chat PRO** - sınırsız chat modu

## Done

- [x] **AI graceful fallback (2026-06-09)** - 503/502 + retry + refund on Anthropic failure
- [x] **Cross-reference empty state (2026-06-09)** - sonuç yoksa submission form göster
- [x] **Pro button → waitlist (2026-06-09)** - Supabase table + functions/waitlist.js endpoint, live & verified: new/duplicate/invalid all pass
- [x] **Freemium quota: localStorage → Supabase (2026-06-08)** - server-side enforced in functions/proxy.js, Supabase 3 tables + RLS, curl test passed: 5x200 then 429
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
