#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  ensureOutputDirs,
  reviewTablesDir,
  productRowsPathForReviewTables,
  productRowsReportPathForReviewTables,
} = require('./shared');

const TABLE_SCORE_THRESHOLD = 90;
const MAX_TABLES = 50;
const ROW_SCORE_THRESHOLD = 35;

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function rowText(row) {
  return (row || []).map(normalizeText).filter(Boolean).join(' ');
}

function numericValues(text) {
  return [...text.matchAll(/\b\d{1,4}(?:[.,]\d{1,4})?\b/g)].map((match) => match[0]);
}

function articleNoGuess(text) {
  const matches = [
    ...text.matchAll(/\b\d{3,5}\s+\d{1,3}(?:[.,]\d{1,4})?\b/g),
    ...text.matchAll(/\b\d{4,6}(?:[.,]\d{1,4})\b/g),
  ].map((match) => match[0]);
  return [...new Set(matches)].slice(0, 4);
}

function designationGuess(text) {
  const matches = [
    ...text.matchAll(/\b(?:RT|RF|HR|DIN|MK|M|G|NC)\s?-?\s?\d{1,4}[A-Z0-9./-]*\b/gi),
    ...text.matchAll(/\b[A-Z]{2,5}\d{2,5}[A-Z0-9./-]*\b/g),
  ].map((match) => normalizeText(match[0]));
  return [...new Set(matches)].slice(0, 4);
}

function wordGuess(text, regex) {
  const match = text.match(regex);
  return match ? normalizeText(match[0]) : null;
}

function isHeaderOnly(text) {
  return /\b(article no\.?|order no\.?|d1|d2|l1|l2|l4|z|mm|inch|coating)\b/i.test(text)
    && numericValues(text).length < 3;
}

function isLikelyFooterOrNavigation(text) {
  return /\b(?:page|p\.)\s?\d{1,4}\b/i.test(text)
    || /\b(?:contents|index|chapter|general catalogue)\b/i.test(text);
}

