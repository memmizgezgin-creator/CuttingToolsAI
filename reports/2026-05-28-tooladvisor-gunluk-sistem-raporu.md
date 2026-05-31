# ToolAdvisor Gunluk Sistem Raporu

Tarih: 2026-05-28  
Otomasyon: gunluk raporlama sistem uzerinden  
Kapsam: UX, SEO, teknik saglik, performans, guvenlik, icerik ve is emri onceliklendirme  
Hedef site: https://tooladvisor.eu/  
Yerel repo: `/Users/muratonder/Desktop/ToolAdvisor`

## Kisa Yonetici Ozeti

Bugunku rontgen, dunku katalog borcunun hala kritik oldugunu dogruluyor; fakat bugunun en yuksek riskli yeni bulgusu URL/canonical sozlesmesinin dagilmis olmasi. Kök `index.html` kullaniciyi `ToolAdvisor.html` dosyasina meta-refresh ile tasiyor ve canonical'i `https://tooladvisor.eu/ToolAdvisor.html` olarak veriyor. `sitemap.xml` `.html` uzantili URL'leri listeliyor. `llms.txt` ise extensionless URL'leri canonical gibi anlatiyor. `catalog.html` kendi canonical'ini kok domaine veriyor. Bu dort sinyal ayni urun/site mimarisini anlatmiyor.

Canli gorunurluk tarafinda web fetch ana domaini acabiliyor ve ucuncu taraf snapshot'i `https://tooladvisor.eu/` icin HTTP 200, gecerli SSL ve "Fast" hiz sinyali bildiriyor. Terminal `curl` bu ortamda DNS cozumleyemedigi icin canli header ve alt rota status kontrolu yapilamadi. Bu rapor canli erisilebilirlik sinyali, arama gorunurlugu ve yerel repo denetimi birlestirilerek hazirlandi.

## Dunku Rapor Sonrasi Degisimler

- `llms.txt` artik repo kokunde var. Bu olumlu, fakat extensionless URL'ler kullandigi icin sitemap/canonical ile uyumsuz.
- Kok `_headers` dosyasi mevcut. Guvenlik header'lari iyi bir baslangic, fakat CSP mevcut sayfa bagimliliklarini tamamen kapsamiyor.
- Katalog problemi devam ediyor: `catalog.html` yaklasik 1.1 MB, 12 H1 ve 293 inline event handler iceriyor.
- Contact form ve CTA aksiyonlari tarafinda temel davranis riski suruyor.

## Bugunku Rontgen Skoru

| Alan | Durum | Not |
| --- | --- | --- |
| URL / Canonical Mimari | Riskli | `/`, `/ToolAdvisor.html`, `.html` sitemap ve extensionless `llms.txt` uyumsuz. |
| Teknik SEO | Riskli | Public sayfalarin cogunda title, description veya canonical eksik. |
| UX / Donusum | Orta-riskli | Contact form semantik form degil; ana CTA hash anchor'a gidiyor. |
| Performans | Riskli | Dev runtime, Tailwind CDN, Babel ve buyuk katalog HTML'i var. |
| Guvenlik | Orta-riskli | CSP iyi niyetli ama mevcut CDN'leri bloklayabilir; `unsafe-inline` gerekiyor. |
| Erisilebilirlik | Orta | Bazi sayfalarda H1 eksik; contact label/input baglantilari yok. |
| Icerik / E-E-A-T | Orta | Niyet net, ancak kaynak/metodoloji/tazelik sinyalleri sayfa geneline yayilmamis. |
| Bakim Kolayligi | Riskli | Build edilen asset var ama `tools-directory.html` kaynak JSX ve dev CDN yukluyor. |

## Olculen Teknik Bulgular

### Public HTML SEO matrisi

| Dosya | Boyut | H1 | JSON-LD | Form | Inline handler | Title/Meta/Canonical durumu |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `index.html` | 192 B | 0 | 0 | 0 | 0 | Title/description yok; canonical `ToolAdvisor.html`. |
| `ToolAdvisor.html` | 24.8 KB | 1 | 0 | 0 | 0 | Title, description, canonical yok. |
| `catalog.html` | 1.1 MB | 12 | 5 | 2 | 293 | Title/description var; canonical kok domaine gidiyor. |
| `tools-directory.html` | 4.8 KB | 0 | 0 | 0 | 0 | Title var; description/canonical/H1 yok. |
| `cross-reference.html` | 34.0 KB | 1 | 0 | 0 | 0 | Title/description/canonical yok. |
| `compare.html` | 30.5 KB | 1 | 0 | 0 | 0 | Title/description/canonical yok. |
| `knowledge.html` | 41.8 KB | 1 | 0 | 0 | 0 | Title/description/canonical yok. |
| `pro.html` | 16.4 KB | 1 | 0 | 0 | 0 | Title yanlis: "Saved Tools"; description/canonical yok. |
| `contact.html` | 17.8 KB | 1 | 0 | 0 | 0 | Description var; title/canonical yok. |
| `profile.html` | 10.3 KB | 0 | 0 | 0 | 0 | Title/description/canonical/H1 yok. |

