const fs = require('fs');
const path = require('path');

const INPUT_JSON = path.resolve(
  __dirname,
  '..',
  '..',
  'research',
  'ingestion',
  'maford-series-272-product-candidates.json'
);
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'research', 'ingestion');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'maford-series-272-product-db-preview-20.json');
const OUTPUT_REPORT = path.join(OUTPUT_DIR, 'maford-series-272-product-db-preview-20-report.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sampleKey(candidate) {
  return `${candidate.pdf_page}:${candidate.source_traceability?.row_index}:${candidate.tool_no}:${candidate.edp}`;
}

function addUnique(target, seen, candidates) {
  for (const candidate of candidates) {
    const key = sampleKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(candidate);
  }
}

function middleSlice(candidates, count) {
  const start = Math.max(0, Math.floor(candidates.length / 2) - Math.floor(count / 2));
  return candidates.slice(start, start + count);
}

function selectPreviewCandidates(candidates) {
  const selected = [];
  const seen = new Set();

  addUnique(selected, seen, candidates.slice(0, 5));
  addUnique(selected, seen, middleSlice(candidates, 5));
  addUnique(selected, seen, candidates.slice(-5));
  addUnique(
    selected,
    seen,
    candidates
      .filter((candidate) => candidate.warnings.includes('mixed_unit_fields_preserved_without_conversion'))
      .slice(0, 5)
  );

  if (selected.length < 20) {
    addUnique(selected, seen, candidates.slice(0, 20));
  }

  return selected.slice(0, 20);
}

function dimensions(candidate) {
  const fields = candidate.normalized_dimensional_fields;
  return {
    diameter: fields.diameter,
    shank_diameter: fields.shank_diameter,
    overall_length: fields.overall_length,
    flute_length: fields.flute_length,
    flutes: fields.flutes,
    lead_angle: fields.lead_angle,
    cutting_direction: fields.cutting_direction,
    unit_system: candidate.unit_system
  };
}

function previewId(candidate, index) {
  return `preview-maford-272-${String(index + 1).padStart(3, '0')}-${candidate.tool_no}-${candidate.edp}`;
}

function productName(candidate) {
  return `M.A. Ford Series 272 ${candidate.product_type} ${candidate.tool_no}`;
}

function confidence(candidate) {
  return {
    level: 'review_high',
    score: 90,
    basis: [
      'format_specific_parser_validated_on_manual_sample',
      'automated_validation_passed_all_924_records',
      'source_traceability_preserved',
      'not_human_approved_for_merge'
    ],
    safe_for_direct_PRODUCT_DB_merge: false
  };
}

function source(candidate) {
  return {
    type: 'manufacturer_catalogue',
    name: 'M.A. Ford 2018 Master Catalog Reamers',
    pdf: candidate.source_pdf,
    pdf_page: candidate.pdf_page,
    catalog_page: candidate.catalog_page
  };
}

function traceability(candidate) {
  return {
    source_pdf: candidate.source_pdf,
    pdf_page: candidate.pdf_page,
    catalog_page: candidate.catalog_page,
    row_index: candidate.source_traceability?.row_index ?? null,
    tool_no: candidate.tool_no,
    edp: candidate.edp,
    candidate_id: candidate.candidate_id,
    parser_name: candidate.source_traceability?.parser_name ?? null,
    parser_version: candidate.source_traceability?.parser_version ?? null,
    raw_row: candidate.source_traceability?.raw_row ?? null
  };
}

function toPreviewRecord(candidate, index) {
  return {
    id: previewId(candidate, index),
    brand: candidate.brand,
    series: candidate.series,
    name: productName(candidate),
    category: 'cutting_tool',
    product_family: candidate.product_family,
    product_type: candidate.product_type,
    tool_no: candidate.tool_no,
    edp: candidate.edp,
    iso_code: null,
    dimensions: dimensions(candidate),
    material_suitability: {
      status: 'requires_review',
      values: [],
      reason: 'Material suitability is not present in the Series 272 source table rows.'
    },
    operation_suitability: {
      status: 'draft_review',
      values: ['reaming'],
      reason: 'Operation is derived from product family/product type and must be reviewed before production use.'
    },
    coating_or_surface: null,
    grade: null,
    source: source(candidate),
    source_traceability: traceability(candidate),
    confidence: confidence(candidate),
    warnings: candidate.warnings,
    merge_status: 'preview_only_not_merged'
  };
}

function warningCounts(records) {
  const counts = {};
  for (const record of records) {
    for (const warning of record.warnings || []) {
      counts[warning] = (counts[warning] || 0) + 1;
    }
  }
  return counts;
}

