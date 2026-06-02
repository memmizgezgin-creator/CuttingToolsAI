# Tasks

## Active

- [ ] **AI graceful fallback** - API cevap vermediğinde kullanıcıya düzgün hata göster
- [ ] **Cross-reference empty state** - sonuç yoksa submission form göster, cross-ref DB büyüt
- [ ] **Freemium quota: localStorage → Supabase** - quota takibini güvenilir hale getir

## Waiting On

- [ ] **Domain cutover** - tooladvisor.eu TransIP → Cloudflare bağlantısı tamamlanacak
- [ ] **Netlify sil** - domain tooladvisor.eu Cloudflare'e geçtikten sonra Netlify sitesini kaldır

## Someday

- [ ] **Stripe entegrasyonu** - Pro €29/mo ödeme akışı
- [ ] **Visual ID PRO** - insert fotoğrafından tanımlama özelliği
- [ ] **AI Chat PRO** - sınırsız chat modu

## Done

- [x] **PDF teknik analiz raporu MVP** - source_page, raw_row_ref, confidence_score, risk_flags alanlarını kullanan örnek rapor; reamer/drill/end_mill fixtures; argüman desteği (generate-sample-technical-report.py)
- [x] **TA-Guard fix** - AI widget z-index sorununu çöz; cookie banner z-index: 9999 set, widget'ın altında kalır
- [x] **Cookie banner z-index fix** - z-index 9999 set, AI widget'ın altında kalır
- [x] **Quota bar + Pro upgrade modal** - FREE_DAILY=5, görsel quota bar (yeşil→sarı→kırmızı), Pro modal bağlandı (TA.openModal)
