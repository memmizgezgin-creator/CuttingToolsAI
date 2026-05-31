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
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'research', 'ingestion');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'maford-series-272-manual-validation-sample.json');
const OUTPUT_CHECKLIST = path.join(OUTPUT_DIR, 'maford-series-272-manual-validation-checklist.md');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sampleKey(record) {
  return `${record.pdf_page}:${record.row_index}:${record.tool_no}:${record.edp}`;
}

function byRowIndex(a, b) {
  return a.row_index - b.row_index;
}

function addUnique(target, seen, records) {
  for (const record of records) {
    const key = sampleKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(record);
  }
}

function middleThree(records) {
  const sorted = [...records].sort((a, b) => a.pdf_page - b.pdf_page || a.row_index - b.row_index);
  if (sorted.length <= 3) return sorted;
  const start = Math.max(0, Math.floor(sorted.length / 2) - 1);
  return sorted.slice(start, start + 3);
}

function normalizedDraftFields(record) {
  return {
    brand: record.brand,
    product_family: record.product_family,
    series: record.series,
    product_type: record.product_type,
    tool_no: record.tool_no,
    edp: record.edp,
    diameter: record.diameter,
    flute_length: record.flute_length,
    overall_length: record.overall_length,
    shank_diameter: record.shank_diameter,
    flutes: record.flutes,
    lead_angle: record.lead_angle,
    cutting_direction: record.cutting_direction,
    coating_or_surface: record.coating_or_surface,
    material_grade_if_present: record.material_grade_if_present,
    unit_system: record.unit_system,
    normalization_status: record.normalization_status
  };
}

function toSampleRecord(record, index) {
  return {
    sample_id: `maford-272-sample-${String(index + 1).padStart(3, '0')}`,
    source_pdf: record.source_pdf,
    pdf_page: record.pdf_page,
    catalog_page: record.catalog_page,
    row_index: record.row_index,
    tool_no: record.tool_no,
    edp: record.edp,
    raw_fields: record.raw_fields,
    normalized_draft_fields: normalizedDraftFields(record),
    normalization_warnings: record.normalization_warnings,
    validation_status: 'pending_manual_review',
    reviewer_notes: ''
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

function writeChecklist(samples) {
  const tableRows = samples.map((sample) => ({
    sample_id: sample.sample_id,
    pdf_page: sample.pdf_page,
    catalog_page: sample.catalog_page,
    row_index: sample.row_index,
    tool_no: sample.tool_no,
    edp: sample.edp,
    warning_types: sample.normalization_warnings.join(', ')
  }));

  const lines = [
    '# M.A. Ford Series 272 Manual Validation Checklist',
    '',
    `- Sample file: ${OUTPUT_JSON}`,
    `- Source normalization review: ${INPUT_JSON}`,
    '- Validation status for every sample: pending_manual_review',
    '- PRODUCT_DB merge: forbidden',
    '',
    '## Fields To Check Against The PDF',
    '',
    '- `tool_no` and `edp` match the printed row.',
    '- `d1_diameter_inch`, `d1_diameter_wire`, `d1_diameter_mm`, and `d1_diameter_decimal` are assigned to the correct diameter columns.',
    '- `d2_shank_inch` and `d2_shank_mm` are assigned to the correct shank columns.',
    '- `l1_oal_inch`, `l1_oal_mm`, `l2_flute_length_inch`, and `l2_flute_length_mm` are assigned to the correct length columns.',
    '- `flutes`, `lead_angle`, and `cutting_direction` match the table/page context.',
    '- `raw_fields.raw_row` preserves the source row values used for the draft.',
    '- `coating_or_surface` and `material_grade_if_present` remain null unless a source-backed field is added later.',
    '',
    '## Manual Review Status Rules',
    '',
    '- `valid`: source row and normalized draft fields match the PDF with no correction needed.',
    '- `invalid`: row is not a Series 272 product row, traceability is wrong, or required identity fields do not match the PDF.',
    '- `needs_correction`: row is traceable and likely valid, but one or more normalized fields need correction before candidate generation.',
    '',
    'Do not mark any record as approved for PRODUCT_DB from this checklist. This checklist only supports manual validation of the review-stage draft.',
    '',
    '## Errors That Block Normalization',
    '',
    '- Missing or incorrect `source_pdf`, `pdf_page`, `catalog_page`, or `row_index`.',
    '- Missing or incorrect `tool_no` or `edp`.',
    '- Column shift that maps diameter, shank, OAL, flute length, or flute count into the wrong field.',
    '- Raw row does not contain enough source evidence for the normalized draft.',
    '- Mixed units are converted or merged without an explicit reviewed conversion rule.',
    '',
    '## Errors That Block PRODUCT_DB Merge',
    '',
    '- Any record still marked `pending_manual_review`, `invalid`, or `needs_correction`.',
    '- Any unreviewed warning that affects identity, dimensions, or traceability.',
    '- Missing source-backed traceability to the PDF and raw row.',
    '- Missing explicit human approval for merge.',
    '- Any inferred coating, material grade, or technical value without source evidence.',
    '',
    '## Sample Records',
    '',
    markdownTable(tableRows, ['sample_id', 'pdf_page', 'catalog_page', 'row_index', 'tool_no', 'edp', 'warning_types']),
    ''
  ];

  fs.writeFileSync(OUTPUT_CHECKLIST, lines.join('\n'));
}

function main() {
  const input = readJson(INPUT_JSON);
  const records = input.records.filter((record) => record.series === '272');
  const sampleSource = [];
  const seen = new Set();

  addUnique(
    sampleSource,
    seen,
    records.filter((record) => record.pdf_page === 11).sort(byRowIndex).slice(0, 3)
  );

  addUnique(
    sampleSource,
    seen,
    middleThree(records.filter((record) => record.pdf_page === 20 || record.pdf_page === 21))
  );

  addUnique(
    sampleSource,
    seen,
    records.filter((record) => record.pdf_page === 32).sort(byRowIndex).slice(-3)
  );

  addUnique(
    sampleSource,
    seen,
    records
      .filter((record) => record.normalization_warnings.includes('mixed_unit_fields_preserved_without_conversion'))
      .sort((a, b) => a.pdf_page - b.pdf_page || a.row_index - b.row_index)
      .slice(0, 5)
  );

  const samples = sampleSource.map(toSampleRecord);
  const warningTypes = [...new Set(samples.flatMap((sample) => sample.normalization_warnings))].sort();
  const pages = [...new Set(samples.map((sample) => sample.pdf_page))].sort((a, b) => a - b);

  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify({
    source_input: INPUT_JSON,
    generated_at: new Date().toISOString(),
    sample_strategy: [
      'first_3_records_from_pdf_page_11',
      'middle_3_records_from_pdf_pages_20_21',
      'last_3_records_from_pdf_page_32',
      'up_to_5_mixed_unit_warning_examples_without_duplicates'
    ],
    restrictions: {
      product_db_merge: false,
      ai_used: false,
      automatic_validation: false,
      unit_conversion: false
    },
    sample_count: samples.length,
    pages_represented: pages,
    warning_types_represented: warningTypes,
    samples
  }, null, 2)}\n`);
  writeChecklist(samples);

  console.log(`Output JSON: ${OUTPUT_JSON}`);
  console.log(`Checklist: ${OUTPUT_CHECKLIST}`);
  console.log(`Sampled records: ${samples.length}`);
  console.log(`Pages represented: ${pages.join(', ')}`);
  console.log(`Warning types represented: ${warningTypes.join(', ')}`);
}

main();
