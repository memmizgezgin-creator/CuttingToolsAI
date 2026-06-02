const fs = require('fs');
const path = require('path');
const { buildCandidateValidation } = require('./candidate-schema-validator');

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
    for (const warning of candidate.risk_flags || []) {
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

function sourcePage(record) {
  return record.source_page ?? record.pdf_page ?? null;
}

function rawRowRef(record) {
  if (!record.source_file || record.pdf_page === undefined || record.row_index === undefined) return null;
  return `raw-page-text/${record.source_file}#page-${record.pdf_page}-row-${record.row_index}`;
}

function mmValue(field) {
  if (!field || !field.mm) return null;
  const value = Number(field.mm.value);
  return Number.isFinite(value) ? value : null;
}

function integerValue(field) {
  if (!field || field.value === undefined || field.value === null) return null;
  const value = Number(field.value);
  return Number.isInteger(value) ? value : null;
}

function handedness(record) {
  if (record.cutting_direction === 'RHC') return 'RH';
  if (record.cutting_direction === 'LHC') return 'LH';
  return null;
}

function designation(record) {
  if (!record.product_type && !record.tool_no) return null;
  return [record.product_type, record.tool_no].filter(Boolean).join(' ');
}

function baseConfidence(record) {
  let score = 90;
  if (!record.source_file) score -= 15;
  if (!sourcePage(record)) score -= 20;
  if (!rawRowRef(record)) score -= 30;
  if (!record.brand) score -= 10;
  if (!record.tool_no && !record.edp) score -= 15;
  if (['diameter', 'shank_diameter', 'overall_length', 'flute_length'].every((field) => mmValue(record[field]) === null) && integerValue(record.flutes) === null) {
    score -= 10;
  }
  if (!record.coating_or_surface) score -= 5;
  if (!record.material_grade_if_present) score -= 5;
  return Math.max(0, Math.min(100, score));
}

function confidenceReason(record) {
  const reasons = [
    'M.A. Ford Series 272 row identity and traceability were extracted by the format-specific PDF table parser.'
  ];
  if (!record.coating_or_surface) reasons.push('Coating/surface is not present in the source row and remains null.');
  if (!record.material_grade_if_present) reasons.push('Material grade is not present in the source row and remains null.');
  if (['diameter', 'shank_diameter', 'overall_length', 'flute_length'].some((field) => mmValue(record[field]) === null)) {
    reasons.push('Inch-only dimensional values were preserved in raw_fields and not converted into mm schema fields.');
  }
  reasons.push('No PRODUCT_DB merge is allowed from this candidate output.');
  return reasons.join(' ');
}

function toCandidate(record, index) {
  const candidate = {
    id: candidateId(record, index),
    source_file: record.source_file ?? null,
    source_page: sourcePage(record),
    raw_row_ref: rawRowRef(record),
    raw_table_ref: null,
    source_type: 'manufacturer_catalogue',
    source_name: 'M.A. Ford 2018 Master Catalog Reamers',
    extraction_method: 'pdf-table',
    designation: designation(record),
    article_no: record.tool_no ?? record.edp ?? null,
    product_family: record.product_family ?? null,
    brand: record.brand ?? 'M.A. Ford',
    type: 'reamer',
    diameter_d1_mm: mmValue(record.diameter),
    diameter_d2_mm: mmValue(record.shank_diameter),
    oal_l1_mm: mmValue(record.overall_length),
    flute_length_l2_mm: mmValue(record.flute_length),
    flutes: integerValue(record.flutes),
    handedness: handedness(record),
    shank_type: null,
    tolerance_d1: null,
    din_norm: null,
    coating: record.coating_or_surface ?? null,
    substrate: null,
    iso_grade: record.material_grade_if_present ?? null,
    insert_shape: null,
    chipbreaker: null,
    iso_materials: null,
    operations: null,
    vc_min: null,
    vc_max: null,
    feed_min: null,
    feed_max: null,
    cutting_data_by_material: null,
    confidence_score: baseConfidence(record),
    confidence_reason: confidenceReason(record),
    risk_flags: record.normalization_warnings || [],
    validation_status: 'extracted_candidate',
    ai_inferred_fields: [],
    last_checked: '2026-06-02',
    merge_status: 'not_merged',
    raw_fields: record.raw_fields ?? null,
    normalized_dimensional_fields: dimensionalFields(record),
    source_traceability: {
      source_pdf: record.source_pdf ?? null,
      catalog_page: record.catalog_page ?? null,
      row_index: record.row_index ?? null,
      parser_name: record.parser_name ?? null,
      parser_version: record.parser_version ?? null,
      extraction_status: record.extraction_status ?? null,
      normalizer_name: record.normalizer_name ?? null,
      normalizer_version: record.normalizer_version ?? null
    }
  };

  return buildCandidateValidation(candidate).candidate;
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
    'id',
    'brand',
    'source_file',
    'source_page',
    'raw_row_ref',
    'raw_table_ref',
    'source_type',
    'source_name',
    'extraction_method',
    'designation',
    'article_no',
    'product_family',
    'type',
    'diameter_d1_mm',
    'diameter_d2_mm',
    'oal_l1_mm',
    'flute_length_l2_mm',
    'flutes',
    'handedness',
    'coating',
    'iso_materials',
    'operations',
    'confidence_score',
    'confidence_reason',
    'risk_flags',
    'validation_status',
    'ai_inferred_fields',
    'last_checked'
  ];

  const rawOnlyFields = [
    'raw_fields.raw_row',
    'raw_fields.raw_y',
    'raw_fields.warnings',
    'inch-only dimensions',
    'coating',
    'substrate',
    'iso_grade',
    'iso_materials',
    'operations',
    'cutting data'
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
    '`coating`, `substrate`, `iso_grade`, `iso_materials`, `operations`, and cutting-data fields remain null because the source table rows do not contain those values. Inch-only dimensions are preserved in `raw_fields` and are not converted into mm schema fields.',
    '',
    '## Merge Status',
    '',
    '- PRODUCT_DB merge: blocked',
    '- Candidate merge_status: not_merged',
    '- New candidates start as validation_status: extracted_candidate',
    '- Candidates with warnings or missing required technical fields are moved to validation_status: needs_review',
    '',
    '## Exact Next Step',
    '',
    'Human review these candidate records against the source PDF/raw rows before any separate merge workflow is considered.'
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
  const validationResults = candidates.map((candidate) => buildCandidateValidation(candidate, { newRecord: false }));
  const invalidCandidates = validationResults.filter((result) => !result.valid);
  if (invalidCandidates.length) {
    throw new Error(`Candidate schema validation failed for ${invalidCandidates.length} record(s): ${JSON.stringify(invalidCandidates[0].errors)}`);
  }
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
