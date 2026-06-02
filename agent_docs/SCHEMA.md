# Ingestion Candidate Product Schema

A **candidate product record** is a normalized but unapproved product extracted from a manufacturer PDF.  
Candidates are NOT products. They require human review before any PRODUCT_DB merge.

---

## Core Principles

- If a field is not found in the source PDF or raw row, it must remain `null`. Never invent values.
- Every candidate must have `source_file`, `source_page`, and `raw_row_ref`.
- AI-inferred fields must be listed in `ai_inferred_fields`.
- `validation_status` starts as `extracted_candidate` and advances only through human approval.

---

## Field Reference

### Provenance (required — candidate is invalid without these)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique candidate ID, e.g. `gue-2026-0001`. Never reuse. |
| `source_file` | string | Original PDF filename, e.g. `GUE_general-catalogue_EN_compressed.pdf` |
| `source_page` | integer or integer[] | Page number(s) the data was extracted from |
| `raw_row_ref` | string | Reference to the exact row in the raw JSON output |
| `raw_table_ref` | string \| null | Reference to the table in the raw JSON output, if applicable |
| `source_type` | string | `"manufacturer_catalogue"`, `"datasheet"`, `"web"`, etc. |
| `source_name` | string | Human-readable source name, e.g. `"Gühring General Catalogue EN"` |
| `extraction_method` | string | `"pdf-text"`, `"pdf-table"`, `"ocr"`, `"manual"` |

### Product Identity

| Field | Type | Description |
|-------|------|-------------|
| `designation` | string \| null | Full product designation as printed in the source |
| `article_no` | string \| null | Manufacturer article number / order code |
| `product_family` | string \| null | Product family or series name |
| `brand` | string \| null | Manufacturer brand name, e.g. `"Gühring"` |
| `type` | string \| null | Tool type, e.g. `"drill"`, `"endmill"`, `"tap"`, `"insert"` |

### Geometry

| Field | Type | Description |
|-------|------|-------------|
| `diameter_d1_mm` | number \| null | Cutting diameter D1 in mm |
| `diameter_d2_mm` | number \| null | Shank diameter D2 in mm |
| `oal_l1_mm` | number \| null | Overall length L1 in mm |
| `flute_length_l2_mm` | number \| null | Flute/cutting length L2 in mm |
| `flutes` | integer \| null | Number of flutes/teeth |
| `handedness` | string \| null | `"RH"`, `"LH"`, or `null` |
| `shank_type` | string \| null | e.g. `"cylindrical"`, `"weldon"`, `"morse"`, `"capto"` |
| `tolerance_d1` | string \| null | Diameter tolerance class, e.g. `"h6"`, `"h8"` |
| `din_norm` | string \| null | DIN standard reference, e.g. `"DIN 6527"` |

### Material & Coating

| Field | Type | Description |
|-------|------|-------------|
| `coating` | string \| null | Coating name as stated in source, e.g. `"TiAlN"`, `"FIRE"` |
| `substrate` | string \| null | Base material, e.g. `"HSS-E"`, `"carbide"`, `"cermet"` |
| `iso_grade` | string \| null | ISO grade designation for inserts, e.g. `"P30"` |
| `insert_shape` | string \| null | ISO insert shape code, e.g. `"CNMG"` |
| `chipbreaker` | string \| null | Chipbreaker designation if stated |

### Application

| Field | Type | Description |
|-------|------|-------------|
| `iso_materials` | string[] \| null | ISO material groups this tool is suited for, e.g. `["P", "M", "K"]` |
| `operations` | string[] \| null | Operations, e.g. `["roughing", "finishing", "drilling"]` |

### Cutting Data

| Field | Type | Description |
|-------|------|-------------|
| `vc_min` | number \| null | Minimum cutting speed in m/min |
| `vc_max` | number \| null | Maximum cutting speed in m/min |
| `feed_min` | number \| null | Minimum feed (mm/rev or mm/tooth) |
| `feed_max` | number \| null | Maximum feed (mm/rev or mm/tooth) |
| `cutting_data_by_material` | object \| null | Nested object with per-material cutting data if available |

### Governance

| Field | Type | Description |
|-------|------|-------------|
| `confidence_score` | integer | 0–100, see scoring guidance in VALIDATION_RULES.md |
| `confidence_reason` | string | Short human-readable explanation of the score |
| `risk_flags` | string[] | List of active warnings, e.g. `["missing_coating", "low_confidence"]` |
| `validation_status` | string | See status values below |
| `ai_inferred_fields` | string[] | Field names where the value was AI-inferred, not directly extracted |
| `last_checked` | string | ISO 8601 date, e.g. `"2026-05-30"` |

---

## Validation Status Values

| Status | Meaning |
|--------|---------|
| `extracted_candidate` | Freshly extracted, not yet reviewed |
| `needs_review` | Has warnings or low confidence — must be checked before approval |
| `approved_for_merge` | Human has reviewed and approved |
| `rejected` | Rejected during review, with reason recorded |
| `merged` | Successfully written into PRODUCT_DB |

---

## Example Candidate Record (JSON)

```json
{
  "id": "gue-2026-0001",
  "brand": "Gühring",
  "source_file": "GUE_general-catalogue_EN_compressed.pdf",
  "source_page": 142,
  "raw_row_ref": "raw-page-text/GUE_general-catalogue_EN_compressed/page-142.json#row-7",
  "raw_table_ref": null,
  "source_type": "manufacturer_catalogue",
  "source_name": "Gühring General Catalogue EN",
  "extraction_method": "pdf-text",
  "designation": "RT 100 U",
  "article_no": "9041050030000",
  "product_family": "RT 100 U",
  "type": "drill",
  "diameter_d1_mm": 3.0,
  "diameter_d2_mm": null,
  "oal_l1_mm": null,
  "flute_length_l2_mm": null,
  "flutes": 2,
  "coating": "Fire",
  "substrate": "carbide",
  "iso_grade": null,
  "insert_shape": null,
  "chipbreaker": null,
  "handedness": "RH",
  "shank_type": null,
  "tolerance_d1": null,
  "din_norm": null,
  "iso_materials": ["P", "M", "K"],
  "operations": ["drilling"],
  "vc_min": null,
  "vc_max": null,
  "feed_min": null,
  "feed_max": null,
  "cutting_data_by_material": null,
  "confidence_score": 72,
  "confidence_reason": "Designation, brand, and diameter confirmed from source. Coating confirmed. Geometry incomplete.",
  "risk_flags": ["missing_dimensions", "missing_cutting_data"],
  "validation_status": "needs_review",
  "ai_inferred_fields": ["iso_materials"],
  "last_checked": "2026-05-30"
}
```
