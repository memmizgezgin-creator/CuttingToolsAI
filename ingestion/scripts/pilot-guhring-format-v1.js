#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const RAW_TABLES_PATH = path.resolve(__dirname, '..', 'output', 'raw-tables', 'gue-general-catalogue-en-compressed.raw-tables.json');
const OUT_DIR = path.resolve(__dirname, '..', 'output', 'pilots', 'guhring-format-v1');
const OUT_JSON = path.join(OUT_DIR, 'clean-units.json');
const OUT_REPORT = path.join(OUT_DIR, 'report.md');
const PAGES = [337, 338, 339, 340];

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isMetricSizeCell(cell) {
  return /^\d{1,3}\.\d{3}(?:\s|$)/.test(normalizeText(cell));
}

function isArticleCell(cell) {
  return /^\d{3,4}\s+\d{1,3}\.\d{3}$/.test(normalizeText(cell));
}

function isTaperCell(cell) {
  return /^MK-\d$/i.test(normalizeText(cell));
}

function isLengthCell(cell) {
  const text = normalizeText(cell);
  return /^\d{2,3}\.0$/.test(text) || /^\d{2,3}\.\d$/.test(text);
}

function isInchCell(cell) {
  const text = normalizeText(cell);
  return /^\d+(?:\s+\d+\/\d+)?$/.test(text) || /^\d+\/\d+$/.test(text) || /^\d{1,3}\.\d{3}\s+\d+(?:\s+\d+\/\d+)?$/.test(text);
}

function metricValue(cell) {
  const match = normalizeText(cell).match(/^(\d{1,3}\.\d{3})(?:\s|$)/);
  return match ? match[1] : null;
}

function inchValue(cell) {
  const text = normalizeText(cell);
  const withMetric = text.match(/^\d{1,3}\.\d{3}\s+(.+)$/);
  if (withMetric) return withMetric[1];
  if (isInchCell(text) && !isMetricSizeCell(text)) return text;
  return null;
}

function groupRow(row) {
  const cells = row.map(normalizeText).filter(Boolean);
  const starts = [];

  for (let index = 0; index < cells.length; index += 1) {
    if (!isMetricSizeCell(cells[index])) continue;
    const hasNearbyTaper = cells.slice(index + 1, index + 5).some(isTaperCell);
    if (!hasNearbyTaper) continue;
    starts.push(index);
  }

  return starts.map((start, groupIndex) => {
    const end = starts[groupIndex + 1] ?? cells.length;
    return {
      groupIndex,
      cells: cells.slice(start, end),
    };
  });
}

function parseGroup(group) {
  const cells = group.cells;
  const diameter = metricValue(cells.find(isMetricSizeCell) || '') || null;
  const articleNumbers = cells.filter(isArticleCell);
  const shankOrType = cells.find(isTaperCell) || null;
  const inchValues = cells.map(inchValue).filter(Boolean);
  const lengthValues = cells.filter((cell) => isLengthCell(cell) && cell !== diameter);
  const warnings = [];

  if (!diameter) warnings.push('missing_diameter');
  if (!articleNumbers.length) warnings.push('missing_article_number');
  if (!shankOrType) warnings.push('missing_shank_or_type');
  if (lengthValues.length < 2) warnings.push('missing_expected_lengths');
  if (cells.length < 4) warnings.push('short_group');

  return {
    diameter,
    inchValues,
    articleNumbers,
    shankOrType,
    lengthValues,
    warnings,
  };
}

function confidenceFor(parsed) {
  let score = 50;
  if (parsed.articleNumbers.length) score += 20;
  if (parsed.diameter) score += 10;
  if (parsed.shankOrType) score += 10;
  if (parsed.lengthValues.length >= 2) score += 10;
  if (parsed.warnings.length) score -= parsed.warnings.length * 8;
  return Math.max(0, Math.min(100, score));
}

function buildUnit({ table, row, rowIndex, group, parsed, articleNo, articleIndex }) {
  const columnSide = group.groupIndex === 0 ? 'left' : group.groupIndex === 1 ? 'right' : `group-${group.groupIndex + 1}`;
  return {
    source_file: table.source_file,
    source_page: table.source_page,
    table_index: table.table_index,
    row_index: rowIndex,
    raw_row: row,
    article_no: articleNo,
    shank_or_type_guess: parsed.shankOrType,
    diameter_or_size_values: [parsed.diameter, ...parsed.inchValues].filter(Boolean),
    length_values: parsed.lengthValues,
    column_group_guess: {
      side: columnSide,
      group_index: group.groupIndex,
      article_index: articleIndex,
      raw_group: group.cells,
    },
    confidence_score: confidenceFor(parsed),
    warnings: parsed.warnings,
  };
}

