# ToolAdvisor Gunluk Sistem Raporu

Tarih: 2026-05-31  
Saat: 09:21 CEST  
Otomasyon: gunluk raporlama sistem uzerinden  
Kapsam: UX, SEO, teknik saglik, performans, guvenlik, icerik, canli render ve is emri onceliklendirme  
Hedef site: https://tooladvisor.eu/  
Yerel repo: `/Users/muratonder/Desktop/ToolAdvisor`

## Kisa Yonetici Ozeti

Bugunku rontgen, onceki gunlerdeki SEO/canonical ve production asset borclarinin surdugunu; buna ek olarak canli katalogda kullanici aksiyonuyla tetiklenen yeni bir P0 runtime kirilmasi oldugunu gosterdi. `tools-directory` ilk yuklemede 470 urunle render oluyor; ancak katalogdaki family/filter aksiyonunda React `ToolCard` bileseni `Cannot read properties of undefined (reading 'length')` hatasina dusuyor ve katalog kok uygulamasi bosaliyor.

Kok neden kuvvetle muhtemel veri katmani ile UI beklentisi arasindaki sozlesme kirilmasi: yerel veri auditinde 470 kaydin 434'u PDF ingestion kaynakli `X...` kayitlari ve bu kayitlarda `equivIds`, `peerIds`, `source`, `costTier`, `lifeRel`, `costPerEdge`, `edges`, `tool_type` gibi UI'nin bekledigi turetilmis alanlar eksik. Bu teknik degerler kaynak PDF'de yoksa icat edilmemeli; UI null-safe hale getirilmeli ve sadece gercekten turetilen alanlar acikca ayristirilmali.

Olumlu degisim: `_headers` icindeki CSP artik `cdn.tailwindcss.com` ve `unpkg.com` kaynaklarini kapsiyor. Bu, onceki "CSP uretimde sayfayi bloke edebilir" riskini kismen azaltmis. Ancak asil performans/guvenlik borcu kapanmadi; public HTML hala Tailwind CDN, React development runtime ve browser Babel calistiriyor.

Ikinci yeni kritik UX bulgusu mobil layout: 390 px genislikte `main` 260 px sol margin ile basliyor ve katalog 130 px'e sikisiyor; dokuman genisligi 559-560 px'e tasiyor. Mobil kullanici ilk ekranda ana icerigi dar/sagdan kirpilmis goruyor.

## Kontrol Kaynaklari

- Canli tarayici testi: `https://tooladvisor.eu/`, `/ToolAdvisor`, `/catalog.html`, `/tools-directory.html`, `/cross-reference.html`, `/compare.html`, `/knowledge.html`, `/pro.html`, `/contact.html`, `/privacy.html`, `/terms.html`, `/profile.html`, `/saved.html`
- Render/interaction testi: Codex in-app Browser, desktop 1280x720 ve mobil 390x844 viewport
- Terminal HTTP kontrolu: `curl -I https://tooladvisor.eu/` ve `curl -I https://tooladvisor.eu/sitemap.xml` DNS nedeniyle yine basarisiz: `Could not resolve host: tooladvisor.eu`
- Yerel statik audit: public HTML dosyalari, `sitemap.xml`, `llms.txt`, `_headers`, `tools-directory.html`, `directory-app.jsx`, `directory-data.js`, `directory-data-extracted.js`, `assets/`
- Onceki raporlar: `reports/2026-05-29-tooladvisor-gunluk-sistem-raporu.md`, `reports/2026-05-30-tooladvisor-gunluk-sistem-raporu.md`

## Dunku Rapor Sonrasi Durum

