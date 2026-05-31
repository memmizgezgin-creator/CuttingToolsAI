#!/usr/bin/env node

const path = require('path');
const { scanPendingPdfs } = require('./shared');
const { writeRawPageTextJson } = require('./write-raw-page-text-json');
const { createBasicReport } = require('./create-basic-report');
const { extractTablesForPdf } = require('./extract-table-candidates');
const { reviewRawTablesFile } = require('./review-table-candidates');

async function main() {
  const pdfs = scanPendingPdfs();
  console.log(`PDFs found: ${pdfs.length}`);

  for (const pdfPath of pdfs) {
    console.log(`Processing ${path.basename(pdfPath)}`);
    const rawResult = await writeRawPageTextJson(pdfPath);
    const reportResult = createBasicReport(pdfPath);
    const tableResult = await extractTablesForPdf(pdfPath);
    const reviewResult = reviewRawTablesFile(tableResult.rawTablesPath);
    console.log(`- Raw JSON: ${rawResult.outputPath}`);
    console.log(`- Report: ${reportResult.reportPath}`);
    console.log(`- Raw tables: ${tableResult.rawTablesPath}`);
    console.log(`- Table report: ${tableResult.reportPath}`);
    console.log(`- Table candidates: ${tableResult.payload.table_candidates.length}`);
    console.log(`- Review tables: ${reviewResult.reviewTablesPath}`);
    console.log(`- Review table report: ${reviewResult.reportPath}`);
    console.log(`- Likely product tables: ${reviewResult.payload.review_tables_selected}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
