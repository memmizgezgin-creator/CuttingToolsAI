# ToolAdvisor — Sohbet Özeti, Stratejik Kararlar ve Devam Planı

**Tarih:** 2026-05-28  
**Amaç:** Bu dosya, bu sohbet boyunca ToolAdvisor için konuşulan ana kararları, yapılan işleri, çalışma disiplinini, mevcut durumu ve bundan sonra izlenecek yolu tek yerde toplamak için hazırlandı.

---

## 1. Ana Sonuç

Bu sohbetin ana sonucu şudur:

> ToolAdvisor için agent/workflow sistemi amaç değildir; sadece kontrollü geliştirme aracıdır. Asıl hedef, ToolAdvisor’ı gerçek veriyle çalışan, güvenilir, brand-neutral bir cutting tool decision/comparison platform haline getirmektir.

Başlangıçta iş; agent sistemi, workflow, task sistemi, automation, SEO ve deploy gibi konuların etrafında fazla dönme riski taşıdı. Bu risk fark edildi ve proje tekrar ana hedefe çekildi:

**ToolAdvisor = Cutting Tool Decision Platform**

Bu kırılma kritik oldu. Çünkü ToolAdvisor’ın amacı şunlar değildir:

- klasik katalog sitesi olmak
- e-commerce clone olmak
- blog olmak
- AI demo olmak
- sadece güzel görünen ürün kartları göstermek

Asıl amaç:

- doğru cutting tool seçimi
- teknik karşılaştırma
- muadil / alternatif bulma
- risk / güven seviyesi gösterme
- recommendation explainability
- engineering decision support
- veri güvenilirliği ve karar kalitesi

---

## 2. İki Katmanlı Mimari Düşünce

Projeyi iki ana katmana ayırdık.

### 2.1 Ürün Katmanı

Bu, kullanıcının gördüğü ToolAdvisor ürün deneyimidir.

İçerir:

- Catalog
- Compare
- Product Detail
- Trust Layer
- Filtering
- Decision UX
- Cross-reference / muadil mantığı
- Material / operation suitability
- Data confidence
- Candidate / verified product logic

Bu katmanın hedefi: Kullanıcıya sadece ürün göstermek değil, doğru ürünü seçmesi için teknik karar desteği vermektir.

### 2.2 Operasyon / Agent Katmanı

Bu, ToolAdvisor’ı kontrollü geliştirmek için kurulan üretim hattıdır.

İçerir:

- Claude Code
- Codex
- GitHub Actions
- Guard
- Worklog
- Task sistemi
- Agent protocol
- Agent dispatcher
- Root / deploy / file safety rules

Bu katmanın hedefi: Murat’ın teknik dosya takibinde boğulmadan ürün sahibi olarak karar vermesini sağlamak.

**Stratejik karar:**  
Agent sistemi amaç değil, araçtır.

---

## 3. Çalışma Disiplini ve Kalıcı Kurallar

### 3.1 Aktif Proje Root

Aktif proje root:

```text
/Users/muratonder/Desktop/ToolAdvisor/
```

Eski klasörler legacy kabul edilir:

```text
tooladvisor-v5-final
tooladvisor-deploy-v2
tv5
benzeri eski ToolAdvisor varyantları
```

Bu klasörler açıkça reaktive edilmedikçe kullanılmaz.

### 3.2 Deploy Kuralı

- Cloudflare Pages / Wrangler aktif deploy yoludur.
- Netlify kullanılmaz.
- Deploy sadece açık onayla yapılır.
- Hiçbir agent kendi kendine deploy yapmaz.

### 3.3 PRODUCT_DB Kuralı

`PRODUCT_DB` kilitlidir.

Açık onay olmadan hiçbir şekilde değiştirilemez.

Bu yasak şunları kapsar:

- PDF’den çıkarılan data
- web’den çıkarılan data
- AI-generated data
- manuel eklenen data
- demo/sample data
- cleanup
- normalization
- schema değişikliği
- küçük düzeltme

Yeni ürün verisi önce staging / candidate / review sürecinden geçmelidir.

---

## 4. Ana Kontrol Dosyaları

Her Claude Code / Codex / ChatGPT işi başlamadan önce şu dosyalar okunmalıdır:

```text
CLOUDFLARE_MIGRATION.md
TOOLADVISOR_WORKLOG.md
AGENT_PROTOCOL.md
AGENT_DISPATCHER.md
```

### 4.1 CLOUDFLARE_MIGRATION.md

Ana karar dosyasıdır.  
Single source of truth olarak kabul edildi.

İçerir:

- aktif root
- deploy kuralları
- Cloudflare migration status
- mimari kararlar
- data strategy
- PRODUCT_DB rules
- security rules
- implementation boundaries

### 4.2 TOOLADVISOR_WORKLOG.md

Operasyon günlüğüdür.

İçerir:

- ne yapıldı
- hangi task tamamlandı
- hangi dosyalar değişti
- hangi testler geçti
- kalan riskler
- sonraki adımlar

### 4.3 AGENT_PROTOCOL.md

Agent giriş kurallarıdır.

İçerir:

- önce hangi dosyalar okunacak
- neye dokunulamaz
- ne zaman durulacak
- PRODUCT_DB kuralı
- deploy kuralı
- worklog kuralı

### 4.4 AGENT_DISPATCHER.md

İş yönlendirme protokolüdür.

İçerir:

- hangi iş Claude Code’a gider
- hangi iş Codex’e gider
- research task nedir
- implementation task nedir
- QA task nedir
- ne zaman owner approval gerekir
- task flow nasıl işler

---

## 5. Veri Stratejisi

Başlangıçta şu soru soruldu:

> ToolAdvisor’ın DB’sinde yeterince takım yok. PDF mi indirip toplatmalıyız, yoksa internet search mü kullanmalıyız?

Karar:

**Canlı internet search ana motor olmamalı.**

Doğru yapı:

```text
Verified DB
↓
Candidate / Staging DB
↓
External Search Layer
```

### 5.1 Verified DB

Sadece doğrulanmış, güvenilir kayıtlar burada olur.  
Kullanıcıya öneri olarak gösterilebilir.

### 5.2 Candidate / Staging DB

PDF, web, AI extraction veya manuel girişten gelen ham aday veriler burada tutulur.

Doğrudan PRODUCT_DB’ye basılmaz.

Önce:

- normalize
- duplicate check
- source reference
- confidence score
- missing fields
- review status
- risk flags

süreçlerinden geçmelidir.

### 5.3 External Search Layer

Sadece destekleyici katmandır.

Kullanıcıya “verified recommendation” gibi sunulmaz.

---

## 6. Data Confidence Layer

Her recommendation şu sorulara cevap verebilmelidir:

- veri kaynağı nedir?
- confidence seviyesi nedir?
- validation durumu nedir?
- risk flag var mı?
- estimated mi verified mı?
- hangi alanlar tahmini?
- hangi alanlar güvenilir?
- recommendation context nedir?

Önemli karar:

> Confidence ≠ guaranteed engineering truth

Confidence şu anlamlara gelir:

- signal coverage
- data quality
- recommendation context
- source reliability
- validation status

Önerilen alanlar:

```text
source_tier
source_name
validation_status
confidence_score
last_checked
risk_flags
economicsEstimated
```

Dikkatli kullanılacak dil:

Kullanılabilir:

- Official catalogue source
- Manufacturer source
- Human reviewed
- High confidence
- Estimated
- Data risk

Kaçınılacak:

- Verified by Sandvik
- Approved by ISCAR
- Manufacturer certified

Bu ifadeler ancak gerçek partnerlik varsa kullanılabilir.

---

## 7. Yapılan İşler — Operasyon / Agent Katmanı

Bu sohbette operasyon tarafında şu işler yapıldı:

- Aktif root standardize edildi.
- Eski klasörler legacy kabul edildi.
- `CLOUDFLARE_MIGRATION.md` ana karar dosyası oldu.
- `TOOLADVISOR_WORKLOG.md` operasyon günlüğü oldu.
- `AGENT_PROTOCOL.md` oluşturuldu.
- `AGENT_DISPATCHER.md` oluşturuldu.
- `tasks/` sistemi kuruldu.
- GitHub Actions Guard kuruldu.
- Guard workflow düzeltildi.
- `directory-data.js` koruma kapsamına alındı.
- `AGENT_PROTOCOL.md` guard tarafından kontrol edilir hale geldi.
- Netlify config geri gelirse yakalanacak hale getirildi.
- Worklog güncelleme kontrolü eklendi.
- GitHub Guard ve Pages build yeşil çalıştı.

Sonuç:

> Agent workflow minimum çalışır ve güvenli seviyeye geldi.

Ama stratejik karar:

> Daha fazla sistem kurmak şimdilik duracak. Ürün değerine dönülecek.

---

## 8. Yapılan İşler — Ürün Katmanı

Ürün tarafında yapılanlar:

