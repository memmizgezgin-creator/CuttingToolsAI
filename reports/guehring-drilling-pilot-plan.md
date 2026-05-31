# Gühring Drilling Tools Pilot — Parser Plan & Field Schema

**Status**: PLAN ONLY — No parsing executed yet  
**Date**: 2026-05-30  
**Scope**: Source-backed material suitability extraction for Gühring Drilling Tools  
**Target**: Extract 10–30 source-backed candidate records with PMKNSH linking  

---

## 1. PDF Page Map — Exact Drilling Tools Structure

### Main Sections

| Section | Page | Purpose | Content |
|---|---|---|---|
| **Drilling Tools Contents** | 20 | Family index | Lists all drilling families & page references |
| **QuickFinder – Solid Carbide** | 16–19 | Application selector | Material family → Tool type mapping |
| **Programme Overview** | 38–385 | Product detail matrix | Detailed table: tool type × PMKNSH × article no. |
| **Cutting Data** | 386–488 | Machining parameters | Vc/Feed/ap keyed by article number |

### Drilling Tool Families (Indexed at Page 20)

| Family | Start Page | Type | Tool Examples |
|---|---|---|---|
| **Micro drills** | 38 | Solid carbide, HSS | Precision small diameter |
| **Solid carbide drills** | 55 | Solid carbide | All-rounder, specialist variants |
| **Modular drills** | 131 | Modular system | Tool holder + insert combinations |
| **Deep hole drills** | 156 | BTA, gun drills | Extended depth drilling |
| **HSS/HSCO drills** | 218 | HSS/HSCO standard | General purpose high-speed steel |
| **Centre drills** | 364 | Centre drills | Spotting / centering |
| **NC spotting drills** | 372 | NC spotting | CNC-ready spotting drills |
| **Step drills** | 382 | Step drills | Multi-diameter step tools |
| **Core drills** | (advanced) | Core drills | Hole enlarging |

**Smallest safe target: Solid carbide drills (pages 55–130)** — Most complete PMKNSH data.

---

## 2. Parser Type & Table Structure

### Programme Section Table Format (Pages 38+)

```
┌─────────────────────────────────────────────────────────────────────┐
│ Drilling tools                                                      │
├─────┬─────────────────────┬──────────┬──────┬────────┬──────┬──────┤
│ D   │ Type                │ P M K N S H  │Shank │Std    │ d1   │ Art. │
│ (1) │ (Tool designation)  │(✓/✗ cols)   │ form │Matl   │range │ no.  │
├─────┼─────────────────────┼──────────┼──────┼────────┼──────┼──────┤
│ 3xD │ RT 100 U 6537 K     │✓ ✗ ✓ ✗ ✓ ✓  │ HA   │ F     │3–20  │ 2480 │
│     │ (internal cooling)  │          │      │        │      │      │
├─────┼─────────────────────┼──────────┼──────┼────────┼──────┼──────┤
│ 3xD │ RT 100 U 6537 K     │✗ ✓ ✗ ✓ ✓ ✓  │ HE   │ F     │3–20  │ 2472 │
│     │ (internal cooling)  │          │      │        │      │      │
└─────┴─────────────────────┴──────────┴──────┴────────┴──────┴──────┘
```

### Column Structure (Left-to-Right)

| Column | Name | Type | Extract Rule |
|---|---|---|---|
| 1 | **Depth** | Text | Depth multiplier (e.g., "3xD", "5xD") |
| 2 | **Type** | Text | Tool designation (e.g., "RT 100 U", "RT 100 FB") |
| 3-8 | **P M K N S H** | Boolean array | ✓ = true, ✗ = false, blank = null |
| 9 | **Shank form** | Enum | HA, HE, HB, Cyl, DIN 1866, DIN 335 |
| 10 | **Standard material** | Text | Carbide grade (e.g., "6537 K", "WN") or steel type |
| 11 | **Surface** | Enum | F (finish?), R (right-hand?), C, blank |
| 12 | **d1 range** | Range | "3.000 - 20.000" (decimal format) |
| 13 | **Article no.** | Integer | Gühring article number (e.g., 2480, 6596) |
| 14 | **Page** | Integer | Page reference to detailed product spec |

### PMKNSH Column Mapping

**Order**: P — M — K — N — S — H

| ISO Group | Meaning | Row Example (RT 100 U 2480) |
|---|---|---|
| **P** | Aluminium alloys, copper, magnesium | ✓ (true) |
| **M** | Stainless steel (austenitic, martensitic) | ✗ (false) |
| **K** | Cast iron, spheroidal iron, chilled | ✓ (true) |
| **N** | Non-ferrous metals (general) | ✗ (false) |
| **S** | High-strength steel, titanium, superalloy | ✓ (true) |
| **H** | Hardened steel, tool steel | ✓ (true) |

