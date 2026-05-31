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
| mixed_unit_fields_preserved_without_conversion | 139 |

## Fields Mapped Into Candidate Schema

- `candidate_id`
- `brand`
- `source_pdf`
- `pdf_page`
- `catalog_page`
- `series`
- `product_family`
- `product_type`
- `tool_no`
- `edp`
- `normalized_dimensional_fields`
- `raw_fields`
- `unit_system`
- `warnings`
- `validation_status`
- `merge_status`
- `source_traceability`

## Fields Left Raw Or Review-Only

- `raw_fields.raw_row`
- `raw_fields.raw_y`
- `raw_fields.warnings`
- `coating_or_surface`
- `material_grade_if_present`

`coating_or_surface` and `material_grade_if_present` remain null because the source table rows do not contain those values. Mixed unit rows remain flagged and are not converted.

## Merge Status

- PRODUCT_DB merge: blocked
- Candidate merge_status: not_merged
- Candidate validation_status: validated_candidate_review

## Exact Next Step

Create a small 20-record PRODUCT_DB schema preview outside PRODUCT_DB.
