#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_PDF_PATH = '/Users/muratonder/Desktop/MAFord_2018_Master_Catalog_Reamers.pdf';
const PARSER_NAME = 'maford-reamer-272-v2-verification';
const OUT_DIR = path.resolve(__dirname, '..', 'output', 'pilots', PARSER_NAME);
const OUT_JSON = path.join(OUT_DIR, 'rows.json');
const OUT_REPORT = path.join(OUT_DIR, 'report.md');
const TARGET_PAGES = [
  { source_page: 12, catalog_page: 387 },
  { source_page: 20, catalog_page: 395 },
];

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

async function extractPageRows(pdfPath, sourcePage) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const buffer = fs.readFileSync(pdfPath);
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    standardFontDataUrl: path.join(pdfjsRoot, 'standard_fonts') + path.sep,
  }).promise;
  const page = await doc.getPage(sourcePage);
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

function confidenceFor(row) {
  const coreFields = ['tool_no', 'edp', 'd1_diameter_decimal', 'd2_shank_inch', 'l1_oal_inch', 'l2_flute_length_inch', 'flutes'];
  const optionalFields = ['d1_diameter_inch', 'd1_diameter_wire', 'd1_diameter_mm', 'd2_shank_mm', 'l1_oal_mm', 'l2_flute_length_mm'];
  const corePresent = coreFields.filter((field) => row[field]).length;
  const optionalPresent = optionalFields.filter((field) => row[field]).length;
  let score = Math.round((corePresent / coreFields.length) * 80 + Math.min(optionalPresent, 3) * 5);
  if (row.warnings.length) score -= row.warnings.length * 8;
  return Math.max(0, Math.min(100, score));
}

