#!/usr/bin/env node
'use strict';
/**
 * validate-staging.js — validation pass over PDF-ingestion staging records.
 *
 * Validates every staged record (the review.json files that
 * ingestion/serve-review.js serves for human approval) against the product-DB
 * candidate schema (agent_docs/SCHEMA.md) and flags duplicates against the
 * live product DB (data/extracted-productdb-candidates.json).
 *
 * Staged raw-extract records carry provenance as source_pdf + source_page
 * (source_pdf is the SCHEMA.md source_file equivalent for this extractor).
 * The duplicate natural key is article_number|source_pdf — the exact dedup
 * key merge-records.js enforces at merge time, built from the SCHEMA.md
 * identity fields (article_no within a source).
 *
 * Per record: { status: 'clean' | 'flagged', reasons: [code, ...] }
 * Reason codes:
 *   missing_source_file   no source_pdf
 *   missing_source_page   no source_page
 *   bad_type_source_page  source_page not an integer / integer[]
 *   missing_brand         brand empty
 *   no_identity           neither article_number nor product_name
 *   bad_iso_group         material_suitability key outside P/M/K/N/S/H
 *                         or value not true/false/null
 *   bad_type_<field>      numeric field is non-numeric and non-null
 *   already_in_db         natural key already exists in the live product DB
 *   dup_in_staging        natural key appears more than once in staging
 *
 * NOTE: low confidence is deliberately NOT a flag — review.json is the
 * conf<70 bucket by construction (claude-extract.js); human batch approval
 * is exactly the override for that.
 *
 * CLI: node scripts/validate-staging.js   → prints the validation report
 * Module: require()d by ingestion/serve-review.js for batch mode.
 * Read-only: never writes anything.
 */

const fs   = require('fs');
const path = require('path');

const { ROOT, loadCandidates } = require('../ingestion/scripts/merge-records.js');

const STAGING_BASE = path.join(ROOT, 'ingestion/output/claude-extracted');
const ISO_GROUPS   = new Set(['P', 'M', 'K', 'N', 'S', 'H']);
const NUM_FIELDS   = ['diameter_min', 'diameter_max'];
const CUT_FIELDS   = ['vc_min', 'vc_max', 'feed_min', 'feed_max'];

// Natural key — must stay identical to the dedup key in merge-records.js.
function naturalKey(r) {
  return (r.article_number || '') + '|' + (r.source_pdf || '');
}

function isIntLike(v) {
  return Number.isInteger(v) || (Array.isArray(v) && v.length > 0 && v.every(Number.isInteger));
}

// ─── Discovery (same tree serve-review.js serves) ───────────────────────────
function discoverStagingFiles() {
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
      out.push({ file: path.relative(ROOT, file), records });
    }
  }
  return out;
}

// ─── Validation ──────────────────────────────────────────────────────────────
/**
 * @param {Array}  records       all staged records (across all staging files)
 * @param {Set}    existingKeys  natural keys already in the live product DB
 * @returns {Array} same order as input: { status, reasons }
 */
