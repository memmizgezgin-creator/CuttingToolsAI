#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  ensureOutputDirs,
  rawTablesDir,
  reviewTablesPathForRawTables,
  reviewTablesReportPathForRawTables,
} = require('./shared');

const SELECT_THRESHOLD = 45;

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function flattenRows(rows) {
  return rows.map((row) => row.map(normalizeText).filter(Boolean));
}

function numericCellCount(row) {
  return row.filter((cell) => /\b\d{1,4}(?:[.,]\d{1,4})?\b/.test(cell)).length;
}

function repeatedNumericColumnScore(rows) {
  const structuredRows = rows.filter((row) => numericCellCount(row) >= 3);
  if (structuredRows.length >= 20) return 25;
  if (structuredRows.length >= 10) return 18;
  if (structuredRows.length >= 5) return 10;
  return 0;
}

function estimateColumnCount(table, rows) {
  if (table.columns_if_detected && table.columns_if_detected.column_count) {
    return table.columns_if_detected.column_count;
  }

  const counts = new Map();
  for (const row of rows) {
    counts.set(row.length, (counts.get(row.length) || 0) + 1);
  }

  let best = 0;
  let bestFrequency = 0;
  for (const [count, frequency] of counts.entries()) {
    if (count > 0 && frequency > bestFrequency) {
      best = count;
      bestFrequency = frequency;
    }
  }

  return best || null;
}

function guessHeader(rows) {
  const headerSignals = /\b(mm|inch|d1|d2|l1|l2|oal|flute|diameter|order|article|no\.?|coating|type)\b/i;
  const firstRows = rows.slice(0, 3);
  const found = firstRows.find((row) => headerSignals.test(row.join(' ')));
  return found || firstRows[0] || [];
}