| Kontrol | Bugunku sonuc |
| --- | --- |
| CSP CDN izinleri | Kismen kapandi. `_headers` artik Tailwind CDN ve unpkg kaynaklarini listeliyor. |
| Production asset pipeline | Acik. `assets/directory-app.js` ve `assets/tailwind.css` var, fakat `tools-directory.html` hala unpkg + Babel + kaynak JSX calistiriyor. |
| Canonical/route sozlesmesi | Acik. Canli `.html` URL'ler extensionless URL'lere gidiyor, fakat sitemap hala `.html`; root `/ToolAdvisor` oluyor; canonical eksikleri suruyor. |
| Katalog runtime sagligi | Yeni P0. Family/filter aksiyonu `ToolCard` hatasiyla katalog uygulamasini bosaltiyor. |
| Mobil layout | Yeni P0/P1. 390 px viewport'ta ana icerik 130 px'e sikisiyor ve yatay overflow olusuyor. |
| Sitemap missing route | Acik. `/saved.html` 404 sayfasi donduruyor, buna ragmen `sitemap.xml` icinde listeli. |
| Kirik ic link | Acik. `contact.html` icinde `guides.html` linki var; repo kokunde dosya yok. |
| Worktree durumu | Temiz degil. Bu rapor mevcut degisiklikleri geri almaz ve kilitli dosyalara dokunmaz. |

## Bugunku Rontgen Skoru

| Alan | Durum | Not |
| --- | --- | --- |
| Katalog runtime / veri sozlesmesi | Kritik | 434 ingestion kaydi UI'nin bekledigi turetilmis alanlari tasimiyor; filter aksiyonu React'i kiriyor. |
| Mobil UX / responsive shell | Kritik | `main` sol margin mobilde 260 px; katalog 390 px viewport'ta 130 px'e dusuyor. |
| URL / Canonical mimari | Kritik | `/`, `/ToolAdvisor`, `.html`, sitemap ve `llms.txt` final URL sozlesmesi farkli. |
| Teknik SEO | Kritik | Yerel statik audit: 12 public sayfada 10 canonical, 9 title, 8 description eksigi. |
| Performans | Kritik | `catalog.html` 1.1 MB; `tools-directory.html` production bundle yerine dev runtime/Babel yukluyor. |
| Guvenlik / CSP | Riskli | CSP uyumlulugu iyilesmis ama CDN/dev runtime'a izin vererek gecici cozumde kalmis. |
| UX / Donusum | Riskli | Contact semantik form degil; footer placeholder linkleri ve `guides.html` kirik akisi suruyor. |
| Icerik / guven sinyali | Orta | Veri kaynagi/tazelik sinyalleri sayfalar arasinda standart degil. |

## Canli Tarayici Bulgulari

### Route Davranisi

| Istenen URL | Canli final URL | Bulgular |
| --- | --- | --- |
| `/` | `/ToolAdvisor` | Sayfa render oluyor; `<title>`, description, canonical yok; Tailwind CDN warning var. |
| `/ToolAdvisor.html` | `/ToolAdvisor` | `.html` route extensionless route'a gidiyor; sitemap bu davranisla uyumsuz. |
| `/catalog.html` | `/catalog` | Title/description var; canonical ve OG URL kok domaine gidiyor; 9 H1 goruldu. |
| `/tools-directory.html` | `/tools-directory` | Ilk yuklemede katalog render oluyor; title var; canonical/description yok; unpkg + Babel warning var. |
| `/cross-reference.html` | `/cross-reference` | Render var; title/description/canonical yok. |
| `/compare.html` | `/compare` | Render var; title/description/canonical yok. |
| `/knowledge.html` | `/knowledge` | Render var; title/description/canonical yok. |
| `/pro.html` | `/pro` | Title yanlis: `Saved Tools - ToolAdvisor Intelligence`; canonical/description yok. |
| `/saved.html` | `/saved.html` | 404 icerigi donuyor; sitemap'te listeli kalmamali. |

### Katalog Interaction Repro

Akis: `https://tooladvisor.eu/tools-directory.html` -> katalog yuklenir -> `Drilling` family filtresi tiklanir.

Gozlenen sonuc:
- Ilk yukleme: `Cutting Tool Catalog` H1 gorunur; `12 shown of 470 matching` bilgisi render olur.
- Aksiyon sonrasi: `#catalog-root` bosalir.
- Console hata: `TypeError: Cannot read properties of undefined (reading 'length') at ToolCard`.
- React ek hata: `<ToolCard>` bileseninde error boundary olmadigi icin tum App agaci duser.