- Canonical schema runtime metadata eklendi.
- `TA_TOOLS` kayıtları canonical alanlarla okunabilir hale geldi.
- Trust metadata başladı.
- Product card tarafına trust badge eklendi.
- Tool type chip eklendi.
- Estimated economics işaretlendi.
- Detail modal trust section aldı.
- Compare ekranına trust / source / risk rows eklendi.
- Compare ekranındaki statik/yanıltıcı bloklar temizlendi.
- Hardcoded winner iddiaları kaldırıldı.
- Summary alanı mevcut data sinyallerinden türetilir hale geldi.
- Catalog → compare routing eklendi.
- Catalog artık `compare.html?ids=<ids>` üretiyor.
- Compare tarafı seçilen ürünleri okumaya hazır hale geldi.
- Category-specific filter visibility task’ı tamamlandı.
- Gizlenen aktif filtrelerin resetlenmesi sağlandı.
- `_QUOTA_MAX` initialization-order runtime bug düzeltildi.
- Catalog browser verification geçti.
- 266 ürün render edildi.
- Detail modal açıldı.
- Compare flow çalıştı.
- Console error yok.
- Build pass.
- `ta-postflight.sh` pass.

---

## 9. Task 021 / Compare Tarafı

Task 021 tarafı değerlendirildi.

Durum:

- `compare.html`, `catalog.html` üzerinden gelen `?ids=` parametresini okuyup seçilen ürünleri dinamik render etmeye başladı.
- Compare tarafındaki statik / yanıltıcı bloklar temizlendi.
- Hardcoded winner iddiaları kaldırıldı.
- Summary alanı sadece mevcut data sinyallerinden türetilir hale geldi.
- Compare tarafında daha fazla dönmemeye karar verildi.

Karar:

```text
Task 021 / compare tarafı kapanmış kabul edildi.
```

---

## 10. Task 023 / Catalog Category-Specific Filters

Codex’in catalog filter analizi geldi.

Doğru tespitler:

- Ana logic `catalog.html` içinde.
- `directory-app.jsx` tarafına gidilmemeli.
- Mevcut filtreler global/generic.
- `filterProducts()`, `prodFilters`, `productMatchesFacet()`, `getProductFacetValues()` yapıları zaten güvenli çalışıyor.
- En küçük güvenli plan: UI visibility layer.
- Kategoriye / operation’a göre bazı advanced filtreler gösterilecek veya gizlenecek.
- Gizlenen aktif filtreler temizlenmeli.

Task 023 başlatıldı:

Amaç:

- Catalog filtrelerinin kategoriye göre daha akıllı görünmesi.
- Veri modeline, product DB’ye, scoring’e, compare flow’a veya detail modal’a dokunmadan sadece UI davranışı ve gizli filtre temizliği eklemek.

İlk sonuçta browser verification bloklandı.

Sebep:

```text
_QUOTA_MAX initialization-order runtime error
```

Karar:

```text
Task tamamlanmadı. Önce _QUOTA_MAX hatası küçük ve güvenli şekilde düzeltilecek.
```

Sonra düzeltildi:

- `_QUOTA_KEY` ve `_QUOTA_MAX`, immediate `init()` çağrısının üstüne taşındı.
- Quota davranışı değiştirilmedi.
- Sadece startup sırasında `updateQuotaBar()` güvenli çalışır hale geldi.

Final doğrulama:

- `catalog.html` initial load geçti.
- 266 product card render edildi.
- Category/operation filter visibility geçti.
- Hidden active filter clear geçti.
- Gizlenen chipbreaker filtresi `all` durumuna resetlendi.
- Product cards render oldu.
- Detail modal açıldı.
- Compare bar ve compare modal flow çalıştı.
- Browser console error yok.
- Catalog script syntax check geçti.
- `npm run build` geçti.
- `scripts/ta-postflight.sh` geçti.

Kalan risk:

- `data/product-db.generated.json` için local browser server loglarında 404 görüldü.
- Ama catalog bundled DB’ye fallback yaptı.
- 266 ürün normal render edildi.
- Acceptance blocker sayılmadı.
- Bu ileride ayrı data-loading/generated DB task’ı olabilir.

Karar:

```text
Task 023 resmi olarak kapandı.
Worklog güncellendi.
Deploy yapılmadı.
```

---

## 11. SEO / Canonical Konusu

Bir günlük sistem raporu SEO / canonical / URL mimarisiyle ilgili riskler gösterdi.

İlk bakışta önemliydi ama bu sohbetin ana planından sapma riski vardı.

Karar:

```text
SEO / canonical hattı bu sohbetin konusu değil.
Ayrı hatta bırakılacak.
Bu akışta ürün değerine odaklanılacak.
```

---

## 12. Product Detail Strengthening

Stratejik odak kararı:

```text
Product Detail = Decision Screen
```

Neden?

