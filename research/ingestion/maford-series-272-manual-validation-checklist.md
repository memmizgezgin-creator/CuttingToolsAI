# M.A. Ford Series 272 Manual Validation Checklist

- Sample file: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-manual-validation-sample.json
- Source normalization review: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-normalization-review.json
- Validation status for every sample: pending_manual_review
- PRODUCT_DB merge: forbidden

## Fields To Check Against The PDF

- `tool_no` and `edp` match the printed row.
- `d1_diameter_inch`, `d1_diameter_wire`, `d1_diameter_mm`, and `d1_diameter_decimal` are assigned to the correct diameter columns.
- `d2_shank_inch` and `d2_shank_mm` are assigned to the correct shank columns.
- `l1_oal_inch`, `l1_oal_mm`, `l2_flute_length_inch`, and `l2_flute_length_mm` are assigned to the correct length columns.
- `flutes`, `lead_angle`, and `cutting_direction` match the table/page context.
- `raw_fields.raw_row` preserves the source row values used for the draft.
- `coating_or_surface` and `material_grade_if_present` remain null unless a source-backed field is added later.

## Manual Review Status Rules

- `valid`: source row and normalized draft fields match the PDF with no correction needed.
- `invalid`: row is not a Series 272 product row, traceability is wrong, or required identity fields do not match the PDF.
- `needs_correction`: row is traceable and likely valid, but one or more normalized fields need correction before candidate generation.

Do not mark any record as approved for PRODUCT_DB from this checklist. This checklist only supports manual validation of the review-stage draft.

## Errors That Block Normalization

- Missing or incorrect `source_pdf`, `pdf_page`, `catalog_page`, or `row_index`.
- Missing or incorrect `tool_no` or `edp`.
- Column shift that maps diameter, shank, OAL, flute length, or flute count into the wrong field.
- Raw row does not contain enough source evidence for the normalized draft.
- Mixed units are converted or merged without an explicit reviewed conversion rule.

## Errors That Block PRODUCT_DB Merge

- Any record still marked `pending_manual_review`, `invalid`, or `needs_correction`.
- Any unreviewed warning that affects identity, dimensions, or traceability.
- Missing source-backed traceability to the PDF and raw row.
- Missing explicit human approval for merge.
- Any inferred coating, material grade, or technical value without source evidence.

## Sample Records

| sample_id | pdf_page | catalog_page | row_index | tool_no | edp | warning_types |
| --- | --- | --- | --- | --- | --- | --- |
| maford-272-sample-001 | 11 | 386 | 1 | 27201300 | 03000 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row |
| maford-272-sample-002 | 11 | 386 | 2 | 27201350 | 01001 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row |
| maford-272-sample-003 | 11 | 386 | 3 | 27201380 | 01005 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row, mixed_unit_fields_preserved_without_conversion |
| maford-272-sample-004 | 20 | 395 | 43 | 27217910 | 01613 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row, mixed_unit_fields_preserved_without_conversion |
| maford-272-sample-005 | 20 | 395 | 44 | 27217950 | 03256 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row |
| maford-272-sample-006 | 21 | 396 | 1 | 27218000 | 01617 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row |
| maford-272-sample-007 | 32 | 407 | 12 | 27260940 | 02027 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row |
| maford-272-sample-008 | 32 | 407 | 13 | 27262500 | 02029 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row |
| maford-272-sample-009 | 32 | 407 | 14 | 27262990 | 02031 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row, mixed_unit_fields_preserved_without_conversion |
| maford-272-sample-010 | 11 | 386 | 9 | 27201570 | 01017 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row, mixed_unit_fields_preserved_without_conversion |
| maford-272-sample-011 | 11 | 386 | 14 | 27201770 | 01025 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row, mixed_unit_fields_preserved_without_conversion |
| maford-272-sample-012 | 11 | 386 | 19 | 27201970 | 01033 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row, mixed_unit_fields_preserved_without_conversion |
| maford-272-sample-013 | 11 | 386 | 24 | 27202170 | 01045 | coating_or_surface_not_present_in_source_row, material_grade_not_present_in_source_row, mixed_unit_fields_preserved_without_conversion |
