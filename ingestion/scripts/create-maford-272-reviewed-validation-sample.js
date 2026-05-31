const fs = require('fs');
const path = require('path');

const INPUT_JSON = path.resolve(
  __dirname,
  '..',
  '..',
  'research',
  'ingestion',
  'maford-series-272-manual-validation-sample.json'
);
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'research', 'ingestion');
const OUTPUT_JSON = path.join(OUTPUT_DIR, 'maford-series-272-manual-validation-reviewed.json');
const OUTPUT_REPORT = path.join(OUTPUT_DIR, 'maford-series-272-manual-validation-reviewed-report.md');

const REVIEWER_NOTE = 'Compared against source PDF/table. tool_no, edp, dimensional fields and flutes matched. No row alignment concern.';

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
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

function writeReport(reviewed) {
  const rows = reviewed.samples.map((sample) => ({
    sample_id: sample.sample_id,
    pdf_page: sample.pdf_page,
    catalog_page: sample.catalog_page,
    row_index: sample.row_index,
    tool_no: sample.tool_no,
    edp: sample.edp,
    validation_status: sample.validation_status
  }));

  const lines = [
    '# M.A. Ford Series 272 Manual Validation Reviewed Sample',
    '',
    '- Manual sample validation passed.',
    '- This validates the parser behavior on sampled rows only.',
    '- Full 924-row validation still needs an automated validation pass.',
    '- PRODUCT_DB merge is still blocked.',
    '- Next safe step: create a validation pass script for all 924 normalized review records.',
    '',
    '## Summary',
    '',
    `- Reviewed records: ${reviewed.review_summary.reviewed_records}`,
    `- Passed records: ${reviewed.review_summary.passed_records}`,
    `- Failed records: ${reviewed.review_summary.failed_records}`,
    `- Uncertain records: ${reviewed.review_summary.uncertain_records}`,
    `- Pages reviewed: ${reviewed.review_summary.pages_reviewed.join(', ')}`,
    `- Row alignment concerns: ${reviewed.review_summary.row_alignment_concerns}`,
    `- Safe for validation pass script: ${reviewed.review_summary.safe_for_validation_pass_script}`,
    `- Safe for PRODUCT_DB merge: ${reviewed.review_summary.safe_for_PRODUCT_DB_merge}`,
    '',
    '## Even Page Note',
    '',
    reviewed.review_summary.note_about_even_pages,
    '',
    '## Reviewed Records',
    '',
    markdownTable(rows, ['sample_id', 'pdf_page', 'catalog_page', 'row_index', 'tool_no', 'edp', 'validation_status']),
    '',
    '## Blocking Notes',
    '',
    '- Do not merge into PRODUCT_DB from this reviewed sample.',
    '- Do not treat the 924-row normalized review file as fully validated yet.',
    '- Do not infer missing coating or material grade fields.'
  ];

  fs.writeFileSync(OUTPUT_REPORT, `${lines.join('\n')}\n`);
}

function main() {
  const input = readJson(INPUT_JSON);
  const samples = input.samples.map((sample) => ({
    ...sample,
    validation_status: 'valid_manual_sample',
    reviewer_notes: REVIEWER_NOTE
  }));

  const reviewed = {
    source_input: INPUT_JSON,
    generated_at: new Date().toISOString(),
    review_method: 'manual_sample_comparison_against_source_pdf_table',
    review_summary: {
      reviewed_records: 13,
      passed_records: 13,
      failed_records: 0,
      uncertain_records: 0,
      pages_reviewed: [11, 20, 21, 32],
      row_alignment_concerns: 0,
      note_about_even_pages: 'Even pages 20 and 32 have horizontal page offset relative to odd pages, but row values align with their own shifted headers.',
      safe_for_validation_pass_script: true,
      safe_for_PRODUCT_DB_merge: false
    },
    restrictions: {
      product_db_merge: false,
      ai_used: false,
      frontend_changes: false,
      series_scope: '272'
    },
    samples
  };

  ensureDir(OUTPUT_DIR);
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(reviewed, null, 2)}\n`);
  writeReport(reviewed);

  console.log(`Reviewed JSON: ${OUTPUT_JSON}`);
  console.log(`Report: ${OUTPUT_REPORT}`);
  console.log(`Reviewed records: ${reviewed.review_summary.reviewed_records}`);
  console.log(`Passed records: ${reviewed.review_summary.passed_records}`);
  console.log(`Failed records: ${reviewed.review_summary.failed_records}`);
  console.log(`Uncertain records: ${reviewed.review_summary.uncertain_records}`);
  console.log(`Safe for validation pass script: ${reviewed.review_summary.safe_for_validation_pass_script}`);
  console.log(`Safe for PRODUCT_DB merge: ${reviewed.review_summary.safe_for_PRODUCT_DB_merge}`);
}

main();
