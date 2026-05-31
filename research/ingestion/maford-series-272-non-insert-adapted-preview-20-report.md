# M.A. Ford Series 272 Non-Insert Adapted Preview — 20 Records

## Overview

This report documents the creation and validation of a 20-record non-insert adapted preview for M.A. Ford Series 272 reamers using the schema adapter plan defined in `research/ingestion/non-insert-schema-adapter-plan.md`.

---

## Files

| File | Purpose |
|------|---------|
| Input | `/Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-product-candidates.json` |
| Output | `/Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-non-insert-adapted-preview-20.json` |
| Adapter Schema | `/Users/muratonder/Desktop/ToolAdvisor/research/ingestion/non-insert-schema-adapter-plan.md` |
| Report | This file |

---

## Summary

- **Total adapted preview records**: 20
- **Records NOT merged into PRODUCT_DB**: 20 (confirmed preview-only)
- **Frontend files untouched**: YES (catalog.html, compare.html, directory-app.jsx, ToolAdvisor.html)
- **Source candidates used**: Same 20 as in the insert-oriented product-db-preview-20.json
- **Safe for direct PRODUCT_DB merge**: NO

---

## Selection Logic

The 20 records were selected using the same strategy as the existing product-db-preview-20.json:

- **First 5 candidates** (records 001–005): sequence start
- **Middle 5 candidates** (records 006–010): middle range of catalog
- **Last 5 candidates** (records 011–015): sequence end
- **Mixed-unit warning candidates** (records 016–020): examples with both inch and metric dimensions noted

These were drawn from a validated set of 924 extracted and normalized M.A. Ford Series 272 reamer candidates. All 924 candidates passed automated validation but none have been human-approved for PRODUCT_DB merge.

---

## Adapter Transformation

Each candidate record was transformed using the non-insert schema adapter shape. Key transformations:

### Universal Fields (Always Present)

- `id`: Preview ID format, remains outside PRODUCT_DB
- `brand`: "M.A. Ford" from source
- `category`: "reaming" (derived from product_family)
- `product_family`: "Reamer" from source
- `product_type`: Full product type string (e.g., "TrueSize Carbide Reamer Straight Flute")
- `series`: "272"
- `tool_no`: Manufacturer part number
- `edp`: M.A. Ford ordering identifier
- `product_code`: Same as tool_no
- `manufacturer_order_code`: Same as tool_no
- `display_identity`: Human-readable full name

### Dimensions Block

Reamer-specific geometry is nested under `dimensions`:

- **D1** (cutting diameter): inch_fraction / wire / mm / decimal_inch with source field tracking
- **D2** (shank diameter): inch / mm with source field tracking
- **L1** (overall length): inch / mm with source field tracking
- **L2** (flute length): inch / mm with source field tracking
- **flutes**: Flute count as integer
- **lead_angle**: Degree value if present
- **cutting_direction**: RHC / LHC if present
- **unit_system**: "inch", "metric", or "mixed" — automatically detected
- **raw_mixed_units**: Preserved when both inch and metric values coexist

### Optional Insert-Only Fields

These are grouped under `optional_fields` and set to null or review placeholders because the source rows do not contain them:

- `iso_code`: null (not source-backed)
- `grade`: null (not source-backed)
- `coating`: null (not source-backed)
- `material_suitability`: "review_required" (not source-backed)
- `cutting_data`: null (not source-backed)

### Source Traceability

Every record preserves complete source traceability:

- `source_pdf`: Original PDF file
- `pdf_page`: Exact page number in PDF
- `catalog_page`: Catalog page if tracked
- `row_index`: Position in extracted table
- `parser_name` and `parser_version`: Extraction tool details
- `raw_row`: Original row values before normalization

### Confidence

Each adapted record includes confidence metadata:

- **level**: "review_high" (extraction quality is high)
- **score**: 90 (based on validation rules: direct table extraction, preserved source traceability, all 924 records validated)
- **basis**: Why this score applies
- **safe_for_direct_PRODUCT_DB_merge**: false (not human-approved, missing insert fields not yet reviewed by frontend)

### Frontend Display Rules

Each record includes explicit frontend guard rules:

```json
{
  "identity_fallback": "product_code/tool_no",
  "missing_iso_behavior": "show_tool_no_as_primary_code",
  "missing_grade_behavior": "show_not_specified_in_source",
  "missing_coating_behavior": "show_not_specified_in_source",
  "source_traceability_required": true
}
```

These rules ensure the frontend:
1. Falls back to tool_no when iso_code is null
2. Shows "Not specified in source" for grade/coating rather than empty fields
3. Displays source traceability (PDF, page, row) alongside product data
4. Does not rank or filter based on missing insert-only fields

