#!/usr/bin/env node
'use strict';
/**
 * serve-review.js — local approval screen for PDF ingestion staging records.
 *
 * Serves review.html plus these endpoints:
 *   GET  /api/staging  → all staging files (review.json per extraction run) with records
 *   GET  /api/staging?group=source_file
 *                      → per-source batches: counts (total/clean/flagged), all
 *                        flagged records with reason codes, and a random sample
 *                        of 5 clean records for spot checking
 *   POST /api/approve  → {file, recordIds} merge selected records into the product DB
 *                        (same merge function as the pipeline: merge-records.js)
 *   POST /api/approve-batch
 *                      → {source_file, confirm} merge ONLY the validation-clean
 *                        records of that source (validate-staging.js). Flagged
 *                        records never batch-merge; they stay in staging for the
 *                        per-record approve/reject below. Without confirm:true
 *                        this is a dry run: returns would-merge counts, writes
 *                        nothing.
 *   POST /api/reject   → {file, recordIds} remove from staging without merging
 *                        (records appended to rejected.json next to the staging file — audit trail)
 *
 * Fully-processed staging files (0 records left) are moved to ingestion/approved-archive/.
 *
 * Start: node ingestion/serve-review.js   →   http://localhost:4747
 * No dependencies — Node built-ins only.
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const { ROOT, mergeRecords } = require('./scripts/merge-records.js');
const { validateRecords, liveDbKeys } = require('../scripts/validate-staging.js');

const PORT          = Number(process.env.PORT) || 4747;  // override for tests
const STAGING_BASE  = path.join(ROOT, 'ingestion/output/claude-extracted');
const ARCHIVE_DIR   = path.join(ROOT, 'ingestion/approved-archive');
const REVIEW_HTML   = path.join(__dirname, 'review.html');

// ─── Staging file discovery ────────────────────────────────────────────────
function listStagingFiles() {
  const out = [];
  if (!fs.existsSync(STAGING_BASE)) return out;
  for (const pdfDir of fs.readdirSync(STAGING_BASE)) {
    const pdfPath = path.join(STAGING_BASE, pdfDir);
    if (!fs.statSync(pdfPath).isDirectory()) continue;
    for (const run of fs.readdirSync(pdfPath).filter(d => d.startsWith('run-'))) {
      const file = path.join(pdfPath, run, 'review.json');
      if (!fs.existsSync(file)) continue;
      let records;
      try { records = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
      if (!Array.isArray(records) || records.length === 0) continue;
      out.push({
        file: path.relative(ROOT, file),
        pdf: records[0].source_pdf || pdfDir,
        runId: run,
        extractedAt: records[0].extracted_at || null,
        count: records.length,
        records: records.map((r, idx) => ({
          id: idx,
          article_number: r.article_number,
          product_name: r.product_name,
          brand: r.brand,
          grade: r.material_grade,
          family: r.family,
          diameter_min: r.diameter_min,
          diameter_max: r.diameter_max,
          vc_min: r.cutting_data?.vc_min ?? null,
          vc_max: r.cutting_data?.vc_max ?? null,
          feed_min: r.cutting_data?.feed_min ?? null,
          feed_max: r.cutting_data?.feed_max ?? null,
          confidence: r.confidence,
          confidence_reason: r.confidence_reason,
          validation_issues: r.validation_issues || [],
          source_page: r.source_page,
          low: (r.confidence || 0) < 70 || (r.validation_issues || []).length > 0
        }))
      });
    }
  }
  // newest extraction first
  out.sort((a, b) => String(b.extractedAt).localeCompare(String(a.extractedAt)));
  return out;
}

// ─── Batch mode (per-source bulk approval with validation quarantine) ──────
function summarize(r, idx) {
  return {
    id: idx,
    article_number: r.article_number,
    product_name: r.product_name,
    brand: r.brand,
    grade: r.material_grade,
    confidence: r.confidence,
    source_page: r.source_page,
  };
}

// All staging entries for one source_file, validated. Validation runs over the
// WHOLE staging set so dup_in_staging sees cross-file duplicates too.
function collectValidated() {
  const files = listStagingFiles();
  const flat = [];
  for (const f of files) {
    const abs = path.resolve(ROOT, f.file);
    const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
    raw.forEach((r, idx) => flat.push({ file: f.file, abs, idx, record: r }));
  }
  const results = validateRecords(flat.map(x => x.record), liveDbKeys());
  flat.forEach((x, i) => { x.validation = results[i]; });
  return flat;
}

function groupBySource() {
  const flat = collectValidated();
  const groups = new Map();
  for (const x of flat) {
    const src = x.record?.source_pdf || '(unknown)';
    if (!groups.has(src)) groups.set(src, { source_file: src, files: new Set(), total: 0, clean: 0, flagged: 0, cleanEntries: [], flaggedEntries: [] });
    const g = groups.get(src);
    g.files.add(x.file);
    g.total++;
    if (x.validation.status === 'clean') { g.clean++; g.cleanEntries.push(x); }
    else { g.flagged++; g.flaggedEntries.push(x); }
  }
  return [...groups.values()].map(g => {
    // Random sample of 5 clean records for Murat's spot check
    const pool = [...g.cleanEntries];
    const sample = [];
    while (sample.length < 5 && pool.length) {
      sample.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
    }
    return {
      source_file: g.source_file,
      files: [...g.files],
      total: g.total,
      clean: g.clean,
      flagged: g.flagged,
      flaggedRecords: g.flaggedEntries.map(x => ({ ...summarize(x.record, x.idx), file: x.file, reasons: x.validation.reasons })),
      cleanSample: sample.map(x => ({ ...summarize(x.record, x.idx), file: x.file })),
    };
  }).sort((a, b) => b.total - a.total);
}

function handleApproveBatch(body) {
  const sourceFile = body.source_file;
  if (!sourceFile) return { status: 400, json: { error: 'source_file required' } };
  const flat = collectValidated().filter(x => (x.record?.source_pdf || '(unknown)') === sourceFile);
  if (flat.length === 0) return { status: 404, json: { error: 'no staged records for that source_file' } };

  const clean   = flat.filter(x => x.validation.status === 'clean');
  const flagged = flat.filter(x => x.validation.status !== 'clean');

  // Dry run unless explicitly confirmed: report counts, write NOTHING.
  if (body.confirm !== true) {
    return { status: 200, json: {
      dryRun: true, source_file: sourceFile,
      wouldMerge: clean.length, flaggedKept: flagged.length,
      files: [...new Set(flat.map(x => x.file))].length,
    } };
  }

  if (clean.length === 0) return { status: 400, json: { error: 'no clean records to merge for that source_file' } };

  // Same code path + audit trail as single approve: mergeRecords per staging
  // file, flagged records written back (they stay individually reviewable),
  // file archived once empty.
  let merged = 0, skippedDuplicates = 0, archivedFiles = 0, remainingFlagged = 0;
  const byFile = new Map();
  for (const x of flat) {
    if (!byFile.has(x.abs)) byFile.set(x.abs, { clean: [], flagged: [] });
    byFile.get(x.abs)[x.validation.status === 'clean' ? 'clean' : 'flagged'].push(x);
  }
  for (const [abs, sets] of byFile) {
    const records = JSON.parse(fs.readFileSync(abs, 'utf8'));
    if (sets.clean.length) {
      const res = mergeRecords({ raw: sets.clean.map(x => x.record) });
      merged += res.added;
      skippedDuplicates += res.skippedDuplicates;
    }
    const remaining = sets.flagged.map(x => x.record);
    remainingFlagged += remaining.length;
    if (writeBackStaging(abs, remaining, records)) archivedFiles++;
  }
  return { status: 200, json: { dryRun: false, source_file: sourceFile, merged, skippedDuplicates, remainingFlagged, archivedFiles } };
}

// Resolve and validate a client-supplied staging file path (must be a
// review.json inside the staging tree — no traversal outside it).
function resolveStagingFile(rel) {
  const abs = path.resolve(ROOT, rel || '');
  if (!abs.startsWith(STAGING_BASE + path.sep)) return null;
  if (path.basename(abs) !== 'review.json') return null;
  if (!fs.existsSync(abs)) return null;
  return abs;
}

function splitByIds(records, recordIds) {
  const ids = new Set((recordIds || []).map(Number));
  const picked = [], remaining = [];
  records.forEach((r, idx) => (ids.has(idx) ? picked : remaining).push(r));
  return { picked, remaining };
}

// Write back the staging file; once fully processed (0 records left),
// move it to approved-archive/ with its original content preserved.
function writeBackStaging(abs, remaining, originalRecords) {
  if (remaining.length > 0) {
    fs.writeFileSync(abs, JSON.stringify(remaining, null, 2));
    return false;
  }
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const runDir  = path.basename(path.dirname(abs));           // run-...
  const pdfSlug = path.basename(path.dirname(path.dirname(abs)));
  fs.writeFileSync(abs, JSON.stringify(originalRecords, null, 2));
  fs.renameSync(abs, path.join(ARCHIVE_DIR, `${pdfSlug}__${runDir}__review.json`));
  return true;
}

// ─── Handlers ──────────────────────────────────────────────────────────────
function handleApprove(body) {
  const abs = resolveStagingFile(body.file);
  if (!abs) return { status: 400, json: { error: 'invalid staging file' } };
  const records = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const { picked, remaining } = splitByIds(records, body.recordIds);
  if (picked.length === 0) return { status: 400, json: { error: 'no records selected' } };

  // Same merge function as pipeline.js — human approval overrides the conf filter
  const { added, skippedDuplicates } = mergeRecords({ raw: picked });

  // Approved records leave staging; archive the file once fully processed
  const archived = writeBackStaging(abs, remaining, records);
  return { status: 200, json: { merged: added, skippedDuplicates, remaining: remaining.length, archived } };
}

function handleReject(body) {
  const abs = resolveStagingFile(body.file);
  if (!abs) return { status: 400, json: { error: 'invalid staging file' } };
  const records = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const { picked, remaining } = splitByIds(records, body.recordIds);
  if (picked.length === 0) return { status: 400, json: { error: 'no records selected' } };

  // Audit trail (REVIEW_WORKFLOW.md): rejected records are kept, not deleted
  const rejectedFile = path.join(path.dirname(abs), 'rejected.json');
  let rejected = [];
  if (fs.existsSync(rejectedFile)) {
    try { rejected = JSON.parse(fs.readFileSync(rejectedFile, 'utf8')); } catch {}
  }
  rejected.push(...picked.map(r => ({ ...r, merge_status: 'rejected', rejected_at: new Date().toISOString() })));
  fs.writeFileSync(rejectedFile, JSON.stringify(rejected, null, 2));

  const archived = writeBackStaging(abs, remaining, records);
  return { status: 200, json: { rejected: picked.length, remaining: remaining.length, archived } };
}

// ─── Server ────────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 5e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const send = (status, json) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(json));
  };
  try {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/review.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fs.readFileSync(REVIEW_HTML));
    } else if (req.method === 'GET' && req.url.startsWith('/api/staging')) {
      const u = new URL(req.url, 'http://localhost');
      if (u.searchParams.get('group') === 'source_file') send(200, groupBySource());
      else send(200, listStagingFiles());
    } else if (req.method === 'POST' && req.url === '/api/approve') {
      const { status, json } = handleApprove(await readBody(req));
      send(status, json);
    } else if (req.method === 'POST' && req.url === '/api/approve-batch') {
      const { status, json } = handleApproveBatch(await readBody(req));
      send(status, json);
    } else if (req.method === 'POST' && req.url === '/api/reject') {
      const { status, json } = handleReject(await readBody(req));
      send(status, json);
    } else {
      send(404, { error: 'not found' });
    }
  } catch (e) {
    send(500, { error: e.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`ToolAdvisor staging review → http://localhost:${PORT}`);
});
