# M.A. Ford Series 272 Product Candidates

- Input file: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-normalization-review.json
- Validation summary: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-validation-pass-summary.json
- Validation report: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-validation-pass-report.md
- Output file: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-product-candidates.json
- Total candidates created: 924
- Source records passed validation: 924
- Safe for product candidate generation: true
- Safe for PRODUCT_DB merge: false

These are review-stage product candidate records only. No PRODUCT_DB or frontend catalog files were written.

## Warning Counts

| Warning | Count |
| --- | --- |
| coating_or_surface_not_present_in_source_row | 924 |
| material_grade_not_present_in_source_row | 924 |
| MISSING_COATING | 924 |
| MISSING_CUTTING_DATA | 924 |
| MISSING_ISO_MATERIALS | 924 |
| MISSING_OPERATION | 924 |
| mixed_unit_fields_preserved_without_conversion | 139 |

## Fields Mapped Into Candidate Schema

- `id`
- `brand`
- `source_file`
- `source_page`
- `raw_row_ref`
- `raw_table_ref`
- `source_type`
- `source_name`
- `extraction_method`
- `designation`
- `article_no`
- `product_family`
- `type`
- `diameter_d1_mm`
- `diameter_d2_mm`
- `oal_l1_mm`
- `flute_length_l2_mm`
- `flutes`
- `handedness`
- `coating`
- `iso_materials`
- `operations`
- `confidence_score`
- `confidence_reason`
- `risk_flags`
- `validation_status`
- `ai_inferred_fields`
- `last_checked`

## Fields Left Raw Or Review-Only

- `raw_fields.raw_row`
- `raw_fields.raw_y`
- `raw_fields.warnings`
- `inch-only dimensions`
- `coating`
- `substrate`
- `iso_grade`
- `iso_materials`
- `operations`
- `cutting data`

`coating`, `substrate`, `iso_grade`, `iso_materials`, `operations`, and cutting-data fields remain null because the source table rows do not contain those values. Inch-only dimensions are preserved in `raw_fields` and are not converted into mm schema fields.

## Merge Status

- PRODUCT_DB merge: blocked
- Candidate merge_status: not_merged
- New candidates start as validation_status: extracted_candidate
- Candidates with warnings or missing required technical fields are moved to validation_status: needs_review

## Exact Next Step

Human review these candidate records against the source PDF/raw rows before any separate merge workflow is considered.
