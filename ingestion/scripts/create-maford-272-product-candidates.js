const fs = require('fs');
const path = require('path');

const INPUT_JSON = path.resolve(
  __dirname,
  '..',
  '..',
  'research',
  'ingestion',
  'maford-series-272-normalization-review.json'
);
const VALIDATION_SUMMARY_JSON = path.resolve(
  __dirname,
  '..',
  '..',
  'research',
  'ingestion',
  'maford-series-272-validation-pass-summary.json'
);
const VALIDATION_REPORT_MD = path.resolve(
  __dirname,
  '..',
  '..',
  'research',
  'ingestion',
  'maford-series-272-validation-pass-report.md'
);
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'research', 'ingestion');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'maford-series-272-product-candidates.json');
const OUTPUT_REPORT = path.join(OUTPUT_DIR, 'maford-series-272-product-candidates-report.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function warningCounts(candidates) {
  const counts = {};
  for (const candidate of candidates) {
    for (const warning of candidate.warnings || []) {
      counts[warning] = (counts[warning] || 0) + 1;
    }
  }
  return counts;
}

function candidateId(record, index) {
  const page = String(record.pdf_page).padStart(2, '0');
  const row = String(record.row_index).padStart(3, '0');
  return `maford-272-p${page}-r${row}-${record.tool_no}-${record.edp}`;
}

function dimensionalFields(record) {
  return {
    diameter: record.diameter,
    shank_diameter: record.shank_diameter,
    overall_length: record.overall_length,
    flute_length: record.flute_length,
    flutes: record.flutes,
    lead_angle: record.lead_angle,
    cutting_direction: record.cutting_direction
  };
}

function sourceTraceability(record) {
  return {
    source_pdf: record.source_pdf,
    source_file: record.source_file,
    pdf_page: record.pdf_page,
    catalog_page: record.catalog_page,
    row_index: record.row_index,
    parser_name: record.parser_name,
    parser_version: record.parser_version,
    extraction_status: record.extraction_status,
    normalizer_name: record.normalizer_name,
    normalizer_version: record.normalizer_version,
    raw_row: record.raw_fields?.raw_row ?? null
  };
}

function toCandidate(record, index) {
  return {
    candidate_id: candidateId(record, index),
    brand: 'M.A. Ford',
    source_pdf: record.source_pdf,
    pdf_page: record.pdf_page,
    catalog_page: record.catalog_page,
    series: '272',
    product_family: 'Reamer',
    product_type: record.product_type,
    tool_no: record.tool_no,
    edp: record.edp,
    normalized_dimensional_fields: dimensionalFields(record),
    raw_fields: record.raw_fields,
    unit_system: record.unit_system,
    coating_or_surface: null,
    material_grade_if_present: null,
    warnings: record.normalization_warnings || [],
    validation_status: 'validated_candidate_review',
    merge_status: 'not_merged',
    source_traceability: sourceTraceability(record)
  };
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

function writeReport(candidates, validationSummary) {
  const warnings = warningCounts(candidates);
  const warningRows = Object.entries(warnings)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([warning, count]) => ({ Warning: warning, Count: count }));

  const mappedFields = [
    'candidate_id',
    'brand',
    'source_pdf',
    'pdf_page',
    'catalog_page',
    'series',
    'product_family',
    'product_type',
    'tool_no',
    'edp',
    'normalized_dimensional_fields',
    'raw_fields',
    'unit_system',
    'warnings',
    'validation_status',
    'merge_status',
    'source_traceability'
  ];

  const rawOnlyFields = [
    'raw_fields.raw_row',
    'raw_fields.raw_y',
    'raw_fields.warnings',
    'coating_or_surface',
    'material_grade_if_present'
  ];

  const lines = [
    '# M.A. Ford Series 272 Product Candidates',
    '',
    `- Input file: ${INPUT_JSON}`,
    `- Validation summary: ${VALIDATION_SUMMARY_JSON}`,
    `- Validation report: ${VALIDATION_REPORT_MD}`,
    `- Output file: ${OUTPUT_JSON}`,
    `- Total candidates created: ${candidates.length}`,
    `- Source records passed validation: ${validationSummary.passed_records}`,
    `- Safe for product candidate generation: ${validationSummary.safe_for_product_candidate_generation}`,
    '- Safe for PRODUCT_DB merge: false',
    '',
    'These are review-stage product candidate records only. No PRODUCT_DB or frontend catalog files were written.',
    '',
    '## Warning Counts',
    '',
    warningRows.length ? markdownTable(warningRows, ['Warning', 'Count']) : 'No warnings found.',
    '',
    '## Fields Mapped Into Candidate Schema',
    '',
    mappedFields.map((field) => `- \`${field}\``).join('\n'),
    '',
    '## Fields Left Raw Or Review-Only',
    '',
    rawOnlyFields.map((field) => `- \`${field}\``).join('\n'),
    '',
    '`coating_or_surface` and `material_grade_if_present` remain null because the source table rows do not contain those values. Mixed unit rows remain flagged and are not converted.',
    '',
    '## Merge Status',
    '',
    '- PRODUCT_DB merge: blocked',
    '- Candidate merge_status: not_merged',
    '- Candidate validation_status: validated_candidate_review',
    '',
    '## Exact Next Step',
    '',
    'Create a small 20-record PRODUCT_DB schema preview outside PRODUCT_DB.'
  ];

  fs.writeFileSync(OUTPUT_REPORT, `${lines.join('\n')}\n`);
}

function main() {
  const input = readJson(INPUT_JSON);
  const validationSummary = readJson(VALIDATION_SUMMARY_JSON);

  if (validationSummary.safe_for_product_candidate_generation !== true) {
    throw new Error('Validation summary is not safe for product candidate generation.');
  }
  if (validationSummary.safe_for_PRODUCT_DB_merge !== false) {
    throw new Error('Validation summary must keep PRODUCT_DB merge blocked.');
  }

  const records = (input.records || []).filter((record) => record.series === '272');
  const candidates = records.map(toCandidate);
  const warnings = warningCounts(candidates);

  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify({
    source_input: INPUT_JSON,
    validation_basis: {
      summary_file: VALIDATION_SUMMARY_JSON,
      report_file: VALIDATION_REPORT_MD,
      total_records_checked: validationSummary.total_records_checked,
      passed_records: validationSummary.passed_records,
      failed_records: validationSummary.failed_records,
      safe_for_product_candidate_generation: validationSummary.safe_for_product_candidate_generation,
      safe_for_PRODUCT_DB_merge: validationSummary.safe_for_PRODUCT_DB_merge
    },
    generated_at: new Date().toISOString(),
    restrictions: {
      product_db_merge: false,
      frontend_changes: false,
      ai_used: false,
      series_scope: '272'
    },
    candidate_count: candidates.length,
    warning_counts: warnings,
    candidates
  }, null, 2)}\n`);
  writeReport(candidates, validationSummary);

  console.log(`Output: ${OUTPUT_JSON}`);
  console.log(`Report: ${OUTPUT_REPORT}`);
  console.log(`Candidates created: ${candidates.length}`);
  console.log(`Warning counts: ${JSON.stringify(warnings)}`);
  console.log('PRODUCT_DB touched: false');
  console.log('Safe for PRODUCT_DB merge: false');
}

main();
