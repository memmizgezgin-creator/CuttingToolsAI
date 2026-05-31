# ToolAdvisor Gunluk Sistem Raporu

Tarih: 2026-05-29  
Saat: 09:06 CEST  
Otomasyon: gunluk raporlama sistem uzerinden  
Kapsam: UX, SEO, teknik saglik, performans, guvenlik, icerik, deploy ve is emri onceliklendirme  
Hedef site: https://tooladvisor.eu/  
Yerel repo: `/Users/muratonder/Desktop/ToolAdvisor`

## Kisa Yonetici Ozeti

Bugunku rontgen, 2026-05-28 raporundaki kritik borclarin kapanmadigini dogruluyor. En yuksek risk halen URL/canonical sozlesmesi ve production asset pipeline tarafinda. `index.html` kok sayfayi meta-refresh ile `ToolAdvisor.html` dosyasina tasiyor; `catalog.html` kendi canonical'ini kok domaine veriyor; `sitemap.xml` `.html` URL'leri listeliyor; `llms.txt` ise extensionless URL'leri canonical gibi anlatiyor. Bu sinyaller arama motorlari ve AI crawler'lar icin ayni site mimarisini tarif etmiyor.

Olumlu gelisme: `assets/directory-app.js`, `assets/tailwind.css`, `package.json` build script'leri ve `og.png` var. Ancak public HTML hala bu production asset'leri sistematik kullanmiyor. `tools-directory.html` build edilmis bundle yerine `unpkg.com` uzerinden React development runtime, Babel ve kaynak JSX calistiriyor. `_headers` CSP ise bu CDN'leri izinli listeye almiyor; uretimde header uygulanirsa sayfa scriptleri bloke olabilir.

Canli HTTP header/status kontrolu bu terminal ortaminda yine DNS nedeniyle tamamlanamadi: `curl: (6) Could not resolve host: tooladvisor.eu`. Bu nedenle bugunku teknik bulgular yerel repo auditine, canli erisilebilirlik sinyali ise web snapshot/search kaynaklarina dayaniyor. ScamAdviser snapshot'i domain icin HTTP 200, valid SSL ve fast sinyali bildiriyor; fakat bu kaynak kapsamli SEO/UX denetimi yerine sadece dis erisilebilirlik sinyali olarak kullanildi.

## Dunku Rapor Sonrasi Degisimler

- Kapanan kritik konu gorulmedi; 2026-05-28 P0 isleri halen acik.
- `assets/directory-app.js` ve `assets/tailwind.css` mevcut; production asset altyapisi var fakat HTML entegrasyonu eksik.
- `og.png` mevcut; katalogdaki OG image referansi bos degil.
- `sitemap.xml` hala `saved.html` listeliyor; repo kokunde `saved.html` yok.
- `contact.html` hala `guides.html` linki iceriyor; repo kokunde `guides.html` yok.
- `sitemap.xml` lastmod degerleri hala `2025-05-23`; 2026 gunluk auditleriyle uyumsuz.

## Bugunku Rontgen Skoru

| Alan | Durum | Not |
| --- | --- | --- |
| URL / Canonical Mimari | Kritik | `/`, `/ToolAdvisor.html`, `.html` sitemap ve extensionless `llms.txt` uyumsuz. |
| Teknik SEO | Kritik | 12 public sayfanin 10'unda canonical, 9'unda title, 8'inde description eksik. |
| UX / Donusum | Riskli | Contact form semantik form degil; 30 placeholder link var. |
| Performans | Kritik | `catalog.html` 1.1 MB; `tools-directory.html` dev React/Babel yukluyor. |
| Guvenlik / CSP | Kritik | CSP, kullanilan Tailwind CDN ve unpkg kaynaklarini kapsamiyor. |
| Erisilebilirlik | Orta-riskli | 3 public sayfada H1 yok; katalogda 12 H1 var. |
| Icerik / E-E-A-T | Orta | Metodoloji ve veri tazeligi sinyalleri sayfa geneline standart dagilmamis. |
| Deploy / Bakim | Riskli | Root Cloudflare Pages config var; Netlify config nested klasorde kalmis. |