function extractPilotUnits() {
  const raw = JSON.parse(fs.readFileSync(RAW_TABLES_PATH, 'utf8'));
  const tables = raw.table_candidates.filter((table) => PAGES.includes(table.source_page));
  const units = [];
  const rejectedRows = [];
  let rowsInspected = 0;

  for (const table of tables) {
    table.rows.forEach((row, index) => {
      const rowIndex = index + 1;
      if (rowIndex === 1 && row.some((cell) => normalizeText(cell).toLowerCase() === 'mm')) {
        return;
      }

      rowsInspected += 1;
      const groups = groupRow(row);
      let rowProduced = 0;

      for (const group of groups) {
        const parsed = parseGroup(group);
        parsed.articleNumbers.forEach((articleNo, articleIndex) => {
          units.push(buildUnit({ table, row, rowIndex, group, parsed, articleNo, articleIndex }));
          rowProduced += 1;
        });
      }

      if (!rowProduced) {
        rejectedRows.push({
          source_page: table.source_page,
          table_index: table.table_index,
          row_index: rowIndex,
          raw_row: row,
          reason: groups.length ? 'no article numbers in parsed groups' : 'no recognizable metric group',
        });
      }
    });
  }

  return {
    source_file: raw.source_file,
    pages_processed: PAGES,
    tables_processed: tables.map((table) => table.table_index),
    rows_inspected: rowsInspected,
    clean_units_produced: units.length,
    rejected_rows: rejectedRows,
    units,
  };
}

function reportFor(result) {
  const examples = result.units.slice(0, 30).map((unit) => (
    `| ${unit.source_page} | ${unit.table_index} | ${unit.row_index} | ${unit.article_no} | ${unit.shank_or_type_guess || ''} | ${unit.diameter_or_size_values.join(', ')} | ${unit.length_values.join(', ')} | ${unit.confidence_score} |`
  ));
  const rejectedExamples = result.rejected_rows.slice(0, 20).map((row) => (
    `| ${row.source_page} | ${row.table_index} | ${row.row_index} | ${row.reason} | ${row.raw_row.map(normalizeText).join(' / ')} |`
  ));
  const confidenceCounts = result.units.reduce((counts, unit) => {
    const bucket = unit.confidence_score >= 90 ? '90-100' : unit.confidence_score >= 75 ? '75-89' : unit.confidence_score >= 60 ? '60-74' : '<60';
    counts[bucket] = (counts[bucket] || 0) + 1;
    return counts;
  }, {});

  return [
    '# Gühring Format Pilot v1',
    '',
    `- Source file: ${result.source_file}`,
    `- Pages processed: ${result.pages_processed.join(', ')}`,
    `- Tables processed: ${result.tables_processed.join(', ')}`,
    `- Rows inspected: ${result.rows_inspected}`,
    `- Clean units produced: ${result.clean_units_produced}`,
    `- Rejected rows: ${result.rejected_rows.length}`,
    `- Output JSON: ${OUT_JSON}`,
    '',
    '## Confidence Distribution',
    '',
    '| Confidence | Units |',
    '|---|---:|',
    `| 90-100 | ${confidenceCounts['90-100'] || 0} |`,
    `| 75-89 | ${confidenceCounts['75-89'] || 0} |`,
    `| 60-74 | ${confidenceCounts['60-74'] || 0} |`,
    `| <60 | ${confidenceCounts['<60'] || 0} |`,
    '',
    '## Examples of Clean Units',
    '',
    '| Page | Table | Row | Article no. | Shank/type | Diameter/size values | Length values | Confidence |',
    '|---:|---:|---:|---|---|---|---|---:|',
    ...examples,
    '',
    '## Rejected Rows',
    '',
    '| Page | Table | Row | Reason | Raw row |',
    '|---:|---:|---:|---|---|',
    ...rejectedExamples,
    '',
    '## Remaining Ambiguity',
    '',
    '- The pilot infers column groups from repeated metric size starts, not original PDF geometry.',
    '- Article variants such as `245` and `654` for the same diameter are emitted as separate units with the same inherited dimensions.',
    '- The first table header only preserves unit labels, so `length_values` are not yet named as L1/L2.',
    '- Page-level family context such as HSS/HSCO drills appears inside some rows, not as stable metadata for every unit.',
    '',
    '## Scaling Assessment',
    '',
    'This page format is worth scaling to adjacent pages with the same Morse taper drill layout. It should not be applied globally yet; first add named column fields for this format and verify another 10-page range manually.',
    '',
  ].join('\n');
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const result = extractPilotUnits();
  fs.writeFileSync(OUT_JSON, JSON.stringify(result, null, 2), 'utf8');
  fs.writeFileSync(OUT_REPORT, reportFor(result), 'utf8');
  console.log(`Pages processed: ${result.pages_processed.join(', ')}`);
  console.log(`Rows inspected: ${result.rows_inspected}`);
  console.log(`Clean units produced: ${result.clean_units_produced}`);
  console.log(`Rejected rows: ${result.rejected_rows.length}`);
  console.log(`Output JSON: ${OUT_JSON}`);
  console.log(`Report: ${OUT_REPORT}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