function validateRecords(records, existingKeys) {
  // Intra-staging duplicate detection: count identity-bearing keys.
  const keyCount = new Map();
  for (const r of records) {
    if (r && r.article_number) {
      const k = naturalKey(r);
      keyCount.set(k, (keyCount.get(k) || 0) + 1);
    }
  }

  return records.map(r => {
    const reasons = [];
    if (!r || typeof r !== 'object') return { status: 'flagged', reasons: ['no_identity'] };

    if (!(typeof r.source_pdf === 'string' && r.source_pdf.trim())) reasons.push('missing_source_file');
    if (r.source_page == null) reasons.push('missing_source_page');
    else if (!isIntLike(r.source_page)) reasons.push('bad_type_source_page');

    if (!(typeof r.brand === 'string' && r.brand.trim())) reasons.push('missing_brand');

    const hasArticle = typeof r.article_number === 'string' ? r.article_number.trim() : r.article_number;
    const hasName    = typeof r.product_name   === 'string' ? r.product_name.trim()   : r.product_name;
    if (!hasArticle && !hasName) reasons.push('no_identity');

    const ms = r.material_suitability;
    if (ms != null) {
      if (typeof ms !== 'object' || Array.isArray(ms)) reasons.push('bad_iso_group');
      else for (const [k, v] of Object.entries(ms)) {
        if (!ISO_GROUPS.has(k) || (v !== true && v !== false && v !== null)) {
          reasons.push('bad_iso_group');
          break;
        }
      }
    }

    for (const f of NUM_FIELDS) {
      if (r[f] != null && typeof r[f] !== 'number') reasons.push(`bad_type_${f}`);
    }
    const cd = r.cutting_data;
    if (cd != null && typeof cd === 'object') {
      for (const f of CUT_FIELDS) {
        if (cd[f] != null && typeof cd[f] !== 'number') reasons.push(`bad_type_${f}`);
      }
    }
    if (r.confidence != null && !(typeof r.confidence === 'number' && r.confidence >= 0 && r.confidence <= 100)) {
      reasons.push('bad_type_confidence');
    }

    if (r.article_number) {
      const k = naturalKey(r);
      if (existingKeys.has(k)) reasons.push('already_in_db');
      if ((keyCount.get(k) || 0) > 1) reasons.push('dup_in_staging');
    }

    return { status: reasons.length ? 'flagged' : 'clean', reasons };
  });
}

function liveDbKeys() {
  return new Set(loadCandidates().map(r => (r.article || '') + '|' + (r.source_pdf || '')));
}

// Full pass: discover, validate, group per source_file (= source_pdf).
function validateStaging() {
  const files = discoverStagingFiles();
  const existingKeys = liveDbKeys();
  const flat = [];
  for (const f of files) {
    f.records.forEach((r, idx) => flat.push({ file: f.file, idx, record: r }));
  }
  const results = validateRecords(flat.map(x => x.record), existingKeys);
  flat.forEach((x, i) => { x.validation = results[i]; });

  const bySource = new Map();
  for (const x of flat) {
    const src = x.record?.source_pdf || '(unknown)';
    if (!bySource.has(src)) bySource.set(src, { source_file: src, files: new Set(), total: 0, clean: 0, flagged: 0, entries: [] });
    const g = bySource.get(src);
    g.files.add(x.file);
    g.total++;
    g[x.validation.status === 'clean' ? 'clean' : 'flagged']++;
    g.entries.push(x);
  }
  const groups = [...bySource.values()].map(g => ({ ...g, files: [...g.files] }))
    .sort((a, b) => b.total - a.total);
  return { files, flat, groups };
}

// ─── CLI report ──────────────────────────────────────────────────────────────
function printReport() {
  const { flat, groups } = validateStaging();
  const clean   = flat.filter(x => x.validation.status === 'clean').length;
  const flagged = flat.length - clean;
  const byReason = {};
  for (const x of flat) for (const r of x.validation.reasons) byReason[r] = (byReason[r] || 0) + 1;

  console.log('=== STAGING VALIDATION REPORT ===');
  console.log(`total staged: ${flat.length}`);
  console.log(`clean:        ${clean}`);
  console.log(`flagged:      ${flagged}`);
  console.log('flagged by reason code:');
  const reasons = Object.entries(byReason).sort((a, b) => b[1] - a[1]);
  if (!reasons.length) console.log('  (none)');
  for (const [code, n] of reasons) console.log(`  ${code}: ${n}`);
  console.log('per-source breakdown:');
  if (!groups.length) console.log('  (staging is empty)');
  for (const g of groups) {
    console.log(`  ${g.source_file}  total=${g.total} clean=${g.clean} flagged=${g.flagged} files=${g.files.length}`);
  }
  return { total: flat.length, clean, flagged };
}

module.exports = { STAGING_BASE, naturalKey, discoverStagingFiles, validateRecords, liveDbKeys, validateStaging, printReport };

if (require.main === module) printReport();