## Olculen Teknik Bulgular

### Public HTML SEO Matrisi

| Dosya | Boyut | H1 | JSON-LD | Form | Inline handler | Title | Description | Canonical | CDN/dev runtime |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `index.html` | 192 B | 0 | 0 | 0 | 0 | Eksik | Eksik | `ToolAdvisor.html` | Yok |
| `ToolAdvisor.html` | 24.8 KB | 1 | 0 | 0 | 0 | Eksik | Eksik | Eksik | Tailwind CDN |
| `catalog.html` | 1.1 MB | 12 | 5 | 2 | 293 | Var | Var | Kok domain | Yok |
| `tools-directory.html` | 4.8 KB | 0 | 0 | 0 | 0 | Var | Eksik | Eksik | Tailwind CDN, unpkg, Babel |
| `cross-reference.html` | 34.0 KB | 1 | 0 | 0 | 0 | Eksik | Eksik | Eksik | Tailwind CDN |
| `compare.html` | 30.5 KB | 1 | 0 | 0 | 0 | Eksik | Eksik | Eksik | Tailwind CDN |
| `knowledge.html` | 41.8 KB | 1 | 0 | 0 | 0 | Eksik | Eksik | Eksik | Tailwind CDN |
| `pro.html` | 16.4 KB | 1 | 0 | 0 | 0 | Yanlis | Eksik | Eksik | Tailwind CDN |
| `contact.html` | 17.8 KB | 1 | 0 | 0 | 0 | Eksik | Var | Eksik | Tailwind CDN |
| `privacy.html` | 16.7 KB | 1 | 0 | 0 | 0 | Eksik | Var | Eksik | Tailwind CDN |
| `terms.html` | 17.0 KB | 1 | 0 | 0 | 0 | Eksik | Var | Eksik | Tailwind CDN |
| `profile.html` | 10.3 KB | 0 | 0 | 0 | 0 | Eksik | Eksik | Eksik | Tailwind CDN |

### Toplu Sayim

| Metrik | Deger |
| --- | ---: |
| Canonical eksigi | 10 / 12 public sayfa |
| Title eksigi | 9 / 12 public sayfa |
| Meta description eksigi | 8 / 12 public sayfa |
| H1 eksigi | 3 / 12 public sayfa |
| Birden fazla H1 | 1 sayfa (`catalog.html`) |
| Tailwind CDN kullanan sayfa | 10 / 12 public sayfa |
| unpkg/Babel kullanan sayfa | 1 sayfa (`tools-directory.html`) |
| Placeholder `href="#"` | 30 adet |
| Katalog inline handler | 293 adet |
| Sitemap missing route | 1 adet (`saved.html`) |
| Bilinen kirik ic link | `contact.html` -> `guides.html` |

## Kritik Gozlemler

1. `index.html` yalnizca 192 byte ve meta-refresh yapiyor. Bu, kok domainin asil HTML sayfasi yerine gecis dosyasi gibi davranmasina neden oluyor.

2. `catalog.html` hem katalog basligi tasiyor hem canonical/OG URL olarak `https://tooladvisor.eu/` gosteriyor. Katalog sayfasi indekslenmek isteniyorsa kendi route'unu canonical vermeli; indekslenmeyecekse sitemap ve llms'ten cikarilmali.

3. `llms.txt`, `/catalog`, `/compare`, `/knowledge`, `/contact` gibi extensionless URL'leri listeliyor. `sitemap.xml` ise `.html` URL'leri listeliyor. AI crawler ve arama motoru sinyalleri ayriliyor.

4. `_headers` CSP `script-src` icinde `cdn.tailwindcss.com` ve `unpkg.com` yok. Buna ragmen 10 public sayfa Tailwind CDN, `tools-directory.html` ise unpkg React/Babel kullaniyor.

5. Production bundle hazir: `assets/directory-app.js` yaklasik 55 KB. Fakat `tools-directory.html` hala `directory-app.jsx` dosyasini `type="text/babel"` ile browser'da derliyor.

