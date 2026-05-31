#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DEFAULT_PDF_PATH = '/Users/muratonder/Desktop/MAFord_2018_Master_Catalog_Reamers.pdf';
const PARSER_NAME = 'maford-reamer-272-full-range';
const PARSER_VERSION = path.basename(__filename);
const PDF_PAGE_START = 11;
const PDF_PAGE_END = 32;
const CATALOG_PAGE_OFFSET = 375;
const OUT_DIR = path.resolve(__dirname, '..', 'output', 'pilots', 'maford-reamer-272-full-range-v1');
const OUT_JSON = path.join(OUT_DIR, 'rows.json');
const OUT_REPORT = path.join(OUT_DIR, 'report.md');

const BASE_COLUMNS = [
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

const FIELDS = BASE_COLUMNS.map(([field]) => field);
const CORE_FIELDS = ['tool_no', 'edp', 'd1_diameter_decimal', 'd2_shank_inch', 'flutes'];

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
      y: Number(row.y.toFixed(1)),
      items: row.items
        .filter((item) => item.x < 470)
        .sort((a, b) => a.x - b.x),
    }))
    .filter((row) => row.items.length)
    .sort((a, b) => b.y - a.y);
}

function inferPageOffset(rows) {
  const firstTool = rows.flatMap((row) => row.items).find((item) => /^272\d{5}$/.test(item.text));
  return firstTool ? Number((firstTool.x - 49).toFixed(1)) : 0;
}

function nearestColumn(x, offset) {
  let best = BASE_COLUMNS[0];
  let bestDistance = Math.abs(x - (best[1] + offset));
  for (const column of BASE_COLUMNS.slice(1)) {
    const distance = Math.abs(x - (column[1] + offset));
    if (distance < bestDistance) {
      best = column;
      bestDistance = distance;
    }
  }
  return bestDistance <= 16 ? best[0] : null;
}

async function loadPdf() {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const buffer = fs.readFileSync(DEFAULT_PDF_PATH);
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    standardFontDataUrl: path.join(pdfjsRoot, 'standard_fonts') + path.sep,
  }).promise;
  return doc;
}

function parsePageRow(pageRow, context) {
  const values = {};
  const rawRow = [];

  for (const item of pageRow.items) {
    const column = nearestColumn(item.x, context.page_offset);
    if (!column) continue;
    rawRow.push(item.text);
    values[column] = values[column] ? `${values[column]} ${item.text}` : item.text;
  }

  if (!/^272\d{5}$/.test(values.tool_no || '') && !/^\d{5}$/.test(values.edp || '')) return null;

  const warnings = [];
  if (!/^272\d{5}$/.test(values.tool_no || '')) warnings.push('missing_or_invalid_tool_no');
  if (!/^\d{5}$/.test(values.edp || '')) warnings.push('missing_or_invalid_edp');
  if (!values.d1_diameter_decimal) warnings.push('missing_d1_diameter_decimal');
  if (!values.d2_shank_inch) warnings.push('missing_d2_shank_inch');
  if (!values.flutes) warnings.push('missing_flutes');

  const row = {
    source_pdf: context.source_pdf,
    source_file: path.basename(context.source_pdf),
    pdf_page: context.pdf_page,
    source_page: context.pdf_page,
    catalog_page: context.catalog_page,
    series: '272',
    row_index: context.row_index,
    parser_name: PARSER_NAME,
    parser_version: PARSER_VERSION,
    brand: 'M.A. Ford',
    product_family: 'reamer',
    product_type: 'TrueSize Carbide Reamer Straight Flute',
    tool_no: values.tool_no || null,
    edp: values.edp || null,
    d1_diameter_inch: values.d1_diameter_inch || null,
    d1_diameter_wire: values.d1_diameter_wire || null,
    d1_diameter_mm: values.d1_diameter_mm || null,
    d1_diameter_decimal: values.d1_diameter_decimal || null,
    d2_shank_inch: values.d2_shank_inch || null,
    d2_shank_mm: values.d2_shank_mm || null,
    l1_oal_inch: values.l1_oal_inch || null,
    l1_oal_mm: values.l1_oal_mm || null,
    l2_flute_length_inch: values.l2_flute_length_inch || null,
    l2_flute_length_mm: values.l2_flute_length_mm || null,
    flutes: values.flutes || null,
    lead_angle: 45,
    cutting_direction: 'RHC',
    raw_row: rawRow,
    raw_y: pageRow.y,
    extraction_status: warnings.length ? 'suspicious' : 'extracted',
    warnings,
  };

  return row;
}