Çünkü kullanıcı catalog’da ürünü görür, filtreler, compare eder. Ama asıl karar noktası çoğu zaman product detail ekranıdır.

Product detail sadece teknik tablo olmamalıdır.

Şunları cevaplamalıdır:

- Bu ürün nedir?
- Hangi operasyon için uygundur?
- Hangi malzemelerde kullanılır?
- Neden önerilir?
- Nerede dikkat edilmelidir?
- Muadili / alternatifi var mı?
- Veri güven seviyesi nedir?
- Hangi alanlar tahmini?
- Hangi bilgiler doğrulanmış?
- Bu ürün ne zaman iyi seçimdir, ne zaman değildir?

---

## 13. Task 024 — Product Detail Audit / Plan

Task 024 başlatıldı.

Amaç:

```text
Product detail’i audit etmek.
```

Önemli:

- Kod yazdırılmadı.
- Önce plan çıkarıldı.
- PRODUCT_DB’ye dokunulmadı.
- Deploy yapılmadı.

Task 024 sonucu:

Mevcut modal aslında gerekli verinin çoğunu içeriyor ama:

- yapı yanlış
- bilgi sırası yanlış
- engineering decision flow eksik

Bu önemli keşif oldu.

İdeal structure tanımlandı:

1. Decision header
2. Operating window
3. Why this fits
4. Watch-outs
5. Alternatives
6. Evidence / trust

Dikkatli engineering dili netleşti:

- “Best match” her yerde kullanılmayacak.
- Düşük confidence ürünlerde daha dikkatli dil kullanılacak:
  - Candidate
  - Review Needed
  - Possible Fit

Bu ToolAdvisor’ın güvenilirliği için kritik karar oldu.

---

## 14. Task 025 — Product Detail Implementation

Task 025 implementation task’ıydı.

Kurallar:

- sadece `catalog.html`
- PRODUCT_DB yok
- `directory-data.js` yok
- deploy yok
- compare flow bozulmayacak

Sonuç:

Product detail artık:

- uzun teknik kayıt değil
- decision-first engineering surface olmaya başladı

Eklenen / güçlenen alanlar:

- decision verdict
- operating window
- why this fits
- watch-out
- evidence / trust
- alternatives
- confidence açıklaması

Ayrıca:

- low-confidence ürünlerde cautious dil
- confidence = data quality / signal coverage açıklaması
- engineering tone
- kısa / scannable yapı

korundu.

QA:

- 266 ürün render
- modal açılıyor
- compare çalışıyor
- shortlist çalışıyor
- filters çalışıyor
- mobile scroll çalışıyor
- console error yok
- build pass
- `ta-postflight` pass

Son değerlendirme:

> ToolAdvisor artık “ürün gösteren site” olmaktan çıkıp “engineering decision platform” hissettirmeye başlamış durumda.

---

## 15. Yeni Risk: Information Overload

Task 025 sonrası yeni risk oluştu:

```text
Information overload
```

Yani problem artık sadece teknik değil.

Yeni risk alanları:

- UX density
- hierarchy
- trust psychology
- decision clarity
- kullanıcıya çok fazla bilgi yüklemek
- karar ekranını karmaşıklaştırmak

Bu yüzden bir ara şu ihtiyaç konuşuldu:

- density cleanup
- product card polish
- compare dynamic refinement

Ama daha sonra daha büyük stratejik düzeltme yapıldı.

---

## 16. Kritik Düzeltme: Asıl İş Veri / Ürün Girişi

Son değerlendirmede Murat çok doğru bir itiraz yaptı:

> “Bence fazlasıyla bu işlere dalıyoruz, detaylarda boğuluyoruz. Asıl işimiz veri / ürün girişi değil mi? Ayrıca otomasyon işini bıraktık, bir yerde dönüyoruz farkında mısın?”

Bu itiraz doğru kabul edildi.

Net karar:

```text
UI / workflow işleri DUR.
Veri hattına geç.
```

Çünkü:

- ürün yoksa compare zayıf kalır
- advisor zayıf kalır
- filter zayıf kalır
- detail ekranı ne kadar güzel olsa da içerik boş kalır

ToolAdvisor’ın gerçek değeri kaliteli ürün datasından gelecek.

---

## 17. Yeni Ana Faz: Data Acquisition Phase

Bundan sonraki ana faz:

```text
Product Data Acquisition Phase
```

Yani:

- hangi markalardan başlanacak?
- hangi ürün aileleri alınacak?
- PDF ingestion nasıl çalışacak?
- Candidate product formatı ne olacak?
- Review / approval nasıl yapılacak?
- PRODUCT_DB’ye ne zaman merge edilecek?