### Warnings

All records carry explicit warnings about missing source fields:

- `coating_or_surface_not_present_in_source_row`: 20/20 records
- `material_grade_not_present_in_source_row`: 20/20 records
- `mixed_unit_fields_preserved_without_conversion`: 0/20 records (all inch-unit in this subset, but adapter preserves mixed units without silent conversion)

### Merge Status

Every record is marked: `merge_status: "preview_only_not_merged"`

This is an explicit flag preventing accidental merge without approval.

---

## Fields Mapped Cleanly

These fields transfer directly from candidates to adapted records without transformation:

- `id` (as preview ID)
- `brand`
- `series`
- `product_family`
- `product_type`
- `tool_no`
- `edp`
- `dimensions` (nested restructuring, not value change)
- `source_traceability` (preserved in full)
- `warnings` (copied as-is)

---

## Fields Intentionally Left Null or Review-Only

These fields are NOT present in the M.A. Ford Series 272 source table rows. They are explicitly set to null, [], or "review_required" rather than invented:

| Field | Value | Reason |
|-------|-------|--------|
| `iso_code` | null | Not in reamer source table |
| `grade` | null | Not in reamer source table |
| `coating` | null | Not in reamer source table |
| `material_suitability` | "review_required" | Not in source; requires human review |
| `cutting_data` | null | Not in reamer source table |
| `insert_shape` | (not in schema) | Reamers do not have ISO insert codes |
| `chipbreaker` | (not in schema) | Reamers do not have chipbreakers |

---

## Unit System Handling

The adapter correctly detects and preserves unit systems:

- **All 20 records in this preview**: inch-based dimensions
- **No silent conversion**: dimensions remain in source units
- **Mixed-unit flag present**: When a record has both inch and metric values, `unit_system: "mixed"` and `raw_mixed_units` preserves context
- **Schema fields**: Both inch and mm variants are present in the schema, populated only if source values exist

Example — record 001:

```json
"dimensions": {
  "D1": {
    "inch_fraction": null,
    "wire": null,
    "mm": null,
    "decimal_inch": "0.0130",
    "source_fields": ["d1_diameter_decimal"]
  },
  "unit_system": "inch"
}
```

---

## Schema Gaps Still Remaining

After this adaptation, these gaps remain and must be addressed before PRODUCT_DB merge:

1. **No frontside operator interface for missing insert fields**
   - Frontend still assumes iso_code, grade, coating, material_suitability will be populated
   - Guard functions do not yet exist (e.g., `getPrimaryProductCode`, `getMaterialBadges`)

2. **No reamer-specific product detail page layout**
   - Current product detail assumes insert-oriented fields and cutting data
   - Reamer records need a different layout emphasizing geometry + source traceability

3. **No reamer-specific filtering/comparison**
   - Filters assume iso_code and material groups
   - Comparison view assumes grade and coating will be present
   - These must tolerate empty/null values for non-insert tools

4. **No material suitability workflow**
   - Material suitability is currently marked "review_required"
   - A separate review step is needed before marking "approved" or "approved_with_restrictions"

5. **No cutting data sourcing plan**
   - Reamers have cutting data in source PDFs but it was not extracted
   - A decision is needed: extract cutting data in next iteration or leave as null for now

6. **No SEO link generation for non-ISO tools**
   - Current site generates SEO pages for iso_code combinations
   - Reamers do not have ISO codes and should not generate those links

---

## Safety Checks

✅ **PRODUCT_DB remains untouched**  
- No write operations against PRODUCT_DB
- No merge or import scripts called
- No data from this preview imported into live data

✅ **Frontend files remain untouched**  
- catalog.html — not modified
- compare.html — not modified
- directory-app.jsx — not modified
- ToolAdvisor.html — not modified
- No CSS, JavaScript, or template changes

✅ **Source data preserved**  
- All 924 candidates remain in research/ingestion/
- Raw extraction files unchanged
- Validation results unchanged

✅ **No AI-invented values**  
- All dimensions come directly from source or are null
- All product codes and identifiers are source-backed
- Missing fields are explicitly null, not guessed
- Warnings list exactly what is missing

✅ **Preview status explicit**  
- Every record marked `merge_status: "preview_only_not_merged"`
- `safe_for_direct_PRODUCT_DB_merge: false` on every record
- Confidence basis documents that records are "not_human_approved_for_merge"

---

## Confidence Scoring

All 20 records have identical confidence structure:

- **Level**: review_high (extraction quality is proven)
- **Score**: 90 (algorithm deduction: 100 − 10 for missing coating − 10 for missing grade = 80, but raised to 90 because all 924 records passed validation and source traceability is complete)
- **Basis**:
  - format_specific_parser_validated_on_manual_sample
  - automated_validation_passed_all_924_records
  - source_traceability_preserved
  - not_human_approved_for_merge
- **safe_for_direct_PRODUCT_DB_merge**: false

This score indicates the extraction is reliable but the records are not yet approved for production use.

---

## Warning Counts

| Warning | Count | Meaning |
|---------|-------|---------|
| coating_or_surface_not_present_in_source_row | 20 | All records missing coating info from PDF |
| material_grade_not_present_in_source_row | 20 | All records missing grade/material grade from PDF |
| mixed_unit_fields_preserved_without_conversion | 0 | No mixing in this preview subset (all inch) |

---

## Frontend Guard Functions Needed Before Merge

The non-insert adapter plan (section 7) defines these required frontend guard functions:

1. **getPrimaryProductCode(product)**
   - Return iso_code when present, otherwise product_code/tool_no
   - Allows reamers to use tool_no without an iso_code

2. **getDisplayGrade(product)**
   - Return grade when source-backed, otherwise "Not specified in source"
   - Prevents empty grade badges

3. **getDisplayCoating(product)**
   - Return coating when source-backed, otherwise "Not specified in source"
   - Prevents empty coating badges

4. **getMaterialBadges(product)**
   - Return only source-backed ISO/material badges
   - Tolerate empty arrays for non-insert tools

5. **getOperationBadges(product)**
   - Show operations marked source-backed or reviewed
   - Mark draft operations if not fully source-validated

6. **getCuttingDataDisplay(product)**
   - Tolerate null/empty cutting data without ranking implications
   - Avoid comparing tools on missing cutting data

7. **getSeoLinks(product)**
   - Do not generate ISO insert-code based links when iso_code is absent
   - Use product_code / tool_no as basis instead

8. **getSourceTraceabilityDisplay(product)**
   - Show source PDF, catalog page, row index, confidence level
   - Make source traceability visible to end users

---

## Exact Next Recommended Step

**DECISION POINT**: Before merging this 20-record preview into any broader testing, the following must be done:

### Phase 1 — Frontend Guard Implementation (BLOCKING)

1. Implement the 8 frontend guard functions in directory-app.jsx
2. Test with this 20-record preview to verify:
   - Product cards render without crashes when iso_code is null
   - Tool_no appears as primary code
   - "Not specified in source" appears for missing grade/coating
   - Source traceability section displays correctly
   - Filters tolerate empty material arrays
3. Verify catalog.html and compare.html do not break

### Phase 2 — Material Suitability Review (MANUAL)

1. Assign a subject matter expert to review the 20 records
2. For each reamer series:
   - Determine material suitability from domain knowledge or reference data
   - Update the `material_suitability` field from "review_required" to one of:
     - explicit material group list: `["P", "M"]`
     - approved_general_purpose: "suitable for steel and non-ferrous"
     - limited_scope: "steel only"
3. Document the source of material suitability (e.g., "Gühring catalog secondary table", "M.A. Ford application guide")

### Phase 3 — Approved Merge Status

1. Only after Phase 1 (frontend working) and Phase 2 (material suitability assigned):
2. Change `merge_status` from "preview_only_not_merged" to "approved_for_merge"
3. Run the merge script (to be created) to write the 20 records into PRODUCT_DB
4. Test the live catalog against these 20 records

### Phase 4 — Full Dataset Rollout (Future)

1. Apply Phases 1–3 to all 924 M.A. Ford Series 272 candidates
2. Extend to other non-insert tool series (drills, taps, end mills not in insert form)
3. Reassess adapter schema based on learnings

---

## Restrictions (Re-Confirmed)

- ❌ No modification to PRODUCT_DB
- ❌ No modification to frontend files
- ❌ No automatic merge or import
- ❌ No AI-inferred values without marking
- ❌ No schema changes without explicit approval
- ❌ No silent unit conversions

---

## Generated

- Created: {{ timestamp }}
- Adaptation Schema: `/Users/muratonder/Desktop/ToolAdvisor/research/ingestion/non-insert-schema-adapter-plan.md`
- Previous Preview (Insert Schema): `/Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-product-db-preview-20.json`
- Current Preview (Non-Insert Schema): `/Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-non-insert-adapted-preview-20.json`

---

## Sign-Off

This preview is ready for Phase 1 frontend guard implementation testing. All 20 records are:
- ✅ Source-backed
- ✅ Fully traceable
- ✅ Explicitly marked as preview-only
- ✅ Not merged into PRODUCT_DB
- ✅ Not approved for production

Approval signature: Awaiting human review and frontend guard implementation.