function fieldCompleteness(rows) {
  return FIELDS.map((field) => ({
    field,
    present: rows.filter((row) => row[field]).length,
    total: rows.length,
  }));
}

function duplicateKeys(rows) {
  const counts = new Map();
  for (const row of rows) {
    if (!row.tool_no || !row.edp) continue;
    const key = `${row.tool_no}|${row.edp}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1);
}

function markDuplicates(rows) {
  const duplicates = new Set(duplicateKeys(rows).map(([key]) => key));
  for (const row of rows) {
    const key = `${row.tool_no}|${row.edp}`;
    if (duplicates.has(key)) {
      row.extraction_status = 'suspicious';
      if (!row.warnings.includes('duplicate_tool_no_edp')) row.warnings.push('duplicate_tool_no_edp');
    }
  }
}

function pageReport(page) {
  const completenessRows = page.field_completeness.map((item) => `| ${item.field} | ${item.present}/${item.total} |`);
  const coreComplete = CORE_FIELDS.every((field) => page.rows.every((row) => row[field]));
  return [
    `### PDF Page ${page.pdf_page} / Catalog Page ${page.catalog_page}`,
    '',
    `- Rows extracted: ${page.rows.length}`,
    `- Rows rejected: ${page.rejected_rows.length}`,
    `- Rows missing tool_no: ${page.rows_missing_tool_no}`,
    `- Rows missing edp: ${page.rows_missing_edp}`,
    `- Suspicious rows: ${page.suspicious_rows}`,
    `- Page offset: ${page.page_offset}`,
    `- Core fields complete: ${coreComplete}`,
    '',
    '| Field | Present |',
    '|---|---:|',
    ...completenessRows,
    '',
  ].join('\n');
}

function reportFor(payload) {
  const duplicateCount = payload.duplicate_tool_no_edp.length;
  const safeForLaterNormalization = duplicateCount === 0
    && payload.rows_missing_tool_no === 0
    && payload.rows_missing_edp === 0
    && payload.pages.every((page) => CORE_FIELDS.every((field) => page.rows.every((row) => row[field])));

  return [
    '# M.A. Ford Series 272 Full-Range Raw Extraction',
    '',
    `- Source PDF: ${payload.source_pdf}`,
    `- PDF pages processed: ${PDF_PAGE_START}-${PDF_PAGE_END}`,
    `- Catalog pages processed: ${PDF_PAGE_START + CATALOG_PAGE_OFFSET}-${PDF_PAGE_END + CATALOG_PAGE_OFFSET}`,
    `- Total pages processed: ${payload.pages.length}`,
    `- Total rows extracted: ${payload.rows.length}`,
    `- Rows with tool_no: ${payload.rows_with_tool_no}`,
    `- Rows with edp: ${payload.rows_with_edp}`,
    `- Rows missing tool_no: ${payload.rows_missing_tool_no}`,
    `- Rows missing edp: ${payload.rows_missing_edp}`,
    `- Duplicate tool_no + edp count: ${duplicateCount}`,
    `- Suspicious row count: ${payload.suspicious_row_count}`,
    `- Output file path: ${OUT_JSON}`,
    `- Safe for later normalization review: ${safeForLaterNormalization}`,
    '',
    '## Page-by-Page Completeness',
    '',
    ...payload.pages.map(pageReport),
    '## Duplicate Tool No. + EDP Keys',
    '',
    duplicateCount
      ? payload.duplicate_tool_no_edp.map(([key, count]) => `- ${key}: ${count}`).join('\n')
      : 'No duplicate Tool No. + EDP combinations detected.',
    '',
    '## Notes',
    '',
    '- This is raw traceable extraction only.',
    '- Missing optional values are preserved as null.',
    '- Suspicious rows are flagged, not deleted.',
    '- No generic parser, AI extraction, PRODUCT_DB merge, frontend changes, or production normalization was performed.',
    '',
  ].join('\n');
}

