#!/usr/bin/env node
/**
 * claude-extract-vision.js
 *
 * PDF → Page Images → Claude Vision API → structured product JSON
 *
 * Instead of extracting garbled text, renders each PDF page as PNG image
 * and sends to Claude Vision to read tables visually. Much more accurate.
 *
 * Usage:
 *   node ingestion/scripts/claude-extract-vision.js <pdf-path> [start-page] [end-page]
 *
 * Output:
 *   ingestion/output/claude-extracted/<pdf-slug>/<timestamp>/
 *     records.json      → all extracted records
 *     approved.json     → confidence >= 70 (auto-approved)
 *     review.json       → confidence < 70 (needs human check)
 *     summary.txt       → run summary
 *
 * Requires: npm install pdf-to-img
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const fs   = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// ─── Config ────────────────────────────────────────────────────────────────
const PAGE_CHUNK   = 5;              // pages sent to Claude per request (5 PNGs per API call)
const CONF_AUTO    = 70;             // confidence >= this → approved automatically
const MODEL        = 'claude-sonnet-4-6';  // Vision model (upgraded from Haiku for image quality)
const MAX_TOKENS   = 4096;
const API_TIMEOUT  = 60000;          // 60s timeout for vision (slower than text)
const CHUNK_DELAY  = 1000;           // ms between chunks (vision is slower)
const MAX_RETRIES  = 3;
const RETRY_DELAY  = 60000;

const OUTPUT_BASE  = path.resolve(__dirname, '..', 'output', 'claude-extracted');

// ─── PDF → Image rendering ────────────────────────────────────────────────
async function renderPagesToImages(pdfPath, startPage, endPage) {
  // pdf-to-img is ESM-only, use dynamic import
  const { pdf } = await import('pdf-to-img');

  const doc = await pdf(pdfPath, { scale: 2 });
  const totalPages = doc.length;
  const from = Math.max(1, startPage || 1);
  const to   = Math.min(totalPages, endPage || totalPages);

  console.log(`  PDF: ${path.basename(pdfPath)} — ${totalPages} total pages, rendering ${from}–${to} as images`);

  const images = [];
  for (let n = from; n <= to; n++) {
    const pngBuffer = await doc.getPage(n);
    images.push({ pageNumber: n, pngBuffer });
  }

  await doc.destroy();
  return images;
}

// ─── Encode image to base64 for API ────────────────────────────────────────
function encodeImageBase64(pngBuffer) {
  return pngBuffer.toString('base64');
}

// ─── Extraction prompt (for vision) ────────────────────────────────────────
const SYSTEM_PROMPT = `You are a cutting tool catalog specialist reading product specification tables visually.
You receive images of PDF pages showing product catalogs (drilling tools, milling tools, turning inserts, reamers, taps, end mills, etc.).
Your job: extract every distinct product/tool variant found in the visible tables and specs into a structured JSON array.

RULES:
1. Extract ONLY data explicitly visible in the images. Never invent or infer.
2. If a field is not visible or unclear, use null.
3. Each article number or SKU = one record. Multiple variants = separate records.
4. PMKNSH material suitability: ◎=true, ○=true (good), blank/~=null, ✗=false
5. Confidence scoring:
   - 95: all required fields visible and clear, article number confirmed, dimensions clear
   - 80: some fields missing or partially visible
   - 60: major uncertainty (article unclear, specs hard to read, formatting ambiguous)
6. Do not merge records. One article → one JSON object.
7. Output ONLY valid JSON array. No markdown, no explanation.`;

const userPromptFor = (pageImages) => `
Pages: ${pageImages.map(p => p.pageNumber).join(', ')}

The images above show PDF catalog pages. Extract all tool/product records visible in tables and specification sections.
Return a JSON array of objects. Each object must have these fields (use null if not visible):

{
  "brand": string | null,
  "product_name": string | null,
  "article_number": string | null,
  "family": string | null,
  "shank_form": string | null,
  "depth_multiplier": string | null,
  "diameter_min": number | null,
  "diameter_max": number | null,
  "material_grade": string | null,
  "material_suitability": {
    "P": boolean | null,
    "M": boolean | null,
    "K": boolean | null,
    "N": boolean | null,
    "S": boolean | null,
    "H": boolean | null
  },
  "cutting_data": {
    "vc_min": number | null,
    "vc_max": number | null,
    "feed_min": number | null,
    "feed_max": number | null
  },
  "source_page": number,
  "confidence": number,
  "confidence_reason": string
}

If no products found on these pages, return [].
Output ONLY the JSON array.`;

// ─── Call Claude Vision API ───────────────────────────────────────────────
async function extractChunk(client, pageImages, pdfName) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('API timeout after 60s')), API_TIMEOUT)
  );

  // Build image content blocks
  const imageContent = pageImages.map(img => ({
    type: 'image',
    source: {
      type: 'base64',
      media_type: 'image/png',
      data: encodeImageBase64(img.pngBuffer)
    }
  }));

  const apiCall = client.messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system:     SYSTEM_PROMPT,
    messages:   [{
      role: 'user',
      content: [
        ...imageContent,
        {
          type: 'text',
          text: userPromptFor(pageImages)
        }
      ]
    }],
  });

  const resp = await Promise.race([apiCall, timeout]);
  const raw  = resp.content[0]?.text?.trim() || '[]';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Chunk images into groups ──────────────────────────────────────────────
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── Main extraction ──────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const pdfPath = process.argv[2];
  const startPage = process.argv[3] ? parseInt(process.argv[3]) : null;
  const endPage = process.argv[4] ? parseInt(process.argv[4]) : null;

  if (!pdfPath) {
    console.error('Usage: node claude-extract-vision.js <pdf-path> [start] [end]');
    process.exit(1);
  }

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ File not found: ${pdfPath}`);
    process.exit(1);
  }

  const pdfName = path.basename(pdfPath);
  const pdfSlug = pdfName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // ─── Render PDF to images ───────────────────────────────────────────────
  console.log(`\n🖼  claude-extract-vision — ${pdfName}`);
  console.log(`   Model: ${MODEL} (Vision) | Chunk size: ${PAGE_CHUNK} pages/chunk`);

  let pageImages;
  try {
    pageImages = await renderPagesToImages(pdfPath, startPage, endPage);
  } catch (e) {
    console.error(`❌ Failed to render PDF: ${e.message}`);
    process.exit(1);
  }

  if (pageImages.length === 0) {
    console.error('❌ No pages rendered');
    process.exit(1);
  }

  // ─── Create output directory ─────────────────────────────────────────────
  const runId = Date.now();
  const outDir = path.join(OUTPUT_BASE, pdfSlug, `run-${runId}`);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`   Output: ${outDir}`);
  console.log(`\n  Sending ${pageImages.length} page images in ${Math.ceil(pageImages.length / PAGE_CHUNK)} chunks to Claude Vision...`);

  // ─── Process chunks ─────────────────────────────────────────────────────
  const chunks = chunk(pageImages, PAGE_CHUNK);
  let allRecords = [];
  let chunksFailed = 0;

  const progressLog = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkImages = chunks[i];
    const percent = Math.round(((i + 1) / chunks.length) * 100);
    const pageRange = `pages ${chunkImages[0].pageNumber}–${chunkImages[chunkImages.length - 1].pageNumber}`;

    let records = [];
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        await new Promise(r => setTimeout(r, CHUNK_DELAY));
        records = await extractChunk(client, chunkImages, pdfName);
        break;
      } catch (e) {
        retries++;
        if (retries >= MAX_RETRIES) {
          console.log(`  ⚠  Chunk ${i + 1}/${chunks.length} failed after ${MAX_RETRIES} retries`);
          chunksFailed++;
          progressLog.push(`[${i + 1}/${chunks.length}] ${percent}% — ${pageRange}... FAILED`);
          break;
        }
        if (e.status === 429) {
          const wait = RETRY_DELAY * Math.pow(2, retries - 1);
          console.log(`  ⏳ Rate limited, waiting ${wait}ms before retry ${retries}/${MAX_RETRIES}...`);
          await new Promise(r => setTimeout(r, wait));
        } else {
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }
    }

    allRecords.push(...records.map(r => ({ ...r, source_pdf: pdfName })));
    const count = records.length;
    console.log(`  [${i + 1}/${chunks.length}] ${percent}% — ${pageRange}... ${count} records`);
    progressLog.push(`[${i + 1}/${chunks.length}] ${percent}% — ${pageRange}... ${count} records (total: ${allRecords.length})`);
  }

  // ─── Filter by confidence ───────────────────────────────────────────────
  const approved = allRecords.filter(r => r.confidence >= CONF_AUTO);
  const review = allRecords.filter(r => r.confidence < CONF_AUTO);

  // ─── Write output ───────────────────────────────────────────────────────
  fs.writeFileSync(path.join(outDir, 'records.json'), JSON.stringify(allRecords, null, 2));
  fs.writeFileSync(path.join(outDir, 'approved.json'), JSON.stringify(approved, null, 2));
  fs.writeFileSync(path.join(outDir, 'review.json'), JSON.stringify(review, null, 2));
  fs.writeFileSync(path.join(outDir, 'progress.log'), progressLog.join('\n'));

  const summary = `claude-extract-vision run: run-${runId}
PDF: ${pdfName}
Pages: ${pageImages[0].pageNumber}–${pageImages[pageImages.length - 1].pageNumber}
Model: ${MODEL}
Date: ${new Date().toISOString()}

Total records extracted: ${allRecords.length}
Auto-approved (conf >= ${CONF_AUTO}): ${approved.length}
Review required (conf < ${CONF_AUTO}): ${review.length}
Chunks failed: ${chunksFailed}

Output: ${outDir}`;

  fs.writeFileSync(path.join(outDir, 'summary.txt'), summary);

  // ─── Print summary ──────────────────────────────────────────────────────
  console.log(`\n✅ Extraction complete`);
  console.log(`   Total:    ${allRecords.length} records`);
  console.log(`   Approved: ${approved.length} (confidence >= ${CONF_AUTO})`);
  console.log(`   Review:   ${review.length} (needs human check)`);
  if (chunksFailed > 0) {
    console.log(`   ⚠  ${chunksFailed} chunks failed`);
  }
  console.log(`   Output:   ${outDir}`);
}

main().catch(e => {
  console.error('❌ Fatal error:', e.message);
  process.exit(1);
});
