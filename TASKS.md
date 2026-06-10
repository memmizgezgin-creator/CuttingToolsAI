# Tasks

## Active

- [ ] **Research worker Supabase secrets** - Murat: `cd research-worker && npx wrangler secret put SUPABASE_URL && npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` (değerler Supabase dashboard → tooladvisor → Settings → API). Yoksa haftalık e-postadaki "DB misses" bölümü sessizce atlanır.

## Waiting On

- [ ] **Stripe integration** - blocked until July 2026, waitlist collecting emails until then
- [ ] **Domain cutover** - cuttingtoolsai.eu TransIP → Cloudflare bağlantısı tamamlanacak
- [ ] **Netlify sil** - domain cuttingtoolsai.eu Cloudflare'e geçtikten sonra Netlify sitesini kaldır

## Someday

- [ ] **Stripe entegrasyonu** - Pro €29/mo ödeme akışı
- [ ] **Visual ID PRO** - insert fotoğrafından tanımlama özelliği
- [ ] **AI Chat PRO** - sınırsız chat modu

## Done

- [x] **Advisor answer quality + query logging (2026-06-10)** - system prompt: metric-first kuralı, yapısal cevap formatı (spec block + CROSS-REF + start advice, <200 kelime), fallback protokolü (ISO decode + en yakın DB kaydından ekstrapolasyon, grade uydurma yasak); proxy'ye retrieveTools eklendi (Supabase products tablosundan SKU/grade eşleşmesi → system prompt'a verified reference block); advisor_queries tablosu (anonim, GDPR-safe: user id/IP yok) + her çağrıda log; research worker e-postasına "DB misses this week" bölümü; NOT: prod products şeması supabase-schema.sql'den farklı (sku boşluklu, grade=coating kolonu) — kod prod şemasına göre yazıldı

- [x] **Proxy 503 timeout fix (2026-06-10)** - "AI is temporarily unavailable" hatasının kökü: web_search'lü sorgular 22-50s sürerken proxy 25s'te abort ediyordu; timeout 50s, timeout'ta retry yok, web_search max_uses:2; ayrıca JS/CSS URL'lerine ?v= versiyonu eklendi (zone Browser Cache TTL 4h eski JS'i saatlerce tutuyordu); canlıda 3/3 sorgu 200 ile doğrulandı
- [x] **Homepage UX dead-end fixes (2026-06-10)** - floating launcher artık her scroll pozisyonunda görünür (IntersectionObserver gizlemesi kaldırıldı, cookie banner çakışması çözüldü); header/hero CTA'ları canlı widget'ı açıyor; JOB 01-03 kartları ve örnek çıktı kartı sorguyu pre-fill ederek widget'ı açıyor; canlıda doğrulandı (cuttingtoolsai.eu, proxy 200 + AI cevap)
- [x] **Weekly research agent (2026-06-10)** - research-worker/ standalone Worker: Pazartesi 06:00 UTC cron, 5 kaynak crawl, TA_RESEARCH KV dedup (SHA-256), Claude why-layer değerlendirmesi (usefulness sıralı, max 8 madde), Resend HTML rapor; uçtan uca doğrulandı — test e-postası inbox'a ulaştı (research@cuttingtoolsai.eu → memmizgezgin@gmail.com)
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
