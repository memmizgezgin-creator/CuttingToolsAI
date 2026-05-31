#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  ensureOutputDirs,
  rawTablesPathForPdf,
  tableReportPathForPdf,
  scanPendingPdfs,
} = require('./shared');

const METHOD = 'pdfjs-text-position-v1';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function groupItemsIntoRows(items, yTolerance = 2.5) {
  const rows = [];
  const sortedItems = items
    .map((item) => ({
      text: normalizeText(item.str),
      x: item.transform[4],
      y: item.transform[5],
      width: item.width || 0,
    }))
    .filter((item) => item.text.length > 0)
    .sort((a, b) => b.y - a.y || a.x - b.x);

  for (const item of sortedItems) {
    let row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= yTolerance);
    if (!row) {
      row = { y: item.y, items: [] };
      rows.push(row);
    }
    row.items.push(item);
    row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
  }

  return rows
    .map((row) => {
      const sorted = row.items.sort((a, b) => a.x - b.x);
      return {
        y: row.y,
        items: sorted,
        cells: groupRowItemsIntoCells(sorted),
      };
    })
    .sort((a, b) => b.y - a.y);
}

function groupRowItemsIntoCells(items) {
  const cells = [];

  for (const item of items) {
    const previous = cells[cells.length - 1];
    const previousEnd = previous ? previous.x + previous.width : null;
    const gap = previousEnd === null ? 0 : item.x - previousEnd;

    if (!previous || gap > 10) {
      cells.push({
        x: item.x,
        width: item.width,
        text: item.text,
      });
    } else {
      previous.text = normalizeText(`${previous.text} ${item.text}`);
      previous.width = Math.max(previous.width, item.x + item.width - previous.x);
    }
  }

  return cells.map((cell) => cell.text);
}

function rowLooksTableLike(row) {
  if (row.cells.length < 3) return false;
  const rowText = row.cells.join(' ');
  const hasDigit = /\d/.test(rowText);
  const compactCells = row.cells.filter((cell) => cell.length <= 24).length;
  return hasDigit || compactCells >= 3;
}

function pageDensity(pageRows) {
  const tableRows = pageRows.filter(rowLooksTableLike);
  const totalRows = pageRows.length;
  const numericRows = tableRows.filter((row) => /\d/.test(row.cells.join(' '))).length;
  const maxColumns = tableRows.reduce((max, row) => Math.max(max, row.cells.length), 0);

  return {
    totalRows,
    tableLikeRows: tableRows.length,
    numericRows,
    maxColumns,
    densityScore: totalRows ? Number((tableRows.length / totalRows).toFixed(3)) : 0,
  };
}

function splitIntoTableRuns(rows) {
  const runs = [];
  let current = [];

  for (const row of rows) {
    if (rowLooksTableLike(row)) {
      current.push(row);
      continue;
    }

    if (current.length >= 4) {
      runs.push(current);
    }
    current = [];
  }

  if (current.length >= 4) {
    runs.push(current);
  }

  return runs;
}

function columnsIfDetected(rows) {
  const counts = new Map();
  for (const row of rows) {
    counts.set(row.cells.length, (counts.get(row.cells.length) || 0) + 1);
  }

  let bestColumnCount = null;
  let bestFrequency = 0;
  for (const [columnCount, frequency] of counts.entries()) {
    if (frequency > bestFrequency && columnCount >= 3) {
      bestColumnCount = columnCount;
      bestFrequency = frequency;
    }
  }

  if (!bestColumnCount || bestFrequency < 3) {
    return null;
  }

  return {
    column_count: bestColumnCount,
    detection_basis: `${bestFrequency} rows share ${bestColumnCount} columns`,
  };
}

function confidenceHint(rows, density) {
  const detected = columnsIfDetected(rows);
  if (rows.length >= 8 && detected && density.numericRows >= 4) return 'medium';
  if (rows.length >= 4) return 'low';
  return 'very_low';
}

function warningsForTable(rows) {
  const warnings = [];
  const detected = columnsIfDetected(rows);
  const rowLengths = new Set(rows.map((row) => row.cells.length));

  if (!detected) warnings.push('columns_not_stable');
  if (rowLengths.size > 3) warnings.push('uneven_row_cell_counts');
  if (rows.length < 6) warnings.push('short_table_run');

  warnings.push('raw_table_candidate_not_normalized');
  return warnings;
}

async function loadPdfDocument(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const standardFontDataUrl = path.join(pdfjsRoot, 'standard_fonts') + path.sep;

  return pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    standardFontDataUrl,
  }).promise;
}

