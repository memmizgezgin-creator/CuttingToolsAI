#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_PDF_PATH = '/Users/muratonder/Desktop/MAFord_2018_Master_Catalog_Reamers.pdf';
const SOURCE_PAGE = 9;
const CATALOG_PAGE = 384;
const PARSER_NAME = 'maford-reamer-270p-v1';
const OUT_DIR = path.resolve(__dirname, '..', 'output', 'pilots', PARSER_NAME);
const OUT_JSON = path.join(OUT_DIR, 'rows.json');
const OUT_REPORT = path.join(OUT_DIR, 'report.md');

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function groupItemsIntoRows(items) {
  const rows = [];
  const sorted = items
    .map((item) => ({
      text: normalizeText(item.str),
      x: item.transform[4],
      y: item.transform[5],
    }))
    .filter((item) => item.text)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  for (const item of sorted) {
    let row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2);
    if (!row) {
      row = { y: item.y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
    row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
  }

  return rows
    .map((row) => ({
      y: row.y,
      cells: row.items
        .filter((item) => item.x < 360)
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text),
    }))
    .filter((row) => row.cells.length)
    .sort((a, b) => b.y - a.y);
}

async function extractPageRows(pdfPath) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const buffer = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    standardFontDataUrl: path.join(pdfjsRoot, 'standard_fonts') + path.sep,
  }).promise;
  const page = await doc.getPage(SOURCE_PAGE);
  const textContent = await page.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });
  const rows = groupItemsIntoRows(textContent.items);
  await doc.destroy();
  return rows;
}

function isDataRow(cells) {
  return /^\.\d{4}-\.\d{4}$/.test(cells[0] || '');
}

function confidenceFor(row) {
  const required = [
    row.d1_diameter_inch_range,
    row.d1_diameter_mm_range,
    row.d2_shank_inch,
    row.d2_shank_mm,
    row.l1_oal_inch,
    row.l1_oal_mm,
    row.l2_flute_length_inch,
    row.l2_flute_length_mm,
    row.flutes,
  ];
  const present = required.filter(Boolean).length;
  return Math.round((present / required.length) * 100);
}

function parseDataRow(cells) {
  const normalized = cells.slice(0, 9);
  const warnings = [];
  if (normalized.length !== 9) warnings.push(`expected_9_columns_found_${normalized.length}`);

  const row = {
    source_file: path.basename(DEFAULT_PDF_PATH),
    source_page: SOURCE_PAGE,
    catalog_page: CATALOG_PAGE,
    parser_name: PARSER_NAME,
    brand: 'M.A. Ford',
    product_family: 'reamer',
    series: '270P',
    product_type: 'TrueSize XP Xtreme Precision Straight Flute Reamer',
    d1_diameter_inch_range: normalized[0] || null,
    d1_diameter_mm_range: normalized[1] || null,
    d2_shank_inch: normalized[2] || null,
    d2_shank_mm: normalized[3] || null,
    l1_oal_inch: normalized[4] || null,
    l1_oal_mm: normalized[5] || null,
    l2_flute_length_inch: normalized[6] || null,
    l2_flute_length_mm: normalized[7] || null,
    flutes: normalized[8] || null,
    lead_angle: 45,
    cutting_direction: 'RHC',
    raw_row: cells,
    confidence_score: 0,
    warnings,
  };
  row.confidence_score = confidenceFor(row);
  return row;
}

function fieldCompleteness(rows) {
  const fields = [
    'd1_diameter_inch_range',
    'd1_diameter_mm_range',
    'd2_shank_inch',
    'd2_shank_mm',
    'l1_oal_inch',
    'l1_oal_mm',
    'l2_flute_length_inch',
    'l2_flute_length_mm',
    'flutes',
  ];

  return fields.map((field) => ({
    field,
    present: rows.filter((row) => row[field]).length,
    total: rows.length,
  }));
}

function reportFor(payload) {
  const completenessRows = fieldCompleteness(payload.rows).map((item) => (
    `| ${item.field} | ${item.present}/${item.total} |`
  ));
  const examples = payload.rows.slice(0, 10).map((row) => (
    `| ${row.d1_diameter_inch_range} | ${row.d1_diameter_mm_range} | ${row.d2_shank_inch} | ${row.d2_shank_mm} | ${row.l1_oal_inch} | ${row.l1_oal_mm} | ${row.l2_flute_length_inch} | ${row.l2_flute_length_mm} | ${row.flutes} |`
  ));
  const rejectedRows = payload.rejected_rows.slice(0, 15).map((row) => (
    `| ${row.y.toFixed(1)} | ${row.cells.join(' / ').replace(/\|/g, '/')} | ${row.reason} |`
  ));

  return [
    '# M.A. Ford Reamer 270P Parser v1',
    '',
    `- Source file: ${payload.source_file}`,
    `- PDF page processed: ${SOURCE_PAGE}`,
    `- Catalog page: ${CATALOG_PAGE}`,
    `- Rows extracted: ${payload.rows.length}`,
    `- Rows rejected: ${payload.rejected_rows.length}`,
    `- Output JSON: ${OUT_JSON}`,
    '',
    '## Field Completeness',
    '',
    '| Field | Present |',
    '|---|---:|',
    ...completenessRows,
    '',
    '## 10 Example Rows',
    '',
    '| D1 inch | D1 mm | D2 inch | D2 mm | L1 inch | L1 mm | L2 inch | L2 mm | Flutes |',
    '|---|---|---|---|---|---|---|---|---:|',
    ...examples,
    '',
    '## Rejected Rows',
    '',
    '| Y | Raw row | Reason |',
    '|---:|---|---|',
    ...rejectedRows,
    '',
    '## Limitations',
    '',
    '- This parser only reads uploaded PDF page 9 / catalog page 384.',
    '- It uses page-specific x-position filtering and row patterns, not a general M.A. Ford parser.',
    '- It preserves inch fractions as strings and does not normalize numeric units.',
    '- It does not create final ToolAdvisor candidates and does not touch PRODUCT_DB.',
    '',
    '## Scaling Assessment',
    '',
    'This parser is likely scalable to Series 270 / 270L / 272 if those pages preserve the same nine-column geometry. The next step should test one page from each series and parameterize the series/product metadata.',
    '',
  ].join('\n');
}

async function main() {
  const pdfPath = path.resolve(process.argv[2] || DEFAULT_PDF_PATH);
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }

  const pageRows = await extractPageRows(pdfPath);
  const rows = [];
  const rejectedRows = [];

  for (const row of pageRows) {
    if (isDataRow(row.cells)) {
      rows.push(parseDataRow(row.cells));
    } else if (row.y < 610 && row.y > 40) {
      rejectedRows.push({
        y: row.y,
        cells: row.cells,
        reason: 'not_270p_data_row',
      });
    }
  }

  const payload = {
    source_file: path.basename(pdfPath),
    source_pdf: pdfPath,
    source_page: SOURCE_PAGE,
    catalog_page: CATALOG_PAGE,
    parser_name: PARSER_NAME,
    extracted_at: new Date().toISOString(),
    rows,
    rejected_rows: rejectedRows,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(OUT_REPORT, reportFor(payload), 'utf8');

  console.log(`PDF page processed: ${SOURCE_PAGE}`);
  console.log(`Catalog page: ${CATALOG_PAGE}`);
  console.log(`Rows extracted: ${rows.length}`);
  console.log(`Rows rejected: ${rejectedRows.length}`);
  console.log(`Output JSON: ${OUT_JSON}`);
  console.log(`Report: ${OUT_REPORT}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