function scoreTable(table) {
  const rows = flattenRows(table.rows || []);
  const rawText = normalizeText(table.raw_text || rows.map((row) => row.join(' ')).join(' '));
  const lower = rawText.toLowerCase();
  const reasons = [];
  const warnings = [...(table.warnings || [])];
  let score = 0;

  const rowCount = rows.length;
  const columnCount = estimateColumnCount(table, rows) || 0;
  const numericRows = rows.filter((row) => numericCellCount(row) >= 3).length;

  if (rowCount >= 20) {
    score += 15;
    reasons.push('many rows');
  } else if (rowCount >= 8) {
    score += 8;
    reasons.push('moderate row count');
  } else if (rowCount < 5) {
    score -= 18;
    reasons.push('very few rows');
    warnings.push('few_rows');
  }

  if (columnCount >= 8) {
    score += 12;
    reasons.push('wide structured table');
  } else if (columnCount >= 4) {
    score += 6;
    reasons.push('multiple columns');
  }

  const repeatedNumericScore = repeatedNumericColumnScore(rows);
  if (repeatedNumericScore) {
    score += repeatedNumericScore;
    reasons.push('repeated numeric columns');
  } else {
    score -= 10;
    reasons.push('no repeated structured numeric pattern');
    warnings.push('weak_numeric_pattern');
  }

  if (/(^|[\s#|])\d{3,5}\s+\d{1,3}(?:[.,]\d{1,3})?\b/.test(rawText) || /(^|[\s#|])\d{4,6}(?:[.,]\d{1,3})?\b/.test(rawText)) {
    score += 15;
    reasons.push('article-number-like values');
  }

  if (/\b(?:rt\s?\d+|rf\s?\d+|din\s?\d+|mk-\d|m\d{1,2}|[a-z]{1,4}\s?\d{2,})\b/i.test(rawText)) {
    score += 8;
    reasons.push('designation-like codes');
  }

  if (/[øØ⌀]|\bd1\b|\bd2\b|\bdiameter\b|\bdia\.?\b/i.test(rawText)) {
    score += 10;
    reasons.push('diameter symbols or labels');
  }

  if (/\bmm\b/i.test(rawText) || /\b\d{1,3}(?:[.,]\d{1,3})?\s*mm\b/i.test(rawText)) {
    score += 8;
    reasons.push('metric dimension labels or values');
  }

  if (/\b(?:l1|l2|oal|overall length|flute length)\b/i.test(rawText)) {
    score += 8;
    reasons.push('length field labels');
  }

  if (/\b(?:coating|substrate|carbide|solid carbide|hss|hsco|fire|tialn|altin|pvd|cobalt)\b/i.test(rawText)) {
    score += 8;
    reasons.push('coating or substrate terms');
  }

  if (/\b(?:drill|reamer|tap|end mill|endmill|milling cutter|cutter|countersink|thread mill)\b/i.test(rawText)) {
    score += 8;
    reasons.push('product family terms');
  }

  if (/\b(?:contents|index|page|chapter)\b/i.test(lower) && rowCount < 12) {
    score -= 18;
    reasons.push('index or table-of-contents pattern');
    warnings.push('possible_index_or_contents');
  }

  if (/\b(?:liability|conditions of sale|terms of payment|safety|warning|copyright|technical changes)\b/i.test(lower)) {
    score -= 25;
    reasons.push('legal or safety text');
    warnings.push('possible_legal_or_safety_text');
  }

  const proseCells = rows.flat().filter((cell) => cell.split(/\s+/).length >= 8).length;
  if (proseCells >= Math.max(2, rows.length / 3)) {
    score -= 18;
    reasons.push('mostly prose cells');
    warnings.push('possible_prose');
  }

  if (numericRows < Math.max(3, Math.floor(rowCount * 0.25))) {
    score -= 8;
    warnings.push('few_numeric_rows');
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  return {
    score: boundedScore,
    reasons,
    warnings: [...new Set(warnings)],
    rowCount,
    columnCount: columnCount || null,
    headerGuess: guessHeader(rows),
    sampleRows: rows.slice(0, 8),
  };
}

function rawTableRef(rawTablesPath, table) {
  return `${path.relative(process.cwd(), rawTablesPath)}#table-${table.table_index}`;
}

function toReviewRecord(rawTablesPath, table, scored) {
  return {
    source_file: table.source_file,
    source_page: table.source_page,
    table_index: table.table_index,
    raw_table_ref: rawTableRef(rawTablesPath, table),
    row_count: scored.rowCount,
    column_count_estimate: scored.columnCount,
    header_guess: scored.headerGuess,
    sample_rows: scored.sampleRows,
    product_table_score: scored.score,
    product_table_reason: scored.reasons.join('; ') || 'No strong product table signals detected',
    warnings: scored.warnings,
  };
}

function scoreDistribution(scoredTables) {
  const buckets = new Map([
    ['90-100', 0],
    ['75-89', 0],
    ['60-74', 0],
    ['45-59', 0],
    ['1-44', 0],
    ['0', 0],
  ]);

  for (const item of scoredTables) {
    const score = item.scored.score;
    if (score >= 90) buckets.set('90-100', buckets.get('90-100') + 1);
    else if (score >= 75) buckets.set('75-89', buckets.get('75-89') + 1);
    else if (score >= 60) buckets.set('60-74', buckets.get('60-74') + 1);
    else if (score >= 45) buckets.set('45-59', buckets.get('45-59') + 1);
    else if (score > 0) buckets.set('1-44', buckets.get('1-44') + 1);
    else buckets.set('0', buckets.get('0') + 1);
  }

  return buckets;
}

function buildReport({ payload, reportPath, distribution, topReviewTables }) {
  const topRows = topReviewTables.slice(0, 30).map((table) => (
    `| ${table.source_page} | ${table.table_index} | ${table.product_table_score} | ${table.row_count} | ${table.column_count_estimate || ''} | ${table.product_table_reason.replace(/\|/g, '/')} |`
  ));

  const distributionRows = [...distribution.entries()].map(([bucket, count]) => `| ${bucket} | ${count} |`);

  return [
    `# Review Tables Report: ${payload.source_file}`,
    '',
    `- Raw table candidates loaded: ${payload.raw_table_candidates_loaded}`,
    `- Review tables selected: ${payload.review_tables_selected}`,
    `- Rejected/low-score tables: ${payload.rejected_low_score_tables_count}`,
    `- Review tables JSON: ${payload.review_tables_path}`,
    `- Report: ${reportPath}`,
    `- Selection threshold: ${payload.selection_threshold}`,
    '',
    '## Top 30 Review Table Pages',
    '',
    '| Page | Table | Score | Rows | Columns | Reasons |',
    '|---:|---:|---:|---:|---:|---|',
    ...topRows,
    '',
    '## Score Distribution',
    '',
    '| Score bucket | Table count |',
    '|---|---:|',
    ...distributionRows,
    '',
    '## Limitations',
    '',
    '- This pass only selects likely product tables; it does not create product candidates.',
    '- Scores are deterministic heuristics and require human review.',
    '- Dense index pages or catalogue selection matrices can still score highly.',
    '- Sparse product tables with minimal labels may be under-scored.',
    '- No AI, OCR, normalization, validation, deduping, or PRODUCT_DB merge is performed.',
    '',
  ].join('\n');
}

function reviewRawTablesFile(rawTablesPath) {
  ensureOutputDirs();

  const resolvedRawTablesPath = path.resolve(rawTablesPath);
  const raw = JSON.parse(fs.readFileSync(resolvedRawTablesPath, 'utf8'));
  const scoredTables = raw.table_candidates.map((table) => ({
    table,
    scored: scoreTable(table),
  }));
  const selected = scoredTables
    .filter((item) => item.scored.score >= SELECT_THRESHOLD)
    .map((item) => toReviewRecord(resolvedRawTablesPath, item.table, item.scored))
    .sort((a, b) => b.product_table_score - a.product_table_score || a.source_page - b.source_page);

  const reviewTablesPath = reviewTablesPathForRawTables(resolvedRawTablesPath);
  const reportPath = reviewTablesReportPathForRawTables(resolvedRawTablesPath);
  const distribution = scoreDistribution(scoredTables);
  const payload = {
    source_file: raw.source_file,
    raw_tables_path: resolvedRawTablesPath,
    review_tables_path: reviewTablesPath,
    reviewed_at: new Date().toISOString(),
    selection_method: 'heuristic-product-table-score-v1',
    selection_threshold: SELECT_THRESHOLD,
    raw_table_candidates_loaded: raw.table_candidates.length,
    review_tables_selected: selected.length,
    rejected_low_score_tables_count: raw.table_candidates.length - selected.length,
    review_tables: selected,
  };
  const report = buildReport({
    payload,
    reportPath,
    distribution,
    topReviewTables: selected,
  });

  fs.writeFileSync(reviewTablesPath, JSON.stringify(payload, null, 2), 'utf8');
  fs.writeFileSync(reportPath, report, 'utf8');

  return {
    reviewTablesPath,
    reportPath,
    payload,
    distribution,
  };
}

function findRawTableFiles() {
  ensureOutputDirs();
  return fs.readdirSync(rawTablesDir)
    .filter((fileName) => fileName.endsWith('.raw-tables.json'))
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => path.join(rawTablesDir, fileName));
}

function main() {
  const inputFiles = process.argv.slice(2);
  const rawTableFiles = inputFiles.length ? inputFiles.map((filePath) => path.resolve(filePath)) : findRawTableFiles();

  if (!rawTableFiles.length) {
    console.log('Raw table files found: 0');
    console.log('Run npm run ingest:tables first.');
    return;
  }

  console.log(`Raw table files found: ${rawTableFiles.length}`);
  for (const rawTablesPath of rawTableFiles) {
    console.log(`Reviewing ${path.basename(rawTablesPath)}`);
    const result = reviewRawTablesFile(rawTablesPath);
    console.log(`- Review tables: ${result.reviewTablesPath}`);
    console.log(`- Report: ${result.reportPath}`);
    console.log(`- Raw table candidates loaded: ${result.payload.raw_table_candidates_loaded}`);
    console.log(`- Likely product tables selected: ${result.payload.review_tables_selected}`);
    console.log(`- Rejected/low-score tables: ${result.payload.rejected_low_score_tables_count}`);
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
  reviewRawTablesFile,
  scoreTable,
};
