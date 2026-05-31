# M.A. Ford Series 272 Schema Compatibility Assessment

## Scope

This assessment reviews the 20-record M.A. Ford Series 272 PRODUCT_DB schema preview against the current ToolAdvisor product data structure.

- Preview file: `research/ingestion/maford-series-272-product-db-preview-20.json`
- Current product data file inspected: `directory-data.js`
- Current frontend expectations inspected read-only in `catalog.html`
- PRODUCT_DB merge: **not performed**
- Frontend changes: **not performed**
- Series scope: **272 only**

## Conclusion

Series 272 is **not safe for direct PRODUCT_DB merge now**.

The parser output is strong enough for candidate generation, but the current PRODUCT_DB/UI model is still heavily insert-oriented and assumes material ISO groups, grade/coating, operation fit, and cutting data are present or can be displayed as ordinary catalog facts. Series 272 reamers should be represented with a source-backed non-insert schema adapter before any merge workflow exists.

## 1. Compatible Current PRODUCT_DB Fields

The following current or canonical ToolAdvisor fields are compatible with Series 272 reamer candidates:

| Current / Canonical Field | Series 272 Mapping | Compatibility |
| --- | --- | --- |
| `id` | Preview/candidate id can become a stable ToolAdvisor id after approval | Compatible |
| `brand` | `M.A. Ford` | Compatible |
| `manufacturer` | `M.A. Ford` if added | Compatible |
| `product_code` / legacy `code` | Prefer `tool_no`; optionally expose `edp` as secondary order code | Compatible |
| `series` | `272` | Compatible |
| `tool_type` | `reamer` | Compatible with schema proposal |
| `category` / `canonical_category` | `reaming` | Compatible with schema proposal |
| `family` | `Reaming` or `Reamer`, depending adapter layer | Compatible with legacy UI if normalized carefully |
| `op` / `operation` | `Finishing` / `["finishing"]` or reviewed `["reaming"]` | Partially compatible, needs adapter choice |
| `dimensions` | D1, D2, L1, L2, flutes, lead angle, cutting direction | Compatible, but current flat UI does not deeply understand these fields |
| `confidence` / `trust.confidence_score` | Parser+validation confidence | Compatible |
| `source` / `trust.source_*` | Manufacturer catalog PDF, page, row | Compatible |
| `lastVerified` / `trust.last_checked` | Current review date can be used later | Compatible |

## 2. Missing Or Not Source-Backed Fields

These fields are either absent from the Series 272 table rows or should not be created without another source:

| Field | Status | Reason |
| --- | --- | --- |
| `iso` / `materials` / `workpiece_materials` | Missing, not source-backed | The product rows do not state ISO material groups. |
| `iso_code` / `isoCodes` | Missing, not source-backed | Reamer tool numbers are not ISO insert codes. |
| `grade` | Missing, not source-backed | The table does not provide grade/material grade per row. |
| `coating` / `coating_or_surface` | Missing, not source-backed | The table rows do not provide coating/surface. |
| `shape` | Not applicable | Insert shape logic does not apply to solid reamers. |
| `tone` | Missing, derived from ISO group today | Should not be derived without material group. |
| `vcMin`, `vcMax`, `fMin`, `fMax`, `apMin`, `apMax` | Missing, not source-backed in extracted row set | Cutting data not present in this Series 272 product table output. |
| `coolant` | Missing, not source-backed | Not in the extracted product rows. |
| `bestFor` / `applicationNotes` | Not source-backed beyond product family | Should remain review text, not production fact. |
| `supply`, `equivalents`, `costTier`, `lifeRel`, `weeklyPicks` | Synthetic/current UI estimates | Should not be auto-created for newly ingested source-backed records. |

## 3. Required Fields For All Cutting Tools

The minimum source-backed fields for all cutting tools should be:

- `id`
- `brand`
- `manufacturer`
- `product_code`
- `tool_type`
- `category`
- `source_traceability`
- `trust`
- `validation_status`
- `merge_status`
- `dimensions` object, allowed to be partially populated
- `raw_source_ref` or equivalent pointer to raw extracted row

For source-backed ingestion, `source_traceability` should include:

- `source_pdf`
- `pdf_page`
- `catalog_page` when available
- `row_index`
- `parser_name`
- `parser_version`
- `raw_row`

## 4. Optional / Product-Family-Specific Fields

These should not be globally required:

- `iso_code`
- `ansi_code`
- `grade`
- `coating`
- `workpiece_materials`
- `cutting_data`
- `coolant`
- `insert_shape`
- `chipbreaker`
- `corner_radius`
- `thread`
- `material_suitability`
- `operation_suitability`
- `commercial`
- `equivalents`

For reamers specifically, useful family-specific fields are:

- `diameter_d1`
- `shank_diameter_d2`
- `overall_length_l1`
- `flute_length_l2`
- `flutes`
- `lead_angle`
- `cutting_direction`
- `diameter_system` / `unit_system`
- `wire_size` when present

## 5. Schema Changes Needed For Reamers

ToolAdvisor should support reamers without forcing fake ISO/coating/grade/material data by adding or formalizing:

1. A non-insert identity path:
   - `product_code`
   - `manufacturer_order_code`
   - `edp`
   - `series`

2. A general solid-tool geometry block:
   - `dimensions.diameter_d1`
   - `dimensions.shank_diameter_d2`
   - `dimensions.overall_length_l1`
   - `dimensions.flute_length_l2`
   - `geometry.flute_count`
   - `geometry.lead_angle_deg`
   - `geometry.cutting_direction`

3. Explicit unknown/review states:
   - `workpiece_materials: []`
   - `material_suitability.status: "not_source_backed"` or `"requires_review"`
   - `operation_suitability.status: "draft_review"`
   - `coating: null`
   - `grade: null`

