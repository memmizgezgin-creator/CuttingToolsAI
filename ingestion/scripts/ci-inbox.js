#!/usr/bin/env node
/**
 * ci-inbox.js — GitHub Actions ingestion orchestrator
 * =====================================================
 * Called by .github/workflows/ingestion.yml.
 * Processes PDFs in ingestion/inbox/, commits staging files, notifies event bus.
 *
 * Does NOT rewrite extraction logic — spawns claude-extract.js unchanged,
 * calls mergeRecords() from the shared merge module.
 *
 * Exit codes:
 *   0  success (including "nothing to process")
 *   1  fatal error (API key missing, or all PDFs failed)
 *
 * GITHUB_OUTPUT: writes ingest_stats=<json> for workflow visibility.
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { mergeRecords } = require('./merge-records.js');

// ─── Paths ─────────────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '../..');
const INBOX_DIR    = path.join(ROOT, 'ingestion/inbox');
const EXTRACT_JS   = path.join(__dirname, 'claude-extract.js');
const PROCESSED    = path.join(ROOT, 'ingestion/output/processed');
const FAILED_DIR   = path.join(ROOT, 'ingestion/failed');
const EXTRACTED_OUT = path.join(ROOT, 'ingestion/output/claude-extracted');
const CONF_MIN     = 70;  // matches pipeline.js CONF_MERGE_MIN

// ─── Stats ─────────────────────────────────────────────────────────────────
const stats = {
  date:        new Date().toISOString().slice(0, 10),
  pdfsFound:   0,
  pdfsOk:      0,
  pdfsErr:     0,
  extracted:   0,
  autoMerged:  0,
  staged:      0,
  failures:    []
};

// ─── GITHUB_OUTPUT helper ──────────────────────────────────────────────────
function writeGithubOutput(key, value) {
  const outFile = process.env.GITHUB_OUTPUT;
  if (outFile) {
    fs.appendFileSync(outFile, `${key}=${JSON.stringify(value)}\n`);
  }
}

// ─── Supabase event notification (best-effort — never blocks the job) ──────
async function notifyEventBus(body) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('ℹ️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — skipping event bus notification');
    return;
  }
  try {
    const res = await fetch(`${url}/rest/v1/agent_events`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        key,
        'Authorization': `Bearer ${key}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify([body]),
    });
    if (res.ok) {
      console.log('📨 Event bus notification sent');
    } else {
      console.log(`⚠️  Event bus HTTP ${res.status} — continuing`);
    }
  } catch (e) {
    console.log(`⚠️  Event bus error: ${e.message} — continuing`);
  }
}

// ─── Parse extraction counts from claude-extract.js summary.txt ───────────
function parseSummary(summaryPath) {
  if (!fs.existsSync(summaryPath)) return { total: 0, approved: 0, review: 0 };
  const text = fs.readFileSync(summaryPath, 'utf8');
  const total    = Number((text.match(/Total records extracted:\s*(\d+)/)   || [,0])[1]);
  const approved = Number((text.match(/Auto-approved[^:]*:\s*(\d+)/)        || [,0])[1]);
  const review   = Number((text.match(/Review required[^:]*:\s*(\d+)/)      || [,0])[1]);
  return { total, approved, review };
}

// ─── Find the most-recently-created run dir for a pdf slug ────────────────
function latestRunDir(pdfSlug) {
  const slugDir = path.join(EXTRACTED_OUT, pdfSlug);
  if (!fs.existsSync(slugDir)) return null;
  const runs = fs.readdirSync(slugDir)
    .filter(d => d.startsWith('run-'))
    .sort()
    .reverse();
  return runs.length ? path.join(slugDir, runs[0]) : null;
}

// ─── PDF slug (matches claude-extract.js's own slug logic) ────────────────
function pdfToSlug(filename) {
  return filename.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  CuttingToolsAI — CI Ingestion Pipeline      ║');
  console.log(`║  ${new Date().toISOString()}          ║`);
  console.log('╚══════════════════════════════════════════════╝');

  // ── 1. API key check ─────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY is not set.');
    console.error('   Add it in: GitHub repo → Settings → Secrets and variables → Actions → New repository secret');
    process.exit(1);
  }
  console.log('✅ ANTHROPIC_API_KEY is set');

  // ── 2. Scan inbox ────────────────────────────────────────────────────────
  if (!fs.existsSync(INBOX_DIR)) fs.mkdirSync(INBOX_DIR, { recursive: true });

  const pdfs = fs.readdirSync(INBOX_DIR)
    .filter(f => f.toLowerCase().endsWith('.pdf') && fs.statSync(path.join(INBOX_DIR, f)).isFile());

  stats.pdfsFound = pdfs.length;
  console.log(`\n📥 Inbox: ${pdfs.length} PDF(s)`);

  // ── 3. Nothing to do ─────────────────────────────────────────────────────
  if (pdfs.length === 0) {
    console.log('ℹ️  Nothing to process — exiting cleanly.');
    writeGithubOutput('ingest_stats', stats);
    await notifyEventBus({
      from_agent:  'ingestion_pipeline',
      to_agent:    'chief_of_staff',
      event_type:  'finding',
      priority:    'low',
      title:       'Ingestion pipeline: nothing to process',
      body:        `Nightly ingestion sweep ran on ${stats.date} but found no PDFs in ingestion/inbox/. ` +
                   'Drop a PDF into ingestion/inbox/ and push (or trigger workflow_dispatch) to start extraction.',
      source_ref:  null
    });
    process.exit(0);
  }

  // ── 4. Process each PDF ──────────────────────────────────────────────────
  fs.mkdirSync(PROCESSED,  { recursive: true });
  fs.mkdirSync(FAILED_DIR, { recursive: true });

  const processedSlugs = [];
  const env = { ...process.env };

  for (const pdfFile of pdfs) {
    const pdfPath = path.join(INBOX_DIR, pdfFile);
    const slug    = pdfToSlug(pdfFile.replace(/\.pdf$/i, ''));
    console.log(`\n📄 Processing: ${pdfFile} (slug: ${slug})`);

    // Timeout: 20 min per PDF, leaving headroom for commit/notify in the 30 min job.
    const result = spawnSync('node', [EXTRACT_JS, pdfPath], {
      cwd:     ROOT,
      env,
      stdio:   'inherit',
      timeout: 20 * 60 * 1000
    });

    if (result.status === 0 && !result.error) {
      // Move to processed/ archive
      const ts   = new Date().toISOString().replace(/[:.]/g, '-').split('Z')[0];
      const dest = path.join(PROCESSED, `${ts}_${pdfFile}`);
      fs.renameSync(pdfPath, dest);
      console.log(`✅ ${pdfFile} → output/processed/`);

      processedSlugs.push(slug);
      stats.pdfsOk++;

      // Tally from summary.txt
      const runDir = latestRunDir(slug);
      if (runDir) {
        const s = parseSummary(path.join(runDir, 'summary.txt'));
        stats.extracted += s.total;
        stats.staged    += s.review;
        console.log(`   extracted=${s.total} approved=${s.approved} staged=${s.review}`);
      }
    } else {
      // Move to failed/ + write error log
      const errMsg = result.error
        ? result.error.message
        : `Process exited with status ${result.status ?? '(signal)'}`;

      const failedPdfPath = path.join(FAILED_DIR, pdfFile);
      const failedErrPath = path.join(FAILED_DIR, pdfFile.replace(/\.pdf$/i, '.error.txt'));

      try {
        fs.renameSync(pdfPath, failedPdfPath);
      } catch (mvErr) {
        console.log(`  ⚠️  Could not move to failed/: ${mvErr.message}`);
      }
      fs.writeFileSync(
        failedErrPath,
        `Failed: ${new Date().toISOString()}\nFile: ${pdfFile}\nExit code: ${result.status ?? 'null'}\nError: ${errMsg}\n`
      );

      console.log(`❌ ${pdfFile} → failed/ (${errMsg})`);
      stats.pdfsErr++;
      stats.failures.push({ file: pdfFile, error: errMsg });
    }
  }

  // ── 5. Merge conf >= 70 records (exact same logic as pipeline.js) ────────
  console.log('\n🔀 Running merge (conf >= 70 auto-merge)...');

  // Gather raw records from ALL staging dirs (mergeRecords has dedup protection)
  const rawRecords = [];
  if (fs.existsSync(EXTRACTED_OUT)) {
    for (const pdfDir of fs.readdirSync(EXTRACTED_OUT)) {
      const pdfPath = path.join(EXTRACTED_OUT, pdfDir);
      if (!fs.statSync(pdfPath).isDirectory()) continue;
      const runs = fs.readdirSync(pdfPath).filter(d => d.startsWith('run-')).sort().reverse();
      if (!runs.length) continue;
      const reviewFile = path.join(pdfPath, runs[0], 'review.json');
      if (!fs.existsSync(reviewFile)) continue;
      try {
        const records = JSON.parse(fs.readFileSync(reviewFile, 'utf8'));
        if (Array.isArray(records)) {
          records.filter(r => (r.confidence || 0) >= CONF_MIN).forEach(r => rawRecords.push(r));
        }
      } catch (e) {
        console.log(`  ⚠️  Could not read ${reviewFile}: ${e.message}`);
      }
    }
  }

  const { added, skippedDuplicates } = mergeRecords({ raw: rawRecords });
  stats.autoMerged = added;
  console.log(`   ✅ ${added} auto-merged, ${skippedDuplicates} duplicates skipped`);

  // ── 6. Write GITHUB_OUTPUT ───────────────────────────────────────────────
  writeGithubOutput('ingest_stats', stats);

  // ── 7. Summary ──────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(60));
  console.log('📊 Pipeline summary:');
  console.log(`   PDFs found:         ${stats.pdfsFound}`);
  console.log(`   PDFs OK:            ${stats.pdfsOk}`);
  console.log(`   PDFs failed:        ${stats.pdfsErr}`);
  console.log(`   Records extracted:  ${stats.extracted}`);
  console.log(`   Auto-merged:        ${stats.autoMerged}`);
  console.log(`   Staged for review:  ${stats.staged}`);
  if (stats.failures.length) {
    console.log(`   Failures:`);
    stats.failures.forEach(f => console.log(`     ❌ ${f.file}: ${f.error}`));
  }
  console.log('─'.repeat(60));

  // ── 8. Notify event bus ─────────────────────────────────────────────────
  const failNote = stats.pdfsErr > 0
    ? ` ⚠️  ${stats.pdfsErr} PDF(s) failed: ${stats.failures.map(f => f.file).join(', ')} — moved to ingestion/failed/.`
    : '';

  const priority = stats.pdfsErr > 0 ? 'normal' : (stats.pdfsOk > 0 ? 'normal' : 'low');

  await notifyEventBus({
    from_agent:  'ingestion_pipeline',
    to_agent:    'chief_of_staff',
    event_type:  'finding',
    priority,
    title:       `Ingestion pipeline: ${stats.pdfsOk} PDF(s) processed, ${stats.autoMerged} records merged`,
    body:        `Run ${stats.date}: ${stats.pdfsFound} PDF(s) in inbox. ` +
                 `${stats.pdfsOk} processed successfully, ${stats.pdfsErr} failed. ` +
                 `${stats.extracted} records extracted. ` +
                 `${stats.autoMerged} auto-merged (conf ≥ ${CONF_MIN}). ` +
                 `${stats.staged} staged for human review (conf < ${CONF_MIN} — use ingestion/review.html).` +
                 failNote,
    source_ref:  null
  });

  // Exit 1 if ALL PDFs failed (partial success is still 0)
  if (stats.pdfsFound > 0 && stats.pdfsOk === 0) {
    console.error('\n❌ All PDFs failed — exiting with error');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('❌ Fatal pipeline error:', e.message);
  process.exit(1);
});
