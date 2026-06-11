# Tasks

## Active

- [ ] **Quality Inspector SQL migration** — Supabase SQL Editor'da çalıştır (inspector bu olmadan çalışır ama denetleyecek yanıt verisi olmaz; proxy fallback sayesinde mevcut query loglama kesilmez): `ALTER TABLE advisor_queries ADD COLUMN IF NOT EXISTS ai_answer TEXT;`

- [ ] **Research worker Supabase secrets** - Murat: `cd research-worker && npx wrangler secret put SUPABASE_URL && npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` (değerler Supabase dashboard → tooladvisor → Settings → API). Yoksa haftalık e-postadaki "DB misses" bölümü VE event-bus yazımı sessizce atlanır.
- [ ] **Agent event bus go-live (Murat)** - 1) Supabase SQL Editor'da `supabase/migrations/20260611000000_agent_events.sql` çalıştır; 2) `cd daily-agents-worker && npx wrangler secret put RESEND_API_KEY && npx wrangler secret put SUPABASE_URL && npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY` (ANTHROPIC_API_KEY set edildi). Bunlar yapılmadan cron'lar çalışır ama event yazamaz/e-posta atamaz (hata loglanır, crash yok).

## Waiting On

- [ ] **Stripe integration** - blocked until July 2026, waitlist collecting emails until then
- [ ] **Domain cutover** - cuttingtoolsai.eu TransIP → Cloudflare bağlantısı tamamlanacak
- [ ] **Netlify sil** - domain cuttingtoolsai.eu Cloudflare'e geçtikten sonra Netlify sitesini kaldır

## Someday

- [ ] **Stripe entegrasyonu** - Pro €29/mo ödeme akışı
- [ ] **Visual ID PRO** - insert fotoğrafından tanımlama özelliği
- [ ] **AI Chat PRO** - sınırsız chat modu

## Post-launch

- [ ] (1 Temmuz sonrası) **Prompt regression testi** - advisor promptu için sabit 20 soruluk test seti oluştur, eski vs yeni prompt cevaplarını Haiku ile puanlayan script yaz. Why-layer değişikliklerinde kalite düşüşünü yakalamak için.

## Done

- [x] **Inter-agent event bus + chief-of-staff daily digest (2026-06-11)** - Supabase `agent_events` tablosu (migration 20260611000000, RLS deny-by-default, service_role only); `agents-shared/departments.js` tek kaynak departman config (site_dev, market_intel, tech_research, chief_of_staff rol prompt'ları + WHY_LAYER_PRINCIPLES buraya taşındı, research-worker import eder); yeni `daily-agents-worker/` (cuttingtoolsai-daily-agents): 07:00 UTC collectors (site_dev canlı homepage analizi + market_intel web_search; bulgular ikinci Claude çağrısıyla event'lere çevrilir), 07:20 evaluation pass (status=eq.new PATCH guard — çifte değerlendirme imkânsız, Claude hatası = defer), 07:40 chief-of-staff digest e-postası (Decisions needed / Routed and evaluated / Department reports, footer'da deferred sayısı); research worker relevant adaylarını tech_research→chief_of_staff finding'i olarak bus'a yazar (best-effort); hiçbir içerik otomatik commit edilmez. NOT: "mevcut günlük ajanlar" repoda/deploy'da yoktu — collectors sıfırdan yazıldı. Lokal uçtan uca test: 2 sahte event → eval (1 escalated, 1 evaluated, re-run 0) → digest HTML üretildi (test-local.mjs). Her iki worker deploy edildi; go-live Murat'ın SQL + secrets adımına bağlı (Active'e bakın).
- [x] **Ingestion staging review UI (2026-06-11)** - ingestion/review.html + ingestion/serve-review.js (Node built-ins, localhost:4747): claude-extract review.json staging dosyaları için lokal onay ekranı; GET /api/staging (51 dosya), POST /api/approve ve /api/reject; merge mantığı pipeline.js'den ingestion/scripts/merge-records.js paylaşımlı modülüne taşındı (kopya yok — pipeline da aynı mergeRecords'u kullanıyor, dry-run regresyon geçti); onaylanan kayıtlar source_pdf + source_page traceability ile data/extracted-productdb-candidates.json'a; reddedilenler rejected.json'a (audit trail, REVIEW_WORKFLOW.md); boşalan staging dosyası ingestion/approved-archive/'a taşınır; conf<70 veya validation issue satırları amber; ta-review zsh fonksiyonu eklendi; uçtan uca test: 2 kayıt approve → DB'ye girdi, ikinci approve → 2 duplicate skip, reject → rejected.json, path traversal guard OK (test sonrası DB/staging eski haline döndürüldü — gerçek onay Murat'ın)

- [x] **Programmatic SEO phase 2: /grade/ carbide grade pages (2026-06-11)** - scripts/build-grade-pages.js: CROSSREF_DB satır kodlarının son token'ından brand-aware desenlerle 39 distinct grade ayıklandı (Sandvik "4325"→GC4325 normalizasyonu, OSG AE-VTSS gibi geometri token'ları skip); /grade/<grade>/ sayfaları: özet (coating, ISO alanı, application range), doğrulanmış eşdeğer tablosu (CROSSREF_DB inversiyonu — uydurma yok), designation tablosu → /ref/ linkleri, advisor CTA, TechArticle JSON-LD; /grade/ index marka gruplu CollectionPage; /ref/ sayfalarına "Grades used" satırı eklendi + regenerate; ortak mantık scripts/lib/seo-shared.js'e taşındı (her iki builder aynı sitemap'i üretir: 70 URL); index.html footer'a Grades linki; Vc verisi DB'de yok → sayfalarda alan koşullu, veri gelince otomatik görünür

- [x] **Programmatic SEO phase 1: /ref/ cross-reference pages (2026-06-11)** - scripts/build-ref-pages.js build-time generator: catalog.html CROSSREF_DB'den 22 insert designation sayfası (/ref/<code>/) + /ref/ index; her sayfa: marka eşdeğer tablosu, ISO 1832 decode, TechArticle JSON-LD, canonical, unique title/desc, related links, AI advisor CTA (?ask= prefill — index.html'e handler eklendi); sitemap.xml otomatik yenileniyor (30 URL); footer'a Cross-Ref linki; canlıda doğrulandı (cnmg120408 + apmt1604pder 200, tam HTML); GSC sitemap submit Murat'ta

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