4. Source-backed warning/risk fields:
   - `risk_flags`
   - `source_warnings`
   - `review_notes`

5. Unit preservation:
   - Store raw inch/mm values separately.
   - Do not require canonical metric conversion at merge time unless conversion rules are reviewed.

## 6. Safest Candidate Schema For Reamers

The safest reamer candidate schema before merge is:

```json
{
  "id": "preview-only-id",
  "brand": "M.A. Ford",
  "manufacturer": "M.A. Ford",
  "product_code": "27201300",
  "manufacturer_order_code": "27201300",
  "edp": "03000",
  "series": "272",
  "tool_type": "reamer",
  "category": "reaming",
  "product_family": "Reamer",
  "product_type": "TrueSize Carbide Reamer Straight Flute",
  "iso_code": null,
  "grade": null,
  "coating": null,
  "dimensions": {
    "diameter_d1": {
      "decimal_inch": "0.0130",
      "inch_fraction": null,
      "wire": null,
      "mm": null
    },
    "shank_diameter_d2": {
      "inch": "0.0130",
      "mm": null
    },
    "overall_length_l1": {
      "inch": "1-1/2",
      "mm": null
    },
    "flute_length_l2": {
      "inch": "3/16",
      "mm": null
    },
    "unit_system": "inch"
  },
  "geometry": {
    "flute_count": 4,
    "lead_angle_deg": 45,
    "cutting_direction": "right_hand_cut"
  },
  "workpiece_materials": [],
  "material_suitability": {
    "status": "requires_review",
    "values": []
  },
  "operation_suitability": {
    "status": "draft_review",
    "values": ["reaming"]
  },
  "trust": {
    "source_tier": "public_catalog_pdf",
    "validation_status": "needs_review",
    "confidence_score": 90,
    "source_name": "M.A. Ford 2018 Master Catalog Reamers",
    "source_file": "MAFord_2018_Master_Catalog_Reamers.pdf",
    "source_page": "11",
    "risk_flags": ["missing_grade", "missing_coating", "material_suitability_unclear", "manual_review_required"]
  },
  "merge_status": "not_merged"
}
```

## 7. Frontend Risks

Current frontend code expects or strongly benefits from these fields:

- `materials` for ISO filter badges and card stripe color.
- `operations` for filtering and card footer tags.
- `isoCodes` for related insert links.
- `grade` or a primary code for card headings and comparison labels.
- `coating` for coating facets and card display.
- `cuttingData`, `vcRange`, `fnRange`, and `apRange` for cards and comparison rows.

Risks if reamers are merged directly:

- Cards may show `ISO —`, which is technically honest but visually suggests incomplete data.
- Coating filters will group all records under “Coating not specified.”
- Material ISO filters will exclude these reamers if `materials` is empty, or mislead users if fake ISO groups are added.
- Comparison rows for Vc/feed/ap will show blanks because cutting data is absent.
- SEO links built around `isoCodes` are insert-oriented and may not apply.
- `grade || primaryCode` fallback can display the tool number as a grade-like value unless the adapter names it clearly.
- Existing recommendation scoring may treat missing material/application data as weak or may default incorrectly if not guarded.

## 8. Minimal Schema Adapter Before Any Merge

Before any PRODUCT_DB merge, add a reamer adapter that maps candidate fields into current UI-compatible fields while preserving nulls and warnings:

| Adapter Field | Value |
| --- | --- |
| `id` | Stable reviewed ToolAdvisor id, not preview id |
| `brand` | `M.A. Ford` |
| `code` | `tool_no` |
| `product_code` | `tool_no` |
| `edp` | `edp` |
| `productName` | `Series 272 TrueSize Carbide Reamer Straight Flute` |
| `series` | `272` |
| `family` | `Reaming` |
| `tool_type` | `reamer` |
| `canonical_category` | `reaming` |
| `category` | Prefer canonical `reaming`; legacy UI may need separate display category |
| `operations` | `["Reaming"]` or reviewed equivalent |
| `op` | `Finishing` only if approved as UI compatibility field |
| `materials` | `[]` unless source-backed material groups are added |
| `isoCodes` | `[]` |
| `iso` | `null` or adapter-safe placeholder, not `P/M/K/N/S/H` |
| `tone` | neutral/default, not ISO-derived |
| `grade` | `null` |
| `coating` | `null` |
| `dimensions` | Source-backed D1/D2/L1/L2/flutes |
| `cuttingData` | `{}` |
| `source_traceability` | Preserve source PDF/page/row/parser/raw row |
| `trust` | `needs_review`, public catalog PDF, risk flags |
| `merge_status` | `not_merged` until manual approval |

The adapter must also protect frontend code from assuming `materials[0]`, `isoCodes[0]`, `cuttingData[firstKey]`, `grade`, or `coating` are present.

## 9. Direct Merge Decision

Series 272 is **not safe for direct PRODUCT_DB merge now**.

Reason:

- The 924 candidates are validated as extracted/review-stage records, but not approved production records.
- Current PRODUCT_DB contains legacy flat fields and synthetic scoring fields that would require either fake values or a careful adapter.
- ISO/material/coating/grade/cutting data are not source-backed by the extracted Series 272 rows.
- Frontend product cards and comparison views contain insert-oriented assumptions.

## 10. Exact Next Recommended Step

Create a small **schema adapter plan** for non-insert tools that defines:

1. Canonical reamer candidate fields.
2. Legacy UI compatibility fields.
3. Null/empty-array handling for ISO, material, coating, grade, and cutting data.
4. Required frontend guards before any reamer can be shown in catalog or comparison.
5. Manual approval gates for moving from `validated_candidate_review` to any merge-eligible status.

Do this as a design document first. Do not generate more data and do not merge into PRODUCT_DB.