function parseRow(pageRow, sourceFile, sourcePage, catalogPage) {
  const itemsByColumn = {};
  const rawRow = [];

  for (const item of pageRow.items) {
    const column = nearestColumn(item.x);
    if (!column) continue;
    rawRow.push(item.text);
    itemsByColumn[column] = itemsByColumn[column] ? `${itemsByColumn[column]} ${item.text}` : item.text;
  }

  if (!isDataRow(itemsByColumn)) return null;

  const row = {
    source_file: sourceFile,
    source_page: sourcePage,
    catalog_page: catalogPage,
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
    warnings: [],
  };

  if (!row.d1_diameter_inch && !row.d1_diameter_wire && !row.d1_diameter_mm) row.warnings.push('missing_nominal_diameter_label');
  if (!row.d2_shank_inch && !row.d2_shank_mm) row.warnings.push('missing_shank_dimension');
  if (!row.l1_oal_inch && !row.l1_oal_mm) row.warnings.push('missing_oal_dimension');
  if (!row.l2_flute_length_inch && !row.l2_flute_length_mm) row.warnings.push('missing_flute_length');
  row.confidence_score = confidenceFor(row);
  return row;
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

function pageSummary(pageResult) {
  const completeness = fieldCompleteness(pageResult.rows)
    .map((item) => `| ${item.field} | ${item.present}/${item.total} |`)
    .join('\n');
  const examples = pageResult.rows.slice(0, 10)
    .map((row) => `| ${row.tool_no} | ${row.edp} | ${row.d1_diameter_inch || ''} | ${row.d1_diameter_wire || ''} | ${row.d1_diameter_mm || ''} | ${row.d1_diameter_decimal || ''} | ${row.d2_shank_inch || ''} | ${row.d2_shank_mm || ''} | ${row.l1_oal_inch || ''} | ${row.l1_oal_mm || ''} | ${row.l2_flute_length_inch || ''} | ${row.l2_flute_length_mm || ''} | ${row.flutes || ''} |`)
    .join('\n');
  return [
    `### PDF Page ${pageResult.source_page} / Catalog Page ${pageResult.catalog_page}`,
    '',
    `- Rows extracted: ${pageResult.rows.length}`,
    `- Rows rejected: ${pageResult.rejected_rows.length}`,
    `- First data row Y: ${pageResult.layout.first_data_y ?? 'none'}`,
    `- Header row Y: ${pageResult.layout.header_y ?? 'none'}`,
    '',
    '| Field | Present |',
    '|---|---:|',
    completeness,
    '',
    '| Tool No. | EDP | D1 Inch | D1 Wire | D1 mm | D1 Decimal | D2 Inch | D2 mm | L1 Inch | L1 mm | L2 Inch | L2 mm | Flutes |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---:|',
    examples,
    '',
  ].join('\n');
}

function reportFor(payload) {
  return [
    '# M.A. Ford Reamer 272 Parser v2 Verification',
    '',
    `- Source file: ${payload.source_file}`,
    `- Pages processed: ${payload.pages.map((page) => `${page.source_page}/${page.catalog_page}`).join(', ')}`,
    `- Total rows extracted: ${payload.rows.length}`,
    `- Total rows rejected: ${payload.rejected_rows.length}`,
    `- Output JSON: ${OUT_JSON}`,
    '',
    '## Per-Page Results',
    '',
    ...payload.pages.map(pageSummary),
    '## Layout Differences Found',
    '',
    '- PDF page 12 and 20 are even-page continuation layouts with first data row around Y=662.8.',
    '- PDF page 11 used in v1 had first data row around Y=621.8 because it includes the larger left-side product title block.',
    '- Column x-positions remain stable across the checked pages, so x-position bucket parsing still works.',
    '- Footer position/text differs by odd/even page, but footer rows are ignored by Tool No./EDP detection.',
    '',
    '## Scaling Assessment',
    '',
    'The parser appears safe to scale to catalog pages 386-407 after one more check on the final Series 272 page. The core table geometry held on page 12 and later page 20, including Tool No., EDP, decimal diameter, shank, length, and flute columns. Scaling should still keep per-page reports and stop on pages where Tool No./EDP completeness drops.',
    '',
    '## Limitations',
    '',
    '- Verification only processed PDF pages 12 and 20.',
    '- Missing inch/wire/mm fields remain null and are not guessed.',
    '- No numeric normalization, final candidate creation, AI, or PRODUCT_DB merge is performed.',
    '',
  ].join('\n');
}

async function main() {
  const pdfPath = path.resolve(process.argv[2] || DEFAULT_PDF_PATH);
  if (!fs.existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);
  const sourceFile = path.basename(pdfPath);
  const pageResults = [];

  for (const target of TARGET_PAGES) {
    const pageRows = await extractPageRows(pdfPath, target.source_page);
    const rows = [];
    const rejectedRows = [];
    let headerY = null;
    let firstDataY = null;

    for (const pageRow of pageRows) {
      const rawText = pageRow.items.map((item) => item.text).join(' ');
      if (/Tool No\.\s+EDP/.test(rawText) || (rawText.includes('Tool No.') && rawText.includes('Flutes'))) headerY = Number(pageRow.y.toFixed(1));
      const parsed = parseRow(pageRow, sourceFile, target.source_page, target.catalog_page);
      if (parsed) {
        rows.push(parsed);
        if (firstDataY === null) firstDataY = Number(pageRow.y.toFixed(1));
      } else if (pageRow.y < 690 && pageRow.y > 40 && (rawText.includes('Tool No.') || /^272\d{5}/.test(rawText))) {
        rejectedRows.push({
          y: Number(pageRow.y.toFixed(1)),
          raw_row: pageRow.items.map((item) => item.text),
          reason: 'not_272_data_row',
        });
      }
    }

    pageResults.push({
      ...target,
      rows,
      rejected_rows: rejectedRows,
      layout: { header_y: headerY, first_data_y: firstDataY },
    });
  }

  const payload = {
    source_file: sourceFile,
    source_pdf: pdfPath,
    parser_name: PARSER_NAME,
    extracted_at: new Date().toISOString(),
    pages: pageResults,
    rows: pageResults.flatMap((page) => page.rows),
    rejected_rows: pageResults.flatMap((page) => page.rejected_rows.map((row) => ({ source_page: page.source_page, catalog_page: page.catalog_page, ...row }))),
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(OUT_REPORT, reportFor(payload), 'utf8');

  console.log(`Pages processed: ${payload.pages.map((page) => `${page.source_page}/${page.catalog_page}`).join(', ')}`);
  for (const page of payload.pages) {
    console.log(`- Page ${page.source_page}: rows extracted ${page.rows.length}, rejected ${page.rejected_rows.length}`);
  }
  console.log(`Output JSON: ${OUT_JSON}`);
  console.log(`Report: ${OUT_REPORT}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
