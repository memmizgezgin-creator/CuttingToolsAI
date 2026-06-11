// ToolAdvisor — real catalog metrics (single source of truth for the site).
// Counts come from the live product DB mirror data/extracted-productdb-candidates.json
// (the AI's reference layer; same file verify-bulk-approval.mjs audits).
//
// brands = distinct canonical brands. The executable mapping lives in
// scripts/lib/brand-canonical.js (case-insensitive; "Sandvik Coromant" counts
// as Sandvik). Since the 2026-06-11 normalization (scripts/normalize-brands.js)
// the DB stores canonical spellings directly, so raw distinct = canonical
// distinct = 8; original spellings are preserved per record in brand_raw.
//
// To update after an ingestion merge, run: node scripts/verify-catalog-metrics.mjs
// It recomputes from the data file and FAILS if these numbers have drifted.
window.TA_CATALOG_METRICS = {
  tools:  1202,   // total verified product records
  brands: 8,      // Gühring, ISCAR, Sandvik, Walter, Kennametal, Kyocera, Tungaloy, YG-1
};