### Kritik gozlemler

1. `index.html` satir 4 meta-refresh ile `ToolAdvisor.html` dosyasina tasiyor, satir 5 canonical'i de dosya URL'sine veriyor. Arama motorlari icin kok domainin asil sayfa mi yoksa dosya URL'si mi oldugu belirsiz.

2. `sitemap.xml` hem `https://tooladvisor.eu/` hem de `https://tooladvisor.eu/ToolAdvisor.html` listeliyor. Ayrica `saved.html` sitemap'te var ama repo kokunde bu dosya bulunmuyor.

3. `llms.txt` `https://tooladvisor.eu/catalog`, `/compare`, `/knowledge`, `/contact` gibi extensionless URL'leri birincil sayfa olarak anlatiyor. Sitemap ise `.html` uzantili URL'leri listeliyor.

4. `catalog.html` canonical'i `https://tooladvisor.eu/` olarak ayarlanmis. Katalog sayfasi kendi basina indekslenmek isteniyorsa bu yanlis; katalog kok sayfaya sinyal devrediyor.

5. `_headers` CSP `script-src` icinde `cdn.tailwindcss.com` ve `unpkg.com` yok. Buna karsilik public HTML dosyalarinin cogu Tailwind CDN yukluyor; `tools-directory.html` React, ReactDOM ve Babel'i `unpkg.com` uzerinden yukluyor. Bu header uretimde uygulanirsa sayfa scriptleri bloklanabilir.

6. `tools-directory.html` build edilmis `assets/directory-app.js` yerine `directory-app.jsx` dosyasini browser'da Babel ile calistiriyor. Repoda `npm run build` script'i ve 55 KB'lik build asset'i var; ancak sayfa bunu kullanmiyor.

7. Contact form bolumu `<form>` degil; input'larda `name`, `id`, `for`, `required`, submit action ve feedback state yok. "Send Message" butonu tek basina UI elemani olarak kaliyor.

8. Contact sayfasinda `guides.html` linki var, fakat repo kokunde `guides.html` bulunmuyor.

9. Footer tarihleri sayfalar arasinda 2024 ve 2025 olarak dagilmis. 2026'da bu guven sinyalini zayiflatiyor.

10. Ucuncu taraf snapshot'i domain icin gecerli SSL ve HTTP 200 bildiriyor; ayni snapshot Tranco gorunurlugunun dusuk oldugunu da belirtiyor. Bu erken/niche site icin normal olabilir, ancak SEO temeli daha temiz kurulmadan organik buyume beklemek zor.

## Bugunku Is Emirleri

### TA-GR-2026-05-28-01 - Tek URL ve Canonical Sozlesmesi

Oncelik: P0  
Alan: SEO, GEO/AEO, mimari  
Dosyalar: `index.html`, `ToolAdvisor.html`, `catalog.html`, `sitemap.xml`, `llms.txt`, `_headers`

Problem: Site kok, dosya uzantili ve extensionless URL'ler arasinda bolunmus. Sitemap, canonical ve `llms.txt` ayni URL stratejisini gostermiyor.

Yapilacaklar:
- Tek public URL stratejisi sec: onerilen extensionless (`/`, `/catalog`, `/compare`, `/knowledge`, `/contact`).
- `index.html` meta-refresh yerine gercek home HTML'i veya platform seviyesinde 301/rewrites kullan.
- Her sayfada canonical'i secilen final URL'ye esitle.
- Sitemap'i yalnizca canonical, indexlenebilir ve mevcut URL'lerle yeniden olustur.
- `llms.txt` ile sitemap URL bicimini ayni hale getir.
- `saved.html` yoksa sitemap'ten cikar; varsa dosyayi ve route'u ekle.

