#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

async function renderPageText(page) {
  const textContent = await page.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });

  let lastY;
  let text = '';

  for (const item of textContent.items) {
    const y = item.transform[5];
    text += lastY === undefined || lastY === y ? item.str : `\n${item.str}`;
    lastY = y;
  }

  return text.trim();
}

async function extractPageText(pdfPath) {
  const resolvedPdfPath = path.resolve(pdfPath);
  const buffer = fs.readFileSync(resolvedPdfPath);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const standardFontDataUrl = path.join(pdfjsRoot, 'standard_fonts') + path.sep;
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    standardFontDataUrl,
  }).promise;

  const pages = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const text = await renderPageText(page);
    pages.push({
      pageNumber,
      text,
      charCount: text.length,
    });
  }

  await doc.destroy();
  return pages;
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: npm run ingestion:extract -- ingestion/input/pending/catalog.pdf');
    process.exit(1);
  }

  const pages = await extractPageText(pdfPath);
  console.log(JSON.stringify({ sourcePdf: path.resolve(pdfPath), pageCount: pages.length, pages }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { extractPageText };
