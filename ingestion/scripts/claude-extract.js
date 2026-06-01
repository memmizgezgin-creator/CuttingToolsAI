#!/usr/bin/env node
/**
 * claude-extract.js
 *
 * PDF → Claude API → structured product JSON
 *
 * Usage:
 *   node ingestion/scripts/claude-extract.js <pdf-path> [start-page] [end-page]
 *
 * Examples:
 *   node ingestion/scripts/claude-extract.js GUE_general-catalogue_EN_compressed.pdf 55 130
 *   node ingestion/scripts/claude-extract.js MyBrand_catalogue.pdf
 *
 * Output:
 *   ingestion/output/claude-extracted/<pdf-slug>/<timestamp>/
 *     records.json      → all extracted records
 *     approved.json     → confidence >= 70 (auto-approved)
 *     review.json       → confidence < 70 (needs human check)
 *     summary.txt       → run summary
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const fs   = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

// ─── Config ────────────────────────────────────────────────────────────────
const PAGE_CHUNK   = 5;      // pages sent to Claude per request
const CONF_AUTO    = 70;     // confidence >= this → approved automatically (lowered from 85)
const MODEL        = 'claude-haiku-4-5'; // fast + cheap; swap to claude-sonnet-4-5 for tricky PDFs
const MAX_TOKENS   = 4096;
const API_TIMEOUT  = 30000;  // 30 seconds max per chunk
const CHUNK_DELAY  = 500;    // ms between chunks (was 150 — raised to reduce 429 rate)
const MAX_RETRIES  = 3;      // max attempts per chunk before logging to failed_chunks.log
const RETRY_DELAY  = 60000;  // base wait on 429 (ms); doubles each attempt

const OUTPUT_BASE  = path.resolve(__dirname, '..', 'output', 'claude-extracted');

// ─── Extraction prompt ─────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a cutting tool data extraction specialist.
You receive raw text extracted from manufacturer PDF catalogues (drilling tools, milling tools, turning inserts, reamers, taps, etc.).
Your job: extract every distinct product/tool variant found in the text into a structured JSON array.

RULES:
1. Extract ONLY data explicitly present in the text. Never invent or infer values.
2. If a field is not present, use null — do not guess.
3. Each article number = one record. Multiple shank forms of same tool = separate records.
4. PMKNSH: P=Steel, M=Stainless, K=Cast iron, N=Non-ferrous, S=Superalloy/Ti, H=Hardened.
   Symbol mapping: ✓ or checkmark or ã = true, ✗ or cross or ä = false, blank or ~ = null.
5. Confidence scoring:
   - 95: all required fields present, PMKNSH symbols clear, article number confirmed
   - 80: some fields missing or symbols ambiguous
   - 60: major uncertainty (article not found, PMKNSH all null, format unclear)
6. Do not merge records. One article number → one JSON object.
7. Output ONLY valid JSON array. No markdown, no explanation.`;

const userPromptFor = (pageTexts, pdfName) => `
PDF: ${pdfName}
Pages: ${pageTexts.map(p => p.pageNumber).join(', ')}

---RAW TEXT START---
${pageTexts.map(p => `[PAGE ${p.pageNumber}]\n${p.text}`).join('\n\n')}
---RAW TEXT END---

Extract all tool/product records from this text.
Return a JSON array of objects. Each object must have these fields:

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

// ─── PDF text extraction (reuse existing logic) ───────────────────────────
async function extractPageTexts(pdfPath, startPage, endPage) {
  const buffer = fs.readFileSync(pdfPath);
  const pdfjs  = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const standardFontDataUrl = path.join(pdfjsRoot, 'standard_fonts') + path.sep;

  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    standardFontDataUrl,
  }).promise;

  const totalPages = doc.numPages;
  const from = Math.max(1, startPage || 1);
  const to   = Math.min(totalPages, endPage || totalPages);

  console.log(`  PDF: ${path.basename(pdfPath)} — ${totalPages} total pages, extracting ${from}–${to}`);

  const pages = [];
  for (let n = from; n <= to; n++) {
    const page = await doc.getPage(n);
    const tc   = await page.getTextContent({ normalizeWhitespace: false });
    let lastY, text = '';
    for (const item of tc.items) {
      const y = item.transform[5];
      text += (lastY === undefined || lastY === y) ? item.str : `\n${item.str}`;
      lastY = y;
    }
    pages.push({ pageNumber: n, text: text.trim() });
  }

  await doc.destroy();
  return pages;
}

// ─── Chunk array into groups ───────────────────────────────────────────────
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ─── Call Claude (with timeout) ────────────────────────────────────────────
async function extractChunk(client, pageTexts, pdfName) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('API timeout after 30s')), API_TIMEOUT)
  );

  const apiCall = client.messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: 'user', content: userPromptFor(pageTexts, pdfName) }],
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

// ─── Validate + score ─────────────────────────────────────────────────────
function validateRecord(rec, pdfName, runId) {
  const issues = [];
  if (!rec.article_number) issues.push('missing_article_number');
  if (!rec.product_name)   issues.push('missing_product_name');

  const ms = rec.material_suitability || {};
  const pmknshValues = ['P','M','K','N','S','H'].map(k => ms[k]);
  const allNull = pmknshValues.every(v => v === null || v === undefined);
  if (allNull) issues.push('pmknsh_all_null');

  const confidence = typeof rec.confidence === 'number'
    ? Math.min(100, Math.max(0, rec.confidence))
    : (issues.length === 0 ? 80 : 60);

  return {
    ...rec,
    confidence,
    validation_issues: issues,
    auto_approved:  confidence >= CONF_AUTO && issues.length === 0,
    review_required: confidence < CONF_AUTO || issues.length > 0,
    source_pdf:  pdfName,
    run_id:      runId,
    merge_status: 'preview_only_not_merged',
    extracted_at: new Date().toISOString(),
  };
}

// ─── Exponential backoff wrapper ──────────────────────────────────────────
/**
 * Calls extractChunk with up to MAX_RETRIES attempts.
 * On HTTP 429 (rate limit): waits RETRY_DELAY * 2^attempt ms before retrying.
 * On any other error: retries immediately (up to MAX_RETRIES).
 * If all attempts fail: logs to failed_chunks.log and returns [] so the run continues.
 *
 * @param {Anthropic} client
 * @param {Array}     pageTexts
 * @param {string}    pdfName
 * @param {string}    outDir     — directory where failed_chunks.log is written
 * @returns {Promise<Array>}     — extracted records ([] on total failure)
 */