Kuvvetli kok neden:
- `directory-data.js` sadece temel 36 kayit icin `equivIds`, `peerIds`, ekonomi ve tool type alanlarini turetiyor.
- `directory-data-extracted.js` sonradan 434 ingestion kaydini `window.TA_TOOLS` uzerine ekliyor.
- Sonradan eklenen kayitlarda UI'nin bekledigi alanlar yok.

Yerel data shape sayimi:

| Metrik | Deger |
| --- | ---: |
| Toplam katalog kaydi | 470 |
| Eksik `equivIds` | 434 |
| Eksik `peerIds` | 434 |
| Eksik `source` | 434 |
| Eksik `costTier` | 434 |
| Eksik `lifeRel` | 434 |
| Eksik `costPerEdge` | 434 |
| Eksik `edges` | 434 |
| Eksik `tool_type` | 434 |

Family bazinda eksik `equivIds`:

| Family | Toplam | Eksik `equivIds` |
| --- | ---: | ---: |
| Drilling | 237 | 234 |
| Milling | 155 | 147 |
| Threading | 48 | 43 |
| Turning | 27 | 10 |
| Reaming | 3 | 0 |

### Mobil Layout Bulgusu

Viewport: 390x844  
Sayfa: `/tools-directory`

| Metrik | Deger |
| --- | ---: |
| `innerWidth` | 390 px |
| `documentElement.scrollWidth` | 559 px |
| `main.left` | 260 px |
| `main.width` | 130 px |
| `#catalog-root.width` | 130 px |

Bu, mobile-first kullanici deneyiminde ana katalog icerigini okunamaz hale getiriyor. Kok neden shell/layout siniflari gibi gorunuyor: sayfa yapisi mobilde de desktop sidebar offset'i (`ml-sidebar-width`) uyguluyor.

## Yerel Statik SEO Matrisi

| Dosya | Boyut | H1 | Title | Description | Canonical | OG URL | Form | Runtime |
| --- | ---: | ---: | --- | --- | --- | --- | ---: | --- |
| `index.html` | 192 B | 0 | Eksik | Eksik | `https://tooladvisor.eu/ToolAdvisor.html` | Eksik | 0 | Meta refresh |
| `ToolAdvisor.html` | 24.8 KB | 1 | Eksik | Eksik | Eksik | Eksik | 0 | Tailwind CDN |
| `catalog.html` | 1.1 MB | 9 | Var | Var | `https://tooladvisor.eu/` | `https://tooladvisor.eu/` | 2 | Inline JS |
| `tools-directory.html` | 4.8 KB | 0 statik / 1 render | Var | Eksik | Eksik | Eksik | 0 statik | Tailwind CDN, unpkg, Babel |
| `cross-reference.html` | 34.0 KB | 1 | Eksik | Eksik | Eksik | Eksik | 0 | Tailwind CDN |
| `compare.html` | 30.5 KB | 1 | Eksik | Eksik | Eksik | Eksik | 0 | Tailwind CDN |
| `knowledge.html` | 41.8 KB | 1 | Eksik | Eksik | Eksik | Eksik | 0 | Tailwind CDN |
| `pro.html` | 16.4 KB | 1 | Yanlis | Eksik | Eksik | Eksik | 0 | Tailwind CDN |
| `contact.html` | 17.8 KB | 1 | Eksik | Var | Eksik | `.html` URL | 0 | Tailwind CDN |
| `privacy.html` | 16.7 KB | 1 | Eksik | Var | Eksik | `.html` URL | 0 | Tailwind CDN |
| `terms.html` | 17.0 KB | 1 | Eksik | Var | Eksik | `.html` URL | 0 | Tailwind CDN |
| `profile.html` | 10.3 KB | 0 | Eksik | Eksik | Eksik | Eksik | 0 | Tailwind CDN |

Toplu sayim:

