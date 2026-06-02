# Ingestion Review Workflow

This document describes how manufacturer PDF data moves from raw extraction to approved product records.

**No step in this workflow automatically updates PRODUCT_DB.**  
Every merge requires a separate, explicit human action.

---

## Pipeline Overview

```
PDF → pending/ → raw extraction → normalization → validation → review → approved → merge (human)
```

---

## Step-by-Step

### Step 1 — Drop PDF into pending

Place the manufacturer PDF in:

```
ingestion/input/pending/
```

Do not rename the file. Keep the original manufacturer filename so `source_file` is traceable.

---

### Step 2 — Raw Extraction

Run the pipeline:

```bash
node ingestion/scripts/run-pipeline.js
```

**What happens:**
- `scan-pending.js` detects the PDF.
- `extract-page-text.js` extracts text from every page.
- `write-raw-page-text-json.js` writes one JSON file per page to `ingestion/output/raw-page-text/`.
- `create-basic-report.js` writes a summary markdown report to `ingestion/output/reports/`.

**What does NOT happen:**
- No AI is called.
- No candidate records are created.
- No PRODUCT_DB changes.

---

### Step 3 — Normalization (planned — Next Milestone)

AI-assisted normalization reads the raw page text and attempts to identify product rows.

**Rules:**
- AI may identify, classify, and normalize product data.
- AI may NOT invent values. If a field is not in the source, it must be `null`.
- Every candidate must have `source_file`, `source_page`, and `raw_row_ref`.
- AI-inferred fields must be listed in `ai_inferred_fields`.

Output: one or more candidate JSON files in `ingestion/output/candidates/` (folder to be created).

---

### Step 4 — Validation

Automated validation checks each candidate against [VALIDATION_RULES.md](VALIDATION_RULES.md).

**Output:**
- `validation_status` is set to `extracted_candidate` or `needs_review`.
- `risk_flags` lists all active failures and warnings.
- `confidence_score` is computed.

Candidates with hard failures must not advance until a human resolves them.

---

### Step 5 — Human Review

A reviewer reads the candidate JSON alongside the original PDF source page.

**For each candidate, the reviewer must:**
1. Confirm `source_file` and `source_page` are correct.
2. Verify that dimension and identification fields match the source page.
3. Check all `ai_inferred_fields` — confirm or correct each.
4. Resolve any `risk_flags`.
5. Set `validation_status` to one of:
   - `approved_for_merge` — ready
   - `rejected` — record the reason in `confidence_reason`
   - `needs_review` — leave if more information is needed

**Reviewer must not:**
- Raise `confidence_score` without documenting a reason.
- Remove a `risk_flag` without verifying the underlying condition is resolved.
- Approve a candidate with any unresolved hard failure.

---

### Step 6 — Merge (human-triggered, separate step)

A separate merge script (to be created) reads `approved_for_merge` candidates and writes them into PRODUCT_DB.

**This step must:**
- Never run automatically.
- Require explicit human invocation.
- Produce a dry-run report before any write.
- Set `validation_status` to `merged` after a successful write.
- Never overwrite existing PRODUCT_DB fields with lower-confidence values.

---

### Step 7 — Rejected Records

Rejected candidates remain in the candidates folder with `validation_status: "rejected"`.  
They must not be deleted — they serve as an audit trail.  
A rejected record may be re-extracted from scratch if the source is re-examined.

---

## Folder Locations (current and planned)

| Purpose | Location |
|---------|----------|
| PDF inbox | `ingestion/input/pending/` |
| Processed PDFs (planned) | `ingestion/input/processed/` |
| Raw page text | `ingestion/output/raw-page-text/` |
| Summary reports | `ingestion/output/reports/` |
| Candidate records (planned) | `ingestion/output/candidates/` |
| Approved records (planned) | `ingestion/output/approved/` |
| Rejected records (planned) | `ingestion/output/rejected/` |

---

## First Milestone Acceptance Criteria

These criteria define the completed first milestone of the ingestion pipeline.

- [x] One real manufacturer PDF can be scanned.
- [x] Page-level raw text extraction works.
- [x] Raw JSON output exists (one file per page).
- [x] Report markdown output exists.
- [x] No PRODUCT_DB merge happens at any stage.
- [x] AI is not used at the raw extraction stage.

**Status: COMPLETE**  
Verified on: `GUE_general-catalogue_EN_compressed.pdf` — 1608 pages, 1605 with text, 3 empty.

---

## Next Milestone Acceptance Criteria

These criteria define the second milestone.

- [ ] Table extraction is added to the pipeline.
- [ ] Product/entity extraction is added.
- [ ] At least one 20–30 page section of the Gühring catalogue produces review-ready candidate records.
- [ ] Every candidate has `source_file` and `source_page` populated.
- [ ] Risky or incomplete records are marked `needs_review`.
- [ ] No automatic PRODUCT_DB merge happens.

**Status: IN PROGRESS**

---

## What This Workflow Explicitly Blocks

- Auto-merge of any extracted data into PRODUCT_DB.
- Candidates without source traceability advancing to review.
- AI-invented technical values appearing as source-backed data.
- Confidence scores being set without deduction logic.
- Deletion of rejected candidates (audit trail must be preserved).