async function extractChunkWithRetry(client, pageTexts, pdfName, outDir) {
  const failedLog = path.join(outDir, 'failed_chunks.log');
  const pageRange = `${pageTexts[0].pageNumber}–${pageTexts[pageTexts.length - 1].pageNumber}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await extractChunk(client, pageTexts, pdfName);
    } catch (err) {
      const is429 = err.status === 429
        || err.message?.includes('429')
        || err.message?.toLowerCase().includes('rate limit')
        || err.message?.toLowerCase().includes('overloaded');

      const isLastAttempt = attempt === MAX_RETRIES - 1;

      if (isLastAttempt) {
        // All retries exhausted — log to failed_chunks.log, return null so caller skips
        const failEntry = [
          `[${new Date().toISOString()}]`,
          `  PDF:      ${pdfName}`,
          `  Pages:    ${pageRange}`,
          `  Attempts: ${MAX_RETRIES}`,
          `  Error:    ${err.message}`,
        ].join('\n');
        fs.appendFileSync(failedLog, failEntry + '\n\n');
        process.stdout.write(`FAILED (${err.message}) — logged to failed_chunks.log\n`);
        return null; // sentinel: caller must not push to allRecords
      }

      if (is429) {
        const waitMs = RETRY_DELAY * Math.pow(2, attempt); // 60s, 120s, 240s
        const waitSec = Math.round(waitMs / 1000);
        process.stdout.write(`429 rate-limit — waiting ${waitSec}s before retry ${attempt + 2}/${MAX_RETRIES}... `);
        await new Promise(r => setTimeout(r, waitMs));
        process.stdout.write(`retrying... `);
      } else {
        // Non-429 error: short wait then retry
        process.stdout.write(`error (${err.message}) — retry ${attempt + 2}/${MAX_RETRIES}... `);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  return null; // unreachable, but satisfies linter
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const [,, pdfArg, startArg, endArg] = process.argv;

  if (!pdfArg) {
    console.error('Usage: node claude-extract.js <pdf-path> [start-page] [end-page]');
    process.exit(1);
  }

  const pdfPath  = path.resolve(pdfArg);
  const startPage = startArg ? parseInt(startArg, 10) : null;
  const endPage   = endArg   ? parseInt(endArg,   10) : null;

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY environment variable not set.');
    process.exit(1);
  }

  const client  = new Anthropic({ apiKey });
  const pdfName = path.basename(pdfPath);
  const runId   = `run-${Date.now()}`;
  const slug    = pdfName.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
  const outDir  = path.join(OUTPUT_BASE, slug, runId);
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`\n🔍 claude-extract — ${pdfName}`);
  console.log(`   Model: ${MODEL} | Chunk size: ${PAGE_CHUNK} pages | Auto-approve threshold: ${CONF_AUTO}`);
  console.log(`   Output: ${outDir}\n`);

  // 1. Extract page texts
  const pageTexts = await extractPageTexts(pdfPath, startPage, endPage);
  const chunks    = chunk(pageTexts, PAGE_CHUNK);

  console.log(`  Sending ${chunks.length} chunks to Claude API...`);
  console.log(`  Progress log: ${path.join(outDir, 'progress.log')}\n`);

  const progressLog = path.join(outDir, 'progress.log');

  // 2. Process chunks
  const allRecords = [];
  for (let i = 0; i < chunks.length; i++) {
    const pages   = chunks[i];
    const pStart  = pages[0].pageNumber;
    const pEnd    = pages[pages.length - 1].pageNumber;
    const pct     = Math.round(((i + 1) / chunks.length) * 100);
    const logLine = `[${String(i+1).padStart(4)}/${chunks.length}] ${pct}% — pages ${pStart}–${pEnd}`;

    process.stdout.write(`  ${logLine}... `);

    const records = await extractChunkWithRetry(client, pages, pdfName, outDir);
    if (records === null) {
      // All retries failed — status already printed by retry wrapper
      fs.appendFileSync(progressLog, `${logLine} → FAILED (see failed_chunks.log)\n`);
    } else {
      const validated = records.map(r => validateRecord(r, pdfName, runId));
      allRecords.push(...validated);
      process.stdout.write(`${records.length} records\n`);
      fs.appendFileSync(progressLog, `${logLine} → ${records.length} records (total: ${allRecords.length})\n`);
    }

    // Write partial results every 50 chunks
    if ((i + 1) % 50 === 0) {
      fs.writeFileSync(path.join(outDir, 'records.partial.json'), JSON.stringify(allRecords, null, 2));
    }

    if (i < chunks.length - 1) await new Promise(r => setTimeout(r, CHUNK_DELAY));
  }

  // 3. Split into approved / review
  const approved = allRecords.filter(r => r.auto_approved);
  const review   = allRecords.filter(r => r.review_required);

  // 4. Write outputs
  fs.writeFileSync(path.join(outDir, 'records.json'),  JSON.stringify(allRecords, null, 2));
  fs.writeFileSync(path.join(outDir, 'approved.json'), JSON.stringify(approved,   null, 2));
  fs.writeFileSync(path.join(outDir, 'review.json'),   JSON.stringify(review,     null, 2));

  const summary = [
    `claude-extract run: ${runId}`,
    `PDF: ${pdfName}`,
    `Pages: ${startPage || 1}–${endPage || 'end'}`,
    `Model: ${MODEL}`,
    `Date: ${new Date().toISOString()}`,
    ``,
    `Total records extracted: ${allRecords.length}`,
    `Auto-approved (conf >= ${CONF_AUTO}): ${approved.length}`,
    `Review required (conf < ${CONF_AUTO}): ${review.length}`,
    ``,
    `Output: ${outDir}`,
  ].join('\n');

  fs.writeFileSync(path.join(outDir, 'summary.txt'), summary);

  console.log(`\n✅ Extraction complete`);
  console.log(`   Total:    ${allRecords.length} records`);
  console.log(`   Approved: ${approved.length} (confidence >= ${CONF_AUTO})`);
  console.log(`   Review:   ${review.length} (needs human check)`);
  console.log(`   Output:   ${outDir}`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