| Metrik | Deger |
| --- | ---: |
| Public HTML sayfasi | 12 |
| Canonical eksigi | 10 / 12 |
| Title eksigi | 9 / 12 |
| Meta description eksigi | 8 / 12 |
| OG URL eksigi | 8 / 12 |
| H1 eksigi | 3 / 12 statik |
| Tailwind CDN kullanan sayfa | 10 / 12 |
| unpkg/Babel kullanan sayfa | 1 |
| Placeholder `href="#"` | 30 |
| Bilinen kirik ic link | `contact.html` -> `guides.html` |
| Sitemap missing route | `saved.html` |

## Bugunku Is Emirleri

### TA-GR-2026-05-31-01 - Katalog Runtime Crash'ini ve Veri Sozlesmesini Duzelt

Oncelik: P0  
Alan: katalog UX, ingestion entegrasyonu, veri guvenilirligi  
Dosyalar: `/Users/muratonder/Desktop/ToolAdvisor/directory-app.jsx`, `/Users/muratonder/Desktop/ToolAdvisor/directory-data.js`, `/Users/muratonder/Desktop/ToolAdvisor/directory-data-extracted.js`, `/Users/muratonder/Desktop/ToolAdvisor/ingestion/`

Problem: PDF ingestion kaynakli 434 kayit UI'nin bekledigi turetilmis alanlari tasimiyor. Katalog filtre aksiyonu `ToolCard` icinde `undefined.length` hatasi uretip uygulamayi bosaltiyor.

Yapilacaklar:
- UI tarafinda array beklenen alanlari null-safe hale getir: `equivIds`, `peerIds`, `iso_all` gibi alanlar yoksa `[]` gibi guvenli varsayimla davran.
- Teknik deger icat etme. Kaynak PDF'de olmayan `costTier`, `lifeRel`, `costPerEdge`, `edges` gibi ticari/ekonomik alanlari otomatik uydurma; yoksa UI'de gizle veya `null` olarak ele al.
- Ingestion ciktilari icin minimum UI sozlesmesi belirle: render icin gereken yapisal alanlar, kaynak izlenebilirligi ve AI-inferred alan ayrimi.
- `ToolCard`, `DetailModal`, compare drawer ve AI context tarafinda eksik alan toleransi ekle.
- Katalog agacina basit error boundary veya hata durumunda kart bazli fallback ekle.

Kabul kriterleri:
- `tools-directory` ilk yukleme, `Drilling`, `Milling`, `Threading`, ISO filtreleri ve sort aksiyonlari console error olmadan calisir.
- `#catalog-root` filtre aksiyonundan sonra bosalmaz.
- 470 kaydin tumu render yolunda hata uretmez.
- Eksik teknik/ticari alanlar kullaniciya kaynakli veri gibi sunulmaz.
- PRODUCT_DB merge yapilmaz; kilitli dosyalara dokunmak icin manuel onay alinir.

### TA-GR-2026-05-31-02 - Mobil Shell Offset'ini Kaldir

Oncelik: P0  
Alan: mobil UX, responsive layout  
Dosyalar: `/Users/muratonder/Desktop/ToolAdvisor/page-switcher.js`, `/Users/muratonder/Desktop/ToolAdvisor/polish.css`, ilgili HTML shell pattern'leri

Problem: Mobilde desktop sidebar icin ayrilan 260 px sol margin devam ediyor. 390 px viewport'ta katalog 130 px'e sikisiyor ve yatay overflow olusuyor.

Yapilacaklar:
- Sidebar/main layout icin mobil breakpoint tanimla.
- `main` ve footer alanlarinda `ml-sidebar-width` davranisini mobilde kaldir.
- Mobil nav'i full-width icerigi kapatmayacak sekilde hamburger/bottom-nav/overlay modeliyle netlestir.
- `tools-directory`, `ToolAdvisor`, `compare`, `cross-reference`, `knowledge` icin 390 px smoke testi ekle.

Kabul kriterleri:
- 390 px viewport'ta `main.left` 0 veya kabul edilebilir gutter degeridir.
- `documentElement.scrollWidth <= innerWidth + 1`.
- Katalog root genisligi 390 px viewport'ta 340 px altina dusmez.
- Ilk ekranda ana baslik, filtreler ve kartlar kirpilmadan okunur.

### TA-GR-2026-05-31-03 - Canonical Route Sozlesmesini Canli Davranisa Gore Kilitle

