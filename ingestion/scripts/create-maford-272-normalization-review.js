const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.resolve(
  __dirname,
  '..',
  'output',
  'pilots',
  'maford-reamer-272-full-range-v1',
  'rows.json'
);
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'research', 'ingestion');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'maford-series-272-normalization-review.json');
const OUTPUT_REPORT = path.join(OUTPUT_DIR, 'maford-series-272-normalization-review-report.md');

const NORMALIZER_NAME = 'maford-series-272-normalization-review';
const NORMALIZER_VERSION = path.basename(__filename);

const RAW_FIELD_KEYS = [
  'd1_diameter_inch',
  'd1_diameter_wire',
  'd1_diameter_mm',
  'd1_diameter_decimal',
  'd2_shank_inch',
  'd2_shank_mm',
  'l1_oal_inch',
  'l1_oal_mm',
  'l2_flute_length_inch',
  'l2_flute_length_mm',
  'flutes',
  'lead_angle',
  'cutting_direction',
  'raw_row',
  'raw_y',
  'warnings'
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function rawFields(row) {
  return Object.fromEntries(RAW_FIELD_KEYS.map((key) => [key, row[key] ?? null]));
}

function directValue(raw, unit, sourceField) {
  if (!hasValue(raw)) return null;
  return {
    value: raw,
    unit,
    source_field: sourceField,
    conversion_applied: false
  };
}

function normalizeDiameter(row) {
  return {
    d1_diameter_inch: directValue(row.d1_diameter_inch, 'inch', 'd1_diameter_inch'),
    d1_diameter_wire: directValue(row.d1_diameter_wire, 'wire_size', 'd1_diameter_wire'),
    d1_diameter_mm: directValue(row.d1_diameter_mm, 'mm', 'd1_diameter_mm'),
    d1_diameter_decimal_inch: directValue(row.d1_diameter_decimal, 'inch_decimal', 'd1_diameter_decimal')
  };
}

function normalizeLength(row, inchField, mmField) {
  return {
    inch: directValue(row[inchField], 'inch', inchField),
    mm: directValue(row[mmField], 'mm', mmField)
  };
}

function normalizeShank(row) {
  return {
    inch: directValue(row.d2_shank_inch, 'inch', 'd2_shank_inch'),
    mm: directValue(row.d2_shank_mm, 'mm', 'd2_shank_mm')
  };
}

function inferUnitSystem(row, warnings) {
  const hasMetric = hasValue(row.d1_diameter_mm) || hasValue(row.d2_shank_mm) || hasValue(row.l1_oal_mm) || hasValue(row.l2_flute_length_mm);
  const hasInch = hasValue(row.d1_diameter_inch) || hasValue(row.d1_diameter_decimal) || hasValue(row.d2_shank_inch) || hasValue(row.l1_oal_inch) || hasValue(row.l2_flute_length_inch);

  if (hasMetric && hasInch) {
    warnings.push('mixed_unit_fields_preserved_without_conversion');
    return 'mixed';
  }
  if (hasMetric) return 'metric';
  if (hasInch) return 'inch';

  warnings.push('no_unit_bearing_dimension_fields');
  return null;
}

function rowWarnings(row) {
  const warnings = [...(row.warnings || [])];

  if (!hasValue(row.tool_no)) warnings.push('missing_tool_no');
  if (!hasValue(row.edp)) warnings.push('missing_edp');
  if (!hasValue(row.d1_diameter_decimal) && !hasValue(row.d1_diameter_mm) && !hasValue(row.d1_diameter_inch)) {
    warnings.push('missing_diameter_value');
  }
  if (!hasValue(row.d2_shank_inch) && !hasValue(row.d2_shank_mm)) warnings.push('missing_shank_diameter');
  if (!hasValue(row.l1_oal_inch) && !hasValue(row.l1_oal_mm)) warnings.push('missing_overall_length');
  if (!hasValue(row.l2_flute_length_inch) && !hasValue(row.l2_flute_length_mm)) warnings.push('missing_flute_length');
  if (!hasValue(row.flutes)) warnings.push('missing_flutes');

  warnings.push('coating_or_surface_not_present_in_source_row');
  warnings.push('material_grade_not_present_in_source_row');

  return warnings;
}

function statusFor(warnings) {
  const blocking = new Set([
    'missing_tool_no',
    'missing_edp',
    'missing_diameter_value',
    'missing_shank_diameter',
    'missing_overall_length',
    'missing_flute_length',
    'missing_flutes',
    'no_unit_bearing_dimension_fields'
  ]);

  return warnings.some((warning) => blocking.has(warning)) ? 'needs_review' : 'normalized_cleanly';
}

function normalizeRow(row) {
  const warnings = rowWarnings(row);
  const unitSystem = inferUnitSystem(row, warnings);

  return {
    source_pdf: row.source_pdf,
    source_file: row.source_file,
    pdf_page: row.pdf_page,
    source_page: row.source_page,
    catalog_page: row.catalog_page,
    series: '272',
    row_index: row.row_index,
    parser_name: row.parser_name,
    parser_version: row.parser_version,
    extraction_status: row.extraction_status,
    normalizer_name: NORMALIZER_NAME,
    normalizer_version: NORMALIZER_VERSION,

    brand: 'M.A. Ford',
    product_family: 'Reamer',
    product_type: row.product_type || 'TrueSize Carbide Reamer Straight Flute',
    tool_no: row.tool_no,
    edp: row.edp,
    diameter: normalizeDiameter(row),
    flute_length: normalizeLength(row, 'l2_flute_length_inch', 'l2_flute_length_mm'),
    overall_length: normalizeLength(row, 'l1_oal_inch', 'l1_oal_mm'),
    shank_diameter: normalizeShank(row),
    flutes: hasValue(row.flutes) ? {
      value: row.flutes,
      source_field: 'flutes',
      conversion_applied: false
    } : null,
    lead_angle: hasValue(row.lead_angle) ? {
      value: row.lead_angle,
      unit: 'degree',
      source_field: 'lead_angle',
      conversion_applied: false
    } : null,
    cutting_direction: row.cutting_direction ?? null,
    coating_or_surface: null,
    material_grade_if_present: null,
    unit_system: unitSystem,
    raw_fields: rawFields(row),
    normalization_status: statusFor(warnings),
    normalization_warnings: warnings
  };
}

function countBy(records, keyFn) {
  return records.reduce((counts, record) => {
    const key = keyFn(record);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function fieldCounts(records) {
  const fields = {
    tool_no: (record) => hasValue(record.tool_no),
    edp: (record) => hasValue(record.edp),
    diameter_decimal_inch: (record) => Boolean(record.diameter.d1_diameter_decimal_inch),
    diameter_mm: (record) => Boolean(record.diameter.d1_diameter_mm),
    diameter_wire: (record) => Boolean(record.diameter.d1_diameter_wire),
    shank_diameter_inch: (record) => Boolean(record.shank_diameter.inch),
    shank_diameter_mm: (record) => Boolean(record.shank_diameter.mm),
    overall_length_inch: (record) => Boolean(record.overall_length.inch),
    overall_length_mm: (record) => Boolean(record.overall_length.mm),
    flute_length_inch: (record) => Boolean(record.flute_length.inch),
    flute_length_mm: (record) => Boolean(record.flute_length.mm),
    flutes: (record) => Boolean(record.flutes),
    coating_or_surface: (record) => hasValue(record.coating_or_surface),
    material_grade_if_present: (record) => hasValue(record.material_grade_if_present)
  };

  return Object.fromEntries(
    Object.entries(fields).map(([field, predicate]) => [
      field,
      records.filter(predicate).length
    ])
  );
}

function formatWarningCounts(records) {
  const counts = {};
  for (const record of records) {
    for (const warning of record.normalization_warnings) {
      counts[warning] = (counts[warning] || 0) + 1;
    }
  }
  return counts;
}

function exampleSummary(record) {
  return {
    pdf_page: record.pdf_page,
    catalog_page: record.catalog_page,
    row_index: record.row_index,
    tool_no: record.tool_no,
    edp: record.edp,
    diameter: record.diameter,
    shank_diameter: record.shank_diameter,
    overall_length: record.overall_length,
    flute_length: record.flute_length,
    flutes: record.flutes,
    unit_system: record.unit_system,
    normalization_status: record.normalization_status,
    normalization_warnings: record.normalization_warnings
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

function writeReport(input, records) {
  const clean = records.filter((record) => record.normalization_status === 'normalized_cleanly');
  const warningRecords = records.filter((record) => record.normalization_warnings.length > 0);
  const warnings = formatWarningCounts(records);
  const fields = fieldCounts(records);
  const fieldRows = Object.entries(fields).map(([field, count]) => ({
    Field: field,
    Present: `${count}/${records.length}`
  }));
  const warningRows = Object.entries(warnings)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([warning, count]) => ({ Warning: warning, Count: count }));

  const cleanExamples = clean.slice(0, 5).map(exampleSummary);
  const warningExamples = warningRecords.slice(0, 5).map(exampleSummary);

  const lines = [
    '# M.A. Ford Series 272 Normalization Review',
    '',
    `- Input file path: ${INPUT_PATH}`,
    `- Output file path: ${OUTPUT_JSON}`,
    `- Source PDF: ${input.source_pdf}`,
    `- Series: 272`,
    `- Total records reviewed: ${records.length}`,
    `- Records normalized cleanly: ${clean.length}`,
    `- Records with warnings: ${warningRecords.length}`,
    `- Safe for manual review: ${records.length > 0 && records.every((record) => record.tool_no && record.edp)}`,
    '- Safe for PRODUCT_DB merge: false',
    '',
    'This file is a review-stage normalization draft only. It is outside PRODUCT_DB and must not be treated as approved production data.',
    '',
    '`normalized_cleanly` means the core source fields were mapped without blocking normalization warnings. Non-blocking warnings are still retained for missing source fields and preserved mixed units.',
    '',
    '## Fields Successfully Normalized',
    '',
    markdownTable(fieldRows.filter((row) => !['coating_or_surface', 'material_grade_if_present'].includes(row.Field)), ['Field', 'Present']),
    '',
    '## Fields Not Normalized',
    '',
    markdownTable(fieldRows.filter((row) => ['coating_or_surface', 'material_grade_if_present'].includes(row.Field)), ['Field', 'Present']),
    '',
    'These fields are left null because they are not present in the extracted Series 272 table rows.',
    '',
    '## Warning Types',
    '',
    warningRows.length ? markdownTable(warningRows, ['Warning', 'Count']) : 'No warning types found.',
    '',
    '## Clean Record Examples',
    '',
    '```json',
    JSON.stringify(cleanExamples, null, 2),
    '```',
    '',
    '## Warning Record Examples',
    '',
    warningExamples.length ? '```json' : 'No warning records beyond expected missing coating/material-grade source fields.',
    warningExamples.length ? JSON.stringify(warningExamples, null, 2) : '',
    warningExamples.length ? '```' : '',
    '',
    '## Review Decision',
    '',
    '- Safe for manual review: true',
    '- Not safe for PRODUCT_DB merge: true',
    '- Reason: records are traceable and structurally normalized, but coating/material-grade fields are unavailable from this source row set and no human approval has occurred.'
  ];

  fs.writeFileSync(OUTPUT_REPORT, `${lines.join('\n')}\n`);
}

function main() {
  const input = readJson(INPUT_PATH);
  const sourceRows = input.rows.filter((row) => row.series === '272');
  const records = sourceRows.map(normalizeRow);

  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify({
    source_input: INPUT_PATH,
    generated_at: new Date().toISOString(),
    normalizer_name: NORMALIZER_NAME,
    normalizer_version: NORMALIZER_VERSION,
    restrictions: {
      product_db_merge: false,
      ai_used: false,
      production_candidate: false
    },
    record_count: records.length,
    records
  }, null, 2)}\n`);
  writeReport(input, records);

  const warningCounts = formatWarningCounts(records);
  console.log(`Input: ${INPUT_PATH}`);
  console.log(`Output JSON: ${OUTPUT_JSON}`);
  console.log(`Report: ${OUTPUT_REPORT}`);
  console.log(`Records reviewed: ${records.length}`);
  console.log(`Records normalized cleanly: ${records.filter((record) => record.normalization_status === 'normalized_cleanly').length}`);
  console.log(`Records with warnings: ${records.filter((record) => record.normalization_warnings.length > 0).length}`);
  console.log(`Warning types: ${Object.keys(warningCounts).join(', ') || 'none'}`);
}

main();
