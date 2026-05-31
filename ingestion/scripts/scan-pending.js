#!/usr/bin/env node

const path = require('path');
const { pendingDir, scanPendingPdfs } = require('./shared');

function main() {
  const pdfs = scanPendingPdfs();

  console.log(`Pending folder: ${pendingDir}`);
  console.log(`PDFs found: ${pdfs.length}`);

  for (const pdfPath of pdfs) {
    console.log(`- ${path.basename(pdfPath)}`);
  }
}

if (require.main === module) {
  main();
}