Oncelik: P0  
Alan: SEO, AEO/GEO, mimari  
Dosyalar: `/Users/muratonder/Desktop/ToolAdvisor/index.html`, `/Users/muratonder/Desktop/ToolAdvisor/ToolAdvisor.html`, `/Users/muratonder/Desktop/ToolAdvisor/sitemap.xml`, `/Users/muratonder/Desktop/ToolAdvisor/llms.txt`, `/Users/muratonder/Desktop/ToolAdvisor/_headers`

Problem: Canli site `.html` URL'leri extensionless route'lara tasiyor, fakat sitemap `.html` URL'leri listeliyor. Root `/ToolAdvisor` final URL'sine gidiyor ve sayfalarda canonical yok.

Yapilacaklar:
- Tek final URL modeli sec ve yazili hale getir. Canli davranisa en yakin model: `/`, `/ToolAdvisor` veya `/advisor`, `/catalog`, `/tools-directory`, `/cross-reference`, `/compare`, `/knowledge`, `/pro`, `/contact`, `/privacy`, `/terms`.
- Sitemap, `llms.txt`, canonical, OG URL ve nav linklerini ayni final route sozlesmesine esitle.
- `/saved.html` sitemap'ten cikar veya gercek sayfa olarak olustur.
- Root `/` icin final home URL kararini netlestir; `/ToolAdvisor` duplicate olmamali.

Kabul kriterleri:
- Sitemap'teki her URL canli 200 icerige gider ve kendi canonical'iyle ayni URL'yi gosterir.
- `.html` ve extensionless URL'ler iki ayri indexlenebilir varlik gibi gorunmez.
- `llms.txt` ile sitemap URL bicimi aynidir.

### TA-GR-2026-05-31-04 - Production Asset Pipeline'a Gec

Oncelik: P1  
Alan: performans, guvenlik, deploy  
Dosyalar: `/Users/muratonder/Desktop/ToolAdvisor/tools-directory.html`, `/Users/muratonder/Desktop/ToolAdvisor/assets/directory-app.js`, `/Users/muratonder/Desktop/ToolAdvisor/assets/tailwind.css`, `/Users/muratonder/Desktop/ToolAdvisor/package.json`, `/Users/muratonder/Desktop/ToolAdvisor/_headers`

Problem: Production bundle hazir olmasina ragmen canli katalog `React development`, `ReactDOM development` ve `@babel/standalone` kaynaklarini browser'da calistiriyor.

Yapilacaklar:
- `tools-directory.html` icinden unpkg React/ReactDOM/Babel ve `type="text/babel"` yuklemeyi kaldir.
- `npm run build` ile uretilen `assets/directory-app.js` bundle'ini kullan.
- Tailwind CDN kullanan public sayfalari kademeli olarak `assets/tailwind.css` kullanimina gecir.
- CSP'yi gecici CDN izinlerinden nihai lokal asset modeline dogru sadelestir.

Kabul kriterleri:
- Canli console'da Babel production warning kalmaz.
- Tailwind production warning kalmaz veya sadece gecici olarak takip edilen sayfalarda kalir.
- Katalog JS/CSS lokal asset olarak cache'lenir.
- Build script deploy oncesi zorunlu kosul olur.

### TA-GR-2026-05-31-05 - Public SEO Skeleton Standardini Tamamla

Oncelik: P1  
Alan: teknik SEO, paylasim gorunurlugu, erisilebilirlik  
Dosyalar: public HTML sayfalari

Problem: Title, description, canonical ve OG/Twitter metadata standardi hala eksik. `pro.html` title'i yanlis. Root sayfanin title'i bos.

Yapilacaklar:
- Her indexlenebilir sayfaya tek `<title>`, meta description, canonical, OG title/description/url/image ve Twitter card ekle.
- Her indexlenebilir sayfada tek H1 garanti et.
- `pro.html` title'ini Pro sayfasi ile uyumlu hale getir.
- `profile` kullanici/hesap sayfasiysa `noindex` karari al.
- Ana sayfaya `Organization`, `WebSite`, `SoftwareApplication` JSON-LD ekle.

