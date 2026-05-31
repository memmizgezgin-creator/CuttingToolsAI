# ToolAdvisor Gunluk Sistem Raporu

Tarih: 2026-05-27  
Otomasyon: gunluk raporlama sistem uzerinden  
Kapsam: UX, SEO, teknik saglik, performans, guvenlik, icerik ve is emri onceliklendirme  
Hedef site: https://tooladvisor.eu/

## Kisa Yonetici Ozeti

Bugunku tarama ToolAdvisor'un temel SEO isaretlerinin buyuk olcude hazir oldugunu gosteriyor: canonical URL'ler, sitemap, robots.txt, OG/Twitter metadata, guvenlik header'lari ve gorsel paylasim varliklari repoda mevcut. Buna karsilik en yuksek riskler katalog deneyimi ve teknik borc tarafinda yogunlasiyor: `catalog.html` yaklasik 1.1 MB, 12 adet H1, 291 inline event handler ve cok sayida tek dosyada gomulu uygulama mantigi iceriyor. Bu hem performansi hem de SEO sinyal temizligini zayiflatiyor.

Canli URL icin web fetch ana sayfaya ulasabiliyor; terminal uzerinden dogrudan `curl` kontrolu bu ortamda DNS cozumleme kisiti nedeniyle tamamlanamadi. Bu nedenle bugunku rapor canli site gorunurluk sinyalleri, arama indeks yansimalari ve yerel repo analizi birlestirilerek hazirlandi.

## Bugunku Rontgen Skoru

| Alan | Durum | Not |
| --- | --- | --- |
| Teknik SEO | Orta-iyi | Metadata ve sitemap var; route/canonical mimarisi netlestirilmeli. |
| UX / Donusum | Orta | Ana CTA'lar ve iletisim akisi tam islevsel gorunmuyor. |
| Performans | Riskli | `catalog.html` 1.1 MB; katalog uygulamasi ve eski demo sayfalar ayrilmali. |
| Erisilebilirlik | Orta | Bazi React/JS sayfalarda statik H1 yok; form label baglantilari guclendirilmeli. |
| Guvenlik | Orta-iyi | Header'lar iyi; `unsafe-inline` ve inline handler'lar azaltmali. |
| Bakim Kolayligi | Riskli | Netlify/Cloudflare izleri, buyuk tek dosyalar ve route karmasi var. |
| Icerik / E-E-A-T | Orta | Teknik niyet guclu; kaynak, metodoloji, veri tazelik sinyalleri daha gorunur olmali. |

## Onemli Bulgular

1. `catalog.html` tek basina 1,103,551 bayt ve 12 H1 iceriyor. Bu sayfa hem eski landing/workspace katmanlarini hem katalog mantigini hem de SEO bloklarini birlikte tasiyor. Arama motorlari ve kullanicilar icin ana konu sinyali dagiliyor.

2. `tools-directory.html` ilk HTML'de `<h1>` ve ana katalog kartlarini statik olarak sunmuyor; icerik React bundle yuklendikten sonra geliyor. Google JS render edebilse de, kritik katalog niyeti icin statik iskelet eklemek daha guvenli.

3. `profile.html` ve `tools-directory.html` statik HTML seviyesinde H1 icermiyor. Bu, sayfa amaci ve erisilebilirlik acisindan zayif sinyal.

4. Sitemap hem `/catalog` hem `/tools-directory` rotalarini listeliyor. Iki rota da katalog niyetine yakin. Canonical ve icerik stratejisi tek ana katalog rotasi etrafinda netlestirilmeli.

5. Ana sayfada "Run the Advisor" ve "See sample output" butonlari kullanici niyeti icin kritik, fakat plain button olarak duruyor; belirgin action handler veya form akisi yok. Bu dogrudan donusum kaybi yaratir.

6. `contact.html` kullaniciya form gosteriyor, ancak `<form>` yapisi, backend/action veya mailto fallback yok. "Send Message" tiklandiginda gercek gonderim garantisi gorunmuyor.

7. Footer yillari sayfalar arasinda tutarsiz: 2024 ve 2025 goruluyor. 2026 tarihli site icin guven sinyali zayiflar.

8. Deployment konfigunda platform izi karisik: root seviyede `wrangler.toml` ve `_headers`, nested dizinde `ToolAdvisor/netlify.toml`, `.netlify/netlify.toml` icinde eski Netlify config izleri var. Uretim platformu tek kaynak olarak netlestirilmeli.

9. CSP guvenlik header'i mevcut fakat inline script/style ve inline handler kullanimi nedeniyle `unsafe-inline` gerektiriyor. Bu kabul edilebilir bir ara durum, ancak uzun vadeli guvenlik hedefi icin kod ayrismali.

