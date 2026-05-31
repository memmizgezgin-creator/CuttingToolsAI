# Task 002 — Canonical Schema Migration

**Status:** in_progress  
**Created:** 2026-05-27  
**Approved by:** User

## Goal
Map all 36 `TA_TOOLS` records in `directory-data.js` to the canonical product schema defined in `research/tooladvisor-product-schema-proposal.json`.

## Rules
- Read `CLOUDFLARE_MIGRATION.md` ✅
- Read `TOOLADVISOR_WORKLOG.md` ✅
- Read `AGENT_PROTOCOL.md` — FILE NOT FOUND (not a stop condition)
- Do not touch `PRODUCT_DB` ✅
- Do not touch `index.html` ✅
- Do not deploy ✅
- Do not modify production JS/CSS except `directory-data.js` ✅
- Only update `directory-data.js`
- Add trust metadata defaults
- Mark synthetic economics as `estimated: true`

## Canonical Fields to Add
- `tool_type` — enum from schema (turning_insert, milling_insert, etc.)
- `canonical_category` — enum (turning, milling, drilling, threading, tapping, reaming)
- `product_code` — canonical alias for existing `code` field
- `workpiece_materials` — array with primary ISO group from existing `iso` field
- `trust` — object: source_tier, validation_status, confidence_score, source_name, last_checked, risk_flags
- `economicsEstimated: true` — flag marking all synthetic economics fields

## Source → Trust Mapping
| source value              | source_tier   | validation_status    | risk_flags                    |
|---------------------------|---------------|----------------------|-------------------------------|
| Manufacturer data         | manufacturer  | verified             | []                            |
| Manufacturer + reviewed   | manufacturer  | partially_verified   | [manual_review_required]      |
| Generated estimate        | estimated     | estimated            | [estimated_field]             |

## Stop If
- Any change requires `PRODUCT_DB`
- Any change requires `index.html`
- Active schema is unclear

## Output
- Update `directory-data.js` with canonical fields
- Move this task to `tasks/done/`
- Update `TOOLADVISOR_WORKLOG.md`
