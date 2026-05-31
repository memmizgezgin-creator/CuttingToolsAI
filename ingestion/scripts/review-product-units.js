#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  ensureOutputDirs,
  productUnitsDir,
  reviewUnitsPathForProductUnits,
  reviewUnitsReportPathForProductUnits,
} = require('./shared');

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

function isMostlyProse(text) {
  const words = text.split(/\s+/).filter(Boolean);
  const numericTokens = words.filter((word) => /\d/.test(word));
  return words.length >= 10 && numericTokens.length < 3;
}

function hasHeaderFooterIndexText(text) {
  return /\b(?:contents|index|chapter|general catalogue|page|copyright|liability|conditions of sale|terms of payment|warning|safety)\b/i.test(text);
}

function weakHeaderContext(headerGuess) {
  const text = rowText(headerGuess);
  return !/\b(?:mm|inch|d1|d2|l1|l2|l4|oal|z|article|order|no\.?)\b/i.test(text);
}

function reviewStatusForUnit(unit) {
  const text = rowText(unit.raw_unit);
  const articleCount = (unit.article_no_guess || []).length;
  const dimensions = dimensionLikeValues(unit.nearby_dimension_values);
  const warnings = new Set(unit.warnings || []);
  const rawUnitLength = (unit.raw_unit || []).filter((cell) => normalizeText(cell)).length;
  const reasons = [];

  if (!articleCount) {
    return {
      status: 'rejected',
      reason: 'No article number guess.',
    };
  }

  if (hasHeaderFooterIndexText(text)) {
    return {
      status: 'rejected',
      reason: 'Header, footer, index, legal, or navigation text detected.',
    };
  }

  if (isMostlyProse(text)) {
    return {
      status: 'rejected',
      reason: 'Raw unit is mostly prose.',
    };
  }

  if (!dimensions.length || unit.unit_score < 40) {
    return {
      status: 'rejected',
      reason: 'No technical numeric structure or score below 40.',
    };
  }

  if (
    unit.unit_score >= 70
    && rawUnitLength >= 3
    && dimensions.length >= 1
    && unit.source_page
    && unit.raw_table_ref
    && unit.row_index
    && !warnings.has('split_uncertain')
    && !warnings.has('short_unit_segment')
    && !warnings.has('anchor_not_in_unit_segment')
  ) {
    return {
      status: 'high_quality',
      reason: 'Article number, dimensions, source traceability, and clean split are present.',
    };
  }

  if (warnings.has('split_uncertain')) reasons.push('split is uncertain');
  if (rawUnitLength < 3) reasons.push('raw unit is short');
  if (!dimensions.length) reasons.push('dimensions are unclear');
  if (weakHeaderContext(unit.header_guess)) reasons.push('header context is weak');
  if (unit.unit_score >= 40 && unit.unit_score <= 69) reasons.push('unit score is between 40 and 69');
  if (warnings.has('short_unit_segment')) reasons.push('short unit segment');
  if (warnings.has('few_nearby_dimensions')) reasons.push('few nearby dimensions');

  return {
    status: 'needs_review',
    reason: reasons.join('; ') || 'Useful article-bearing unit, but not high quality.',
  };
}

function toReviewUnit(unit, review) {
  return {
    source_file: unit.source_file,
    source_page: unit.source_page,
    raw_table_ref: unit.raw_table_ref,
    table_index: unit.table_index,
    row_index: unit.row_index,
    unit_index: unit.unit_index,
    raw_row: unit.raw_row,
    raw_unit: unit.raw_unit,
    article_no_guess: unit.article_no_guess || [],
    designation_guess: unit.designation_guess || [],
    nearby_dimension_values: unit.nearby_dimension_values || [],
    header_guess: unit.header_guess || [],
    unit_score: unit.unit_score,
    review_status: review.status,
    review_reason: review.reason,
    warnings: unit.warnings || [],
  };
}