10. `robots.txt` query parametrelerini disallow ediyor: `Disallow: /*?*`. Filtreli katalog URL'leri indekslenmeyecekse dogru; fakat SEO landing hedefleri query parametreyle kurulacaksa bu strateji ters duser.

11. Structured data sadece katalog tarafinda yogun. Ana sayfa, knowledge, compare, cross-reference, pro ve contact icin WebSite, Organization, BreadcrumbList, FAQPage, SoftwareApplication ve ilgili sayfa tipleri eklenmeli.

12. Google Fonts yuklemeleri sayfalar arasinda tekrarlaniyor; ana sayfada Material Symbols icin iki ayri font linki mevcut. Font istekleri birlestirilmeli veya self-host stratejisi degerlendirilmeli.

## Bugunku Is Emirleri

### TA-GR-2026-05-27-01 - Katalog Rotasi ve SEO Iskeleti

Oncelik: P0  
Alan: SEO, performans, mimari  
Dosyalar: `catalog.html`, `tools-directory.html`, `directory-app.jsx`, `assets/directory-app.js`, `sitemap.xml`

Problem: Katalog niyeti iki rota arasinda bolunuyor; `catalog.html` cok buyuk ve coklu H1 iceriyor; `tools-directory.html` statik HTML'de ana katalog icerigi sunmuyor.

Yapilacaklar:
- Tek ana katalog rotasi sec: onerilen `/catalog`.
- Diger rotayi 301 veya canonical secondary olarak konumlandir.
- Katalog sayfasinda statik H1, intro, en populer ISO/family linkleri ve en az 6 statik katalog linki sun.
- Eski/demo workspace bloklarini `catalog.html` disina tasi veya dev-only arsive al.
- H1 sayisini her route icin 1'e indir.

Kabul kriterleri:
- `/catalog` ilk HTML'de tek H1 ile render olur.
- Sayfa ilk HTML boyutu hedefi 250 KB altina iner veya katalog JS/CSS ayrilir.
- Sitemap sadece canonical katalog stratejisini yansitir.
- Lighthouse/HTML audit H1 uyarisi vermez.

### TA-GR-2026-05-27-02 - Ana Sayfa Advisor CTA Akisi

Oncelik: P1  
Alan: UX, donusum  
Dosyalar: `index.html`, `advisor-ai-widget.js`, `modals.js`

Problem: Ana sayfadaki "Run the Advisor" ve "See sample output" aksiyonlari kullanicinin bekledigi akisi baslatmiyor.

Yapilacaklar:
- "Run the Advisor" butonunu gercek advisor widget/panel veya ilgili form akisi ile bagla.
- "See sample output" butonunu ornek sonuc bolumune scroll, modal veya anchor ile bagla.
- Button state'leri icin focus, loading ve error durumlarini ekle.

Kabul kriterleri:
- Iki CTA da klavye ve mouse ile calisir.
- Kullanici tikladiginda net bir UI degisimi gorur.
- Analytics event isimleri belirlenir: `advisor_cta_start`, `advisor_sample_view`.

### TA-GR-2026-05-27-03 - Iletisim Formunu Gercek Aksiyonla Bagla

Oncelik: P1  
Alan: UX, destek, guven  
Dosyalar: `contact.html`, `functions/proxy.js` veya yeni form endpoint'i

Problem: Contact form gorunuyor ama gercek submit akisi yok.

Yapilacaklar:
- `<form>` semantigi, `name`, `id`, `for` baglantilari ve validation ekle.
- Baslangic icin `mailto:` fallback veya Cloudflare Pages Function endpoint'i kur.
- Basarili/basarisiz gonderim durumlarini ekle.

Kabul kriterleri:
- Bos alanlar icin kullanici dostu hata gorunur.
- Gonderim basariliysa net confirmation gorunur.
- Destek email adresi ve form akisi ayni sayfada tutarli olur.

### TA-GR-2026-05-27-04 - Semantik Baslik ve Schema Temizligi

Oncelik: P1  
Alan: SEO, erisilebilirlik  
Dosyalar: `profile.html`, `tools-directory.html`, `index.html`, `knowledge.html`, `compare.html`, `cross-reference.html`, `pro.html`

Problem: Bazi sayfalarda statik H1 eksik; structured data kapsami daginik.

Yapilacaklar:
- Her sayfada tek ve net H1 standardi uygula.
- Ana sayfaya `Organization`, `WebSite`, `SoftwareApplication` schema ekle.
- Knowledge sayfasina `ItemList` veya `Article`/`FAQPage` schema ekle.
- Compare ve cross-reference sayfalarina breadcrumb schema ekle.

