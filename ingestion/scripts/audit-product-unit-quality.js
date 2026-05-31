#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  ensureOutputDirs,
  auditDir,
  productUnitsDir,
  reviewUnitsDir,
} = require('./shared');

const AUDIT_REPORT_PATH = path.join(auditDir, 'product-unit-quality-audit.md');

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function rowText(row) {
  return (row || []).map(normalizeText).filter(Boolean).join(' ');
}

function dimensionLikeValues(values) {
  return (values || []).filter((value) => {
    const text = normalizeText(value);
    return /\d/.test(text) && !/^\d{3,5}$/.test(text);
  });
}

function bucketCounts(values, buckets) {
  const counts = new Map(buckets.map((bucket) => [bucket.label, 0]));
  for (const value of values) {
    const bucket = buckets.find((candidate) => candidate.test(value));
    if (bucket) counts.set(bucket.label, counts.get(bucket.label) + 1);
  }
  return counts;
}

function countBy(items, fn) {
  const counts = new Map();
  for (const item of items) {
    const key = fn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
}

function warningCounts(units) {
  const counts = new Map();
  for (const unit of units) {
    for (const warning of unit.warnings || []) {
      counts.set(warning, (counts.get(warning) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function isArticleSuspicious(article) {
  return /\b\d{3}\s+\d{1,2}\b/.test(article) || /\b\d{3,5}\s+\d{1,2}$/.test(article);
}

function headerQuality(unit) {
  const text = rowText(unit.header_guess);
  const hasUnits = /\b(?:mm|inch)\b/i.test(text);
  const hasDimensionLabels = /\b(?:d1|d2|l1|l2|l4|oal|z)\b/i.test(text);
  const hasArticleLabels = /\b(?:article|order|no\.?)\b/i.test(text);
  if (hasDimensionLabels && hasArticleLabels) return 'strong';
  if (hasUnits || hasDimensionLabels || hasArticleLabels) return 'partial';
  return 'weak';
}

function rowHasEnoughContext(unit) {
  const rawRowText = rowText(unit.raw_row);
  const rawUnitText = rowText(unit.raw_unit);
  const rawRowNumbers = dimensionLikeValues([...rawRowText.matchAll(/\b\d{1,4}(?:[.,]\d{1,4})?\b/g)].map((match) => match[0]));
  const rawUnitNumbers = dimensionLikeValues(unit.nearby_dimension_values);
  const rawRowArticles = [...rawRowText.matchAll(/\b\d{3,5}\s+\d{1,3}(?:[.,]\d{1,4})\b/g)].length;
  return rawRowArticles >= 2 && rawRowNumbers.length >= 6 && (rawUnitNumbers.length < 4 || rawUnitText.split(/\s+/).length <= 2);
}

function formatTable(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows,
  ].join('\n');
}

function unitExampleRow(unit, extra = '') {
  return `| ${unit.source_page} | ${unit.table_index} | ${unit.row_index} | ${unit.unit_index} | ${unit.unit_score} | ${(unit.article_no_guess || []).join(', ')} | ${rowText(unit.raw_unit).replace(/\|/g, '/')} | ${extra.replace(/\|/g, '/')} |`;
}

function findLatestFile(dir, suffix) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((fileName) => fileName.endsWith(suffix))
    .map((fileName) => path.join(dir, fileName))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0] || null;
}

function buildAudit({ productUnitsPayload, reviewUnitsPayload, productUnitsPath, reviewUnitsPath }) {
  const allUnits = productUnitsPayload.product_units || [];
  const highQuality = reviewUnitsPayload.high_quality_units || [];
  const needsReview = reviewUnitsPayload.needs_review_units || [];
  const rejected = reviewUnitsPayload.rejected_units || [];
  const reviewedUnits = [...highQuality, ...needsReview, ...rejected];
  const topNeeds = [...needsReview].sort((a, b) => b.unit_score - a.unit_score).slice(0, 50);
  const topRejected = [...rejected].sort((a, b) => b.unit_score - a.unit_score).slice(0, 50);
  const scoreDistribution = bucketCounts(reviewedUnits.map((unit) => unit.unit_score), [
    { label: '70+', test: (value) => value >= 70 },
    { label: '60-69', test: (value) => value >= 60 && value <= 69 },
    { label: '40-59', test: (value) => value >= 40 && value <= 59 },
    { label: '1-39', test: (value) => value >= 1 && value <= 39 },
    { label: '0', test: (value) => value === 0 },
  ]);
  const rawUnitLengthDistribution = bucketCounts(reviewedUnits.map((unit) => (unit.raw_unit || []).filter(Boolean).length), [
    { label: '1 cell', test: (value) => value === 1 },
    { label: '2 cells', test: (value) => value === 2 },
    { label: '3-5 cells', test: (value) => value >= 3 && value <= 5 },
    { label: '6-9 cells', test: (value) => value >= 6 && value <= 9 },
    { label: '10+ cells', test: (value) => value >= 10 },
  ]);
  const dimensionDistribution = bucketCounts(reviewedUnits.map((unit) => dimensionLikeValues(unit.nearby_dimension_values).length), [
    { label: '0 dimensions', test: (value) => value === 0 },
    { label: '1 dimension', test: (value) => value === 1 },
    { label: '2-3 dimensions', test: (value) => value >= 2 && value <= 3 },
    { label: '4-6 dimensions', test: (value) => value >= 4 && value <= 6 },
    { label: '7+ dimensions', test: (value) => value >= 7 },
  ]);
  const headerDistribution = countBy(reviewedUnits, headerQuality);
  const missingSignalCounts = [
    ['missing article_no_guess', reviewedUnits.filter((unit) => !(unit.article_no_guess || []).length).length],
    ['missing source_page', reviewedUnits.filter((unit) => !unit.source_page).length],
    ['missing raw_table_ref', reviewedUnits.filter((unit) => !unit.raw_table_ref).length],
    ['missing row_index', reviewedUnits.filter((unit) => !unit.row_index).length],
    ['no dimension-like values', reviewedUnits.filter((unit) => !dimensionLikeValues(unit.nearby_dimension_values).length).length],
    ['short raw_unit (<3 cells)', reviewedUnits.filter((unit) => (unit.raw_unit || []).filter(Boolean).length < 3).length],
    ['uncertain split warning', reviewedUnits.filter((unit) => (unit.warnings || []).includes('split_uncertain')).length],
    ['weak header context', reviewedUnits.filter((unit) => headerQuality(unit) === 'weak').length],
    ['suspicious article guess', reviewedUnits.filter((unit) => (unit.article_no_guess || []).some(isArticleSuspicious)).length],
  ];
  const contextLostExamples = reviewedUnits.filter(rowHasEnoughContext).slice(0, 20);
  const goodLookingNeeds = topNeeds.filter((unit) => (unit.article_no_guess || []).length && dimensionLikeValues(unit.nearby_dimension_values).length >= 4 && !(unit.warnings || []).length).slice(0, 20);
  const badRejected = topRejected.filter((unit) => (unit.warnings || []).length || (unit.raw_unit || []).length < 3 || dimensionLikeValues(unit.nearby_dimension_values).length < 3).slice(0, 20);

  const scoreRows = [...scoreDistribution.entries()].map(([bucket, count]) => `| ${bucket} | ${count} |`);
  const lengthRows = [...rawUnitLengthDistribution.entries()].map(([bucket, count]) => `| ${bucket} | ${count} |`);
  const dimensionRows = [...dimensionDistribution.entries()].map(([bucket, count]) => `| ${bucket} | ${count} |`);
  const headerRows = headerDistribution.map(([quality, count]) => `| ${quality} | ${count} |`);
  const warningRows = warningCounts(reviewedUnits).map(([warning, count]) => `| ${warning} | ${count} |`);
  const missingRows = missingSignalCounts.map(([signal, count]) => `| ${signal} | ${count} |`);
  const topNeedRows = topNeeds.slice(0, 50).map((unit) => unitExampleRow(unit, unit.review_reason || ''));
  const topRejectedRows = topRejected.slice(0, 50).map((unit) => unitExampleRow(unit, unit.review_reason || ''));
  const goodRows = goodLookingNeeds.map((unit) => unitExampleRow(unit, 'Has article, dimensions, traceability, and no warnings; capped by scoring model.'));
  const badRows = badRejected.map((unit) => unitExampleRow(unit, unit.review_reason || 'Rejected by heuristic.'));
  const contextRows = contextLostExamples.map((unit) => unitExampleRow(unit, `raw_row cells=${(unit.raw_row || []).length}; raw_unit cells=${(unit.raw_unit || []).length}`));

  return [
    '# Product Unit Quality Audit',
    '',
    `- Product units file: ${productUnitsPath}`,
    `- Review units file: ${reviewUnitsPath}`,
    `- Source file: ${productUnitsPayload.source_file}`,
    `- Product units loaded: ${allUnits.length}`,
    `- High quality: ${highQuality.length}`,
    `- Needs review: ${needsReview.length}`,
    `- Rejected: ${rejected.length}`,
    '',
    '## 1. Score Distribution',
    '',
    formatTable(['Score bucket', 'Unit count'], scoreRows),
    '',
    'Current best score is 65. No unit reaches the high_quality threshold of 70.',
    '',
    '## 2. Top Scoring Units and Why They Did Not Pass',
    '',
    formatTable(['Page', 'Table', 'Row', 'Unit', 'Score', 'Article guesses', 'Raw unit', 'Why not high quality'], topNeedRows.slice(0, 30)),
    '',
    'The top useful units are capped at 65 because the unit scoring grants article anchor + nearby numeric dimensions + designation context, but does not yet reward source traceability, clean split quality, or header evidence. Review classification requires `unit_score >= 70`, so these stay in needs_review even when they look structurally useful.',
    '',
    '## 3. Most Common Warnings',
    '',
    formatTable(['Warning', 'Count'], warningRows.length ? warningRows : ['| none | 0 |']),
    '',
    '## 4. Missing Signal Counts',
    '',
    formatTable(['Signal', 'Count'], missingRows),
    '',
    '## Article Number Quality',
    '',
    `Suspicious article guesses: ${missingSignalCounts.find(([name]) => name === 'suspicious article guess')[1]}`,
    '',
    'The main article issue is noisy matching around fractional inch values, for example fragments like `110 7` or `460 11`. The current splitter improved this by anchoring units on article-like cells, but the older product-row article guesses and some unit anchors still show fraction bleed-through.',
    '',
    '## Raw Unit Length Distribution',
    '',
    formatTable(['Raw unit length', 'Unit count'], lengthRows),
    '',
    '## Dimension Detection Quality',
    '',
    formatTable(['Dimension-like value count', 'Unit count'], dimensionRows),
    '',
    'Dimension extraction is broad: it keeps article-number components and fraction components as numeric values. This helps avoid data loss, but weakens quality scoring because the script cannot yet distinguish D1, shank, L1, L2, and article-code tokens.',
    '',
    '## Header Guess Quality',
    '',
    formatTable(['Header quality', 'Unit count'], headerRows),
    '',
    'Most high-scoring units only have partial headers such as `mm | inch | mm | mm`, not semantic labels like `d1`, `d2`, `l1`, or `l2`. That prevents stronger confidence.',
    '',
    '## 5. Good-Looking Units Stuck in Needs Review',
    '',
    formatTable(['Page', 'Table', 'Row', 'Unit', 'Score', 'Article guesses', 'Raw unit', 'Audit note'], goodRows.slice(0, 20)),
    '',
    '## 6. Bad Units Correctly Rejected',
    '',
    formatTable(['Page', 'Table', 'Row', 'Unit', 'Score', 'Article guesses', 'Raw unit', 'Rejection reason'], badRows.slice(0, 20)),
    '',
    '## Rows Where Split Lost Context',
    '',
    formatTable(['Page', 'Table', 'Row', 'Unit', 'Score', 'Article guesses', 'Raw unit', 'Context note'], contextRows.slice(0, 20)),
    '',
    'These examples show rows where `raw_row` has enough surrounding dimensions and multiple article anchors, but a late unit segment such as `654 17.250` becomes too short after splitting. The row-level data is useful; the unit segment lacks inherited left-side dimensions.',
    '',
    '## 7. Root Causes',
    '',
    '1. Unit scoring is capped by missing positive signals: clean source traceability, clean split, and strong header context are not rewarded.',
    '2. Header guesses are too weak for many product tables because the raw table extraction often captures only units (`mm`, `inch`) instead of semantic fields (`d1`, `d2`, `l1`, `l2`).',
    '3. Split v1 treats each article anchor independently. Later anchors in the same row can lose shared dimensions, producing short fragments with `split_uncertain` or `short_unit_segment` warnings.',
    '4. Numeric detection is not typed. Article codes, diameters, lengths, Morse taper markers, and inch fractions are all mixed in `nearby_dimension_values`.',
    '5. Article matching still has fraction bleed-through in some cases, creating suspicious guesses like partial `xxx 7` patterns.',
    '',
    '## 8. Recommended Minimal Fixes',
    '',
    '1. Add a clean-unit scoring bonus, not a threshold change: +5 for no warnings, +5 for source traceability present, +5 for at least four dimension-like values, and +5 for partial/strong header context.',
    '2. Improve row splitting so short trailing article units inherit the nearest left-side dimension group when they only contain an article anchor.',
    '3. Add typed numeric buckets before normalization: `article_like`, `diameter_like`, `length_like`, `fraction_like`, and `taper_like`.',
    '4. Tighten article regex to avoid matching fraction spillover such as `110 7` from `11.110 7/16`.',
    '5. Add a header-context enrichment pass that looks at the first rows of the raw table, not only the review table `header_guess`.',
    '',
    '## 9. Threshold Recommendation',
    '',
    'Keep the high_quality threshold at 70 for now. The threshold is reasonable; the current problem is that scoring does not reward enough real quality signals and splitting can strip context. Adjust the threshold only after scoring and split inheritance improve.',
    '',
    '## 10. Exact Next Coding Task',
    '',
    'Implement Product Unit Scoring v2: add clean-unit bonuses, typed numeric signal counts, stricter article matching, and inherited dimension context for short split units. Re-run `ingest:product-units`, `ingest:review-units`, and this audit afterward. Do not normalize or create final candidates yet.',
    '',
  ].join('\n');
}

function runAudit({ productUnitsPath, reviewUnitsPath }) {
  ensureOutputDirs();
  const resolvedProductUnitsPath = path.resolve(productUnitsPath || findLatestFile(productUnitsDir, '.product-units.json'));
  const resolvedReviewUnitsPath = path.resolve(reviewUnitsPath || findLatestFile(reviewUnitsDir, '.review-units.json'));

  if (!resolvedProductUnitsPath || !fs.existsSync(resolvedProductUnitsPath)) {
    throw new Error('Product units file not found. Run npm run ingest:product-units first.');
  }
  if (!resolvedReviewUnitsPath || !fs.existsSync(resolvedReviewUnitsPath)) {
    throw new Error('Review units file not found. Run npm run ingest:review-units first.');
  }

  const productUnitsPayload = JSON.parse(fs.readFileSync(resolvedProductUnitsPath, 'utf8'));
  const reviewUnitsPayload = JSON.parse(fs.readFileSync(resolvedReviewUnitsPath, 'utf8'));
  const report = buildAudit({
    productUnitsPayload,
    reviewUnitsPayload,
    productUnitsPath: resolvedProductUnitsPath,
    reviewUnitsPath: resolvedReviewUnitsPath,
  });

  fs.writeFileSync(AUDIT_REPORT_PATH, report, 'utf8');
  return {
    reportPath: AUDIT_REPORT_PATH,
    productUnitsPath: resolvedProductUnitsPath,
    reviewUnitsPath: resolvedReviewUnitsPath,
  };
}

function main() {
  const [productUnitsPath, reviewUnitsPath] = process.argv.slice(2);
  const result = runAudit({ productUnitsPath, reviewUnitsPath });
  console.log(`Audit report: ${result.reportPath}`);
  console.log(`Product units: ${result.productUnitsPath}`);
  console.log(`Review units: ${result.reviewUnitsPath}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  runAudit,
};
