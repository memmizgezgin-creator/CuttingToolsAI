#!/usr/bin/env node

/**
 * Migration: Add source_file and source_page fields to extracted-productdb-candidates.json
 *
 * Rules:
 * - Gühring          → guhring_catalogue
 * - Walter           → walter_complete
 * - ISCAR            → iscar_aluminum_machining
 * - Sandvik Coromant → sandvik_solid_round_tools   (326R/A326R article codes confirmed)
 * - Kennametal       → kennametal_turning_brochure  (grade codes KCP25C etc confirmed)
 * - others           → null
 *
 * Always overwrites source_file when a mapping exists (fixes previously null records).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.resolve(__dirname, '../data/extracted-productdb-candidates.json');
const BACKUP_FILE = DATA_FILE + '.pre-migration-' + new Date().toISOString().split('T')[0];

// Source file mapping by brand
const BRAND_SOURCE_MAP = {
  'Gühring':           'guhring_catalogue',
  'Walter':            'walter_complete',
  'ISCAR':             'iscar_aluminum_machining',
  'Sandvik Coromant':  'sandvik_solid_round_tools',
  'Kennametal':        'kennametal_turning_brochure',
};

function migrateRecords(tools) {
  let migratedCount = 0;
  let unchangedCount = 0;

  tools.forEach((tool) => {
    const mapped = BRAND_SOURCE_MAP[tool.brand] || null;

    // Skip only if the stored value is already correct (non-null and matches map)
    if (tool.source_file === mapped && 'source_page' in tool) {
      unchangedCount++;
      return;
    }

    tool.source_file = mapped;
    tool.source_page = tool.source_page ?? null; // preserve if already set

    migratedCount++;
  });

  return { migratedCount, unchangedCount };
}

function main() {
  try {
    // Read current data
    console.log(`Reading ${DATA_FILE}...`);
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(content);

    console.log(`Found ${data.total} tools in database`);

    // Create backup
    console.log(`Creating backup: ${BACKUP_FILE}`);
    fs.writeFileSync(BACKUP_FILE, content, 'utf8');

    // Migrate
    const { migratedCount, unchangedCount } = migrateRecords(data.tools);

    // Write updated data
    console.log(`Writing updated data to ${DATA_FILE}...`);
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');

    console.log('\n✓ Migration complete!');
    console.log(`  - Migrated: ${migratedCount} records`);
    console.log(`  - Unchanged: ${unchangedCount} records`);
    console.log(`  - Backup created: ${BACKUP_FILE}`);

    // Summary by brand
    const byBrand = {};
    data.tools.forEach(tool => {
      if (!byBrand[tool.brand]) byBrand[tool.brand] = { count: 0, source_file: null };
      byBrand[tool.brand].count++;
      byBrand[tool.brand].source_file = tool.source_file;
    });

    console.log('\nSummary by brand:');
    Object.entries(byBrand)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([brand, data]) => {
        console.log(`  - ${brand}: ${data.count} records → source_file: ${data.source_file || 'null'}`);
      });

  } catch (error) {
    console.error('Error during migration:', error.message);
    process.exit(1);
  }
}

main();