Kabul kriterleri:
- Tum public sayfalarda statik H1 vardir.
- Rich Results testinde JSON-LD parse hatasi yoktur.
- Canonical, OG URL ve schema URL ayni rota stratejisini izler.

### TA-GR-2026-05-27-05 - Deploy Konfigunu Tek Kaynaga Indir

Oncelik: P1  
Alan: DevOps, guvenilirlik  
Dosyalar: `wrangler.toml`, `_headers`, `ToolAdvisor/netlify.toml`, `.netlify/netlify.toml`, README

Problem: Repo Cloudflare Pages ve Netlify izlerini birlikte tasiyor. Uretim davranisi ve redirect/header kaynagi belirsizlesiyor.

Yapilacaklar:
- Uretim platformunu belge olarak netlestir.
- Kullanilmayan nested deploy configlerini arsivle veya README'de "legacy" olarak isaretle.
- Extensionless route, www redirect, http->https redirect ve API route davranisini otomatik test et.

Kabul kriterleri:
- Tek deploy kaynagi README'de net yazilir.
- `/`, `/catalog`, `/tools-directory`, `/cross-reference`, `/compare`, `/knowledge`, `/pro`, `/contact` route testleri gecilir.
- Header ve redirect kaynagi tek dosyada takip edilir.

### TA-GR-2026-05-27-06 - Performans Borcu: Inline Handler ve Buyuk HTML Temizligi

Oncelik: P2  
Alan: performans, guvenlik, bakim  
Dosyalar: `catalog.html`, `modals.js`, `page-switcher.js`, `directory-app.jsx`

Problem: Inline event handler ve inline style yogunlugu CSP'yi zayiflatiyor, cache etkinligini azaltiyor ve bakimi zorlastiriyor.

Yapilacaklar:
- Inline handler'lari event delegation veya module JS'e tasi.
- Ortak chrome/modals CSS'ini statik CSS dosyalarina al.
- Katalog datasini JS chunk veya JSON kaynak olarak ayir.

Kabul kriterleri:
- `catalog.html` inline handler sayisi kademeli olarak 291'den 50 altina iner.
- CSP'den `unsafe-inline` kaldirma plani dokumante edilir.
- Kritik sayfa HTML boyutu belirgin azalir.

### TA-GR-2026-05-27-07 - Sitemap, Robots ve AI Discoverability Hijyeni

Oncelik: P2  
Alan: SEO, GEO/AEO  
Dosyalar: `sitemap.xml`, `robots.txt`, yeni `llms.txt`

Problem: Sitemap lastmod degerleri tum sayfalarda ayni gune set edilmis. Query parametreleri tamamen bloklu. AI arama/discoverability icin ozet kaynak dosyasi yok.

Yapilacaklar:
- `lastmod` degerlerini gercek icerik degisikligine gore otomatik uret.
- Query parametre stratejisini netlestir: filtreler noindex ise statik landing sayfalari olustur.
- `llms.txt` ekleyerek ToolAdvisor'un ne yaptigini, ana sayfalari ve veri sinirlari ozetle.

Kabul kriterleri:
- Sitemap yalnizca canonical public sayfalari icerir.
- Search Console'da sitemap uyarisi yoktur.
- `llms.txt` root'ta yayinlanir ve ana sayfalara link verir.

## 24 Saatlik Odak Onerisi

1. Once katalog rotasi ve H1 problemini cozumle. Bu hem SEO hem performans hem de bakim maliyetini ayni anda etkiliyor.
2. Ardindan ana sayfa CTA ve contact formu gercek aksiyona bagla. Bu iki is dogrudan kullanici kazanimi ve guven sinyali uretir.
3. Deploy configini tek kaynaga indirip route smoke test ekle. Boylece sonraki gunluk raporlar gercek regresyon yakalayabilir.

## Takip Edilecek Metrikler

- Public route HTTP status: 200/301 dogrulama
- HTML boyutu: ana sayfa, katalog, tools-directory
- Tek H1 uyumu: tum public sayfalar
- Indexlenebilir canonical URL sayisi
- CTA tiklama -> advisor panel acilma orani
- Contact form submit basari orani
- Katalog bundle boyutu ve ilk render suresi
- Search Console: coverage, duplicate canonical, sitemap warnings

## Kaynaklar

- Canli site: https://tooladvisor.eu/
- Robots: https://tooladvisor.eu/robots.txt
- Sitemap: https://tooladvisor.eu/sitemap.xml
- Ucuncu taraf gorunurluk snapshot'i: https://www.scamadviser.com/check-website/tooladvisor.eu
- Yerel repo taramasi: `/Users/muratonder/Desktop/ToolAdvisor`
