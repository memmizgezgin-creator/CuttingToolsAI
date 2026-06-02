# Ingestion Validation Rules

These rules govern whether a candidate product record is acceptable for review or must be flagged.

Validation runs after normalization, before human review.  
**No candidate with a hard failure may advance to `approved_for_merge`.**

---

## Hard Validation Failures

A hard failure sets `validation_status` to `needs_review` and adds the failure code to `risk_flags`.  
A human reviewer must explicitly resolve every hard failure before approving a candidate.

| Code | Condition |
|------|-----------|
| `MISSING_BRAND` | `brand` is null or empty |
| `MISSING_SOURCE_FILE` | `source_file` is null or empty |
| `MISSING_SOURCE_PAGE` | `source_page` is null or empty |
| `MISSING_IDENTITY` | Both `designation` and `article_no` are null |
| `MISSING_RAW_REF` | Both `raw_row_ref` and `raw_table_ref` are null |
| `UNSUPPORTED_TECHNICAL_VALUE` | A technical field is filled but there is no matching `source_page` or `raw_row_ref` to verify it |
| `IMPOSSIBLE_DIMENSION` | Any dimension field is ≤ 0, or D1 > 500 mm, or L1 < D1 |
| `DUPLICATE_CONFLICT` | An existing record has the same `id` or the same `article_no` with conflicting technical data |

### Hard Failure Escalation

If a candidate has 3 or more hard failures, it must be set to `rejected` automatically and the reviewer must create a new extraction attempt rather than editing the existing record.

---

## Review Warnings

Warnings do not block a candidate from advancing, but they must be acknowledged by the reviewer.  
Each active warning is added to `risk_flags` and lowers the `confidence_score`.

| Code | Condition | Score Impact |
|------|-----------|-------------|
| `MISSING_COATING` | `coating` is null | −5 |
| `MISSING_ISO_MATERIALS` | `iso_materials` is null or empty | −5 |
| `MISSING_OPERATION` | `operations` is null or empty | −5 |
| `MISSING_CUTTING_DATA` | All four cutting data fields are null | −10 |
| `LOW_CONFIDENCE` | `confidence_score` < 60 | informational |
| `AI_INFERRED_CATEGORY` | `type` appears in `ai_inferred_fields` | −8 |
| `SOURCE_PAGE_UNCLEAR` | `source_page` is a range of more than 5 pages | −5 |
| `PRODUCT_FAMILY_UNCERTAIN` | `product_family` appears in `ai_inferred_fields` | −5 |
| `MISSING_DIMENSIONS` | All geometry fields are null | −10 |

---

## Confidence Scoring Guidance

Confidence scores reflect how completely and directly the candidate data can be traced to the source.

| Range | Meaning | Action |
|-------|---------|--------|
| 90–100 | Direct table extraction: designation, dimensions, brand, page, and raw row all confirmed | Safe to approve after quick spot-check |
| 75–89 | Clear product data, some optional fields missing | Review and approve if no hard failures |
| 60–74 | Useful candidate but requires careful review | Check each flagged field manually |
| < 60 | Incomplete or uncertain — do not approve without manual check | Return for re-extraction or reject |

### Confidence Deduction Reference

Start at 100 and apply deductions:

| Deduction | Reason |
|-----------|--------|
| −30 | `raw_row_ref` missing |
| −20 | `source_page` missing |
| −15 | `designation` missing |
| −10 | `brand` missing |
| −10 | All geometry null |
| −10 | All cutting data null |
| −8 | `type` is AI-inferred |
| −5 each | Any other warning flag (up to −20 total) |

### Anti-Faking Rule

Do not manually set a confidence score higher than what the deduction table produces.  
If a reviewer believes the score is too low because the source is obviously clear, they must document their reasoning in `confidence_reason` — not silently raise the number.

---

## Field-Level Rules

### Dimensions

- All dimension values must be positive numbers.
- If a value appears implausible (e.g. D1 = 500 mm for an endmill), flag `IMPOSSIBLE_DIMENSION`.
- Do not convert units without confirming the source unit. If unit is ambiguous, set the field to `null` and add a note in `confidence_reason`.

### Coating

- Use the coating name exactly as stated in the source (e.g. `"Fire"`, `"TiAlN"`, `"AlCrN"`).
- Do not normalize or alias coating names without marking `coating` in `ai_inferred_fields`.

### ISO Materials

- Must be drawn from: `P`, `M`, `K`, `N`, `S`, `H`.
- If inferred by AI from tool type or coating context (not stated in the source), list `iso_materials` in `ai_inferred_fields` and deduct 5 points.

### Cutting Data

- Values must come from a source table, not calculated or estimated.
- If cutting data varies by material, use `cutting_data_by_material` and leave the top-level `vc_min`/`vc_max`/`feed_min`/`feed_max` as `null`.

---

## Duplicate Detection

Before a candidate is written to any review queue, check for:

1. Same `id` — reject duplicate with error.
2. Same `article_no` and same `brand` — compare technical fields:
   - If all technical fields agree: merge as same product (keep higher `confidence_score`).
   - If any technical field conflicts: flag `DUPLICATE_CONFLICT`, do not merge, require human resolution.
