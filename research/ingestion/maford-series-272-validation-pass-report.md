# M.A. Ford Series 272 Validation Pass

- Input file: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-normalization-review.json
- Reviewed sample evidence file: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-manual-validation-reviewed.json
- Total records checked: 924
- Passed records: 924
- Failed records: 0
- Duplicate count: 0
- Missing tool_no count: 0
- Missing edp count: 0
- Page range validation result: true
- Catalog page range validation result: true
- Safe for product candidate generation: true
- Safe for PRODUCT_DB merge: false

This validation pass does not create PRODUCT_DB entries. It checks whether the 924 normalized review records are structurally safe for the next outside-PRODUCT_DB candidate-generation step.

## Manual Sample Evidence

- Reviewed records: 13
- Passed records: 13
- Failed records: 0
- Uncertain records: 0
- Pages reviewed: 11, 20, 21, 32
- Row alignment concerns: 0

## Warning Counts

| Warning | Count |
| --- | --- |
| coating_or_surface_not_present_in_source_row | 924 |
| material_grade_not_present_in_source_row | 924 |
| mixed_unit_fields_preserved_without_conversion | 139 |

## Failure Counts

No validation failures found.

## Notes

- `coating_or_surface` and `material_grade_if_present` are intentionally not required because they are not present in the source rows.
- Mixed unit rows must remain flagged and must preserve raw source values without silent conversion.
- PRODUCT_DB merge remains blocked even when validation passes.
- Next safe step: generate product candidate review records outside PRODUCT_DB.
