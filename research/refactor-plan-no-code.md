# Refactor Plan, No Code

Date: 2026-05-27

This is a planning document only. Do not implement until the data model is approved.

## Current State

The active frontend catalog uses `window.TA_TOOLS` from `directory-data.js`. `PRODUCT_DB`, `CROSSREF_DB`, and `CROSSREF_SIGNAL_DB` are referenced by legacy Supabase seed scripts, but are not present in the active inspected `index.html`.

The product model is currently suitable for a compact demo catalog, but it is not yet suitable for professional cutting tool comparison. Filters, product details, cross-reference and comparison logic are driven by a small set of generic fields.

## Phase 1: Define Canonical Schema

Create a canonical product schema with:

- Universal base fields.
- Category-specific field groups.
- Normalized operation taxonomy.
- Normalized ISO/material support.
- Unit-aware cutting data.
- Field-level confidence and source records.

Decision needed: choose whether the source of truth will be local JSON, Supabase, or a generated static data bundle from Supabase.

## Phase 2: Map Existing `TA_TOOLS`

Migrate current fields into canonical fields:

- `brand` -> `manufacturer` or `brand`.
- `code` -> `designation_raw` and `designation_normalized`.
- `family` -> `category`.
- `op` -> mapped operation value.
- `iso` -> `primary_material_group`.
- `vcMin/vcMax/fMin/fMax/apMin/apMax` -> preliminary `cutting_data` record with explicit units and estimate flags.
- `source/confidence/lastVerified` -> initial confidence object.

Mark synthetic fields as estimated:

- `costTier`
- `unitPrice`
- `costPerEdge`
- `lifeRel`
- `weeklyPicks`
- `valueIndex`
- `betterValueId`
- `betterValueDelta`

## Phase 3: Build Category-Specific Extensions

Define schemas for:

- Turning inserts.
- Milling inserts.
- Solid drills.
- Indexable drills.
- Taps.
- Reamers.
- End mills.
- Grooving/parting tools.

Each schema needs:

- Mandatory technical fields.
- Optional enrichment fields.
- Filter definitions.
- Comparison row definitions.
- Validation rules.

## Phase 4: Data Confidence Layer

Replace the single `confidence` value with:

- Overall confidence.
- Identity confidence.
- Geometry confidence.
- Cutting data confidence.
- Cross-reference confidence.
- Commercial confidence.
- Field-level confidence.
- Evidence/source records.
- Stale/conflict/estimated flags.

The UI should show both a score and the reason behind it.

## Phase 5: Category-Specific Filters

Replace hard-coded family/operation filters with a filter registry:

- Universal filters always available.
- Category filters appear only when relevant.
- Filter values are derived from normalized data.
- URL state supports deep links.
- CSV export uses the same normalized field definitions.

## Phase 6: Product Detail Page

Replace the current generic modal with a stronger category-aware detail view:

- Identity and decoded designation.
- Technical geometry table.
- Cutting data by material and operation.
- Compatibility.
- Application notes and avoid conditions.
- Confidence and source evidence.
- Alternatives and cross-references.
- Commercial/availability data when verified.

The existing modal can remain as a quick view, but it should link to a full detail route once routes exist.

## Phase 7: Cross-Reference Logic

Replace visual/static cross-reference content with scored matching:

- Exact equivalent.
- Near equivalent.
- Functional alternative.
- Value alternative.
- Not recommended.

Scoring should consider:

- Geometry/designation compatibility.
- Grade/coating/substrate similarity.
- Material group overlap.
- Operation compatibility.
- Cutting envelope overlap.
- Holder/tool body compatibility.
- Confidence and source evidence.
- Risk notes.

## Phase 8: Serious Compare Logic

Make compare dynamic and schema-aware:

- Load selected product IDs from local storage or URL.
- Prevent meaningless comparisons or label them as cross-category.
- Show only rows relevant to selected category.
- Use unit conversion where needed.
- Compute deltas against a baseline.
- Show confidence per compared row.
- Export a decision report.

## Phase 9: Data Quality Backlog

Before broad launch, clean these known weaknesses:

- Fix records whose family does not match code/application.
- Separate grooving from threading.
- Separate solid drills, indexable drills, taps and reamers.
- Stop rendering all feed values as `mm/rev`.
- Stop using `ap` as a universal depth field.
- Replace synthetic pricing/life/community metrics with explicit estimated labels or verified data.
- Resolve the `PRODUCT_DB`/`TA_TOOLS` schema drift.

## Suggested Order

1. Approve canonical schema.
2. Create migration map from current `TA_TOOLS`.
3. Add validation rules and confidence structure.
4. Rebuild filters around schema registry.
5. Rebuild detail view.
6. Rebuild comparison.
7. Rebuild cross-reference.

No code changes are recommended until the schema and category scope are approved.
