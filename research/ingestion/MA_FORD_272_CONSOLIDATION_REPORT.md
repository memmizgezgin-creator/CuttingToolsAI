# M.A. Ford Series 272 Ingestion Consolidation Report

## 1. Goal

Build a traceable, local PDF catalog ingestion pipeline for cutting tool product data. The pipeline must preserve source evidence from manufacturer PDFs and produce reviewable intermediate artifacts before any product database work.

The current goal is not generic catalog understanding. The current goal is a reliable, format-specific parser for M.A. Ford Series 272 reamer product tables.

## 2. What Has Been Tested

### Generic Pipeline

- Raw PDF page text extraction.
- Raw table candidate extraction.
- Review table filtering.
- Product row extraction.
- Product unit splitting.
- Product unit review and quality audit.

### Gühring Catalogue

- Source: `GUE_general-catalogue_EN_compressed.pdf`
- Raw text extraction:
  - 1608 pages.
  - 1605 pages with text.
- Raw table extraction:
  - 2125 table candidates.
- Generic parser quality gate:
  - high_quality = 0.
  - best generic unit score = 65.

### M.A. Ford Reamer PDF

- Source: `/Users/muratonder/Desktop/MAFord_2018_Master_Catalog_Reamers.pdf`
- Series 270P pilot:
  - PDF page 9 / catalog page 384.
  - 43 clean range-spec rows.
- Series 272 pilot:
  - PDF page 11 / catalog page 386.
  - 42 rows extracted.
  - `tool_no`, `edp`, `d1_diameter_decimal`, `d2_shank_inch`, and `flutes` complete.
- Series 272 verification:
  - PDF page 12 / catalog page 387.
  - PDF page 20 / catalog page 395.
  - Required product fields complete on both pages.
- Series 272 boundary check:
  - PDF page 32 / catalog page 407.
  - 14 rows extracted.
  - Layout status: stable.
  - `safe_to_scale: true`.
  - Recommended full range: PDF pages 11-32 / catalog pages 386-407.

## 3. What Worked

- Local PDF parsing with `pdfjs-dist` works.
- Raw text and raw table outputs are useful for inspection and audit.
- Format-specific extraction works better than generic extraction when the table layout is stable.
- M.A. Ford Series 272 has stable Tool No. / EDP table geometry across sampled pages.
- The Series 272 parser preserves missing values as `null` rather than guessing absent fields.
- Traceability is preserved in parser outputs through `source_file`, `source_page`, `catalog_page`, and `raw_row`.

## 4. What Failed

The generic parser is not acceptable for production candidate creation yet.

Observed generic parser failures:

- It lost column group context.
- It could not reliably map article numbers to the correct dimensions.
- Header context was weak or partial.
- Row splitting created short fragments that lost nearby dimensions.
- Numeric detection mixed article codes, diameters, lengths, Morse taper values, and inch fractions.
- Product unit review produced `high_quality = 0`.

## 5. Evidence Files, Scripts, and Outputs

### Governance

- `AGENTS.md`
- `ingestion/SCHEMA.md`
- `ingestion/VALIDATION_RULES.md`
- `ingestion/REVIEW_WORKFLOW.md`

### Generic Ingestion Scripts

- `ingestion/scripts/scan-pending.js`
- `ingestion/scripts/extract-page-text.js`
- `ingestion/scripts/write-raw-page-text-json.js`
- `ingestion/scripts/create-basic-report.js`
- `ingestion/scripts/extract-table-candidates.js`
- `ingestion/scripts/review-table-candidates.js`
- `ingestion/scripts/extract-product-rows.js`
- `ingestion/scripts/split-product-units.js`
- `ingestion/scripts/review-product-units.js`
- `ingestion/scripts/audit-product-unit-quality.js`

### M.A. Ford Pilot Scripts

- `ingestion/scripts/pilot-maford-reamer-270p-v1.js`
- `ingestion/scripts/pilot-maford-reamer-272-v1.js`
- `ingestion/scripts/pilot-maford-reamer-272-v2-verify.js`
- `ingestion/scripts/pilot-maford-reamer-272-boundary.js`

### M.A. Ford Outputs

