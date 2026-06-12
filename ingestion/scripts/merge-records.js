'use strict';
/**
 * merge-records.js — shared merge logic for approved extraction records.
 *
 * Single source of truth for mapping raw claude-extract records into the
 * product-DB candidate schema and merging them into
 * data/extracted-productdb-candidates.json with de-duplication.
 *
 * Used by:
 *   - ingestion/scripts/pipeline.js   (daily automated merge, conf >= 70)
 *   - ingestion/serve-review.js       (human approval UI, no conf filter)
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '../..');
const CANDIDATES = path.join(ROOT, 'data/extracted-productdb-candidates.json');

function detectFamily(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('drill') || t.includes('boring bar') || t.includes('countersink')) return 'Drilling';
  if (t.includes('tap') || t.includes('thread mill') || t.includes('threading')) return 'Threading';
  if (t.includes('ream')) return 'Reaming';
  if (t.includes('groove') || t.includes('parting') || t.includes('cut-off')) return 'Grooving';
  if (t.includes('turning') || t.includes('insert') || t.includes('cnmg') || t.includes('cngg')) return 'Turning';
  if (t.includes('mill') || t.includes('end mill') || t.includes('slot') || t.includes('face mill')) return 'Milling';
  return 'Drilling';
}

function mapRawRecord(r, id) {
  if (!r.article_number && !r.product_name) return null;
  const ms = r.material_suitability || {};
  const isoAll = ['P','M','K','N','S','H'].filter(k => ms[k] === true);
  const brand = r.brand || 'Gühring';
  const family = detectFamily((r.family || '') + ' ' + (r.product_name || ''));
  const opMap = { Drilling:'Solid', Threading:'Internal', Reaming:'Finishing',
                  Turning:'Mixed', Milling:'Solid', Grooving:'External' };
  const bestFor = [r.product_name, r.family, r.shank_form, r.depth_multiplier]
    .filter(Boolean).join(' | ').slice(0, 200);
  return {
    id, brand,
    code: r.article_number || '',
    grade: r.material_grade || '',
    shape: '-', tone: 'iso-p',
    iso: isoAll[0] || (ms.P !== false ? 'P' : 'K'),
    iso_all: isoAll.length > 0 ? isoAll : null,
    family,
    op: opMap[family] || 'Solid',
    vcMin: r.cutting_data?.vc_min || null,
    vcMax: r.cutting_data?.vc_max || null,
    fMin: r.cutting_data?.feed_min || null,
    fMax: r.cutting_data?.feed_max || null,
    apMin: null, apMax: null,
    coolant: '', stability: '', bestFor,
    confidence: Math.round(r.confidence || 70),
    supply: 3, equivalents: 0, equivIds: [], betterValueId: null,
    source: r.source || 'initial-import',
    dateAdded: r.dateAdded || '2025-01-01',
    lastVerified: new Date().toISOString().slice(0, 10),
    article: String(r.article_number || ''),
    source_file: r.source_pdf || '',
    source_pdf:  r.source_pdf || '',
    source_page: r.source_page ?? null
  };
}

function loadCandidates() {
  let existing = [];
  if (fs.existsSync(CANDIDATES)) {
    const raw = JSON.parse(fs.readFileSync(CANDIDATES, 'utf8'));
    existing = Array.isArray(raw) ? raw : (raw.tools || []);
  }
  return existing;
}

/**
 * Merge records into data/extracted-productdb-candidates.json.
 *
 * @param {Object} input
 * @param {Array}  input.preMapped  records already in candidate schema (must carry .id)
 * @param {Array}  input.raw        raw claude-extract records (mapped via mapRawRecord)
 * @param {Object} opts
 * @param {boolean} opts.dryRun     skip the file write
 * @returns {{tools: Array, added: number, skippedDuplicates: number}}
 */
function mergeRecords({ preMapped = [], raw = [] } = {}, { dryRun = false } = {}) {
  const existing = loadCandidates();

  // De-dup: id for pre-mapped, article+source_pdf for raw (robust against re-runs)
  const existingIds  = new Set(existing.map(r => r.id));
  const existingKeys = new Set(existing.map(r => (r.article || '') + '|' + (r.source_pdf || '')));
  let idCounter = existing.length + 1;

  const newRecords = [];
  let skippedDuplicates = 0;

  for (const r of preMapped) {
    if (!r.id || existingIds.has(r.id)) { skippedDuplicates++; continue; }
    existingIds.add(r.id);
    existingKeys.add((r.article || '') + '|' + (r.source_pdf || ''));
    newRecords.push(r);
  }

  for (const r of raw) {
    const key = (r.article_number || '') + '|' + (r.source_pdf || '');
    if (existingKeys.has(key)) { skippedDuplicates++; continue; }
    let id;
    do { id = 'X' + String(idCounter++).padStart(4, '0'); } while (existingIds.has(id));
    const mapped = mapRawRecord(r, id);
    if (!mapped) { skippedDuplicates++; continue; }
    existingKeys.add(key);
    existingIds.add(id);
    newRecords.push(mapped);
  }

  const tools = [...existing, ...newRecords];
  if (newRecords.length > 0 && !dryRun) {
    fs.writeFileSync(CANDIDATES, JSON.stringify({ total: tools.length, tools }, null, 2));
  }
  return { tools, added: newRecords.length, skippedDuplicates };
}

module.exports = { ROOT, CANDIDATES, detectFamily, mapRawRecord, loadCandidates, mergeRecords };
