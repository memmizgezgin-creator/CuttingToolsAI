# Non-Insert Schema Adapter Plan

## Scope

This plan defines the minimal adapter needed before ToolAdvisor can safely represent non-insert cutting tools, using M.A. Ford Series 272 reamers as the test case.

- PRODUCT_DB changes: **not included**
- Frontend changes: **not included**
- Product record generation: **not included**
- Merge workflow: **blocked**

## 1. Current Problem

The current PRODUCT_DB and frontend assumptions are still insert-oriented.

Existing catalog and comparison behavior expects fields such as ISO material group, ISO code, grade, coating, insert shape, chipbreaker, and cutting data. Reamers do not always have those fields in the source table rows.

For M.A. Ford Series 272:

- `tool_no` and `edp` are source-backed.
- D1/D2/L1/L2/flutes are source-backed.
- Lead angle and cutting direction are source-backed from page/table context.
- ISO code is not source-backed.
- Grade is not source-backed in the extracted rows.
- Coating is not source-backed in the extracted rows.
- Material suitability is not source-backed in the extracted rows.
- Cutting data is not source-backed in the extracted rows.

The adapter must make missing data explicit instead of filling gaps with guesses.

## 2. Required Universal Fields For All Cutting Tools

Every cutting tool record, insert or non-insert, should support these fields:

| Field | Requirement |
| --- | --- |
| `id` | Stable ToolAdvisor id after approval; preview ids must remain outside PRODUCT_DB. |
| `brand` | Source-backed manufacturer/brand. |
| `category` | Broad canonical category, e.g. `reaming`, `turning`, `drilling`. |
| `product_family` | Human-readable family, e.g. `Reamer`. |
| `product_type` | Source-backed product type/series description when available. |
| `series` | Manufacturer series, e.g. `272`. |
| `manufacturer_order_code` / `tool_no` | Primary source-backed order/product code. |
| `edp` | Secondary M.A. Ford ordering identifier when present. |
| `dimensions` | Family-specific structured dimensions. |
| `source_traceability` | Source PDF, PDF page, catalog page, row index, parser, raw row. |
| `confidence` | Confidence score/basis, with merge safety separated from extraction quality. |
| `warnings` | Missing source fields, mixed units, review requirements. |
| `merge_status` | Must remain explicit, e.g. `not_merged`, `preview_only_not_merged`. |

## 3. Reamer-Specific Fields

Reamers should have a dedicated geometry/dimensions shape:

| Field | Meaning |
| --- | --- |
| `D1` | Cutting diameter. May include inch fraction, wire size, mm, and decimal inch variants. |
| `D2` | Shank diameter. |
| `L1` | Overall length. |
| `L2` | Flute length. |
| `flutes` | Flute count. |
| `lead_angle` | Lead angle if table/page context supports it. |
| `cutting_direction` | Cutting direction if table/page context supports it. |
| `unit_system` | `inch`, `metric`, or `mixed`. |
| `raw_mixed_units` | Raw unit-bearing values when inch and metric fields coexist. |

Mixed-unit rows must preserve source values separately. Do not silently convert into one canonical unit system until conversion rules are reviewed.

## 4. Optional Insert-Only Fields

These fields should be optional and must not be required for reamers:

- `iso_code`
- `insert_shape`
- `chipbreaker`
- `grade`
- `coating`
- `material_group`
- `cutting_data`

If absent from the source row/table, these fields should be `null`, `[]`, or an explicit review placeholder. They should not be invented for UI compatibility.

## 5. Frontend Compatibility Rules

Before reamers are displayed in the catalog or comparison UI, the frontend must handle missing insert-only fields safely:

1. If `iso_code` is missing, show `product_code` / `tool_no` as the primary product code.
2. If `coating` is missing, show `Not specified in source` or hide the field.
3. If `grade` is missing, show `Not specified in source` or hide the field.
4. If material suitability is not source-backed, label it as `review required` or omit it from recommendation claims.
5. Do not create fake SEO pages based on ISO code for reamers.
6. Product detail must show source traceability: PDF, catalog page, row index, and raw row/reference.
7. Filters must tolerate empty `materials`, empty `isoCodes`, empty `cuttingData`, and null `grade`/`coating`.
8. Compare views must show `—` or `Not specified in source` for Vc/feed/ap when cutting data is absent.
9. Recommendation logic must not rank a reamer for a material group unless material suitability is source-backed or explicitly reviewed.

## 6. Candidate Adapter Output Proposal

This draft shape is for an adapted preview outside PRODUCT_DB.

