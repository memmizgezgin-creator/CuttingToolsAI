# Tasks

## Active

### Architecture refactor — Hide DB from public UI, AI-first surface

**Status:** Approved, ready to start

**Goal:** ToolAdvisor must look and feel like an AI advisor, not a product catalog. PRODUCT_DB stays as internal reference for AI; users never browse it.

**Changes:**

1. **Navigation:** Remove "Catalog" link from public navigation across all HTML files (index.html, ToolAdvisor.html, cross-reference.html, compare.html, knowledge.html, pro.html, profile.html). Keep tools-directory.html reachable by direct URL (admin use), but unlinked.

2. **Cross-Reference page (cross-reference.html):** Remove brand filter pills, product cards grid, and any browse-style lists. Keep ONLY: input field for an insert code or grade, then AI-generated equivalent list as text output. Results render as AI advisor output, not catalog cards.

3. **Compare page (compare.html):** Remove "Open catalog" CTA and browse-style elements. Keep input fields for 2-3 grade names plus AI-generated side-by-side comparison.

4. **Advisor (index.html / ToolAdvisor.html):** Promote the AI widget from the floating bottom-right position to the MAIN content area. The 4-step guided input (Material, Operation, Constraints, Goal) stays as primary UI. AI response area becomes the central focus of the page.

5. **Honesty fixes:**
   - Remove any "944 tools" or similar product count claims everywhere.
   - Remove "Manufacturer data + reviewed" confidence badges. Replace with an honest label like "AI recommendation based on engineering principles."
   - Remove the "How we stay neutral" stats block (8 / 6 / 12+ / 100%) if it implies catalog scale we don't actually have.

**Preservation (DO NOT TOUCH):**
- PRODUCT_DB and CROSS_REF_DB stays intact (used by AI as internal reference)
- functions/proxy.js
- System prompt in advisor-ai-widget.js
- Ingestion pipeline and admin tools (tools-directory.html, ingestion scripts)

**Why:** Enforces KIRILMAZ KURAL — ToolAdvisor is an AI recommendation engine, not a catalog. Current UI implies catalog scale (944 tools) we cannot honestly back.

---

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
