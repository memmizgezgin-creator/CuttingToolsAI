# ToolAdvisor — Agent Protocol

Bu dosya tüm AI ajanlar (Claude Code, Codex, ChatGPT) için zorunlu çalışma kurallarını tanımlar.
Her oturum başında CLOUDFLARE_MIGRATION.md, TOOLADVISOR_WORKLOG.md ve bu dosya okunmalıdır.

---

## Görev Sistemi

Görevler `/tasks/` klasöründe yönetilir:

| Klasör | Anlamı |
|--------|--------|
| `tasks/todo/` | Bekleyen görevler |
| `tasks/in-progress/` | Şu an üzerinde çalışılan |
| `tasks/done/` | Tamamlanan görevler |
| `tasks/blocked/` | Engellenmiş, karar bekleyen görevler |

---

## Görev Dosyası Formatı

Her görev ayrı bir `.md` dosyasıdır. Dosya adı: `YYYY-MM-DD-kisa-aciklama.md`

```
# Görev: [Başlık]

## Hedef
Ne yapılacak, neden.

## Agent
claude-code | codex | chatgpt

## Kapsam
Hangi dosyalara dokunulabilir.

## Yasak
Hangi dosyalara kesinlikle dokunulamaz.

## Tamamlanma Kriteri
Ne zaman bitti sayılır.

## Durum
todo | in-progress | done | blocked

## Notlar
Ek bilgi, bağımlılıklar.
```

---

## Agent Çalışma Kuralları

### Başlamadan önce
1. `CLOUDFLARE_MIGRATION.md` oku.
2. `TOOLADVISOR_WORKLOG.md` oku.
3. `AGENT_PROTOCOL.md` oku (bu dosya).
4. `tasks/todo/` içindeki görevi al.
5. Görevi `tasks/in-progress/` klasörüne taşı.
6. Görev dosyasında `Durum: in-progress` yap.

### Çalışırken
- Sadece görevde izin verilen dosyalara dokun.
- `PRODUCT_DB`'ye dokunma.
- `index.html`'e dokunma (aksi belirtilmedikçe).
- Deploy yapma.
- Netlify kullanma.
- Belirsizlik varsa dur ve raporla.

### Bitirince
1. Görevi `tasks/done/` klasörüne taşı.
2. Görev dosyasında `Durum: done` yap, tamamlanma notunu ekle.
3. `TOOLADVISOR_WORKLOG.md`'ye giriş ekle.
4. Commit yap: `task: [görev adı] completed`.
5. Push yap.

### Engellenince
1. Görevi `tasks/blocked/` klasörüne taşı.
2. Görev dosyasında `Durum: blocked`, sebebi yaz.
3. `TOOLADVISOR_WORKLOG.md`'ye ekle.
4. İnsan onayı bekle.

---

## Agent Sorumlulukları

| Agent | Uygundur |
|-------|----------|
| Claude Code | Strateji, mimari, refactor planı, dokümantasyon, risk analizi |
| Codex | Kod uygulama, test, dosya düzenleme, küçük patch |
| ChatGPT | Karar çerçevesi, prompt tasarımı, kalite denetimi |

---

## Hard Rules (Değiştirilemez)

- PRODUCT_DB kilitli. Hiçbir agent onaysız dokunamaz.
- Deploy yasak. Onay gelmeden push sonrası deploy tetiklenmez.
- Netlify yasak.
- index.html görevde açıkça belirtilmedikçe değiştirilemez.
- Belirsizlikte dur ve sor. Tahmin etme.
- Her tamamlanan görev TOOLADVISOR_WORKLOG.md'ye yazılmalı.

---

## GitHub Actions

Her push sonrası `ta-guard.yml` otomatik çalışır:
- Kritik dosyalar yerinde mi?
- PRODUCT_DB değişmiş mi?
- Netlify dosyası var mı?
- WORKLOG güncellenmiş mi?

Kırmızı çıkarsa görev tamamlanmış sayılmaz.
