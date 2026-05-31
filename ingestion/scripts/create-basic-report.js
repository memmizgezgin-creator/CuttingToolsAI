#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { ensureOutputDirs, rawJsonPathForPdf, reportPathForPdf } = require('./shared');

function summarizePages(pages) {
  const pagesWithText = pages.filter((page) => page.text.trim().length > 0);
  const totalChars = pages.reduce((sum, page) => sum + page.charCount, 0);

  return {
    totalChars,
    pagesWithText: pagesWithText.length,
    emptyPages: pages.length - pagesWithText.length,
  };
}

function createBasicReport(pdfPath) {
  ensureOutputDirs();

  const resolvedPdfPath = path.resolve(pdfPath);
  const rawJsonPath = rawJsonPathForPdf(resolvedPdfPath);
  if (!fs.existsSync(rawJsonPath)) {
    throw new Error(`Raw page text JSON not found: ${rawJsonPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(rawJsonPath, 'utf8'));
  const summary = summarizePages(raw.pages);
  const reportPath = reportPathForPdf(resolvedPdfPath);
  const firstTextPage = raw.pages.find((page) => page.text.trim().length > 0);
  const sampleText = firstTextPage
    ? firstTextPage.text.replace(/\s+/g, ' ').trim().slice(0, 500)
    : 'No extractable text found.';

  const report = [
    `# ${path.basename(resolvedPdfPath)}`,
    '',
    `- Source PDF: ${resolvedPdfPath}`,
    `- Raw JSON: ${rawJsonPath}`,
    `- Pages: ${raw.pageCount}`,
    `- Pages with text: ${summary.pagesWithText}`,
    `- Empty pages: ${summary.emptyPages}`,
    `- Total extracted characters: ${summary.totalChars}`,
    `- Extracted at: ${raw.extractedAt}`,
    '',
    '## First Text Sample',
    '',
    sampleText,
    '',
  ].join('\n');

  fs.writeFileSync(reportPath, report, 'utf8');
  return { reportPath, summary };
}

function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: npm run ingestion:report -- ingestion/input/pending/catalog.pdf');
    process.exit(1);
  }

  const { reportPath, summary } = createBasicReport(pdfPath);
  console.log(`Wrote report to ${reportPath}`);
  console.log(`Pages with text: ${summary.pagesWithText}`);
  console.log(`Total extracted characters: ${summary.totalChars}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { createBasicReport };