function scoreRow(row, table) {
  const text = rowText(row);
  const headerText = rowText(table.header_guess || []);
  const contextText = `${headerText} ${table.product_table_reason || ''}`;
  const combined = `${text} ${contextText}`;
  const reasons = [];
  const warnings = [];
  let score = 0;

  const numbers = numericValues(text);
  const articleNumbers = articleNoGuess(text);
  const designations = designationGuess(text);
  const longCells = (row || []).filter((cell) => normalizeText(cell).split(/\s+/).length >= 8);

  if (!text) {
    return {
      score: 0,
      reasons: ['empty row'],
      warnings: ['empty_row'],
      articleNumbers: [],
      designations: [],
      dimensionValues: [],
    };
  }

  if (articleNumbers.length) {
    score += 24;
    reasons.push('article-number-like value');
  }

  if (designations.length) {
    score += 10;
    reasons.push('designation-like code');
  }

  if (numbers.length >= 6) {
    score += 20;
    reasons.push('repeated numeric dimension values');
  } else if (numbers.length >= 3) {
    score += 12;
    reasons.push('numeric dimension values');
  } else if (!numbers.length) {
    score -= 15;
    reasons.push('no numeric structure');
    warnings.push('no_numeric_structure');
  }

  if (/\b\d{1,3}(?:[.,]\d{1,4})?\s*mm\b/i.test(text) || /\bmm\b/i.test(headerText)) {
    score += 8;
    reasons.push('mm-like values or header context');
  }

  if (/\b(?:d1|d2|l1|l2|l4|oal|flute|overall length|flute length|z)\b/i.test(combined)) {
    score += 8;
    reasons.push('dimension header context');
  }

  if (/\b(?:coating|carbide|solid carbide|hss|hsco|hss-e|fire|tialn|altin|pvd|cobalt)\b/i.test(combined)) {
    score += 8;
    reasons.push('coating or material words');
  }

  if (/\b(?:drill|reamer|tap|end mill|endmill|milling cutter|cutter|countersink|thread mill)\b/i.test(combined)) {
    score += 8;
    reasons.push('tool family terms');
  }

  if (isHeaderOnly(text)) {
    score -= 28;
    reasons.push('header-only row');
    warnings.push('header_only_row');
  }

  if (isLikelyFooterOrNavigation(text)) {
    score -= 24;
    reasons.push('footer or navigation row');
    warnings.push('possible_footer_or_navigation');
  }

  if (longCells.length >= 1 && numbers.length < 4) {
    score -= 18;
    reasons.push('prose-like row');
    warnings.push('possible_prose_row');
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  return {
    score: boundedScore,
    reasons,
    warnings: [...new Set(warnings)],
    articleNumbers,
    designations,
    dimensionValues: numbers,
  };
}

function buildProductRow(table, row, rowIndex, scored) {
  const text = rowText(row);
  return {
    source_file: table.source_file,
    source_page: table.source_page,
    raw_table_ref: table.raw_table_ref,
    table_index: table.table_index,
    row_index: rowIndex,
    raw_row: row,
    header_guess: table.header_guess || [],
    designation_guess: scored.designations,
    article_no_guess: scored.articleNumbers,
    dimension_values_detected: scored.dimensionValues,
    coating_guess: wordGuess(text, /\b(?:Fire|TiAlN|AlTiN|PVD|coated|uncoated)\b/i),
    substrate_guess: wordGuess(`${text} ${rowText(table.header_guess || [])}`, /\b(?:solid carbide|carbide|HSS-E|HSS|HSCO|cobalt)\b/i),
    product_family_guess: wordGuess(`${text} ${rowText(table.header_guess || [])}`, /\b(?:machine reamers?|reamers?|drills?|taps?|end mills?|milling cutters?|countersinks?|thread mills?)\b/i),
    extraction_method: 'heuristic-product-row-v1-narrow-pilot',
    row_score: scored.score,
    row_reason: scored.reasons.join('; ') || 'No strong row signals detected',
    warnings: scored.warnings,
  };
}

function scoreDistribution(scoredRows) {
  const buckets = new Map([
    ['90-100', 0],
    ['75-89', 0],
    ['60-74', 0],
    ['35-59', 0],
    ['1-34', 0],
    ['0', 0],
  ]);

  for (const row of scoredRows) {
    const score = row.score;
    if (score >= 90) buckets.set('90-100', buckets.get('90-100') + 1);
    else if (score >= 75) buckets.set('75-89', buckets.get('75-89') + 1);
    else if (score >= 60) buckets.set('60-74', buckets.get('60-74') + 1);
    else if (score >= 35) buckets.set('35-59', buckets.get('35-59') + 1);
    else if (score > 0) buckets.set('1-34', buckets.get('1-34') + 1);
    else buckets.set('0', buckets.get('0') + 1);
  }

  return buckets;
}

function selectPilotTables(reviewTables) {
  return reviewTables
    .filter((table) => table.product_table_score >= TABLE_SCORE_THRESHOLD)
    .sort((a, b) => b.product_table_score - a.product_table_score || a.source_page - b.source_page)
    .slice(0, MAX_TABLES);
}

function loadRawTableRows(rawTableRef, rawTableCache) {
  const [rawPathPart, fragment] = rawTableRef.split('#table-');
  if (!rawPathPart || !fragment) {
    return null;
  }

  const rawPath = path.resolve(process.cwd(), rawPathPart);
  if (!rawTableCache.has(rawPath)) {
    rawTableCache.set(rawPath, JSON.parse(fs.readFileSync(rawPath, 'utf8')));
  }

  const raw = rawTableCache.get(rawPath);
  const tableIndex = Number.parseInt(fragment, 10);
  const table = raw.table_candidates.find((candidate) => candidate.table_index === tableIndex);
  return table ? table.rows : null;
}

function buildReport({ payload, reportPath, distribution, topRows }) {
  const topRowLines = topRows.slice(0, 30).map((row) => (
    `| ${row.source_page} | ${row.table_index} | ${row.row_index} | ${row.row_score} | ${row.article_no_guess.join(', ')} | ${row.dimension_values_detected.slice(0, 8).join(', ')} | ${row.row_reason.replace(/\|/g, '/')} |`
  ));
  const distributionRows = [...distribution.entries()].map(([bucket, count]) => `| ${bucket} | ${count} |`);

  return [
    `# Product Row Extraction Report: ${payload.source_file}`,
    '',
    `- Review tables loaded: ${payload.review_tables_loaded}`,
    `- Review tables processed: ${payload.review_tables_processed}`,
    `- Product row candidates generated: ${payload.product_row_candidates_generated}`,
    `- Rows rejected/ignored: ${payload.rows_rejected_ignored}`,
    `- Product rows JSON: ${payload.product_rows_path}`,
    `- Report: ${reportPath}`,
    `- Table score threshold: ${payload.table_score_threshold}`,
    `- Max tables: ${payload.max_tables}`,
    `- Row score threshold: ${payload.row_score_threshold}`,
    '',
    '## Top 30 Candidate Rows',
    '',
    '| Page | Table | Row | Score | Article guesses | Dimension values | Reasons |',
    '|---:|---:|---:|---:|---|---|---|',
    ...topRowLines,
    '',
    '## Score Distribution',
    '',
    '| Score bucket | Row count |',
    '|---|---:|',
    ...distributionRows,
    '',
    '## Limitations',
    '',
    '- Narrow pilot only: processes review tables with score >= 90, capped at 50 tables.',
    '- Output rows are unnormalized row candidates, not ToolAdvisor product records.',
    '- Some catalogue rows contain two products side by side and are not split yet.',
    '- Header context can be incomplete when PDF text extraction split multi-line headers.',
    '- No AI, OCR, final schema normalization, validation, deduping, or PRODUCT_DB merge is performed.',
    '',
  ].join('\n');
}

function extractProductRowsFromReviewTables(reviewTablesPath) {
  ensureOutputDirs();

  const resolvedReviewTablesPath = path.resolve(reviewTablesPath);
  const review = JSON.parse(fs.readFileSync(resolvedReviewTablesPath, 'utf8'));
  const pilotTables = selectPilotTables(review.review_tables || []);
  const productRows = [];
  const allScoredRows = [];
  const rawTableCache = new Map();
  let rowsSeen = 0;

  for (const table of pilotTables) {
    const rows = loadRawTableRows(table.raw_table_ref, rawTableCache) || table.sample_rows || [];
    for (let index = 0; index < rows.length; index += 1) {
      const rowIndex = index + 1;
      const scored = scoreRow(rows[index], table);
      rowsSeen += 1;
      allScoredRows.push(scored);

      if (scored.score < ROW_SCORE_THRESHOLD) {
        continue;
      }

      productRows.push(buildProductRow(table, rows[index], rowIndex, scored));
    }
  }

  productRows.sort((a, b) => b.row_score - a.row_score || a.source_page - b.source_page || a.row_index - b.row_index);

  const productRowsPath = productRowsPathForReviewTables(resolvedReviewTablesPath);
  const reportPath = productRowsReportPathForReviewTables(resolvedReviewTablesPath);
  const distribution = scoreDistribution(allScoredRows);
  const payload = {
    source_file: review.source_file,
    review_tables_path: resolvedReviewTablesPath,
    product_rows_path: productRowsPath,
    extracted_at: new Date().toISOString(),
    extraction_method: 'heuristic-product-row-v1-narrow-pilot',
    table_score_threshold: TABLE_SCORE_THRESHOLD,
    max_tables: MAX_TABLES,
    row_score_threshold: ROW_SCORE_THRESHOLD,
    review_tables_loaded: (review.review_tables || []).length,
    review_tables_processed: pilotTables.length,
    product_row_candidates_generated: productRows.length,
    rows_rejected_ignored: rowsSeen - productRows.length,
    product_rows: productRows,
  };
  const report = buildReport({
    payload,
    reportPath,
    distribution,
    topRows: productRows,
  });

  fs.writeFileSync(productRowsPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(reportPath, report, 'utf8');

  return {
    productRowsPath,
    reportPath,
    payload,
    distribution,
  };
}

function findReviewTableFiles() {
  ensureOutputDirs();
  return fs.readdirSync(reviewTablesDir)
    .filter((fileName) => fileName.endsWith('.review-tables.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => path.join(reviewTablesDir, fileName));
}

function main() {
  const inputFiles = process.argv.slice(2);
  const reviewTableFiles = inputFiles.length ? inputFiles.map((filePath) => path.resolve(filePath)) : findReviewTableFiles();

  if (!reviewTableFiles.length) {
    console.log('Review table files found: 0');
    console.log('Run npm run ingest:review-tables first.');
    return;
  }

  console.log(`Review table files found: ${reviewTableFiles.length}`);
  for (const reviewTablesPath of reviewTableFiles) {
    console.log(`Extracting product rows from ${path.basename(reviewTablesPath)}`);
    const result = extractProductRowsFromReviewTables(reviewTablesPath);
    console.log(`- Product rows: ${result.productRowsPath}`);
    console.log(`- Report: ${result.reportPath}`);
    console.log(`- Review tables loaded: ${result.payload.review_tables_loaded}`);
    console.log(`- Review tables processed: ${result.payload.review_tables_processed}`);
    console.log(`- Product row candidates: ${result.payload.product_row_candidates_generated}`);
    console.log(`- Rows rejected/ignored: ${result.payload.rows_rejected_ignored}`);
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
  extractProductRowsFromReviewTables,
  scoreRow,
};
