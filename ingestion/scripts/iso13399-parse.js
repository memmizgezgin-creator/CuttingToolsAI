#!/usr/bin/env node
/**
 * iso13399-parse.js
 *
 * ISO 13399 cutting tool data file parser → PRODUCT_DB candidates
 *
 * ISO 13399 is the international standard for cutting tool data exchange.
 * Major manufacturers publish their full catalogs in this format (free):
 *   Sandvik  → https://www.sandvik.coromant.com → CoroPlus Tool Library → Export ISO 13399
 *   Kennametal→ https://www.kennametal.com → NOVO → Export
 *   Walter   → https://www.walter-tools.com → GPS → ISO 13399 export
 *   Iscar    → https://www.iscar.com → ITA → ISO 13399
 *   Gühring  → https://www.guehring.com → Tool Management → Export
 *   Mitsubishi→ https://www.mitsubishicarbide.com → Data download
 *
 * File formats supported:
 *   .xml  — standard ISO 13399 XML
 *   .ctf  — CoroPlus Tool Format (Sandvik) — ZIP containing ISO 13399 XML
 *
 * Usage:
 *   node ingestion/scripts/iso13399-parse.js <file.xml>
 *   node ingestion/scripts/iso13399-parse.js <file.ctf>
 *   node ingestion/scripts/iso13399-parse.js <folder/>   ← batch: all XML files
 *
 * Output:
 *   ingestion/output/iso13399/<brand-slug>/
 *     candidates.json   → all parsed records
 *     approved.json     → complete records
 *     review.json       → incomplete/uncertain records
 *     summary.txt
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');

// ─── ISO 13399 Parameter Code → our field mapping ─────────────────────────
//
// Full code list: ISO 13399:2023, Annex A
// We extract the most useful subset for ToolAdvisor.
//
const PARAM_MAP = {
  // Identity
  'BRAND':    'brand',
  'GRADE':    'grade',
  'CATNO':    'article_number',      // Catalog number / order code
  'CATID':    'article_number',      // Alternative catalog ID
  'DESCR':    'product_name',
  'TYPID':    'tool_type_id',        // ISO 13399 tool type identifier
  'CUTMAT':   'cutting_material',    // e.g. HW (hardmetal/carbide), HS (HSS), BN (CBN)

  // Geometry
  'DC':       'diameter_cutting',    // Cutting diameter (mm)
  'DCON':     'diameter_connection', // Connection diameter
  'OAL':      'length_overall',      // Overall length
  'LF':       'length_functional',   // Functional length
  'LU':       'length_usable',       // Usable cutting length
  'RE':       'corner_radius',       // Corner radius
  'KAPR':     'lead_angle',          // Lead/entering angle
  'GAMA':     'rake_angle',
  'APMX':     'ap_max',              // Max axial depth of cut

  // Application
  'HAND':     'hand',                // R=right, L=left, N=neutral
  'COOLANT':  'coolant',
  'SFDM':     'machining_type',      // Turning, milling, drilling, etc.
  'PROCSS':   'process',

  // Workpiece material suitability (ISO 513 groups)
  // These appear as separate params or as a combined WKPMAT field
  'WKPMAT':   'workpiece_material',  // Free text material description
  'ISO_P':    'iso_P',
  'ISO_M':    'iso_M',
  'ISO_K':    'iso_K',
  'ISO_N':    'iso_N',
  'ISO_S':    'iso_S',
  'ISO_H':    'iso_H',

  // Cutting data
  'VCMIN':    'vc_min',
  'VCMAX':    'vc_max',
  'FZMIN':    'fz_min',
  'FZMAX':    'fz_max',
  'APMIN':    'ap_min',
};

// ─── ISO 13399 TYPID → family mapping ─────────────────────────────────────
const TYPID_FAMILY = {
  'EDS':  'Drilling',       // Exchangeable drill point
  'SDS':  'Drilling',       // Solid drill short
  'SDL':  'Drilling',       // Solid drill long
  'SDX':  'Drilling',       // Solid drill extra long
  'MDS':  'Drilling',       // Modular drill
  'TDN':  'Drilling',       // Triangular drilling insert
  'SLD':  'Drilling',
  'MGI':  'Milling',        // Milling general insert
  'SEM':  'Milling',        // Solid end mill
  'FMI':  'Milling',        // Face mill insert
  'HFM':  'Milling',        // High feed mill
  'TRI':  'Turning',        // Turning insert
  'TUI':  'Turning',        // Turning utility insert
  'THI':  'Turning',        // Threading insert
  'GRI':  'Turning',        // Grooving insert
  'REA':  'Reaming',        // Reamer
  'TAP':  'Threading',      // Tap
  'CBT':  'Threading',      // Combined tool
};

// ─── CUTMAT → material label ───────────────────────────────────────────────
const CUTMAT_LABEL = {
  'HW':  'Carbide',
  'HC':  'Coated carbide',
  'HS':  'HSS',
  'HE':  'HSS-E (Co-alloyed)',
  'BN':  'CBN',
  'DP':  'Diamond (PCD)',
  'CR':  'Cermet',
  'CA':  'Ceramic',
  'CC':  'Coated ceramic',
};

// ─── XML helpers ───────────────────────────────────────────────────────────
function getAttr(el, name) {
  return el?.getAttribute?.(name) ?? null;
}

function getText(el) {
  return el?.textContent?.trim() ?? null;
}

function findAll(parent, tagName) {
  if (!parent) return [];
  try { return Array.from(parent.getElementsByTagName(tagName)); }
  catch { return []; }
}

// ─── Parse a single ISO 13399 XML document ────────────────────────────────
function parseISO13399XML(xmlString, sourceFile) {
  const parser = new DOMParser();
  const doc    = parser.parseFromString(xmlString, 'application/xml');

  const records = [];

  // ISO 13399 XML has two main structures:
  // 1. <ToolItem> elements (most common — one per product variant)
  // 2. <Component> or <Assembly> elements (newer versions)

  // Try ToolItem first
  const toolItems = findAll(doc, 'ToolItem')
    .concat(findAll(doc, 'toolitem'))
    .concat(findAll(doc, 'tool_item'));

  // Also try Component-based structure
  const components = findAll(doc, 'Component')
    .concat(findAll(doc, 'component'));

  const items = toolItems.length > 0 ? toolItems : components;

  for (const item of items) {
    const record = { _raw_params: {} };

    // Method 1: <Parameter paramCode="DC" value="12.0" nominalValue="12.0"/>
    const params = findAll(item, 'Parameter')
      .concat(findAll(item, 'parameter'))
      .concat(findAll(item, 'Param'));

    for (const p of params) {
      const code  = getAttr(p, 'paramCode') || getAttr(p, 'ParamCode') || getAttr(p, 'code') || getText(p.getElementsByTagName('ParamCode')[0]);
      const value = getAttr(p, 'value') || getAttr(p, 'Value') || getAttr(p, 'nominalValue') || getText(p.getElementsByTagName('Value')[0]);

      if (code && value !== null) {
        record._raw_params[code.toUpperCase()] = value;
        const field = PARAM_MAP[code.toUpperCase()];
        if (field) record[field] = value;
      }
    }

    // Method 2: Direct child elements <DC>12.0</DC> or <Brand>Sandvik</Brand>
    for (const [isoCode, field] of Object.entries(PARAM_MAP)) {
      if (record[field] !== undefined) continue; // already set
      const el = item.getElementsByTagName(isoCode)[0]
               || item.getElementsByTagName(isoCode.toLowerCase())[0];
      if (el) record[field] = getText(el);
    }

    // Method 3: Attributes directly on the item element
    for (const [isoCode, field] of Object.entries(PARAM_MAP)) {
      if (record[field] !== undefined) continue;
      const val = getAttr(item, isoCode) || getAttr(item, isoCode.toLowerCase());
      if (val) record[field] = val;
    }

    // Skip empty records
    if (!record.article_number && !record.product_name && !record.diameter_cutting) continue;

    // Normalize numeric fields
    const numericFields = ['diameter_cutting', 'length_overall', 'length_functional', 'vc_min', 'vc_max', 'ap_max', 'corner_radius'];
    for (const f of numericFields) {
      if (record[f]) {
        const n = parseFloat(record[f]);
        record[f] = isNaN(n) ? null : n;
      }
    }

    // Resolve family from TYPID
    if (record.tool_type_id) {
      record.family = TYPID_FAMILY[record.tool_type_id.toUpperCase()] || record.tool_type_id;
    }

    // Resolve cutting material label
    if (record.cutting_material) {
      record.cutting_material_label = CUTMAT_LABEL[record.cutting_material.toUpperCase()] || record.cutting_material;
    }

    // Build material_suitability from ISO params
    // ISO 13399 encodes this as ISO_P, ISO_M etc. with values Y/N/C (yes/no/conditional)
    const msRaw = {
      P: record.iso_P, M: record.iso_M, K: record.iso_K,
      N: record.iso_N, S: record.iso_S, H: record.iso_H,
    };
    // Also check WKPMAT free text as fallback
    const material_suitability = {};
    let hasSuitability = false;
    for (const [g, v] of Object.entries(msRaw)) {
      if (v === null || v === undefined) {
        material_suitability[g] = null;
      } else if (['Y', 'YES', '1', 'TRUE'].includes(String(v).toUpperCase())) {
        material_suitability[g] = true; hasSuitability = true;
      } else if (['N', 'NO', '0', 'FALSE'].includes(String(v).toUpperCase())) {
        material_suitability[g] = false; hasSuitability = true;
      } else if (['C', 'COND', 'CONDITIONAL'].includes(String(v).toUpperCase())) {
        material_suitability[g] = null; hasSuitability = true; // conditional = null
      } else {
        material_suitability[g] = null;
      }
      // Clean up individual iso_ fields
      delete record[`iso_${g}`];
    }

    // Confidence scoring
    const issues = [];
    if (!record.article_number)  issues.push('missing_article_number');
    if (!record.brand)           issues.push('missing_brand');
    if (!record.family)          issues.push('missing_family');
    if (!hasSuitability)         issues.push('pmknsh_not_in_file');

    const confidence = issues.length === 0 ? 95
                     : issues.length === 1 ? 85
                     : issues.length === 2 ? 70
                     : 55;

    records.push({
      brand:               record.brand        || null,
      product_name:        record.product_name || null,
      article_number:      record.article_number || null,
      family:              record.family        || null,
      cutting_material:    record.cutting_material_label || record.cutting_material || null,
      grade:               record.grade         || null,
      hand:                record.hand          || null,
      diameter_cutting:    record.diameter_cutting ?? null,
      length_overall:      record.length_overall   ?? null,
      length_functional:   record.length_functional ?? null,
      ap_max:              record.ap_max            ?? null,
      corner_radius:       record.corner_radius     ?? null,
      coolant:             record.coolant       || null,
      material_suitability,
      cutting_data: {
        vc_min: record.vc_min ? parseFloat(record.vc_min) : null,
        vc_max: record.vc_max ? parseFloat(record.vc_max) : null,
        fz_min: record.fz_min ? parseFloat(record.fz_min) : null,
        fz_max: record.fz_max ? parseFloat(record.fz_max) : null,
      },
      workpiece_material:  record.workpiece_material || null,
      source_file:         path.basename(sourceFile),
      source_standard:     'ISO 13399',
      confidence,
      confidence_reason:   issues.length === 0
                             ? 'All required fields present in ISO 13399 data'
                             : `Missing: ${issues.join(', ')}`,
      validation_issues:   issues,
      auto_approved:       confidence >= 85,
      review_required:     confidence < 85,
      merge_status:        'preview_only_not_merged',
      extracted_at:        new Date().toISOString(),
    });
  }

  return records;
}

// ─── Handle .ctf files (Sandvik CoroPlus Tool Format = ZIP) ───────────────
async function parseCTF(filePath) {
  // CTF is a ZIP file. We need to extract and find the XML inside.
  // Requires: npm install adm-zip
  try {
    const AdmZip = require('adm-zip');
    const zip    = new AdmZip(filePath);
    const xmlEntry = zip.getEntries().find(e => e.entryName.endsWith('.xml'));
    if (!xmlEntry) throw new Error('No XML found inside CTF file');
    const xmlString = zip.readAsText(xmlEntry);
    return parseISO13399XML(xmlString, filePath);
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.error('CTF support requires: npm install adm-zip');
      console.error('Run: npm install adm-zip --save');
    } else {
      console.error(`CTF parse error: ${err.message}`);
    }
    return [];
  }
}

// ─── Process a single file ────────────────────────────────────────────────
async function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.ctf') {
    return parseCTF(filePath);
  } else if (ext === '.xml' || ext === '.iso13399') {
    const xmlString = fs.readFileSync(filePath, 'utf8');
    return parseISO13399XML(xmlString, filePath);
  } else {
    console.warn(`Unsupported file type: ${ext} — skipping ${path.basename(filePath)}`);
    return [];
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const [,, inputArg] = process.argv;

  if (!inputArg) {
    console.log('Usage:');
    console.log('  node ingestion/scripts/iso13399-parse.js <file.xml>');
    console.log('  node ingestion/scripts/iso13399-parse.js <file.ctf>');
    console.log('  node ingestion/scripts/iso13399-parse.js <folder/>');
    console.log('');
    console.log('Download ISO 13399 files from:');
    console.log('  Sandvik    → CoroPlus Tool Library → Export ISO 13399');
    console.log('  Kennametal → NOVO → Export');
    console.log('  Walter     → GPS → ISO 13399 download');
    console.log('  Iscar      → ITA software → Export');
    console.log('  Gühring    → Tool Management portal');
    process.exit(0);
  }

  const inputPath = path.resolve(inputArg);
  const stat = fs.statSync(inputPath);

  let files = [];
  if (stat.isDirectory()) {
    files = fs.readdirSync(inputPath)
      .filter(f => ['.xml', '.ctf', '.iso13399'].includes(path.extname(f).toLowerCase()))
      .map(f => path.join(inputPath, f));
    console.log(`📁 Batch mode: ${files.length} files in ${inputPath}`);
  } else {
    files = [inputPath];
  }

  if (files.length === 0) {
    console.error('No .xml or .ctf files found.');
    process.exit(1);
  }

  // Process all files
  const allRecords = [];
  for (const file of files) {
    console.log(`\n🔍 Parsing: ${path.basename(file)}`);
    const records = await processFile(file);
    allRecords.push(...records);
    console.log(`   → ${records.length} records extracted`);
  }

  // Determine brand from records (for output folder naming)
  const brandCounts = {};
  for (const r of allRecords) {
    if (r.brand) brandCounts[r.brand] = (brandCounts[r.brand] || 0) + 1;
  }
  const topBrand = Object.entries(brandCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'unknown';
  const brandSlug = topBrand.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Split approved / review
  const approved = allRecords.filter(r => r.auto_approved);
  const review   = allRecords.filter(r => r.review_required);

  // Output
  const outDir = path.resolve(__dirname, '..', 'output', 'iso13399', brandSlug);
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'candidates.json'), JSON.stringify(allRecords, null, 2));
  fs.writeFileSync(path.join(outDir, 'approved.json'),   JSON.stringify(approved,   null, 2));
  fs.writeFileSync(path.join(outDir, 'review.json'),     JSON.stringify(review,     null, 2));

  const summary = [
    `ISO 13399 Parse — ${new Date().toISOString()}`,
    `Files processed: ${files.length}`,
    ``,
    `Total records:    ${allRecords.length}`,
    `Auto-approved:    ${approved.length}`,
    `Review required:  ${review.length}`,
    ``,
    `Brands found: ${Object.entries(brandCounts).map(([b,n]) => `${b} (${n})`).join(', ')}`,
    ``,
    `Output: ${outDir}`,
  ].join('\n');

  fs.writeFileSync(path.join(outDir, 'summary.txt'), summary);

  console.log(`\n✅ ISO 13399 parse complete`);
  console.log(`   Total:    ${allRecords.length} records`);
  console.log(`   Approved: ${approved.length}`);
  console.log(`   Review:   ${review.length}`);
  console.log(`   Output:   ${outDir}`);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
