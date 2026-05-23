# ToolAdvisor — Claude Code Context

## Proje Özeti
Brand-neutral AI cutting tool intelligence platform. Hedef kitle: CNC operatörleri, takım mühendisleri, üretim yöneticileri. ISO P/M/K/N/S/H tüm grupları kapsar.

**Canlı site:** https://tooladvisor.eu  
**Netlify site:** https://beamish-souffle-969f95.netlify.app  
**GitHub repo:** https://github.com/memmizgezgin-creator/ToolAdvisor  
**Deploy:** GitHub push → Netlify otomatik deploy

---

## Site Yapısı

| Dosya | Sayfa | Açıklama |
|-------|-------|----------|
| `index.html` | Dashboard | Ana sayfa, AI Advisor girişi |
| `tools.html` | Tool Directory | 266+ ürün katalogu, ISO filtre |
| `saved.html` | Saved Tools | Kullanıcı kayıtlı araçlar |
| `community.html` | Community Forum | Tartışma, soru-cevap |
| `guides.html` | Guides & Tutorials | Teknik rehberler |
| `reviews.html` | Reviews & Comparisons | Marka karşılaştırmaları |
| `profile.html` | User Profile | Hesap, Pro abonelik |

---

## Teknik Yığın

- **Frontend:** Vanilla HTML/CSS/JS + Tailwind CDN. Çoklu sayfa, her biri standalone.
- **Backend:** Netlify Functions (`netlify/functions/claude.js`) — Claude API proxy
- **API endpoint:** `/api/claude` → `/.netlify/functions/claude`
- **AI:** Anthropic Claude (Sonnet 4), API key Netlify env var'da: `ANTHROPIC_API_KEY`
- **Fonts:** DM Sans, DM Mono, Nunito (Google Fonts)
- **Icons:** Material Symbols Outlined

---

## Aktif / Pasif Özellikler

| Özellik | Durum | Not |
|---------|-------|-----|
| AI Advisor | Pasif | `ANTHROPIC_API_KEY` kredi bekliyor |
| Tool Directory | Aktif | Static mockup |
| Cross-Reference | Aktif | Static mockup |
| Supabase (DB) | Pasif | Henüz bağlanmadı |
| Stripe (ödeme) | Pasif | Henüz bağlanmadı |
| Plausible Analytics | Pasif | Script var, hesap açılmadı |

---

## Tasarım Kuralları

- Renk paleti: warm white `#FAF9F7`, deep ink `#1A1A2E`, slate blue `#2C4A6E`
- ISO renkleri: P=mavi, M=sarı, K=kırmızı, N=yeşil, S=turuncu, H=gri
- Font: başlıklar Nunito, gövde DM Sans, teknik veri DM Mono
- Border radius: 18px kartlar, 999px pill butonlar
- Hiçbir sayfada em dash (—) kullanma
- Tüm UI metinleri İngilizce

---

## Navigasyon

Her sayfada floating pill nav bar var (JS inject, `</body>` öncesi). Sayfa linkleri:
`index.html` / `tools.html` / `saved.html` / `community.html` / `guides.html` / `reviews.html` / `profile.html`

---

## Öncelikli Görevler (sırasıyla)

1. Privacy Policy sayfası + Cookie banner ekle (GDPR zorunlu, .eu domain, NL)
2. 404.html sayfası yap
3. Plausible analytics aktifleştir (plausible.io hesabı açılınca)
4. AI Advisor'ı wire-up et (kredi gelince): `index.html` → `/api/claude` fetch
5. Supabase bağla: kullanıcı kaydı, saved tools persistence
6. Stripe bağla: Pro plan €29/ay

---

## Yapılmaması Gerekenler

- Em dash (—) kullanma
- Motivasyonel dil, filler opener kullanma
- Partial snippet verme, her zaman çalışan tam kodu yaz
- Sayfaları ayrı framework'e taşıma (Vue, React vb.) — vanilla kalacak
- Bootstrap veya başka CSS framework ekleme — Tailwind CDN yeterli

---

## Geliştirici Notu

Murat Önder (kurucu) — cutting tools domain uzmanı, teknik detayları açıklamana gerek yok. Direkt execution odaklı çalış. Türkçe konuşur, UI/output İngilizce olacak.