**Symbol Interpretation**:
- **ã** = checkmark (✓) = suitable
- **ä** = cross (✗) = not suitable
- **~** = tilde or partial mark = conditional/requires review
- **Blank** = not specified in this table = null

---

## 3. Field Proposal — Extracted Record Schema

### Proposed Fields (23 total)

```json
{
  "id": "guehring-drilling-pilot-XXXX",
  "brand": "Gühring",
  "category": "drilling",
  "tool_family": "Solid carbide drills",
  "programme": "Solid carbide internal cooling",
  "tool_designation": "RT 100 U",
  "designation_variant": "6537 K",
  "shank_form": "HA",
  "standard_material": "6537 K",
  "surface": "F",
  "depth_multiplier": "3xD",
  "diameter_range": {
    "min": 3.000,
    "max": 20.000,
    "unit": "mm"
  },
  "article_number": 2480,
  "article_number_source": "programme_table_page_57",
  "material_suitability": {
    "P": true,
    "M": false,
    "K": true,
    "N": false,
    "S": true,
    "H": true,
    "source_backed": true,
    "source_table": "Solid carbide drills Programme",
    "source_page": 57,
    "parsing_confidence": 95
  },
  "source_traceability": {
    "source_pdf": "GUE_general-catalogue_EN_compressed.pdf",
    "section": "Drilling Tools",
    "programme_page": 57,
    "product_detail_page": 57,
    "cutting_data_page": 386,
    "table_row": 3,
    "extraction_date": "2026-05-30"
  },
  "validation_status": "extracted_candidate",
  "confidence": {
    "level": "high",
    "score": 95,
    "basis": [
      "source_backed_from_official_programme_table",
      "clear_pmknsh_symbols",
      "article_number_present",
      "page_reference_present"
    ]
  },
  "merge_status": "preview_only_not_merged",
  "review_state": "pending_manual_review"
}
```

### Field Breakdown

**Identity Fields** (5):
- `id`: Preview record ID (format: guehring-drilling-pilot-XXXX)
- `brand`: Always "Gühring"
- `category`: Always "drilling"
- `tool_family`: Drilling family (e.g., "Solid carbide drills")
- `programme`: Specific programme line (e.g., "Solid carbide internal cooling")

**Product Designation Fields** (7):
- `tool_designation`: Tool type code (e.g., "RT 100 U")
- `designation_variant`: Grade/variant (e.g., "6537 K")
- `shank_form`: Shank geometry (HA, HE, HB, Cyl, etc.)
- `standard_material`: Base material (e.g., "carbide 6537 K")
- `surface`: Surface finish/direction (F, R, C, etc.)
- `depth_multiplier`: Drilling depth code (e.g., "3xD")
- `diameter_range`: Min/max cutting diameter with unit

**Article & Source Fields** (4):
- `article_number`: Gühring article code (integer)
- `article_number_source`: Where article was sourced (programme page)
- `source_traceability`: Full source tracking (PDF, section, page, table row)
- `cutting_data_page`: Cross-reference to cutting data section

**Material Suitability Fields** (6):
- `material_suitability.P`: Boolean or null
- `material_suitability.M`: Boolean or null
- `material_suitability.K`: Boolean or null
- `material_suitability.N`: Boolean or null
- `material_suitability.S`: Boolean or null
- `material_suitability.H`: Boolean or null
- `material_suitability.source_backed`: Always true (explicit: from official table)
- `material_suitability.source_table`: Programme table name
- `material_suitability.source_page`: Page number where PMKNSH extracted
- `material_suitability.parsing_confidence`: 0-100 score

**Validation & Status Fields** (3):
- `validation_status`: extracted_candidate, needs_review, etc.
- `confidence.level`: high, medium, low
- `confidence.score`: 0-100
- `merge_status`: Always "preview_only_not_merged"
- `review_state`: pending_manual_review, approved_for_merge, etc.

---

## 4. Smallest Safe Extraction Target

### Selection: Solid Carbide Drills Family (Pages 55–130)

**Why this target**:
1. ✅ Complete PMKNSH columns in every row
2. ✅ Clear material designations (6537 K, 6537 L, 6539, etc.)
3. ✅ Consistent table structure across many rows
4. ✅ Direct article number linking
5. ✅ High confidence (official Gühring catalogue)

**Scope**:
- Extract 10–15 representative Solid Carbide Drills records
- Cover multiple shank forms (HA, HE, HB, Cyl)
- Include both internal and external cooling variants
- All from pages 55–80 (first 25 pages of solid carbide section)

