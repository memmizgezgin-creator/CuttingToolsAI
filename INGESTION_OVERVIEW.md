# ToolAdvisor — PDF Ingestion Pipeline Overview

## What It Does
Automatically extracts cutting tool data from manufacturer PDF catalogs and adds them to the tool database.

## How It Works

### 1. **Discovery** — `catalogue-crawler.js`
Finds PDF catalogs from multiple sources:
- **Known PDFs** (25 hardcoded URLs from manufacturer sites) — most reliable
- **Sitemap discovery** (5 domains: Walter, ISCAR, Kennametal, Tungaloy, Kyocera)
- **Bing Search API** (optional, if `BING_API_KEY` set) for new sources
- **Distributor mirrors** (drillingworld.com, indrilling.com, etc.)

### 2. **Download** — `catalogue-crawler.js`
PDFs are fetched and saved to `ingestion/input/pending/`
- HEAD request checks file size & Last-Modified
- Skips unchanged files (registry-based deduplication)
- Max file size: 300MB

### 3. **Extract** — `claude-extract.js` (Claude Haiku API)
Splits PDF into chunks (8–12 pages per chunk) and sends to Claude with structured prompt:
```json
{
  "article_number": "DNMG 1204",
  "brand": "Sandvik Coromant",
  "family": "Turning",
  "product_name": "CoroTurn® Prime",
  "iso_group": "P",
  "cutting_data": {
    "vc_min": 100,
    "vc_max": 500,
    "feed_min": 0.10,
    "feed_max": 0.40
  },
  "confidence": 85
}
```
- **Rate limiting:** 429 → wait 60s → retry 3x → log to `failed_chunks.log`
- Output saved to `ingestion/output/claude-extracted/{pdf-name}/run-{timestamp}/`

### 4. **Review** — Manual approval (optional)
Extracted records saved to `review.json`
- Confidence ≥ 70 → auto-approved
- Confidence < 70 → manual review (user can accept/reject)
- Approved records → `approved.json`

### 5. **Merge** — `pipeline.js`
Merges all approved records into `extracted-productdb-candidates.json`:
- Deduplicates by `(article_number, source_pdf)` pair
- Maps raw extraction format to database schema
- Only includes records with confidence ≥ 70 (configurable)
- Maintains running total across all PDF sources

### 6. **Generate JS** — `pipeline.js`
Creates `directory-data-extracted.js`:
- Syntax-checked before writing
- Loaded by the frontend alongside `directory-data.js`
- Auto-deploys via Cloudflare Pages

---

## Current State
- **25 PDF sources** across 7 brands (Gühring, Walter, ISCAR, Sandvik, Kennametal, Kyocera, Tungaloy, YG-1)
- **~900 tools** extracted and indexed
- **Runs daily** via cron at 03:17 UTC
- **Confidence threshold:** 70+ auto-approved (previously 85)

---

## Known Limitations

### PDF Discovery
- **Sitemap discovery doesn't work for B2B sites** — they hide PDFs from sitemaps for access control
  - Workaround: Maintain hardcoded KNOWN_PDFS list + distributor mirrors
- **Bing Search API is optional** — requires `BING_API_KEY`
- **Login-protected catalogs** (e.g., Sandvik CoroPlus) cannot be accessed

### Extraction Quality
- Single prompt for all tool types (drilling, turning, milling, etc.)
  - Results in lower precision on specialized tools
- No post-extraction validation of extracted data
- Confidence score is Claude's estimate, not validated against constraints

### Rate Limiting
- Fixed 60-second wait on 429 errors (naive approach)
- No request batching or pacing
- No use of Claude Batch API (could save 50% cost)

---

## File Structure
```
ingestion/
├── input/
│   └── pending/               # Downloaded PDFs
├── output/
│   ├── claude-extracted/      # Extraction results per PDF
│   │   └── {pdf-name}/
│   │       └── run-{timestamp}/
│   │           ├── review.json
│   │           ├── approved.json
│   │           └── ...
│   └── reports/
│       ├── crawl-log.json     # Latest crawl results
│       └── catalogue-registry.json
└── scripts/
    ├── catalogue-crawler.js   # Step 1: Discovery + Download
    ├── claude-extract.js      # Step 2: Extraction (Claude API)
    ├── pipeline.js            # Step 3-6: Merge, Generate, Deploy
    └── run-pipeline.js        # Entry point
```

---

## Running the Pipeline

### Manual run (all steps)
```bash
npm run crawl              # Download + extract
node ingestion/scripts/pipeline.js  # Merge + generate + deploy
```

### CLI options
```bash
node ingestion/scripts/pipeline.js --no-crawl      # Merge+deploy only (skip download)
node ingestion/scripts/pipeline.js --no-deploy     # Crawl+merge only (skip Cloudflare)
node ingestion/scripts/pipeline.js --dry-run       # Show what would happen (no writes)
```

### Cron schedule (current)
```cron
17 3 * * * /opt/homebrew/bin/node /Users/muratonder/Desktop/ToolAdvisor/ingestion/scripts/pipeline.js
```
Runs daily at 03:17 UTC (11:17 PM EST).

---

## Recommended Improvements

See `INGESTION_IMPROVEMENTS.md` for detailed proposals on:
1. **Better PDF discovery** — RSS feeds, distributor mirrors, webhook inbound
2. **Improving extraction quality** — specialized prompts per tool type, validation, few-shot examples
3. **Handling rate limits** — Batch API, exponential backoff, request queuing

---

## Troubleshooting

**No PDFs downloaded?**
- Check KNOWN_PDFS URLs with `curl -I <url>` — some may have moved
- Enable Bing Search: set `BING_API_KEY` in `.env`
- Check `ingestion/output/reports/crawl-log.json` for failures

**Low confidence scores?**
- Increase `CONF_MERGE_MIN` in `pipeline.js` (currently 70)
- Review Claude's prompt in `claude-extract.js` — may need few-shot examples
- Check extracted JSON: look for missing fields like `article_number` or `confidence`

**Rate limit 429 errors?**
- Check `ingestion/output/failed_chunks.log` for affected chunks
- Implement exponential backoff (see improvements guide)
- Consider Batch API for large crawls

**Deploy fails?**
- Check Cloudflare Pages credentials (wrangler)
- Verify `directory-data-extracted.js` syntax: `node --check directory-data-extracted.js`
- Check log: `cat /tmp/tooladvisor-pipeline-daily.log`