6. `sitemap.xml` `saved.html` listeliyor ama dosya yok. Bu Search Console'da submitted URL not found uyarisi uretir.

7. `contact.html` icinde `guides.html` linki var ama dosya yok. Mevcut karsilik `knowledge.html` gibi gorunuyor.

8. Contact sayfasi ve katalog icindeki contact modal form gibi gorunuyor ama ana contact sayfasinda semantik `<form>` yok. Bu hem donusum olcumunu hem de klavye/ekran okuyucu deneyimini zayiflatiyor.

9. Footer legal/support linkleri bircok sayfada `href="#"`; bu guven sinyali, crawl derinligi ve kullanici beklentisi acisindan zayif.

10. Footer yillari 2024/2025 olarak daginik. 2026'da aktif bakim sinyalini dusuruyor.

11. Root `wrangler.toml` Cloudflare Pages icin `pages_build_output_dir = "."` diyor. Netlify config ise `ToolAdvisor/netlify.toml` alt klasorunde. Tek deploy kaynagi ve tek publish root belgelenmeli.

## Bugunku Is Emirleri

### TA-GR-2026-05-29-01 - Canonical URL Sozlesmesini Kilitle

Oncelik: P0  
Alan: SEO, AEO/GEO, mimari  
Dosyalar: `index.html`, `ToolAdvisor.html`, `catalog.html`, `sitemap.xml`, `llms.txt`, `_headers`, deploy config

Problem: URL stratejisi kok domain, dosya uzantili route ve extensionless route arasinda bolunmus durumda.

Yapilacaklar:
- Tek final URL modeli sec: onerilen model `/`, `/catalog`, `/tools-directory`, `/cross-reference`, `/compare`, `/knowledge`, `/pro`, `/contact`, `/privacy`, `/terms`.
- `index.html` meta-refresh modelini kaldir; kok sayfa gercek home HTML'i servis etsin.
- Gerekirse Cloudflare Pages redirects/rewrites ile `.html` URL'leri final extensionless URL'lere 301 yonlendir.
- Her indexlenebilir sayfaya tek canonical ekle.
- `sitemap.xml`, `llms.txt`, OG URL ve canonical degerlerini ayni route sozlesmesine esitle.
- `saved.html` yoksa sitemap'ten cikar; gerekiyorsa gercek route olarak ekle.

Kabul kriterleri:
- Sitemap'teki tum URL'ler mevcut ve canonical ile ayni final URL'yi gosterir.
- `/` ve `/ToolAdvisor.html` iki ayri canonical sayfa gibi davranmaz.
- `llms.txt` ile sitemap URL bicimi bire bir uyumludur.
- Search Console'da duplicate canonical ve submitted not found uyarisi uretmez.

### TA-GR-2026-05-29-02 - CSP ve Production Asset Pipeline'i Duzelt

Oncelik: P0  
Alan: guvenlik, performans, deploy  
Dosyalar: `_headers`, `tools-directory.html`, `package.json`, `assets/directory-app.js`, `assets/tailwind.css`, `directory-app.jsx`

Problem: CSP mevcut CDN bagimliliklarini izinli listeye almiyor; public sayfa production bundle yerine dev runtime ve Babel calistiriyor.

Yapilacaklar:
- `tools-directory.html` icinde React/unpkg/Babel ve `directory-app.jsx` yuklemeyi kaldir.
- `assets/directory-app.js` production bundle'ini kullan.
- Tailwind CDN kullanan sayfalari kademeli olarak `assets/tailwind.css` kullanimina gecir.
- CSP'yi nihai production bagimliliklarina gore sade hale getir.
- Deploy once `npm run build` adimini zorunlu yap.

Kabul kriterleri:
- `tools-directory.html` unpkg ve Babel olmadan render olur.
- Browser console'da CSP script/style violation yoktur.
- Production HTML kaynak JSX calistirmaz.
- JS/CSS varliklari lokal asset olarak cache'lenir.

### TA-GR-2026-05-29-03 - Public SEO Skeleton Standardini Uygula