async function extractTablesForPdf(pdfPath) {
  ensureOutputDirs();

  const resolvedPdfPath = path.resolve(pdfPath);
  const sourceFile = path.basename(resolvedPdfPath);
  const doc = await loadPdfDocument(resolvedPdfPath);
  const pageCount = doc.numPages;
  const tableCandidates = [];
  const pageDensityRows = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent({
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    });
    const rows = groupItemsIntoRows(textContent.items);
    const density = pageDensity(rows);
    pageDensityRows.push({ source_page: pageNumber, ...density });

    if (density.tableLikeRows < 4 || density.maxColumns < 3) {
      continue;
    }

    const runs = splitIntoTableRuns(rows);
    for (const run of runs) {
      const tableIndex = tableCandidates.length + 1;
      tableCandidates.push({
        source_file: sourceFile,
        source_page: pageNumber,
        table_index: tableIndex,
        extraction_method: METHOD,
        raw_text: run.map((row) => row.cells.join(' | ')).join('\n'),
        rows: run.map((row) => row.cells),
        columns_if_detected: columnsIfDetected(run),
        confidence_hint: confidenceHint(run, density),
        warnings: warningsForTable(run),
      });
    }
  }

  await doc.destroy();

  const rawTablesPath = rawTablesPathForPdf(resolvedPdfPath);
  const reportPath = tableReportPathForPdf(resolvedPdfPath);
  const payload = {
    source_file: sourceFile,
    source_pdf: resolvedPdfPath,
    extracted_at: new Date().toISOString(),
    extraction_method: METHOD,
    page_count: pageCount,
    pages_scanned_for_tables: pageCount,
    table_candidates: tableCandidates,
  };
  const report = buildReport({
    payload,
    rawTablesPath,
    reportPath,
    pageDensityRows,
  });

  fs.writeFileSync(rawTablesPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(reportPath, report, 'utf8');

  return {
    rawTablesPath,
    reportPath,
    payload,
    pageDensityRows,
  };
}

function buildReport({ payload, rawTablesPath, reportPath, pageDensityRows }) {
  const topPages = [...pageDensityRows]
    .sort((a, b) => b.tableLikeRows - a.tableLikeRows || b.maxColumns - a.maxColumns)
    .slice(0, 20);

  const topPageRows = topPages.map((page) => (
    `| ${page.source_page} | ${page.tableLikeRows} | ${page.totalRows} | ${page.numericRows} | ${page.maxColumns} | ${page.densityScore} |`
  ));

  return [
    `# Table Extraction Report: ${payload.source_file}`,
    '',
    `- PDF processed: ${payload.source_pdf}`,
    `- Page count: ${payload.page_count}`,
    `- Pages scanned for tables: ${payload.pages_scanned_for_tables}`,
    `- Table candidates found: ${payload.table_candidates.length}`,
    `- Raw table JSON: ${rawTablesPath}`,
    `- Report: ${reportPath}`,
    `- Extraction method: ${payload.extraction_method}`,
    '',
    '## Top 20 Pages by Table-Like Density',
    '',
    '| Page | Table-like rows | Total rows | Numeric rows | Max columns | Density score |',
    '|---:|---:|---:|---:|---:|---:|',
    ...topPageRows,
    '',
    '## Limitations',
    '',
    '- This is raw table candidate extraction only; it does not create product candidates.',
    '- Columns are inferred from text positions and spacing, so multi-line headers may be split incorrectly.',
    '- Scanned/image-only pages require OCR and are not handled here.',
    '- Page headers, footers, legends, and dense paragraph layouts can be false positives.',
    '- No values are normalized, validated, deduplicated, or merged into PRODUCT_DB.',
    '',
  ].join('\n');
}

async function main() {
  const pdfArgs = process.argv.slice(2);
  const pdfs = pdfArgs.length ? pdfArgs.map((pdfPath) => path.resolve(pdfPath)) : scanPendingPdfs();

  if (!pdfs.length) {
    console.log('PDFs found: 0');
    console.log('Add PDFs to ingestion/input/pending or pass a PDF path.');
    return;
  }

  console.log(`PDFs found: ${pdfs.length}`);
  for (const pdfPath of pdfs) {
    console.log(`Extracting tables from ${path.basename(pdfPath)}`);
    const result = await extractTablesForPdf(pdfPath);
    console.log(`- Raw tables: ${result.rawTablesPath}`);
    console.log(`- Report: ${result.reportPath}`);
    console.log(`- Table candidates: ${result.payload.table_candidates.length}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  extractTablesForPdf,
  groupItemsIntoRows,
  splitIntoTableRuns,
};
