# ToolAdvisor PDF Inbox

Bu klasore PDF at, pipeline calistir, sistem otomatik isler.

## Nasil kullanilir

1. Bu klasore cutting tool PDF'lerini koy (surukle birak)
   - Veya link eklemek istersen: urls.txt dosyasi olustur, her satira bir PDF linki yaz

2. Terminal ac, proje klasorune git:
   cd ~/Desktop/ToolAdvisor

3. Pipeline'i calistir:
   node ingestion/scripts/pipeline.js

4. Bitince:
   - Islenen PDF'ler processed/ klasorune tasinir (timestamp ile)
   - Yeni urunler directory-data-extracted.js'e eklenir
   - confidence >= 70 olanlar otomatik onaylanir
   - Site otomatik Cloudflare'e deploy olur

## Sadece inbox islemek (internetten katalog cekmeden)

   node ingestion/scripts/pipeline.js --no-crawl

## Test et, kaydetme (dry run)

   node ingestion/scripts/pipeline.js --dry-run

## Notlar

- Ayni PDF'i tekrar koyarsan tekrar islenir, processed/ klasoru sadece arsiv
- Cron her gun 03:17'de otomatik calisir (KNOWN_PDFS + sitemap kaynaklari)
- Inbox sadece sen manuel calistirinca islenir
