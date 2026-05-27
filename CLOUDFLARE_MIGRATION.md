# ToolAdvisor — Cloudflare Migration Notes

Bu dosya Codex ve diğer AI ajanlar için hazırlanmıştır.  
İki ayrı sohbet oturumunda yapılan tüm değişiklikleri, mevcut durumu ve çözülmemiş sorunları belgeler.

---

## Bağlam: Neden Taşındık

Proje Netlify'da host ediliyordu (stunning-smakager-aebe36.netlify.app).  
Netlify team account kredi limiti doldu, deploy tamamen durdu.  
Cloudflare Pages + Workers'a geçildi.

---

## Hesap ve Altyapı Bilgileri

| Öğe | Değer |
|-----|-------|
| Cloudflare account | memmizgezgin@gmail.com |
| Cloudflare account ID | f686cc8bf928a0a983d883ea6904fdcd |
| GitHub repo | memmizgezgin-creator/ToolAdvisor |
| Domain kayıt yeri | TransIP |
| Domain | tooladvisor.eu |
| Cloudflare nameservers | denver.ns.cloudflare.com / peaches.ns.cloudflare.com |

---

## Cloudflare'de Mevcut Yapılar

### 1. Pages Projesi: `tooladvisor-v2`
- GitHub main branch'e bağlı, push gelince otomatik deploy
- Build output dir: `.` (repo kökü)
- Custom domain: tooladvisor.eu (Active + SSL enabled)
- **Environment variables (Production):**
  - `ANTHROPIC_API_KEY` → Secret (şifreli, set edildi)

### 2. Worker: `tooladvisor-ai-proxy`
- URL: `https://tooladvisor-ai-proxy.memmizgezgin.workers.dev`
- **Environment variables:**
  - `ALLOWED_ORIGINS` → `https://tooladvisor.eu,https://www.tooladvisor.eu,http://localhost:8...`
  - `ANTHROPIC_API_KEY` → Secret
  - `ANTHROPIC_MODEL` → `claude-sonnet-4-20250514`
  - `RATE_LIMIT_MAX` → `20`
  - `RATE_LIMIT_WINDOW_MS` → `60000`
- Worker source kodu repo'da YOK, Cloudflare dashboard'da doğrudan yönetiliyor
- ⚠️ Bu Worker'ın `tooladvisor.eu/api/*` için bir route'u olduğu düşünülüyor (kesin doğrulanmadı)

### 3. Worker: `tooladvisor-ai` (eski)
- Dashboard'da görünüyor, muhtemelen artık kullanılmıyor

---

## DNS Durumu

TransIP nameservers `denver.ns.cloudflare.com` ve `peaches.ns.cloudflare.com` olarak güncellendi.  
DNSSEC TransIP'te kapatıldı.  
tooladvisor.eu Cloudflare'de aktif, tüm DNS Cloudflare üzerinden yönetiliyor.

---

## Repo Dosya Yapısı (Önemli Dosyalar)

```
/
├── ToolAdvisor.html          # Ana uygulama (v5)
├── advisor-ai-widget.js      # AI chat widget — API_URL buradan yönetilir
├── functions/
│   ├── proxy.js              # ← AKTİF Pages Function (widget buraya çağırıyor)
│   ├── api/
│   │   ├── chat.js           # Pages Function — /api/chat route'u (Worker tarafından bloke ediliyor olabilir)
│   │   └── test.js           # Debug endpoint — /api/test
├── wrangler.toml             # pages_build_output_dir = "."
├── catalog.html
├── cross-reference.html
├── compare.html
├── knowledge.html
└── [diğer sayfalar]
```

**Silinmiş dosyalar:**
- `_redirects` — `/* /index.html 200` içeriyordu, kaldırıldı (API yollarını etkiliyordu)
- `netlify.toml` — eski Netlify config
- `netlify/functions/claude.js` — eski Netlify Function

---

## API Proxy Akışı

Widget (`advisor-ai-widget.js`) → `POST /proxy` → Pages Function (`functions/proxy.js`) → Anthropic API

```javascript
// advisor-ai-widget.js satır 212:
const API_URL = '/proxy';
```

`functions/proxy.js`:
- `OPTIONS` → 204 (CORS preflight)
- `POST` → Anthropic'e proxy, response döner
- Diğer methodlar → 405
- `ANTHROPIC_API_KEY` → `context.env.ANTHROPIC_API_KEY` (Pages env var'dan okunuyor)

---

## Sorun Geçmişi ve Çözüm Süreci

### Sorun 1: `/api/chat` 405 döndürüyordu
- Pages Function (`functions/api/chat.js`) doğru yazılmıştı ama POST geldiğinde 405 dönüyordu
- Araştırma: `tooladvisor-ai-proxy` Worker'ının `tooladvisor.eu/api/*` route'u intercept ettiği tespit edildi
- Çözüm: Endpoint `/proxy` olarak taşındı (`functions/proxy.js`)

### Sorun 2: `_redirects` etkisi
- `/* /index.html 200` kuralı `/api/test` gibi path'leri engelliyor olabilirdi
- Dosya kaldırıldı. Site `.html` uzantılı sayfalar kullandığı için SPA routing gerekmiyordu

### Sorun 3: Worker URL direkt çağrısı başarısız
- `tooladvisor-ai-proxy.memmizgezgin.workers.dev` direkt çağrıldığında widget "Sorry, I had trouble answering that." döndürüyordu
- Response formatı widget ile uyumsuz olduğu düşünülüyor
- Worker kodu dashboard'da, repo'da yok — kaynak görülemedi

---

## Bekleyen / Doğrulanmamış

- [ ] `/proxy` endpoint'inin çalıştığı henüz tam doğrulanmadı (push yapıldı, test bekleniyor)
- [ ] `tooladvisor-ai-proxy` Worker'ının route yapılandırması bilinmiyor — Cloudflare dashboard > Workers > tooladvisor-ai-proxy > Triggers sekmesinde kontrol edilmeli
- [ ] Worker'ın tooladvisor.eu/api/* için route'u varsa kaldırılabilir; bu durumda `/api/chat` de çalışır
- [ ] `functions/api/chat.js` ve `functions/api/test.js` temizlenebilir (şu an gereksiz)

---

## Codex için Kural: Neye Dokunma

- `functions/proxy.js` — dokunma, widget buna bağlı
- `advisor-ai-widget.js` satır 212 (`API_URL`) — değiştirme
- Cloudflare env var'larına (ANTHROPIC_API_KEY) — kod üzerinden erişilemiyor, dashboard'dan yönetiliyor
- Worker kaynak kodu repo'da yok, Cloudflare dashboard'da

---

## Codex için Kural: Yapabileceklerin

- `functions/api/chat.js` ve `functions/api/test.js` silinebilir (gereksiz)
- UI, özellik geliştirme, katalog içeriği serbestçe düzenlenebilir
- Yeni Pages Function eklenecekse `functions/` altına koy (deploy otomatik)
- GitHub push = Cloudflare Pages otomatik deploy (main branch bağlı)

