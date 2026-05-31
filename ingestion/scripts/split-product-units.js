#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  ensureOutputDirs,
  productRowsDir,
  productUnitsPathForProductRows,
  productUnitsReportPathForProductRows,
} = require('./shared');

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function rowText(row) {
  return (row || []).map(normalizeText).filter(Boolean).join(' ');
}

function numericValues(text) {
  return [...text.matchAll(/\b\d{1,4}(?:[.,]\d{1,4})?\b/g)].map((match) => match[0]);
}

function designationGuess(text) {
  const matches = [
    ...text.matchAll(/\b(?:RT|RF|HR|DIN|MK|M|G|NC)\s?-?\s?\d{1,4}[A-Z0-9./-]*\b/gi),
    ...text.matchAll(/\b[A-Z]{2,5}\d{2,5}[A-Z0-9./-]*\b/g),
  ].map((match) => normalizeText(match[0]));
  return [...new Set(matches)].slice(0, 4);
}

function findArticleAnchors(row) {
  const anchors = [];

  for (let cellIndex = 0; cellIndex < row.length; cellIndex += 1) {
    const cell = normalizeText(row[cellIndex]);
    const matches = [...cell.matchAll(/\b\d{3,5}\s+\d{1,3}(?:[.,]\d{1,4})\b/g)];
    for (const match of matches) {
      anchors.push({
        article: match[0],
        cellIndex,
        textOffset: match.index || 0,
      });
    }
  }

  const seen = new Set();
  return anchors.filter((anchor) => {
    const key = `${anchor.article}|${anchor.cellIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function nearbyCells(row, anchor, nextAnchor) {
  const previousAnchorCell = anchor.previousCellIndex ?? -1;
  const leftStart = Math.max(previousAnchorCell + 1, anchor.cellIndex - 4);
  const rightEnd = nextAnchor ? Math.max(anchor.cellIndex + 1, nextAnchor.cellIndex) : Math.min(row.length, anchor.cellIndex + 3);
  return row.slice(leftStart, rightEnd).map(normalizeText).filter(Boolean);
}

function scoreUnit(unitText, sourceRow, splitWarningCount) {
  const numbers = numericValues(unitText);
  const reasons = [];
  const warnings = [];
  let score = 0;

  if (/\b\d{3,5}\s+\d{1,3}(?:[.,]\d{1,4})\b/.test(unitText)) {
    score += 35;
    reasons.push('article-number anchor');
  }

  if (numbers.length >= 4) {
    score += 20;
    reasons.push('nearby numeric dimensions');
  } else if (numbers.length >= 2) {
    score += 10;
    reasons.push('some nearby numeric values');
  } else {
    warnings.push('few_nearby_dimensions');
  }

  if (/\b(?:MK-\d|RT\s?\d+|RF\s?\d+|DIN\s?\d+|M\d{1,2})\b/i.test(unitText)) {
    score += 10;
    reasons.push('designation-like context');
  }

  if (/\b(?:carbide|hss|hsco|hss-e|fire|tialn|altin|coated|uncoated)\b/i.test(unitText)) {
    score += 8;
    reasons.push('material or coating context');
  }

  if (/\b(?:drill|reamer|tap|end mill|milling cutter|countersink|thread mill)\b/i.test(unitText)) {
    score += 8;
    reasons.push('tool family context');
  }

  if (splitWarningCount > 0) {
    score -= 8;
    warnings.push('split_uncertain');
  }

  if (sourceRow.length <= 2) {
    warnings.push('short_source_row');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
    warnings,
  };
}

function buildSingleUnit(rowCandidate, warnings = []) {
  const text = rowText(rowCandidate.raw_row);
  const scored = scoreUnit(text, rowCandidate.raw_row, warnings.length);
  return {
    unit: buildUnit(rowCandidate, 0, rowCandidate.raw_row, rowCandidate.article_no_guess || [], scored, 'single-row-fallback', warnings),
    rowsSplit: false,
    uncertain: warnings.length > 0,
  };
}

function buildUnit(rowCandidate, unitIndex, rawUnitCells, articleNumbers, scored, splitMethod, extraWarnings = []) {
  const rawUnitText = rowText(rawUnitCells);
  return {
    source_file: rowCandidate.source_file,
    source_page: rowCandidate.source_page,
    raw_table_ref: rowCandidate.raw_table_ref,
    table_index: rowCandidate.table_index,
    row_index: rowCandidate.row_index,
    unit_index: unitIndex,
    raw_row: rowCandidate.raw_row,
    raw_unit: rawUnitCells,
    article_no_guess: articleNumbers,
    designation_guess: designationGuess(rawUnitText),
    nearby_dimension_values: numericValues(rawUnitText),
    header_guess: rowCandidate.header_guess || [],
    split_method: splitMethod,
    unit_score: scored.score,
    unit_reason: scored.reasons.join('; ') || 'No strong unit signals detected',
    warnings: [...new Set([...(scored.warnings || []), ...(extraWarnings || [])])],
  };
}

function splitProductRow(rowCandidate) {
  const row = (rowCandidate.raw_row || []).map(normalizeText).filter(Boolean);
  const anchors = findArticleAnchors(row);

  if (anchors.length < 2) {
    const warning = anchors.length === 0 ? ['no_article_anchor_for_split'] : [];
    return buildSingleUnit(rowCandidate, warning);
  }

  const uniqueArticles = new Set(anchors.map((anchor) => anchor.article));
  if (uniqueArticles.size < 2) {
    return buildSingleUnit(rowCandidate, ['repeated_same_article_anchor']);
  }

  const units = [];
  let uncertain = false;

  for (let index = 0; index < anchors.length; index += 1) {
    const anchor = anchors[index];
    const previousAnchor = anchors[index - 1];
    const nextAnchor = anchors[index + 1];
    anchor.previousCellIndex = previousAnchor ? previousAnchor.cellIndex : -1;

    const rawUnitCells = nearbyCells(row, anchor, nextAnchor);
    const unitText = rowText(rawUnitCells);
    const articleNumbers = [anchor.article];
    const warnings = [];

    if (!unitText.includes(anchor.article)) {
      warnings.push('anchor_not_in_unit_segment');
      uncertain = true;
    }

    if (rawUnitCells.length < 2) {
      warnings.push('short_unit_segment');
      uncertain = true;
    }

    const scored = scoreUnit(unitText, row, warnings.length);
    units.push(buildUnit(rowCandidate, index, rawUnitCells, articleNumbers, scored, 'article-anchor-v1', warnings));
  }

  return {
    units,
    rowsSplit: units.length > 1,
    uncertain,
  };
}

function buildReport({ payload, reportPath, topUnits }) {
  const topRows = topUnits.slice(0, 30).map((unit) => (
    `| ${unit.source_page} | ${unit.table_index} | ${unit.row_index} | ${unit.unit_index} | ${unit.unit_score} | ${unit.article_no_guess.join(', ')} | ${rowText(unit.raw_unit).replace(/\|/g, '/')} |`
  ));

  return [
    `# Product Unit Split Report: ${payload.source_file}`,
    '',
    `- Product rows loaded: ${payload.product_rows_loaded}`,
    `- Product units generated: ${payload.product_units_generated}`,
    `- Rows split into multiple units: ${payload.rows_split_into_multiple_units}`,
    `- Rows kept as single unit: ${payload.rows_kept_as_single_unit}`,
    `- Uncertain split warnings: ${payload.uncertain_split_warnings}`,
    `- Product units JSON: ${payload.product_units_path}`,
    `- Report: ${reportPath}`,
    '',
    '## Top 30 Product Units',
    '',
    '| Page | Table | Row | Unit | Score | Article guesses | Raw unit |',
    '|---:|---:|---:|---:|---:|---|---|',
    ...topRows,
    '',
    '## Limitations',
    '',
    '- Splitting is based on repeated article-number-like anchors only.',
    '- Fractional dimensions can still look like article fragments in noisy PDF text.',
    '- Nearby dimensions are positional text segments, not validated geometry fields.',
    '- Some rows may contain multiple coatings or product families that are not assigned per unit yet.',
    '- No AI, final schema normalization, validation, deduping, or PRODUCT_DB merge is performed.',
    '',
  ].join('\n');
}

function splitProductRowsFile(productRowsPath) {
  ensureOutputDirs();

  const resolvedProductRowsPath = path.resolve(productRowsPath);
  const productRowsPayload = JSON.parse(fs.readFileSync(resolvedProductRowsPath, 'utf8'));
  const productRows = productRowsPayload.product_rows || [];
  const productUnits = [];
  let rowsSplit = 0;
  let rowsKept = 0;
  let uncertainWarnings = 0;

  for (const rowCandidate of productRows) {
    const result = splitProductRow(rowCandidate);
    const units = result.units || [result.unit];
    productUnits.push(...units);

    if (result.rowsSplit) rowsSplit += 1;
    else rowsKept += 1;
    if (result.uncertain) uncertainWarnings += 1;
  }

  productUnits.sort((a, b) => b.unit_score - a.unit_score || a.source_page - b.source_page || a.row_index - b.row_index || a.unit_index - b.unit_index);

  const productUnitsPath = productUnitsPathForProductRows(resolvedProductRowsPath);
  const reportPath = productUnitsReportPathForProductRows(resolvedProductRowsPath);
  const payload = {
    source_file: productRowsPayload.source_file,
    product_rows_path: resolvedProductRowsPath,
    product_units_path: productUnitsPath,
    split_at: new Date().toISOString(),
    split_method: 'article-anchor-v1',
    product_rows_loaded: productRows.length,
    product_units_generated: productUnits.length,
    rows_split_into_multiple_units: rowsSplit,
    rows_kept_as_single_unit: rowsKept,
    uncertain_split_warnings: uncertainWarnings,
    product_units: productUnits,
  };
  const report = buildReport({
    payload,
    reportPath,
    topUnits: productUnits,
  });

  fs.writeFileSync(productUnitsPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(reportPath, report, 'utf8');

  return {
    productUnitsPath,
    reportPath,
    payload,
  };
}

function findProductRowFiles() {
  ensureOutputDirs();
  return fs.readdirSync(productRowsDir)
    .filter((fileName) => fileName.endsWith('.product-rows.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => path.join(productRowsDir, fileName));
}

function main() {
  const inputFiles = process.argv.slice(2);
  const productRowFiles = inputFiles.length ? inputFiles.map((filePath) => path.resolve(filePath)) : findProductRowFiles();

  if (!productRowFiles.length) {
    console.log('Product row files found: 0');
    console.log('Run npm run ingest:product-rows first.');
    return;
  }

  console.log(`Product row files found: ${productRowFiles.length}`);
  for (const productRowsPath of productRowFiles) {
    console.log(`Splitting product units from ${path.basename(productRowsPath)}`);
    const result = splitProductRowsFile(productRowsPath);
    console.log(`- Product units: ${result.productUnitsPath}`);
    console.log(`- Report: ${result.reportPath}`);
    console.log(`- Product rows loaded: ${result.payload.product_rows_loaded}`);
    console.log(`- Product units generated: ${result.payload.product_units_generated}`);
    console.log(`- Rows split into multiple units: ${result.payload.rows_split_into_multiple_units}`);
    console.log(`- Rows kept as single unit: ${result.payload.rows_kept_as_single_unit}`);
    console.log(`- Uncertain split warnings: ${result.payload.uncertain_split_warnings}`);
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
  splitProductRowsFile,
  splitProductRow,
};