function warningDistribution(units) {
  const counts = new Map();
  for (const unit of units) {
    for (const warning of unit.warnings || []) {
      counts.set(warning, (counts.get(warning) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function buildExampleRows(units) {
  return units.slice(0, 30).map((unit) => (
    `| ${unit.source_page} | ${unit.table_index} | ${unit.row_index} | ${unit.unit_index} | ${unit.unit_score} | ${unit.article_no_guess.join(', ')} | ${rowText(unit.raw_unit).replace(/\|/g, '/')} |`
  ));
}

function buildReport({ payload, reportPath, warningRows }) {
  const warningLines = warningRows.length
    ? warningRows.map(([warning, count]) => `| ${warning} | ${count} |`)
    : ['| none | 0 |'];

  return [
    `# Product Unit Review Report: ${payload.source_file}`,
    '',
    `- Product units loaded: ${payload.product_units_loaded}`,
    `- High quality count: ${payload.high_quality_count}`,
    `- Needs review count: ${payload.needs_review_count}`,
    `- Rejected count: ${payload.rejected_count}`,
    `- Review units JSON: ${payload.review_units_path}`,
    `- Report: ${reportPath}`,
    '',
    '## Warning Distribution',
    '',
    '| Warning | Count |',
    '|---|---:|',
    ...warningLines,
    '',
    '## Top 30 High Quality Examples',
    '',
    '| Page | Table | Row | Unit | Score | Article guesses | Raw unit |',
    '|---:|---:|---:|---:|---:|---|---|',
    ...buildExampleRows(payload.high_quality_units),
    '',
    '## Top 30 Needs Review Examples',
    '',
    '| Page | Table | Row | Unit | Score | Article guesses | Raw unit |',
    '|---:|---:|---:|---:|---:|---|---|',
    ...buildExampleRows(payload.needs_review_units),
    '',
    '## Limitations',
    '',
    '- Review status is heuristic and source-traceable, not a final approval.',
    '- High-quality requires score >= 70, so many useful score-65 units remain in needs_review.',
    '- Article numbers and dimensions are still guesses from PDF text positions.',
    '- No final ToolAdvisor schema normalization, AI, validation, deduping, or PRODUCT_DB merge is performed.',
    '',
  ].join('\n');
}

function reviewProductUnitsFile(productUnitsPath) {
  ensureOutputDirs();

  const resolvedProductUnitsPath = path.resolve(productUnitsPath);
  const productUnitsPayload = JSON.parse(fs.readFileSync(resolvedProductUnitsPath, 'utf8'));
  const productUnits = productUnitsPayload.product_units || [];
  const highQualityUnits = [];
  const needsReviewUnits = [];
  const rejectedUnits = [];

  for (const unit of productUnits) {
    const reviewed = toReviewUnit(unit, reviewStatusForUnit(unit));
    if (reviewed.review_status === 'high_quality') highQualityUnits.push(reviewed);
    else if (reviewed.review_status === 'needs_review') needsReviewUnits.push(reviewed);
    else rejectedUnits.push(reviewed);
  }

  const sortUnits = (a, b) => b.unit_score - a.unit_score || a.source_page - b.source_page || a.row_index - b.row_index || a.unit_index - b.unit_index;
  highQualityUnits.sort(sortUnits);
  needsReviewUnits.sort(sortUnits);
  rejectedUnits.sort(sortUnits);

  const reviewUnitsPath = reviewUnitsPathForProductUnits(resolvedProductUnitsPath);
  const reportPath = reviewUnitsReportPathForProductUnits(resolvedProductUnitsPath);
  const warningRows = warningDistribution(productUnits);
  const payload = {
    source_file: productUnitsPayload.source_file,
    product_units_path: resolvedProductUnitsPath,
    review_units_path: reviewUnitsPath,
    reviewed_at: new Date().toISOString(),
    review_method: 'heuristic-product-unit-review-v1',
    product_units_loaded: productUnits.length,
    high_quality_count: highQualityUnits.length,
    needs_review_count: needsReviewUnits.length,
    rejected_count: rejectedUnits.length,
    high_quality_units: highQualityUnits,
    needs_review_units: needsReviewUnits,
    rejected_units: rejectedUnits,
  };
  const report = buildReport({
    payload,
    reportPath,
    warningRows,
  });

  fs.writeFileSync(reviewUnitsPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(reportPath, report, 'utf8');

  return {
    reviewUnitsPath,
    reportPath,
    payload,
  };
}

function findProductUnitFiles() {
  ensureOutputDirs();
  return fs.readdirSync(productUnitsDir)
    .filter((fileName) => fileName.endsWith('.product-units.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => path.join(productUnitsDir, fileName));
}

function main() {
  const inputFiles = process.argv.slice(2);
  const productUnitFiles = inputFiles.length ? inputFiles.map((filePath) => path.resolve(filePath)) : findProductUnitFiles();

  if (!productUnitFiles.length) {
    console.log('Product unit files found: 0');
    console.log('Run npm run ingest:product-units first.');
    return;
  }

  console.log(`Product unit files found: ${productUnitFiles.length}`);
  for (const productUnitsPath of productUnitFiles) {
    console.log(`Reviewing product units from ${path.basename(productUnitsPath)}`);
    const result = reviewProductUnitsFile(productUnitsPath);
    console.log(`- Review units: ${result.reviewUnitsPath}`);
    console.log(`- Report: ${result.reportPath}`);
    console.log(`- Product units loaded: ${result.payload.product_units_loaded}`);
    console.log(`- High quality: ${result.payload.high_quality_count}`);
    console.log(`- Needs review: ${result.payload.needs_review_count}`);
    console.log(`- Rejected: ${result.payload.rejected_count}`);
  }
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
  reviewProductUnitsFile,
  reviewStatusForUnit,
};