- `ingestion/output/pilots/maford-reamer-270p-v1/rows.json`
- `ingestion/output/pilots/maford-reamer-270p-v1/report.md`
- `ingestion/output/pilots/maford-reamer-272-v1/rows.json`
- `ingestion/output/pilots/maford-reamer-272-v1/report.md`
- `ingestion/output/pilots/maford-reamer-272-v2-verification/rows.json`
- `ingestion/output/pilots/maford-reamer-272-v2-verification/report.md`
- `ingestion/output/pilots/maford-reamer-272-boundary-check/rows.json`
- `ingestion/output/pilots/maford-reamer-272-boundary-check/report.md`

### Generic Quality Evidence

- `ingestion/output/audit/product-unit-quality-audit.md`
- `ingestion/output/review-units/gue-general-catalogue-en-compressed.review-units.json`
- `ingestion/output/product-units/gue-general-catalogue-en-compressed.product-units.json`

## 6. Why Generic Parsing Is Currently Rejected

Generic parsing is rejected because it cannot currently preserve enough table structure to create reliable product records.

The quality audit shows:

- Product units loaded: 1111.
- High quality: 0.
- Needs review: 751.
- Rejected: 360.
- No unit reached the high-quality threshold.
- The best units were capped at score 65.

This means the generic parser is useful for exploration, but not safe for structured product extraction.

## 7. Why Format-Specific Parsing Is Accepted

Format-specific parsing is accepted because it uses known table geometry and catalog-specific rules. This allows the parser to map values to columns without guessing.

For M.A. Ford Series 272, the parser can read stable x-position buckets for:

- Tool No.
- EDP.
- D1 diameter columns.
- D2 shank columns.
- L1 OAL columns.
- L2 flute length columns.
- Flutes.

This approach is narrower, but more reliable and auditable.

## 8. Current M.A. Ford Series 272 Quality Evidence

### Initial Page

PDF page 11 / catalog page 386:

- Rows extracted: 42.
- `tool_no`: 42/42.
- `edp`: 42/42.
- `d1_diameter_decimal`: 42/42.
- `d2_shank_inch`: 42/42.
- `flutes`: 42/42.

### Verification Pages

PDF page 12 / catalog page 387:

- Rows extracted: 46.
- `tool_no`: 46/46.
- `edp`: 46/46.
- `d1_diameter_decimal`: 46/46.
- `d2_shank_inch`: 46/46.
- `flutes`: 46/46.

PDF page 20 / catalog page 395:

- Rows extracted: 44.
- `tool_no`: 44/44.
- `edp`: 44/44.
- `d1_diameter_decimal`: 44/44.
- `d2_shank_inch`: 44/44.
- `flutes`: 44/44.

### Boundary Page

PDF page 32 / catalog page 407:

- Rows extracted: 14.
- Rows rejected: 1.
- Layout status: stable.
- `tool_no`: 14/14.
- `edp`: 14/14.
- `d1_diameter_decimal`: 14/14.
- `d2_shank_inch`: 14/14.
- `flutes`: 14/14.
- `safe_to_scale: true`.

Recommended extraction range:

- PDF pages 11-32.
- Catalog pages 386-407.

## 9. Exact Next Safe Action

Create a full-range M.A. Ford Series 272 extraction script for PDF pages 11-32 / catalog pages 386-407.

Required safety controls:

- Process only the Series 272 page range.
- Preserve one output JSON and one report under a new pilot folder.
- Keep all missing optional values as `null`.
- Stop or flag the run if any page loses 100% completeness for:
  - `tool_no`
  - `edp`
  - `d1_diameter_decimal`
  - `d2_shank_inch`
  - `flutes`
- Do not write to PRODUCT_DB.
- Do not create final ToolAdvisor candidates.

Suggested next output folder:

- `ingestion/output/pilots/maford-reamer-272-full-range-v1/`

## 10. Non-Goals and Forbidden Actions

Do not:

- Merge anything into `PRODUCT_DB`.
- Modify `directory-data.js`.
- Create or modify UI.
- Use AI extraction.
- Run all PDFs.
- Run the generic parser for production extraction.
- Normalize into final ToolAdvisor product candidates.
- Broaden beyond M.A. Ford Series 272.
- Touch unrelated ToolAdvisor app logic.
- Infer missing values.

The next step is still ingestion-only, source-backed, and review-oriented.

## Available Commands

Existing relevant commands:

```bash
npm run ingest:pilot:maford-reamer-270p-v1
npm run ingest:pilot:maford-reamer-272-v1
npm run ingest:pilot:maford-reamer-272-v2-verify
npm run ingest:pilot:maford-reamer-272-boundary
```

The full-range extraction command does not exist yet. It should be added only in the next task.