Kabul kriterleri:
- `/` ve `/ToolAdvisor.html` ayni canonical sinyali vermez; birincil URL nettir.
- Sitemap'teki tum URL'ler 200 veya bilincli 301 verir.
- `sitemap.xml`, `llms.txt`, OG URL ve canonical degerleri ayni route sozlesmesini izler.
- Search Console'da duplicate canonical ve submitted URL not found uyarisi uretmez.

### TA-GR-2026-05-28-02 - CSP ve Production Asset Pipeline Duzeltmesi

Oncelik: P0  
Alan: guvenlik, performans, build/deploy  
Dosyalar: `_headers`, `tools-directory.html`, `package.json`, `assets/directory-app.js`, `assets/tailwind.css`, `directory-app.jsx`

Problem: CSP mevcut CDN kullanimini izinli listeye almiyor; ayni zamanda production sayfasi dev React, Babel ve kaynak JSX yukluyor.

Yapilacaklar:
- `tools-directory.html` icin `assets/directory-app.js` production bundle'ini kullan.
- Browser'da `type="text/babel"` ve `directory-app.jsx` yuklemeyi kaldir.
- Tailwind CDN kullanimini kademeli olarak `assets/tailwind.css` ile degistir.
- CSP'yi gercek production bagimliliklarina gore sade hale getir; gecici CDN gerekiyorsa bilincli izin ver.
- Build komutunu deploy surecinin zorunlu adimi yap.

Kabul kriterleri:
- `tools-directory.html` unpkg/Babel olmadan render olur.
- CSP console'da script/style block hatasi uretmez.
- Production HTML'de kaynak JSX calistirilmaz.
- Sayfa ilk yukleme JS/CSS bagimliliklari cache'lenebilir lokal asset'lerden gelir.

### TA-GR-2026-05-28-03 - Public Sayfa SEO Skeleton Standardi

Oncelik: P1  
Alan: teknik SEO, erisilebilirlik  
Dosyalar: `ToolAdvisor.html`, `tools-directory.html`, `cross-reference.html`, `compare.html`, `knowledge.html`, `pro.html`, `contact.html`, `profile.html`, `privacy.html`, `terms.html`

Problem: Public sayfalarin cogunda title, meta description, canonical, OG/Twitter metadata ve JSON-LD standart degil. Bazi sayfalarda H1 yok.

Yapilacaklar:
- Her public sayfaya tek `<title>`, tek meta description, tek canonical ve tek H1 standardi ekle.
- Ana sayfaya `Organization`, `WebSite` ve `SoftwareApplication` JSON-LD ekle.
- Katalog/knowledge/compare/cross-reference sayfalarina sayfa amacina uygun JSON-LD ve breadcrumb ekle.
- `pro.html` title'ini "Saved Tools" yerine pricing/pro vaadine uygun hale getir.
- `profile.html` public indekslenecekse H1/meta ekle; indekslenmeyecekse noindex stratejisi belirle.

Kabul kriterleri:
- Public HTML audit'te title/description/canonical eksigi kalmaz.
- Her indexlenebilir route'ta tek H1 vardir.
- Rich Results testinde JSON-LD parse hatasi yoktur.
- OG URL ve canonical ayni final route'u gosterir.

### TA-GR-2026-05-28-04 - Katalog Borcunu Ayristirma

Oncelik: P1  
Alan: performans, SEO, bakim  
Dosyalar: `catalog.html`, `tools-directory.html`, `directory-app.jsx`, `assets/directory-app.js`, `directory-data.js`

Problem: `catalog.html` hala 1.1 MB, 12 H1 ve 293 inline handler iceriyor. Katalog niyeti ile eski/demo uygulama bloklari ayni dosyada duruyor.

Yapilacaklar:
- Katalog icin tek canonical route belirle.
- `catalog.html` icindeki eski/demo workspace bloklarini ayri arsiv dosyasina veya dev-only alana tasi.
- H1 sayisini 1'e indir.
- Inline handler'lari module JS veya event delegation'a tasi.
- Katalog datasini statik JSON/JS chunk olarak cache'lenebilir hale getir.

Kabul kriterleri:
- Katalog HTML ilk yaniti 250 KB altina iner veya kritik icerik + bundle ayrimi netlesir.
- H1 sayisi 1 olur.
- Inline handler sayisi 50 altina iner.
- Katalog route'u kendi canonical'ini verir.

### TA-GR-2026-05-28-05 - Contact Form ve Destek Akisi

Oncelik: P1  
Alan: UX, donusum, guven  
Dosyalar: `contact.html`, `functions/proxy.js` veya yeni form endpoint'i