Bu fazda kontrolsüz PRODUCT_DB merge yok.

Doğru akış:

```text
PDF / katalog / üretici datası
↓
candidate DB
↓
normalize
↓
duplicate check
↓
confidence / source / risk flag
↓
review queue
↓
approved olursa PRODUCT_DB
```

---

## 18. Bundan Sonra Durması Gerekenler

Şimdilik duracak:

- yeni workflow sistemi
- yeni agent otomasyonu
- SEO / canonical
- UI polish
- density cleanup
- product detail üstünde fazla dönmek
- deploy
- marketplace / cart
- payment
- Supabase migration
- büyük redesign

Bunlar daha sonra yapılabilir ama şu an ana öncelik değil.

---

## 19. Bundan Sonra Başlaması Gerekenler

Yeni öncelik:

```text
Ürün datasını güvenli şekilde büyütmek.
```

İlk 3 iş:

1. Product Data Acquisition Strategy
2. Candidate Product Schema
3. First PDF Pilot: 1 marka + 1 ürün ailesi

---

## 20. Önerilen Sonraki Task

### Task 026 — Product Data Acquisition Strategy

Amaç:

ToolAdvisor için kontrollü ürün veri büyütme stratejisi çıkarmak.

Kurallar:

- Kod değiştirme
- PRODUCT_DB’ye dokunma
- Deploy yapma
- UI polish yapma
- SEO / canonical konusuna girme

Focus:

- Manufacturer PDF ingestion
- Candidate DB
- Review queue
- Duplicate detection
- Source confidence
- Data confidence
- First product families
- First brands

Output:

```text
research/026-product-data-acquisition-strategy.md
```

Raporda olmalı:

1. Hangi ürün aileleriyle başlanmalı?
2. Hangi markalar öncelikli?
3. PDF’den hangi alanlar çıkarılmalı?
4. Candidate product schema nasıl olmalı?
5. PRODUCT_DB’ye otomatik merge neden yasak?
6. Review / approval akışı nasıl olmalı?
7. İlk 100 / 500 / 1000 ürün stratejisi
8. Riskler
9. Codex için sonraki implementation task önerisi

Priority:

Kesici takımlar ile başla:

- turning inserts
- milling inserts
- drills
- taps
- reamers

Şimdilik genişleme yok:

- holders yok
- machines yok
- grinding wheels yok
- marketplace/cart yok

---

## 21. Stratejik Yön

Şu andaki nihai yön:

```text
ToolAdvisor’ın frontend karar ekranı temeli yeterince güçlendi.
Şimdi ürün datası büyütülmeli.
```

Ama ürün datası büyütme şu şekilde olacak:

- acele yok
- otomatik merge yok
- güven katmanı var
- candidate DB var
- review queue var
- approved merge var

---

## 22. Tek Cümlelik Yeni Rota

> Artık ToolAdvisor’ın ekranlarını daha fazla cilalamak yerine, güvenilir ürün datasını kontrollü şekilde büyütecek candidate data pipeline’a geçiyoruz.

---

## 23. Yeni Sohbet İçin Kısa Başlangıç Komutu

Yeni sohbette şu komut kullanılabilir:

```text
ToolAdvisor devam.

Ana hedef:
ToolAdvisor’ı gerçek veriyle çalışan, brand-neutral cutting tool decision/comparison platform yapmak.

Önemli stratejik karar:
Agent workflow yöntemdir, ToolAdvisor ürün kalitesi hedeftir.

Son kabul edilen durum:
- Compare dynamic groundwork tamamlandı.
- Catalog category-specific filters tamamlandı.
- Product detail decision-first hale getirildi.
- _QUOTA_MAX bug düzeltildi.
- 266 ürün render ediliyor.
- Detail modal / compare / filters çalışıyor.
- Console error yok.
- Worklog güncellendi.
- Deploy yapılmadı.
- SEO/canonical ayrı hatta bırakıldı.

Yeni karar:
UI / workflow / SEO işleri şimdilik duracak.
Asıl odağa dönüyoruz: ürün datası ve güvenli data acquisition.

Sıradaki task:
Task 026 — Product Data Acquisition Strategy.

Kurallar:
- Kod yazma.
- PRODUCT_DB’ye dokunma.
- Deploy yapma.
- UI polish yapma.
- SEO/canonical konusuna girme.
- Önce PDF ingestion / candidate DB / review queue stratejisi çıkar.
```

---

## 24. Final İlke

Bundan sonra her task şu soruya hizmet etmeli:

> ToolAdvisor’ın gerçek ürün datası, karar kalitesi veya güvenilirliği artıyor mu?

Cevap hayırsa, task beklemeli.

