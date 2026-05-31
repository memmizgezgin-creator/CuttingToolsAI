const fs = require('fs');
const path = require('path');

const ingestionRoot = path.resolve(__dirname, '..');
const pendingDir = path.join(ingestionRoot, 'input', 'pending');
const rawPageTextDir = path.join(ingestionRoot, 'output', 'raw-page-text');
const rawTablesDir = path.join(ingestionRoot, 'output', 'raw-tables');
const reviewTablesDir = path.join(ingestionRoot, 'output', 'review-tables');
const productRowsDir = path.join(ingestionRoot, 'output', 'product-rows');
const productUnitsDir = path.join(ingestionRoot, 'output', 'product-units');
const reviewUnitsDir = path.join(ingestionRoot, 'output', 'review-units');
const auditDir = path.join(ingestionRoot, 'output', 'audit');
const reportsDir = path.join(ingestionRoot, 'output', 'reports');

function ensureOutputDirs() {
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.mkdirSync(rawPageTextDir, { recursive: true });
  fs.mkdirSync(rawTablesDir, { recursive: true });
  fs.mkdirSync(reviewTablesDir, { recursive: true });
  fs.mkdirSync(productRowsDir, { recursive: true });
  fs.mkdirSync(productUnitsDir, { recursive: true });
  fs.mkdirSync(reviewUnitsDir, { recursive: true });
  fs.mkdirSync(auditDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100) || 'pdf';
}

function pdfBaseName(pdfPath) {
  return slugify(path.basename(pdfPath, path.extname(pdfPath)));
}

function rawJsonPathForPdf(pdfPath) {
  return path.join(rawPageTextDir, `${pdfBaseName(pdfPath)}.raw-pages.json`);
}

function reportPathForPdf(pdfPath) {
  return path.join(reportsDir, `${pdfBaseName(pdfPath)}.report.md`);
}

function rawTablesPathForPdf(pdfPath) {
  return path.join(rawTablesDir, `${pdfBaseName(pdfPath)}.raw-tables.json`);
}

function tableReportPathForPdf(pdfPath) {
  return path.join(reportsDir, `${pdfBaseName(pdfPath)}.table-extraction-report.md`);
}

function reviewTablesPathForRawTables(rawTablesPath) {
  const baseName = path.basename(rawTablesPath, '.raw-tables.json');
  return path.join(reviewTablesDir, `${baseName}.review-tables.json`);
}

function reviewTablesReportPathForRawTables(rawTablesPath) {
  const baseName = path.basename(rawTablesPath, '.raw-tables.json');
  return path.join(reportsDir, `${baseName}.review-tables-report.md`);
}

function productRowsPathForReviewTables(reviewTablesPath) {
  const baseName = path.basename(reviewTablesPath, '.review-tables.json');
  return path.join(productRowsDir, `${baseName}.product-rows.json`);
}

function productRowsReportPathForReviewTables(reviewTablesPath) {
  const baseName = path.basename(reviewTablesPath, '.review-tables.json');
  return path.join(reportsDir, `${baseName}.product-rows-report.md`);
}

function productUnitsPathForProductRows(productRowsPath) {
  const baseName = path.basename(productRowsPath, '.product-rows.json');
  return path.join(productUnitsDir, `${baseName}.product-units.json`);
}

function productUnitsReportPathForProductRows(productRowsPath) {
  const baseName = path.basename(productRowsPath, '.product-rows.json');
  return path.join(reportsDir, `${baseName}.product-units-report.md`);
}

function reviewUnitsPathForProductUnits(productUnitsPath) {
  const baseName = path.basename(productUnitsPath, '.product-units.json');
  return path.join(reviewUnitsDir, `${baseName}.review-units.json`);
}

function reviewUnitsReportPathForProductUnits(productUnitsPath) {
  const baseName = path.basename(productUnitsPath, '.product-units.json');
  return path.join(reportsDir, `${baseName}.review-units-report.md`);
}

function scanPendingPdfs() {
  ensureOutputDirs();
  return fs.readdirSync(pendingDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.pdf'))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => path.join(pendingDir, fileName));
}

module.exports = {
  ingestionRoot,
  pendingDir,
  rawPageTextDir,
  rawTablesDir,
  reviewTablesDir,
  productRowsDir,
  productUnitsDir,
  reviewUnitsDir,
  auditDir,
  reportsDir,
  ensureOutputDirs,
  pdfBaseName,
  rawJsonPathForPdf,
  reportPathForPdf,
  rawTablesPathForPdf,
  tableReportPathForPdf,
  reviewTablesPathForRawTables,
  reviewTablesReportPathForRawTables,
  productRowsPathForReviewTables,
  productRowsReportPathForReviewTables,
  productUnitsPathForProductRows,
  productUnitsReportPathForProductRows,
  reviewUnitsPathForProductUnits,
  reviewUnitsReportPathForProductUnits,
  scanPendingPdfs,
};