Problem: Contact UI form gibi gorunuyor ama semantik form ve submit akisi yok. Ayrica `guides.html` linki kirik.

Yapilacaklar:
- Input/textarea alanlarini `<form>` icine al.
- `label for`, `id`, `name`, `required`, validation ve accessible error state ekle.
- Cloudflare Pages Function veya mailto fallback ile gercek submit akisi kur.
- Basari/basarisizlik confirmation state ekle.
- `guides.html` linkini mevcut `knowledge.html` veya gercek guide route'una bagla.

Kabul kriterleri:
- Form klavye ile doldurulup submit edilebilir.
- Bos veya gecersiz email icin anlasilir hata gorunur.
- Basarili gonderimde kullanici net feedback alir.
- Kirik `guides.html` linki kalmaz.

### TA-GR-2026-05-28-06 - Footer, Legal ve Guven Sinyali Temizligi

Oncelik: P2  
Alan: UX, guven, marka tutarliligi  
Dosyalar: `ToolAdvisor.html`, `tools-directory.html`, `cross-reference.html`, `compare.html`, `knowledge.html`, `pro.html`, `contact.html`, `privacy.html`, `terms.html`, `profile.html`

Problem: Footer linkleri bazi sayfalarda `#` olarak kaliyor; copyright yillari 2024/2025 daginik.

Yapilacaklar:
- Footer linklerini gercek `terms`, `privacy`, `contact` URL'lerine bagla.
- Copyright yilini tek kaynak/degisken veya 2026 sabitiyle guncelle.
- Footer metnini "Brand-neutral" guven pozisyonlamasiyla tutarli hale getir.

Kabul kriterleri:
- Public sayfalarda `href="#"` legal/support linki kalmaz.
- Footer yili tum sayfalarda tutarlidir.
- Legal/support linkleri 200 veren sayfalara gider.

### TA-GR-2026-05-28-07 - Canli Route Smoke Test Otomasyonu

Oncelik: P2  
Alan: QA, deployment guvenilirligi  
Dosyalar: yeni `scripts/smoke-routes.*`, README veya deployment docs

Problem: Bu ortamda terminal DNS cozumleyemedigi icin bugun canli status/header audit tamamlanamadi. Gunluk raporlarin gercek regresyon yakalayabilmesi icin deploy ortamindan veya CI'dan calisan route smoke test gerekir.

Yapilacaklar:
- Canonical route listesini tek dosyada tanimla.
- CI veya deploy sonrasi smoke test ile status, final URL, canonical, title ve CSP violation kontrolu yap.
- Sitemap URL'lerinin dosya/route varligini otomatik dogrula.

Kabul kriterleri:
- `/`, `/catalog`, `/tools-directory`, `/cross-reference`, `/compare`, `/knowledge`, `/pro`, `/contact`, `/privacy`, `/terms` icin smoke raporu uretilir.
- Sitemap'teki missing route testte fail eder.
- Gunluk rapor bir onceki gune gore yeni regresyonlari ayirabilir.

## 24 Saatlik Odak Onerisi

1. Once TA-GR-2026-05-28-01'i tamamla: URL/canonical/sitemap/llms uyumu duzelmeden diger SEO isleri tam etki vermez.
2. Hemen ardindan TA-GR-2026-05-28-02'yi ele al: CSP ile production asset pipeline uyusmazligi canli sayfa bozulmasina yol acabilir.
3. Sonra TA-GR-2026-05-28-03 ve TA-GR-2026-05-28-05'i bitir: metadata standardi ve contact akisi dogrudan guven/donusum sinyali uretir.

## Takip Edilecek Metrikler

- Canonical URL sayisi ve duplicate canonical uyarilari
- Sitemap URL'lerinin 200/301/404 dagilimi
- Public sayfalarda title/description/canonical/H1 eksik sayisi
- CSP violation sayisi
- Production HTML'de CDN/dev runtime bagimliligi sayisi
- Katalog HTML boyutu ve inline handler sayisi
- Contact form submit basari/hata orani
- Search Console coverage ve sitemap uyarilari
- AI discoverability icin `llms.txt` ile sitemap URL uyum orani

## Kaynaklar

- Canli site: https://tooladvisor.eu/
- Ucuncu taraf gorunurluk snapshot'i: https://www.scamadviser.com/check-website/tooladvisor.eu
- Yerel repo taramasi: `/Users/muratonder/Desktop/ToolAdvisor`
- Otomasyon hafizasi: `/Users/muratonder/.codex/automations/gunluk-raporlama-sistem-uzerinden/memory.md`