Oncelik: P1  
Alan: teknik SEO, erisilebilirlik, paylasim gorunurlugu  
Dosyalar: `ToolAdvisor.html`, `tools-directory.html`, `cross-reference.html`, `compare.html`, `knowledge.html`, `pro.html`, `contact.html`, `privacy.html`, `terms.html`, `profile.html`

Problem: 12 public sayfanin 10'unda canonical, 9'unda title, 8'inde description eksik. OG/Twitter metadata da standart degil.

Yapilacaklar:
- Her indexlenebilir sayfaya tek `<title>`, meta description, canonical, OG title/description/url/image ve Twitter card ekle.
- Her indexlenebilir sayfada tek H1 olmasini sagla.
- `pro.html` title'ini "Saved Tools" yerine ToolAdvisor Pro deger onerisine gore duzelt.
- `profile.html` public indekslenecekse metadata/H1 ekle; kullanici sayfasi ise noindex karari al.
- Ana sayfaya `Organization`, `WebSite` ve `SoftwareApplication` JSON-LD ekle.

Kabul kriterleri:
- Public HTML auditinde title/description/canonical eksigi kalmaz.
- H1 eksigi kalmaz; katalog dahil hicbir indexlenebilir sayfada birden fazla H1 olmaz.
- OG URL ve canonical ayni final route'u gosterir.
- Rich Results testinde JSON-LD parse hatasi yoktur.

### TA-GR-2026-05-29-04 - Katalog Dosyasini Parcala ve SEO'yu Temizle

Oncelik: P1  
Alan: performans, UX, bakim  
Dosyalar: `catalog.html`, `directory-data.js`, `tools-directory.html`, `directory-app.jsx`, `assets/directory-app.js`

Problem: `catalog.html` 1.1 MB, 12 H1 ve 293 inline handler iceriyor. Bu dosya hem uygulama kabugu hem veri hem de eski/demo bloklari tasiyor.

Yapilacaklar:
- Katalog icin tek route ve tek H1 belirle.
- Demo/arsiv workspace bloklarini production HTML'den ayir.
- Inline handler'lari event delegation veya module JS tarafina tasi.
- Katalog datasini cache'lenebilir JS/JSON chunk olarak ayir.
- Kritik above-the-fold HTML'i koruyup geri kalan UI'i bundle'a tasi.

Kabul kriterleri:
- Ilk HTML yaniti 250 KB altina iner veya kritik HTML/bundle ayrimi netlesir.
- H1 sayisi 1 olur.
- Inline handler sayisi 50 altina iner.
- Katalog canonical'i kendi final route'una gider.

### TA-GR-2026-05-29-05 - Contact ve Kirik Link Akisini Onar

Oncelik: P1  
Alan: UX, donusum, guven  
Dosyalar: `contact.html`, `functions/proxy.js` veya yeni Pages Function, footer partial/pattern

Problem: Contact sayfasi form gibi gorunuyor fakat semantik form/submit akisi yok. Ayrica `guides.html` kirik link ve cok sayida `href="#"` placeholder var.

Yapilacaklar:
- Contact input/textarea alanlarini `<form>` icine al.
- `label for`, `id`, `name`, `required`, validation ve accessible feedback state ekle.
- Gercek submit akisi kur: Cloudflare Pages Function, mevcut proxy veya mailto fallback.
- `guides.html` linkini `knowledge.html` veya gercek guide route'una bagla.
- Footer legal/support placeholder linklerini gercek `terms.html`, `privacy.html`, `contact.html` route'larina cevir.

Kabul kriterleri:
- Form klavye ile doldurulup submit edilebilir.
- Basarili ve basarisiz submit durumlari kullaniciya net feedback verir.
- `guides.html` ve `href="#"` kaynakli kullanici yolu kirikligi kalmaz.
- Form submit olayi analytics/CRM tarafinda olculebilir hale gelir.

### TA-GR-2026-05-29-06 - Deploy Kaynagini ve Route Smoke Testini Standartlastir