async function main() {
  if (!fs.existsSync(DEFAULT_PDF_PATH)) throw new Error(`PDF not found: ${DEFAULT_PDF_PATH}`);
  const doc = await loadPdf();
  const pages = [];
  const allRows = [];
  const allRejectedRows = [];

  for (let pdfPage = PDF_PAGE_START; pdfPage <= PDF_PAGE_END; pdfPage += 1) {
    const page = await doc.getPage(pdfPage);
    const textContent = await page.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });
    const groupedRows = groupItemsIntoRows(textContent.items);
    const pageOffset = inferPageOffset(groupedRows);
    const catalogPage = pdfPage + CATALOG_PAGE_OFFSET;
    const rows = [];
    const rejectedRows = [];

    for (const groupedRow of groupedRows) {
      const parsed = parsePageRow(groupedRow, {
        source_pdf: DEFAULT_PDF_PATH,
        pdf_page: pdfPage,
        catalog_page: catalogPage,
        page_offset: pageOffset,
        row_index: rows.length + 1,
      });
      if (parsed) {
        rows.push(parsed);
      } else {
        const rawText = groupedRow.items.map((item) => item.text).join(' ');
        if (groupedRow.y < 690 && groupedRow.y > 40 && (rawText.includes('Tool No.') || /^272\d{5}/.test(rawText))) {
          rejectedRows.push({
            source_pdf: DEFAULT_PDF_PATH,
            pdf_page: pdfPage,
            catalog_page: catalogPage,
            raw_y: groupedRow.y,
            raw_row: groupedRow.items.map((item) => item.text),
            reason: 'not_272_data_row',
          });
        }
      }
    }

    allRows.push(...rows);
    allRejectedRows.push(...rejectedRows);
    pages.push({
      pdf_page: pdfPage,
      catalog_page: catalogPage,
      page_offset: pageOffset,
      rows,
      rejected_rows: rejectedRows,
      rows_missing_tool_no: rows.filter((row) => !row.tool_no).length,
      rows_missing_edp: rows.filter((row) => !row.edp).length,
      suspicious_rows: rows.filter((row) => row.extraction_status === 'suspicious').length,
      field_completeness: fieldCompleteness(rows),
    });
  }

  await doc.destroy();
  markDuplicates(allRows);

  for (const page of pages) {
    page.suspicious_rows = page.rows.filter((row) => row.extraction_status === 'suspicious').length;
  }

  const payload = {
    source_pdf: DEFAULT_PDF_PATH,
    source_file: path.basename(DEFAULT_PDF_PATH),
    parser_name: PARSER_NAME,
    parser_version: PARSER_VERSION,
    extracted_at: new Date().toISOString(),
    pdf_page_range: [PDF_PAGE_START, PDF_PAGE_END],
    catalog_page_range: [PDF_PAGE_START + CATALOG_PAGE_OFFSET, PDF_PAGE_END + CATALOG_PAGE_OFFSET],
    pages,
    rows: allRows,
    rejected_rows: allRejectedRows,
    rows_with_tool_no: allRows.filter((row) => row.tool_no).length,
    rows_with_edp: allRows.filter((row) => row.edp).length,
    rows_missing_tool_no: allRows.filter((row) => !row.tool_no).length,
    rows_missing_edp: allRows.filter((row) => !row.edp).length,
    duplicate_tool_no_edp: duplicateKeys(allRows),
    suspicious_row_count: allRows.filter((row) => row.extraction_status === 'suspicious').length,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(OUT_REPORT, reportFor(payload), 'utf8');

  console.log(`Pages processed: ${payload.pages.length}`);
  console.log(`Rows extracted: ${payload.rows.length}`);
  console.log(`Rows with tool_no: ${payload.rows_with_tool_no}`);
  console.log(`Rows with edp: ${payload.rows_with_edp}`);
  console.log(`Duplicates: ${payload.duplicate_tool_no_edp.length}`);
  console.log(`Suspicious rows: ${payload.suspicious_row_count}`);
  console.log(`Output JSON: ${OUT_JSON}`);
  console.log(`Report: ${OUT_REPORT}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
