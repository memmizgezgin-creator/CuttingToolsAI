#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_PDF_PATH = '/Users/muratonder/Desktop/MAFord_2018_Master_Catalog_Reamers.pdf';
const SOURCE_PAGE = 11;
const CATALOG_PAGE = 386;
const PARSER_NAME = 'maford-reamer-272-v1';
const OUT_DIR = path.resolve(__dirname, '..', 'output', 'pilots', PARSER_NAME);
const OUT_JSON = path.join(OUT_DIR, 'rows.json');
const OUT_REPORT = path.join(OUT_DIR, 'report.md');

const COLUMNS = [
  ['tool_no', 49],
  ['edp', 91],
  ['d1_diameter_inch', 128],
  ['d1_diameter_wire', 164],
  ['d1_diameter_mm', 189],
  ['d1_diameter_decimal', 220],
  ['d2_shank_inch', 255],
  ['d2_shank_mm', 290],
  ['l1_oal_inch', 317],
  ['l1_oal_mm', 346],
  ['l2_flute_length_inch', 370],
  ['l2_flute_length_mm', 399],
  ['flutes', 432],
];

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function nearestColumn(x) {
  let best = COLUMNS[0];
  let bestDistance = Math.abs(x - best[1]);
  for (const column of COLUMNS.slice(1)) {
    const distance = Math.abs(x - column[1]);
    if (distance < bestDistance) {
      best = column;
      bestDistance = distance;
    }
  }
  return bestDistance <= 16 ? best[0] : null;
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
      items: row.items
        .filter((item) => item.x < 455)
        .sort((a, b) => a.x - b.x),
    }))
    .filter((row) => row.items.length)
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

function isDataRow(itemsByColumn) {
  return /^272\d{5}$/.test(itemsByColumn.tool_no || '') && /^\d{5}$/.test(itemsByColumn.edp || '');
}

function parseRow(row, sourceFile) {
  const itemsByColumn = {};
  const rawRow = [];
  const warnings = [];

  for (const item of row.items) {
    const column = nearestColumn(item.x);
    if (!column) continue;
    rawRow.push(item.text);
    itemsByColumn[column] = itemsByColumn[column] ? `${itemsByColumn[column]} ${item.text}` : item.text;
  }

  if (!isDataRow(itemsByColumn)) return null;

  const parsed = {
    source_file: sourceFile,
    source_page: SOURCE_PAGE,
    catalog_page: CATALOG_PAGE,
    parser_name: PARSER_NAME,
    brand: 'M.A. Ford',
    product_family: 'reamer',
    series: '272',
    product_type: 'TrueSize Carbide Reamer Straight Flute',
    tool_no: itemsByColumn.tool_no || null,
    edp: itemsByColumn.edp || null,
    d1_diameter_inch: itemsByColumn.d1_diameter_inch || null,
    d1_diameter_wire: itemsByColumn.d1_diameter_wire || null,
    d1_diameter_mm: itemsByColumn.d1_diameter_mm || null,
    d1_diameter_decimal: itemsByColumn.d1_diameter_decimal || null,
    d2_shank_inch: itemsByColumn.d2_shank_inch || null,
    d2_shank_mm: itemsByColumn.d2_shank_mm || null,
    l1_oal_inch: itemsByColumn.l1_oal_inch || null,
    l1_oal_mm: itemsByColumn.l1_oal_mm || null,
    l2_flute_length_inch: itemsByColumn.l2_flute_length_inch || null,
    l2_flute_length_mm: itemsByColumn.l2_flute_length_mm || null,
    flutes: itemsByColumn.flutes || null,
    lead_angle: 45,
    cutting_direction: 'RHC',
    raw_row: rawRow,
    confidence_score: 0,
    warnings,
  };

  if (!parsed.d1_diameter_inch && !parsed.d1_diameter_wire && !parsed.d1_diameter_mm) {
    warnings.push('missing_nominal_diameter_label');
  }
  if (!parsed.d2_shank_inch && !parsed.d2_shank_mm) warnings.push('missing_shank_dimension');
  if (!parsed.l1_oal_inch && !parsed.l1_oal_mm) warnings.push('missing_oal_dimension');
  if (!parsed.l2_flute_length_inch && !parsed.l2_flute_length_mm) warnings.push('missing_flute_length');

  parsed.confidence_score = confidenceFor(parsed);
  return parsed;
}

