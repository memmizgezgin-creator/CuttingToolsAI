# Product Card, Detail, Advisor, And Compare Recommendations

Research date: 2026-05-27

## Current ToolAdvisor Structure Observed

The requested path `/Users/muratonder/Desktop/tooladvisor-v5-final/tooladvisor-deploy/` was not present on disk. I inspected the active workspace at `/Users/muratonder/Desktop/ToolAdvisor`.

Relevant files inspected:

- `/Users/muratonder/Desktop/ToolAdvisor/index.html`
- `/Users/muratonder/Desktop/ToolAdvisor/catalog.html`
- `/Users/muratonder/Desktop/ToolAdvisor/directory-data.js`
- `/Users/muratonder/Desktop/ToolAdvisor/modals.js`
- `/Users/muratonder/Desktop/ToolAdvisor/page-switcher.js`
- `/Users/muratonder/Desktop/ToolAdvisor/compare.html`
- `/Users/muratonder/Desktop/ToolAdvisor/assets/directory-app.js`

Observed structure:

- `directory-data.js` contains `window.TA_TOOLS`, a 36-item demo dataset.
- Product records currently use flat fields: `brand`, `code`, `grade`, `shape`, `iso`, `family`, `op`, `vcMin`, `vcMax`, `fMin`, `fMax`, `apMin`, `apMax`, `coolant`, `stability`, `bestFor`, `confidence`, `source`, `supply`, `equivalents`, `lastVerified`.
- Synthetic economics are derived in code: `costTier`, `lifeRel`, `unitPrice`, `costPerEdge`, `weeklyPicks`, `valueIndex`.
- Product detail modal in `modals.js` is a generic demo detail and does not reflect category-specific attributes.
- Advanced filter modal covers family, ISO material, brand, cost tier, and confidence, but lacks geometry, dimensions, standards, hole/thread fields, coating, and source validation.
- Catalog sidebar filters by family and ISO group; this is a good foundation but too shallow for real cutting-tool selection.
- Compare page is visually strong, but mostly hard-coded for turning inserts and includes “Buy” actions that are not aligned with the brand-neutral/non-marketplace direction.
- Advisor result cards focus on grades and cutting-data ranges, but should show source confidence, fit basis, and risk notes more clearly.

## Product Card Layout

Must-have now:

1. Header row
   - Brand
   - Product code
   - Tool type
   - Source/confidence badge

2. Primary fit row
   - ISO material chips: P/M/K/N/S/H
   - Operation chips: finishing, medium, roughing, blind hole, through hole, shoulder milling, etc.
   - Best-use case, one short line

3. Key dimensions row
   - Turning/milling insert: shape, size/IC, radius, chipbreaker
   - Drill: diameter, flute length, L/D, coolant-through
   - Tap: thread size/pitch, hole type, flute type, tolerance
   - End mill: diameter, flute count, cutting length, corner style
   - Reamer: diameter, tolerance, flute count

4. Grade/coating row
   - Grade
   - Coating/finish
   - Tool material when relevant

5. Actions
   - Compare
   - Equivalent
   - Detail

Good later:

- Compact cutting envelope visualization.
- “Why this matches” expandable micro-panel.
- User-context overlay: “fits your current material/operation”.

Not needed yet:

- Add-to-cart / buy button.
- Manufacturer images.
- Long marketing description.

Recommended compact card wireframe:

```text
[Brand]                [Verified 92]
PRODUCT-CODE           Turning insert
ISO P primary · ISO M possible · Medium turning

Geometry: CNMG · C shape · r 0.8 · PM chipbreaker
Grade/coating: GC4325 · CVD
Best use: stable P-group medium turning

[Compare] [Equivalent] [Detail]
```

## Product Detail Page / Modal

Must-have now:

- Identity block: brand, product code, ISO/ANSI code, series, tool type.
- Technical specification table with category-specific groups.
- Application range: material groups, operations, stability/coolant assumptions.
- Recommended use cases.
- Cross-reference alternatives with exact/near/avoid tiers.
- Risk/watch-out notes.
- Source and validation section:
  - source tier
  - validation status
  - confidence score
  - source name
  - source URL/file/page
  - last checked
  - risk flags

Good later:

