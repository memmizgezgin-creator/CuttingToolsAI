// ToolAdvisor — real catalog metrics (single source of truth for the site).
// Counts come from the live product DB mirror data/extracted-productdb-candidates.json
// (the AI's reference layer; same file verify-bulk-approval.mjs audits).
//
// brands = distinct after normalization: case-insensitive, and "Sandvik Coromant"
// counts as Sandvik (same manufacturer). Raw file has 10 spellings → 8 real brands.
//
// To update after an ingestion merge, run: node scripts/verify-catalog-metrics.mjs
// It recomputes from the data file and FAILS if these numbers have drifted.
window.TA_CATALOG_METRICS = {
  tools:  1202,   // total verified product records
  brands: 8,      // Gühring, ISCAR, Sandvik, Walter, Kennametal, Kyocera, Tungaloy, YG-1
};