Kabul kriterleri:
- Public auditte title/description/canonical eksigi kalmaz.
- OG URL ve canonical final route ile aynidir.
- H1 sayisi her indexlenebilir sayfada 1'dir.

### TA-GR-2026-05-31-06 - Contact, Footer ve Kirik Link Akisini Onar

Oncelik: P1  
Alan: UX, donusum, guven  
Dosyalar: `/Users/muratonder/Desktop/ToolAdvisor/contact.html`, footer pattern'leri, gerekirse Cloudflare Pages Function

Problem: `contact.html` icinde `guides.html` kirik linki var. Footer'da 30 placeholder `href="#"` linki duruyor. Contact sayfasindaki ana iletisim akisinda semantik form yok.

Yapilacaklar:
- `guides.html` linkini `knowledge.html` veya gercek guide route'una bagla.
- Footer legal/support linklerini gercek hedeflere cevir.
- Contact input/textarea alanlarini gercek `<form>` yapisina al.
- Accessible label, validation, success/error state ve gercek submit/fallback akisi ekle.

Kabul kriterleri:
- Kirik `guides.html` yolu kalmaz.
- Placeholder footer linkleri temizlenir.
- Contact form klavye ile doldurulup submit edilebilir.

### TA-GR-2026-05-31-07 - Route, SEO, Runtime ve Data Shape Smoke Testi Yaz

Oncelik: P2  
Alan: QA, otomasyon, regression onleme  
Dosyalar: yeni smoke script, `/Users/muratonder/Desktop/ToolAdvisor/package.json`, `/Users/muratonder/Desktop/ToolAdvisor/reports/`

Problem: Gunluk raporlar ayni borclari yakaliyor, fakat CI/deploy oncesi otomatik fail eden test yok. Yeni katalog crash'i basit bir interaction smoke testiyle yakalanabilirdi.

Yapilacaklar:
- Route listesi, sitemap, canonical, title, description, H1 ve missing local link testlerini tek smoke komutuna bagla.
- `tools-directory` icin interaction testi ekle: family filtreleri, ISO filtreleri, sort, view toggle.
- Data shape testi ekle: render icin zorunlu yapisal alanlar eksikse fail et; teknik kaynak alanlari eksikse UI'nin null-safe oldugunu dogrula.
- Mobil 390 px ve desktop 1280 px layout overflow kontrolu ekle.

Kabul kriterleri:
- `npm run smoke` veya benzeri komut P0 SEO/runtime/layout regresyonlarini yakalar.
- `saved.html` sitemap'te kalirsa test fail eder.
- Katalog filter crash'i tekrar girerse test fail eder.

## 2 Saatlik Uygulama Sirasi

1. `TA-GR-2026-05-31-01`: Katalog crash'ini onar. Once UI null-safe guard, sonra ingestion cikti sozlesmesi.
2. `TA-GR-2026-05-31-02`: Mobil shell offset'ini kaldir ve 390 px smoke ile dogrula.
3. `TA-GR-2026-05-31-03`: Final route/canonical kararini sitemap ve `llms.txt` ile esitle; `saved.html` borcunu kapat.
4. `TA-GR-2026-05-31-04`: `tools-directory.html` sayfasini production bundle'a gecir.
5. `TA-GR-2026-05-31-07`: Yukaridaki iki P0 icin kalici smoke testi yaz.

## Notlar ve Sinirlar

- Bu calisma analiz/rapor uretimiyle sinirlidir; site kodu, `directory-data.js`, `directory-app.jsx`, `ToolAdvisor.html`, `index.html` veya `CNAME` degistirilmedi.
- `directory-app.jsx` ve `directory-data.js` AGENTS kurallarinda kilitli dosya oldugu icin uygulama fix'i manuel onay gerektirir.
- Terminal DNS kisiti suruyor; canli route bulgulari Browser tabanli render testiyle alindi.
- PDF ingestion kaynakli kayitlarda teknik alanlar icat edilmemeli. Eksik kaynak degeri varsa `null`/gizli UI davranisi tercih edilmeli.