- Evidence panel showing which fields came from which source.
- Change history by `last_checked`.
- CAD/datasheet links only when legally and publicly linked, not copied.
- CAM-ready cutting-data export after source licensing is clear.

Not needed yet:

- Full variant matrix for every manufacturer family.
- Image gallery.
- Checkout/quote flow.

## Advisor Result Cards

Current advisor cards are close in spirit but should be stricter about evidence. Recommended fields:

- Match rank
- Product code + brand
- Tool type
- Fit basis: material, operation, geometry, grade/coating
- Key dimensions required for the operation
- Recommended envelope, if verified: Vc, feed, ap/ae
- Confidence badge
- Source badge
- Risk note
- Alternatives button
- Compare button

Must-have now:

- Stop presenting “top match” without showing confidence and verification status.
- Include “verify on sample part” only as a risk/footer note, not as a substitute for source metadata.
- Label estimates clearly.

## Compare Modal / Matrix

Must-have now:

- Compare only same comparable class by default:
  - turning insert vs turning insert
  - tap vs tap
  - drill vs drill
  - end mill vs end mill
- Add category-aware row groups:
  - Identity
  - Geometry
  - Dimensions
  - Grade/coating
  - Material compatibility
  - Operation fit
  - Cutting envelope
  - Trust/source
  - Risks

Turning insert compare rows:

- ISO/ANSI code
- Insert shape
- Clearance/relief
- Tolerance
- Size/IC
- Thickness
- Corner/nose radius
- Chipbreaker
- Grade
- Coating
- P/M/K/N/S/H suitability
- Operation
- Coolant
- Vc/feed/ap envelope
- Confidence/risk/source

Tap compare rows:

- Thread size
- Pitch/TPI
- Thread standard
- Tap type
- Hole type
- Flute type
- Chamfer form
- Tolerance
- Coating/finish
- Tool material
- Shank diameter
- Overall length
- Thread/cutting length
- Coolant
- Workpiece material
- Confidence/risk/source

Drill compare rows:

- Diameter
- L/D
- Flute length
- Overall length
- Point angle
- Shank type/diameter
- Coating
- Tool material
- Coolant-through
- Workpiece material
- Vc/feed if verified
- Confidence/risk/source

End mill compare rows:

- Diameter
- Flutes
- Corner style/radius
- Cutting length
- Overall length
- Shank diameter
- Coating
- Tool material
- Helix angle
- Center-cutting
- Workpiece material
- Operation
- Confidence/risk/source

Good later:

- Best-use case row with advisory text.
- Weighted compare scoring by user priority.
- “Not comparable” warning when users mix categories or incompatible operations.

Not needed yet:

- Price/lead-time as default rows. Keep optional and user-selected.
- “Buy” links in compare.

## Trust And Confidence Layer

Each product should support:

- `source_tier`: manufacturer, authorized_distributor, neutral_data_platform, public_catalog_pdf, manual_review, estimated, unknown
- `validation_status`: verified, partially_verified, needs_review, estimated, stale, rejected
- `confidence_score`: 0-100
- `source_name`
- `source_url`
- `source_file`
- `source_page`
- `last_checked`
- `risk_flags`

Recommended scoring:

- 95-100: manufacturer or neutral licensed source, field-level verification, recent check.
- 85-94: manufacturer/distributor source with clear specs, minor fields inferred.
- 70-84: distributor/public PDF/manual review, some gaps.
- 50-69: plausible but incomplete, use only with warning.
- Below 50: do not recommend; show only as unverified reference.

Risk flags to expose:

- Estimated field
- Stale source
- Distributor-only source
- Conflicting sources
- Missing dimensions
- Missing grade/coating
- Operation unclear
- Material suitability unclear
- Manual review required

## Current Gap Summary

Must-have now:

- Replace flat `iso`, `family`, `op` model with category-aware product schema.
- Add trust metadata beyond `confidence`, `source`, and `lastVerified`.
- Remove or de-emphasize `Buy` actions from compare/cards.
- Add geometry/dimension/standard filters.
- Add category-specific product detail sections.

Good later:

- Import pipeline that maps ISO/GTC/ISO 13399 property names to ToolAdvisor labels.
- Field-level provenance.
- Compare scoring by user priority.

Not needed yet:

- Holder-first records.
- Marketplace commercial workflows.
- Blog/content expansion.
