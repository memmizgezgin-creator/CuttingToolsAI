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
const REVIEWED_SAMPLE_JSON = path.resolve(
  __dirname,
  '..',
  '..',
  'research',
  'ingestion',
  'maford-series-272-manual-validation-reviewed.json'
);
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'research', 'ingestion');
const REPORT_PATH = path.join(OUTPUT_DIR, 'maford-series-272-validation-pass-report.md');
const FAILURES_PATH = path.join(OUTPUT_DIR, 'maford-series-272-validation-pass-failures.json');
const SUMMARY_PATH = path.join(OUTPUT_DIR, 'maford-series-272-validation-pass-summary.json');

const EXPECTED_RECORD_COUNT = 924;
const PDF_PAGE_MIN = 11;
const PDF_PAGE_MAX = 32;
const CATALOG_PAGE_MIN = 386;
const CATALOG_PAGE_MAX = 407;
const REQUIRED_FIELDS = [
  'source_pdf',
  'pdf_page',
  'catalog_page',
  'series',
  'row_index',
  'tool_no',
  'edp',
  'raw_fields',
  'normalization_status'
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return readJson(filePath);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function normalizedValue(wrapper) {
  if (!wrapper || typeof wrapper !== 'object') return null;
  return wrapper.value ?? null;
}

function valuesEqual(rawValue, normalized) {
  return (rawValue ?? null) === (normalized ?? null);
}

function addFailure(failures, record, code, message) {
  failures.push({
    code,
    message,
    source_pdf: record.source_pdf ?? null,
    pdf_page: record.pdf_page ?? null,
    catalog_page: record.catalog_page ?? null,
    row_index: record.row_index ?? null,
    tool_no: record.tool_no ?? null,
    edp: record.edp ?? null
  });
}

function validateRawPreservation(record, failures) {
  const raw = record.raw_fields || {};
  const checks = [
    ['d1_diameter_inch', raw.d1_diameter_inch, record.diameter?.d1_diameter_inch],
    ['d1_diameter_wire', raw.d1_diameter_wire, record.diameter?.d1_diameter_wire],
    ['d1_diameter_mm', raw.d1_diameter_mm, record.diameter?.d1_diameter_mm],
    ['d1_diameter_decimal', raw.d1_diameter_decimal, record.diameter?.d1_diameter_decimal_inch],
    ['d2_shank_inch', raw.d2_shank_inch, record.shank_diameter?.inch],
    ['d2_shank_mm', raw.d2_shank_mm, record.shank_diameter?.mm],
    ['l1_oal_inch', raw.l1_oal_inch, record.overall_length?.inch],
    ['l1_oal_mm', raw.l1_oal_mm, record.overall_length?.mm],
    ['l2_flute_length_inch', raw.l2_flute_length_inch, record.flute_length?.inch],
    ['l2_flute_length_mm', raw.l2_flute_length_mm, record.flute_length?.mm],
    ['flutes', raw.flutes, record.flutes]
  ];

  for (const [field, rawValue, wrapper] of checks) {
    const normalized = normalizedValue(wrapper);
    if (!valuesEqual(rawValue, normalized)) {
      addFailure(
        failures,
        record,
        'raw_value_not_preserved',
        `${field} raw value ${JSON.stringify(rawValue ?? null)} does not match normalized value ${JSON.stringify(normalized)}`
      );
    }
    if (wrapper && wrapper.conversion_applied !== false) {
      addFailure(
        failures,
        record,
        'unexpected_conversion_applied',
        `${field} must preserve the source value without conversion`
      );
    }
  }
}

function hasMixedUnitRawFields(record) {
  const raw = record.raw_fields || {};
  const hasMetric = hasValue(raw.d1_diameter_mm) || hasValue(raw.d2_shank_mm) || hasValue(raw.l1_oal_mm) || hasValue(raw.l2_flute_length_mm);
  const hasInch = hasValue(raw.d1_diameter_inch) || hasValue(raw.d1_diameter_decimal) || hasValue(raw.d2_shank_inch) || hasValue(raw.l1_oal_inch) || hasValue(raw.l2_flute_length_inch);
  return hasMetric && hasInch;
}

function validateMixedUnits(record, failures) {
  const warnings = record.normalization_warnings || [];
  if (hasMixedUnitRawFields(record)) {
    if (record.unit_system !== 'mixed') {
      addFailure(failures, record, 'mixed_units_not_marked', 'Mixed inch/metric source fields must have unit_system=mixed');
    }
    if (!warnings.includes('mixed_unit_fields_preserved_without_conversion')) {
      addFailure(failures, record, 'mixed_units_warning_missing', 'Mixed inch/metric source fields must retain a mixed-unit warning');
    }
  }
}

function warningCounts(records) {
  const counts = {};
  for (const record of records) {
    for (const warning of record.normalization_warnings || []) {
      counts[warning] = (counts[warning] || 0) + 1;
    }
  }
  return counts;
}

function countFailuresByCode(failures) {
  const counts = {};
  for (const failure of failures) {
    counts[failure.code] = (counts[failure.code] || 0) + 1;
  }
  return counts;
}

function validate(records) {
  const failures = [];
  const seenToolEdp = new Map();

  if (records.length !== EXPECTED_RECORD_COUNT) {
    failures.push({
      code: 'unexpected_record_count',
      message: `Expected ${EXPECTED_RECORD_COUNT} records, found ${records.length}`,
      source_pdf: null,
      pdf_page: null,
      catalog_page: null,
      row_index: null,
      tool_no: null,
      edp: null
    });
  }

  for (const record of records) {
    for (const field of REQUIRED_FIELDS) {
      if (!(field in record) || !hasValue(record[field])) {
        addFailure(failures, record, 'missing_required_field', `Missing required field: ${field}`);
      }
    }

    if (!hasValue(record.tool_no)) addFailure(failures, record, 'missing_tool_no', 'tool_no is required');
    if (!hasValue(record.edp)) addFailure(failures, record, 'missing_edp', 'edp is required');

    if (record.series !== '272') {
      addFailure(failures, record, 'invalid_series', `series must equal 272, found ${record.series}`);
    }
    if (!(record.pdf_page >= PDF_PAGE_MIN && record.pdf_page <= PDF_PAGE_MAX)) {
      addFailure(failures, record, 'pdf_page_out_of_range', `pdf_page must be ${PDF_PAGE_MIN}-${PDF_PAGE_MAX}`);
    }
    if (!(record.catalog_page >= CATALOG_PAGE_MIN && record.catalog_page <= CATALOG_PAGE_MAX)) {
      addFailure(failures, record, 'catalog_page_out_of_range', `catalog_page must be ${CATALOG_PAGE_MIN}-${CATALOG_PAGE_MAX}`);
    }

    if (hasValue(record.tool_no) && hasValue(record.edp)) {
      const key = `${record.tool_no}|${record.edp}`;
      if (seenToolEdp.has(key)) {
        addFailure(failures, record, 'duplicate_tool_no_edp', `Duplicate tool_no + edp combination also found at ${seenToolEdp.get(key)}`);
      } else {
        seenToolEdp.set(key, `pdf_page ${record.pdf_page}, row_index ${record.row_index}`);
      }
    }

    validateRawPreservation(record, failures);
    validateMixedUnits(record, failures);
  }

  return failures;
}

function table(rows, headers) {
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`
  ];
  for (const row of rows) {
    lines.push(`| ${headers.map((header) => row[header] ?? '').join(' | ')} |`);
  }
  return lines.join('\n');
}

function buildSummary(records, failures, reviewedSample) {
  const failedKeys = new Set(
    failures
      .filter((failure) => failure.tool_no || failure.edp || failure.pdf_page || failure.row_index)
      .map((failure) => `${failure.pdf_page}:${failure.row_index}:${failure.tool_no}:${failure.edp}`)
  );
  const duplicateCount = failures.filter((failure) => failure.code === 'duplicate_tool_no_edp').length;
  const missingToolNoCount = records.filter((record) => !hasValue(record.tool_no)).length;
  const missingEdpCount = records.filter((record) => !hasValue(record.edp)).length;
  const pageRangeValid = records.every((record) => record.pdf_page >= PDF_PAGE_MIN && record.pdf_page <= PDF_PAGE_MAX);
  const catalogPageRangeValid = records.every((record) => record.catalog_page >= CATALOG_PAGE_MIN && record.catalog_page <= CATALOG_PAGE_MAX);
  const safeForProductCandidateGeneration = failures.length === 0
    && records.length === EXPECTED_RECORD_COUNT
    && reviewedSample?.review_summary?.safe_for_validation_pass_script === true;

  return {
    input_file: INPUT_JSON,
    reviewed_sample_file: REVIEWED_SAMPLE_JSON,
    generated_at: new Date().toISOString(),
    total_records_checked: records.length,
    passed_records: records.length - failedKeys.size,
    failed_records: failedKeys.size + failures.filter((failure) => failure.code === 'unexpected_record_count').length,
    duplicate_count: duplicateCount,
    missing_tool_no_count: missingToolNoCount,
    missing_edp_count: missingEdpCount,
    page_range_validation: {
      expected_pdf_page_min: PDF_PAGE_MIN,
      expected_pdf_page_max: PDF_PAGE_MAX,
      valid: pageRangeValid
    },
    catalog_page_range_validation: {
      expected_catalog_page_min: CATALOG_PAGE_MIN,
      expected_catalog_page_max: CATALOG_PAGE_MAX,
      valid: catalogPageRangeValid
    },
    warning_counts: warningCounts(records),
    failure_counts: countFailuresByCode(failures),
    manually_reviewed_sample_evidence: reviewedSample ? {
      reviewed_records: reviewedSample.review_summary?.reviewed_records ?? null,
      passed_records: reviewedSample.review_summary?.passed_records ?? null,
      failed_records: reviewedSample.review_summary?.failed_records ?? null,
      uncertain_records: reviewedSample.review_summary?.uncertain_records ?? null,
      pages_reviewed: reviewedSample.review_summary?.pages_reviewed ?? [],
      row_alignment_concerns: reviewedSample.review_summary?.row_alignment_concerns ?? null,
      safe_for_validation_pass_script: reviewedSample.review_summary?.safe_for_validation_pass_script === true
    } : null,
    safe_for_product_candidate_generation: safeForProductCandidateGeneration,
    safe_for_PRODUCT_DB_merge: false
  };
}

function writeReport(summary) {
  const warningRows = Object.entries(summary.warning_counts).map(([warning, count]) => ({ Warning: warning, Count: count }));
  const failureRows = Object.entries(summary.failure_counts).map(([failure, count]) => ({ Failure: failure, Count: count }));
  const lines = [
    '# M.A. Ford Series 272 Validation Pass',
    '',
    `- Input file: ${summary.input_file}`,
    `- Reviewed sample evidence file: ${summary.reviewed_sample_file}`,
    `- Total records checked: ${summary.total_records_checked}`,
    `- Passed records: ${summary.passed_records}`,
    `- Failed records: ${summary.failed_records}`,
    `- Duplicate count: ${summary.duplicate_count}`,
    `- Missing tool_no count: ${summary.missing_tool_no_count}`,
    `- Missing edp count: ${summary.missing_edp_count}`,
    `- Page range validation result: ${summary.page_range_validation.valid}`,
    `- Catalog page range validation result: ${summary.catalog_page_range_validation.valid}`,
    `- Safe for product candidate generation: ${summary.safe_for_product_candidate_generation}`,
    `- Safe for PRODUCT_DB merge: ${summary.safe_for_PRODUCT_DB_merge}`,
    '',
    'This validation pass does not create PRODUCT_DB entries. It checks whether the 924 normalized review records are structurally safe for the next outside-PRODUCT_DB candidate-generation step.',
    '',
    '## Manual Sample Evidence',
    '',
    summary.manually_reviewed_sample_evidence
      ? [
          `- Reviewed records: ${summary.manually_reviewed_sample_evidence.reviewed_records}`,
          `- Passed records: ${summary.manually_reviewed_sample_evidence.passed_records}`,
          `- Failed records: ${summary.manually_reviewed_sample_evidence.failed_records}`,
          `- Uncertain records: ${summary.manually_reviewed_sample_evidence.uncertain_records}`,
          `- Pages reviewed: ${summary.manually_reviewed_sample_evidence.pages_reviewed.join(', ')}`,
          `- Row alignment concerns: ${summary.manually_reviewed_sample_evidence.row_alignment_concerns}`
        ].join('\n')
      : 'Reviewed sample evidence file was not found.',
    '',
    '## Warning Counts',
    '',
    warningRows.length ? table(warningRows, ['Warning', 'Count']) : 'No warnings found.',
    '',
    '## Failure Counts',
    '',
    failureRows.length ? table(failureRows, ['Failure', 'Count']) : 'No validation failures found.',
    '',
    '## Notes',
    '',
    '- `coating_or_surface` and `material_grade_if_present` are intentionally not required because they are not present in the source rows.',
    '- Mixed unit rows must remain flagged and must preserve raw source values without silent conversion.',
    '- PRODUCT_DB merge remains blocked even when validation passes.',
    '- Next safe step: generate product candidate review records outside PRODUCT_DB.'
  ];

  fs.writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`);
}