**Expected records**:
- RT 100 FB (page 55, article 6596)
- RT 100 U HA (page 57, article 2480)
- RT 100 U HE (page 57, article 2472)
- RT 100 U HB (page 59, article 6026)
- RT 100 U Cyl (page 61, article 2473)
- RT 100 HF (page 62, article 8524)
- RT 100 U 5xD HA (page 64, article 2996)
- RT 100 U 5xD HE (page 64, article 2719)
- RT 100 U 5xD HB (page 66, article 5651)
- RT 100 U 5xD Cyl (page 68, article 2474)
- [+3–5 more variants if available]

**Source pages**: 55, 57, 59, 61, 62, 64, 66, 68, 69, ...

---

## 5. Parser Implementation Strategy

### Stage 1: Manual Structure Validation

**What to do**:
1. Extract pages 55–80 from PDF (Solid Carbide Drills)
2. Visually inspect table structure (confirm column order)
3. Manually extract 3–5 rows to verify PMKNSH symbol interpretation
4. Confirm article numbers match cutting data section references

**Expected outcome**: 
- Confirmed column positions
- Confirmed PMKNSH symbol meaning (ã = true, ä = false)
- 3–5 manually-validated records to anchor parser

### Stage 2: Parser Codelet

**What to do**:
1. Write Node.js script to extract Programme table (pages 55–80)
2. Parse each row using confirmed column positions
3. Extract PMKNSH array (positions 3–8)
4. Link article number to page reference
5. Generate JSON output with proposed field schema

**Input**: 
- PDF pages 55–80
- Column position map (from stage 1)
- Symbol dictionary (ã → true, ä → false, etc.)

**Output**:
- `guehring-drilling-pilot.sample.json` (10–15 records)

### Stage 3: Validation & Confidence Scoring

**What to do**:
1. For each extracted record:
   - Verify article number is numeric and valid
   - Verify PMKNSH array has 6 elements
   - Verify diameter range has min/max
   - Verify source page is in range 55–80
2. Assign confidence score:
   - 95–100: All fields present, clear symbols
   - 80–94: Minor OCR artifacts, but suitability clear
   - <80: Symbol ambiguous or missing, mark for review

**Output**:
- Confidence distribution report
- Any records with <80 confidence flagged for manual review

---

## 6. File Output Plan

### 1. Parsed Records
**File**: `parsed-products/guehring-drilling-pilot.sample.json`
- Format: JSON array with 10–15 records
- Schema: Proposed field schema above
- No merge into PRODUCT_DB
- All records marked `merge_status: "preview_only_not_merged"`

### 2. Pilot Plan Report
**File**: `reports/guehring-drilling-pilot-plan.md`
- This document
- Parser stage descriptions
- Column mapping
- PMKNSH legend
- Target scope and expected records

### 3. Worklog Update
**File**: `TOOLADVISOR_WORKLOG.md`
- Add entry: Gühring Drilling Pilot — page map and parser plan created
- Decision: M.A. Ford material suitability stays `review_required` (source not available)
- Next step: Manual validation of Solid Carbide pages 55–80
- No PRODUCT_DB changes

---

## 7. Safety Checklist

✅ **Scope limitation**: Only drilling tools, only Solid Carbide family (pages 55–80)  
✅ **No PRODUCT_DB edits**: Records stay as preview, no merge  
✅ **No frontend changes**: No catalog.html, compare.html, or directory-app.jsx modifications  
✅ **No cross-brand inference**: Gühring PMKNSH will NOT be applied to M.A. Ford records  
✅ **Source-backed only**: Every material suitability directly from official Gühring programme table  
✅ **Article number linking**: Each record includes full source traceability (page, table row, article)  
✅ **No deployment**: All work stays in local research folder  

---

## 8. Success Criteria

✓ At least 10 records extracted (targeting 10–15)  
✓ All records include `source_page` (pages 55–80)  
✓ All records include `material_suitability` with PMKNSH array  
✓ All records include `article_number` and cross-reference  
✓ All records marked `merge_status: "preview_only_not_merged"`  
✓ Confidence >= 90 for at least 80% of records  
✓ No modifications to PRODUCT_DB  
✓ No frontend changes  

---

## 9. Next Steps After Pilot

### If Successful (≥10 high-confidence records extracted):
1. Expand to pages 80–130 (full Solid Carbide family)
2. Move to Micro Drills family (pages 38–54)
3. Establish confidence threshold for merge approval

### If Issues Found:
1. Debug column positions or symbol interpretation
2. Try different OCR processing or manual row extraction
3. Adjust confidence thresholds based on error patterns

---

**Plan created**: 2026-05-30  
**Status**: Ready for Stage 1 manual validation  
**Next action**: Visually inspect PDF pages 55–80 to confirm table structure and PMKNSH symbols

