# M.A. Ford Series 272 PRODUCT_DB Schema Preview

- Input file: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-product-candidates.json
- Output file: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-product-db-preview-20.json
- Total preview records: 20
- PRODUCT_DB untouched: true
- Safe for direct PRODUCT_DB merge: false

This is a schema compatibility preview only. It is not production data and does not modify PRODUCT_DB.

## Mapping Decisions

- `tool_no` and `edp` map directly from validated candidate identity fields.
- Dimensional fields are nested under `dimensions` and preserve source values without conversion.
- `material_suitability` uses an explicit `requires_review` placeholder because the source rows do not contain material suitability.
- `operation_suitability` uses `draft_review` with `reaming` from the Series 272 product family/type context.
- `iso_code`, `coating_or_surface`, and `grade` remain null.
- `source_traceability` preserves source PDF, page, catalog page, row index, parser details, candidate id, and raw row.

## Fields Mapped Cleanly

- `id`
- `brand`
- `series`
- `name`
- `category`
- `product_family`
- `product_type`
- `tool_no`
- `edp`
- `dimensions`
- `source`
- `source_traceability`
- `warnings`
- `merge_status`

## Fields Left Null Or Review

- `iso_code`
- `coating_or_surface`
- `grade`
- `material_suitability`
- `operation_suitability`
- `mixed unit canonical conversions`

## Warning Counts

| Warning | Count |
| --- | --- |
| coating_or_surface_not_present_in_source_row | 20 |
| material_grade_not_present_in_source_row | 20 |
| mixed_unit_fields_preserved_without_conversion | 8 |

## Schema Gaps Found

- No source-backed ISO code in Series 272 table rows.
- No source-backed coating_or_surface in Series 272 table rows.
- No source-backed grade/material grade in Series 272 table rows.
- Material suitability is absent from row source and remains a review placeholder.
- Operation suitability is derived from product family/product type and remains draft/review.
- Mixed inch/metric rows are preserved but not converted into a single canonical unit system.

## Exact Next Recommended Step

Review this 20-record preview against the current PRODUCT_DB schema expectations, then decide which fields need schema adapters before any merge workflow is designed.