function confidenceFor(row) {
  const coreFields = ['tool_no', 'edp', 'd1_diameter_decimal', 'd2_shank_inch', 'l1_oal_inch', 'l2_flute_length_inch', 'flutes'];
  const optionalFields = ['d1_diameter_inch', 'd1_diameter_wire', 'd1_diameter_mm', 'd2_shank_mm', 'l1_oal_mm', 'l2_flute_length_mm'];
  const corePresent = coreFields.filter((field) => row[field]).length;
  const optionalPresent = optionalFields.filter((field) => row[field]).length;
  let score = Math.round((corePresent / coreFields.length) * 80 + Math.min(optionalPresent, 3) * 5);
  if (row.warnings.length) score -= row.warnings.length * 8;
  return Math.max(0, Math.min(100, score));
}

function fieldCompleteness(rows) {
  const fields = [
    'tool_no',
    'edp',
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
  ];
  return fields.map((field) => ({ field, present: rows.filter((row) => row[field]).length, total: rows.length }));
}

function reportFor(payload) {
  const completenessRows = fieldCompleteness(payload.rows).map((item) => `| ${item.field} | ${item.present}/${item.total} |`);
  const examples = payload.rows.slice(0, 10).map((row) => (
    `| ${row.tool_no} | ${row.edp} | ${row.d1_diameter_inch || ''} | ${row.d1_diameter_wire || ''} | ${row.d1_diameter_mm || ''} | ${row.d1_diameter_decimal || ''} | ${row.d2_shank_inch || ''} | ${row.d2_shank_mm || ''} | ${row.l1_oal_inch || ''} | ${row.l1_oal_mm || ''} | ${row.l2_flute_length_inch || ''} | ${row.l2_flute_length_mm || ''} | ${row.flutes || ''} |`
  ));
  const rejectedRows = payload.rejected_rows.slice(0, 15).map((row) => `| ${row.y.toFixed(1)} | ${row.raw_row.join(' / ').replace(/\|/g, '/')} | ${row.reason} |`);

  return [
    '# M.A. Ford Reamer 272 Parser v1',
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
    '| Tool No. | EDP | D1 Inch | D1 Wire | D1 mm | D1 Decimal | D2 Inch | D2 mm | L1 Inch | L1 mm | L2 Inch | L2 mm | Flutes |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---:|',
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
    '- This parser only reads PDF page 11 / catalog page 386.',
    '- Missing inch, wire, metric, or mm length values are preserved as null; no values are guessed.',
    '- It uses page-specific x-position buckets and is not yet a general Series 272 parser.',
    '- It does not create final ToolAdvisor candidates and does not touch PRODUCT_DB.',
    '',
    '## Scaling Assessment',
    '',
    'This parser can likely scale to catalog pages 386-407 if the Tool No./EDP table geometry remains stable. Before scaling, test page 12 and the final Series 272 page to confirm continuation headers, blank columns, and footer text behave the same way.',
    '',
  ].join('\n');
}

async function main() {
  const pdfPath = path.resolve(process.argv[2] || DEFAULT_PDF_PATH);
  if (!fs.existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);

  const sourceFile = path.basename(pdfPath);
  const pageRows = await extractPageRows(pdfPath);
  const rows = [];
  const rejectedRows = [];

  for (const pageRow of pageRows) {
    const parsed = parseRow(pageRow, sourceFile);
    if (parsed) {
      rows.push(parsed);
    } else if (pageRow.y < 640 && pageRow.y > 40) {
      rejectedRows.push({
        y: pageRow.y,
        raw_row: pageRow.items.map((item) => item.text),
        reason: 'not_272_data_row',
      });
    }
  }

  const payload = {
    source_file: sourceFile,
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