function main() {
  const input = readJson(INPUT_JSON);
  const reviewedSample = readJsonIfExists(REVIEWED_SAMPLE_JSON);
  const records = (input.records || []).filter((record) => record.series === '272');
  const failures = validate(records);
  const summary = buildSummary(records, failures, reviewedSample);

  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(FAILURES_PATH, `${JSON.stringify({
    input_file: INPUT_JSON,
    generated_at: summary.generated_at,
    failure_count: failures.length,
    failures
  }, null, 2)}\n`);
  fs.writeFileSync(SUMMARY_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  writeReport(summary);

  console.log(`Report: ${REPORT_PATH}`);
  console.log(`Summary: ${SUMMARY_PATH}`);
  console.log(`Failures: ${FAILURES_PATH}`);
  console.log(`Total records checked: ${summary.total_records_checked}`);
  console.log(`Passed records: ${summary.passed_records}`);
  console.log(`Failed records: ${summary.failed_records}`);
  console.log(`Duplicate count: ${summary.duplicate_count}`);
  console.log(`Missing tool_no count: ${summary.missing_tool_no_count}`);
  console.log(`Missing edp count: ${summary.missing_edp_count}`);
  console.log(`Safe for product candidate generation: ${summary.safe_for_product_candidate_generation}`);
  console.log(`Safe for PRODUCT_DB merge: ${summary.safe_for_PRODUCT_DB_merge}`);
}

main();
