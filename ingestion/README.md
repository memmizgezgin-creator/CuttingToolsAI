# ToolAdvisor Ingestion Pipeline

This folder contains the local pipeline for importing manufacturer PDF data into ToolAdvisor.

**No AI is used at the raw extraction stage.**  
**No automatic merge into PRODUCT_DB happens at any stage.**

---

## Folder Structure

```
ingestion/
├── input/
│   └── pending/          # Drop manufacturer PDFs here for processing
├── output/
│   ├── raw-page-text/    # Raw page-level text extracted from PDFs
│   └── reports/          # Markdown summary reports per PDF
├── scripts/              # Codex extraction scripts (do not modify)
│   ├── scan-pending.js
│   ├── extract-page-text.js
│   ├── write-raw-page-text-json.js
│   ├── create-basic-report.js
│   ├── run-pipeline.js
│   └── shared.js
├── README.md             # This file
├── SCHEMA.md             # Candidate product record schema
├── VALIDATION_RULES.md   # Hard failures and review warnings
└── REVIEW_WORKFLOW.md    # End-to-end review and approval process
```

---

## How to Process a PDF

1. Drop the PDF into `ingestion/input/pending/`.
2. Run the pipeline: `node ingestion/scripts/run-pipeline.js`
3. Raw page text appears in `ingestion/output/raw-page-text/`.
4. A summary report appears in `ingestion/output/reports/`.
5. No AI step runs. No PRODUCT_DB change happens.

---

## What This Pipeline Does NOT Do (yet)

- OCR for image-only pages
- Table extraction (planned: Next Milestone)
- Product/entity extraction (planned: Next Milestone)
- Schema mapping into ToolAdvisor candidate format
- Deduplication
- Confidence scoring
- AI classification or normalization
- PRODUCT_DB merge (requires separate human-approved step, always)

---

## Governance Documents

| Document | Purpose |
|----------|---------|
| [SCHEMA.md](SCHEMA.md) | Defines all fields in a candidate product record |
| [VALIDATION_RULES.md](VALIDATION_RULES.md) | Hard failures and review warnings |
| [REVIEW_WORKFLOW.md](REVIEW_WORKFLOW.md) | Review and approval process |
| [../AGENTS.md](../AGENTS.md) | Project-wide agent rules and data principles |

---

## Current Milestone Status

**First Milestone — COMPLETE**

- Real manufacturer PDF can be scanned ✅
- Page-level raw text extraction works ✅
- Raw JSON output exists ✅
- Report markdown output exists ✅
- No PRODUCT_DB merge happens ✅
- AI is not used at the raw extraction stage ✅

Tested on: `GUE_general-catalogue_EN_compressed.pdf` (1608 pages, 1605 with text, 3 empty)

**Next Milestone — IN PROGRESS**

See [REVIEW_WORKFLOW.md](REVIEW_WORKFLOW.md) for acceptance criteria.