function markdownTable(rows, headers) {
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`
  ];
  for (const row of rows) {
    lines.push(`| ${headers.map((header) => row[header] ?? '').join(' | ')} |`);
  }
  return lines.join('\n');
}

function writeReport(records, warnings) {
  const warningRows = Object.entries(warnings)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([warning, count]) => ({ Warning: warning, Count: count }));

  const schemaGaps = [
    'No source-backed ISO code in Series 272 table rows.',
    'No source-backed coating_or_surface in Series 272 table rows.',
    'No source-backed grade/material grade in Series 272 table rows.',
    'Material suitability is absent from row source and remains a review placeholder.',
    'Operation suitability is derived from product family/product type and remains draft/review.',
    'Mixed inch/metric rows are preserved but not converted into a single canonical unit system.'
  ];

  const lines = [
    '# M.A. Ford Series 272 PRODUCT_DB Schema Preview',
    '',
    `- Input file: ${INPUT_JSON}`,
    `- Output file: ${OUTPUT_JSON}`,
    `- Total preview records: ${records.length}`,
    '- PRODUCT_DB untouched: true',
    '- Safe for direct PRODUCT_DB merge: false',
    '',
    'This is a schema compatibility preview only. It is not production data and does not modify PRODUCT_DB.',
    '',
    '## Mapping Decisions',
    '',
    '- `tool_no` and `edp` map directly from validated candidate identity fields.',
    '- Dimensional fields are nested under `dimensions` and preserve source values without conversion.',
    '- `material_suitability` uses an explicit `requires_review` placeholder because the source rows do not contain material suitability.',
    '- `operation_suitability` uses `draft_review` with `reaming` from the Series 272 product family/type context.',
    '- `iso_code`, `coating_or_surface`, and `grade` remain null.',
    '- `source_traceability` preserves source PDF, page, catalog page, row index, parser details, candidate id, and raw row.',
    '',
    '## Fields Mapped Cleanly',
    '',
    [
      'id',
      'brand',
      'series',
      'name',
      'category',
      'product_family',
      'product_type',
      'tool_no',
      'edp',
      'dimensions',
      'source',
      'source_traceability',
      'warnings',
      'merge_status'
    ].map((field) => `- \`${field}\``).join('\n'),
    '',
    '## Fields Left Null Or Review',
    '',
    [
      'iso_code',
      'coating_or_surface',
      'grade',
      'material_suitability',
      'operation_suitability',
      'mixed unit canonical conversions'
    ].map((field) => `- \`${field}\``).join('\n'),
    '',
    '## Warning Counts',
    '',
    warningRows.length ? markdownTable(warningRows, ['Warning', 'Count']) : 'No warnings found.',
    '',
    '## Schema Gaps Found',
    '',
    schemaGaps.map((gap) => `- ${gap}`).join('\n'),
    '',
    '## Exact Next Recommended Step',
    '',
    'Review this 20-record preview against the current PRODUCT_DB schema expectations, then decide which fields need schema adapters before any merge workflow is designed.'
  ];

  fs.writeFileSync(OUTPUT_REPORT, `${lines.join('\n')}\n`);
}

function main() {
  const input = readJson(INPUT_JSON);
  const candidates = input.candidates.filter((candidate) => candidate.series === '272');
  const selected = selectPreviewCandidates(candidates);
  const previewRecords = selected.map(toPreviewRecord);
  const warnings = warningCounts(previewRecords);

  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify({
    source_input: INPUT_JSON,
    generated_at: new Date().toISOString(),
    restrictions: {
      product_db_merge: false,
      frontend_changes: false,
      ai_used: false,
      series_scope: '272'
    },
    selection_strategy: [
      'first_5_candidates',
      'middle_5_candidates',
      'last_5_candidates',
      'up_to_5_mixed_unit_warning_candidates',
      'duplicates_removed'
    ],
    preview_record_count: previewRecords.length,
    safe_for_direct_PRODUCT_DB_merge: false,
    product_db_untouched: true,
    warning_counts: warnings,
    records: previewRecords
  }, null, 2)}\n`);
  writeReport(previewRecords, warnings);

  console.log(`Output: ${OUTPUT_JSON}`);
  console.log(`Report: ${OUTPUT_REPORT}`);
  console.log(`Preview records: ${previewRecords.length}`);
  console.log(`Warning counts: ${JSON.stringify(warnings)}`);
  console.log('PRODUCT_DB untouched: true');
  console.log('Safe for direct PRODUCT_DB merge: false');
}

main();