Oncelik: P2  
Alan: QA, deployment, izlenebilirlik  
Dosyalar: `wrangler.toml`, `ToolAdvisor/netlify.toml`, README, yeni `scripts/smoke-routes.*`

Problem: Root Cloudflare Pages config aktif gorunuyor; Netlify config nested klasorde. Canli route/header kontrolu gunluk terminal ortaminda DNS nedeniyle dogrulanamiyor.

Yapilacaklar:
- Tek production deploy kaynagini belgeleyip eski/alternatif config'i `legacy` olarak isaretle.
- Canonical route listesini tek dosyada tut.
- CI veya deploy sonrasi smoke test ile status, final URL, canonical, title, H1 ve CSP violation kontrolu yap.
- Sitemap'teki URL'lerin varligini otomatik test et.

Kabul kriterleri:
- Deploy dokumani hangi config'in production oldugunu acikca soyler.
- Smoke test missing route veya canonical drift durumunda fail eder.
- Gunluk raporlar DNS kisitli ortamda bile son CI smoke sonucunu referans alabilir.

### TA-GR-2026-05-29-07 - Guven ve Tazelik Sinyallerini Guncelle

Oncelik: P2  
Alan: marka guveni, legal, E-E-A-T  
Dosyalar: `ToolAdvisor.html`, `tools-directory.html`, `cross-reference.html`, `compare.html`, `knowledge.html`, `pro.html`, `contact.html`, `privacy.html`, `terms.html`, `profile.html`, `sitemap.xml`

Problem: Footer yillari 2024/2025 daginik; legal sayfalardaki efektif tarihler 2025; sitemap lastmod 2025-05-23. Bu, aktif bakim sinyalini zayiflatiyor.

Yapilacaklar:
- Footer yilini tek pattern ile 2026'ya guncelle.
- Legal sayfalarda "Last Updated" tarihlerini gercek inceleme tarihine gore guncelle.
- Sitemap `lastmod` degerlerini gercek dosya/icerik guncellemesine bagla.
- Knowledge ve katalog sayfalarinda metodoloji, veri kaynagi ve son gozden gecirme sinyallerini gorunur kil.

Kabul kriterleri:
- Public sayfalarda footer yil tutarsizligi kalmaz.
- Legal tarihleri bilincli ve guncel olur.
- Sitemap lastmod degerleri otomatik veya dokumante edilmis surecle guncellenir.

## 24 Saatlik Odak Onerisi

1. TA-GR-2026-05-29-01'i tamamla. Canonical sozlesmesi netlesmeden diger SEO iyilestirmeleri tam etki vermez.
2. TA-GR-2026-05-29-02'yi hemen ardindan ele al. CSP ile runtime uyumsuzlugu canli sayfa bozulmasina yol acabilir.
3. TA-GR-2026-05-29-03 ve TA-GR-2026-05-29-05'i ayni sprintte kapat. Metadata standardi ve contact akisi dogrudan guven/donusum sinyali uretir.

## Takip Edilecek Metrikler

- Canonical eksigi olan public sayfa sayisi
- Title/description/H1 eksigi olan sayfa sayisi
- Sitemap URL 200/301/404 dagilimi
- `llms.txt` ile sitemap URL uyum orani
- CSP violation sayisi
- Tailwind CDN ve unpkg kullanan public sayfa sayisi
- Katalog HTML boyutu, H1 sayisi ve inline handler sayisi
- Placeholder `href="#"` sayisi
- Contact form submit basari/hata orani
- Search Console duplicate canonical ve submitted not found uyarilari

## Kaynaklar

- Canli site: https://tooladvisor.eu/
- Dis erisilebilirlik snapshot'i: https://www.scamadviser.com/check-website/tooladvisor.eu
- Yerel repo audit kaynagi: `/Users/muratonder/Desktop/ToolAdvisor`
- Onceki gun raporu: `/Users/muratonder/Desktop/ToolAdvisor/reports/2026-05-28-tooladvisor-gunluk-sistem-raporu.md`
- Otomasyon hafizasi: `/Users/muratonder/.codex/automations/gunluk-raporlama-sistem-uzerinden/memory.md`
