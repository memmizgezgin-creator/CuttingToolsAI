#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { ensureOutputDirs, rawJsonPathForPdf } = require('./shared');
const { extractPageText } = require('./extract-page-text');

async function writeRawPageTextJson(pdfPath) {
  ensureOutputDirs();

  const resolvedPdfPath = path.resolve(pdfPath);
  const pages = await extractPageText(resolvedPdfPath);
  const outputPath = rawJsonPathForPdf(resolvedPdfPath);
  const payload = {
    sourcePdf: resolvedPdfPath,
    extractedAt: new Date().toISOString(),
    pageCount: pages.length,
    pages,
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf8');
  return { outputPath, payload };
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: npm run ingestion:raw -- ingestion/input/pending/catalog.pdf');
    process.exit(1);
  }

  const { outputPath, payload } = await writeRawPageTextJson(pdfPath);
  console.log(`Wrote ${payload.pageCount} pages to ${outputPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { writeRawPageTextJson };