```json
{
  "id": "preview-maford-272-001-27201300-03000",
  "brand": "M.A. Ford",
  "category": "reaming",
  "product_family": "Reamer",
  "product_type": "TrueSize Carbide Reamer Straight Flute",
  "series": "272",
  "manufacturer_order_code": "27201300",
  "tool_no": "27201300",
  "edp": "03000",
  "product_code": "27201300",
  "display_name": "M.A. Ford Series 272 TrueSize Carbide Reamer Straight Flute 27201300",
  "dimensions": {
    "D1": {
      "inch_fraction": null,
      "wire": null,
      "mm": null,
      "decimal_inch": "0.0130",
      "source_fields": ["d1_diameter_decimal"]
    },
    "D2": {
      "inch": "0.0130",
      "mm": null,
      "source_fields": ["d2_shank_inch"]
    },
    "L1": {
      "inch": "1-1/2",
      "mm": null,
      "source_fields": ["l1_oal_inch"]
    },
    "L2": {
      "inch": "3/16",
      "mm": null,
      "source_fields": ["l2_flute_length_inch"]
    },
    "flutes": 4,
    "lead_angle": {
      "value": 45,
      "unit": "degree"
    },
    "cutting_direction": "RHC",
    "unit_system": "inch",
    "raw_mixed_units": null
  },
  "insert_fields": {
    "iso_code": null,
    "insert_shape": null,
    "chipbreaker": null,
    "grade": null,
    "coating": null,
    "material_group": [],
    "cutting_data": []
  },
  "material_suitability": {
    "status": "requires_review",
    "values": [],
    "source_backed": false
  },
  "operation_suitability": {
    "status": "draft_review",
    "values": ["reaming"],
    "source_backed": "product_family_only"
  },
  "source_traceability": {
    "source_pdf": "/Users/muratonder/Desktop/MAFord_2018_Master_Catalog_Reamers.pdf",
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 1,
    "parser_name": "maford-reamer-272-full-range",
    "parser_version": "extract-maford-reamer-272-full-range.js",
    "raw_row": ["27201300", "03000", "0.0130", "0.0130", "1-1/2", "3/16", "4"]
  },
  "confidence": {
    "level": "review_high",
    "score": 90,
    "basis": [
      "format_specific_parser_validated_on_manual_sample",
      "automated_validation_passed_all_924_records",
      "source_traceability_preserved",
      "not_human_approved_for_merge"
    ],
    "safe_for_direct_PRODUCT_DB_merge": false
  },
  "warnings": [
    "coating_or_surface_not_present_in_source_row",
    "material_grade_not_present_in_source_row"
  ],
  "merge_status": "preview_only_not_merged"
}
```

## 7. Merge Gate

### Must Be True Before PRODUCT_DB Merge

- A reviewed adapter exists for reamers.
- All required universal fields are populated.
- Source traceability is complete for every record.
- Mixed-unit values are preserved and clearly labeled.
- Missing ISO/coating/grade/material/cutting data fields remain explicit nulls, empty arrays, or review placeholders.
- Frontend guards exist for missing insert-only fields.
- Manual approval exists for the adapted records.
- Merge status is intentionally moved from preview/review to a merge-eligible status by a human.

### Blocks Merge

- Missing `source_traceability`.
- Missing `tool_no` or `edp` for M.A. Ford Series 272.
- Any fake ISO group, fake grade, fake coating, or fake material suitability.
- Any silent unit conversion.
- Any record still marked `preview_only_not_merged`, `not_merged`, `validated_candidate_review`, or `requires_review`.
- Frontend still assuming non-empty `materials`, `isoCodes`, `grade`, `coating`, or `cuttingData`.

### Required Frontend Guard Functions

- `getPrimaryProductCode(product)`: return ISO/insert code when present, otherwise `product_code`/`tool_no`.
- `getDisplayGrade(product)`: return grade when source-backed, otherwise `Not specified in source` or hide.
- `getDisplayCoating(product)`: return coating when source-backed, otherwise `Not specified in source` or hide.
- `getMaterialBadges(product)`: return source-backed ISO/material badges only; tolerate empty arrays.
- `getOperationBadges(product)`: show reviewed operations; mark draft operations if not fully reviewed.
- `getCuttingDataDisplay(product)`: tolerate empty cutting data and avoid ranking claims from missing values.
- `getSeoLinks(product)`: do not generate ISO insert SEO links when `iso_code`/`isoCodes` are absent.
- `getSourceTraceabilityDisplay(product)`: show source PDF, catalog page, row index, and confidence/review status.

## 8. Exact Next Recommended Step

Create a 20-record non-insert adapted preview outside PRODUCT_DB.

The preview should use the existing M.A. Ford Series 272 candidate records and map them into the adapter shape defined above. It should not alter PRODUCT_DB, should not modify frontend files, and should remain a review artifact until the adapter and frontend guards are approved.
