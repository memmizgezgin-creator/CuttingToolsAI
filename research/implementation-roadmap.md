# Implementation Roadmap

Research date: 2026-05-27

Goal: evolve ToolAdvisor from demo catalogue records into a brand-neutral cutting-tool decision platform. Do not clone product databases, scrape protected content, or add marketplace behavior.

## Phase 1: Data Model Foundation

Must-have now:

- Add the proposed schema as the canonical internal product shape.
- Keep existing `directory-data.js` as demo seed data, but map it into the normalized schema before rendering.
- Add `trust` to every record:
  - `source_tier`
  - `validation_status`
  - `confidence_score`
  - `source_name`
  - `source_url`
  - `source_file`
  - `source_page`
  - `last_checked`
  - `risk_flags`
- Split flat fields into:
  - identity
  - geometry
  - dimensions
  - grade/coating
  - application
  - cutting_data
  - commercial optional
  - trust

Good later:

- Add field-level provenance: each spec field can point to a source and validation status.
- Add ISO 13399/GTC property code mapping table for internal imports.

Not needed yet:

- Full manufacturer catalogue import.
- Image asset ingestion.

## Phase 2: Product Cards

Must-have now:

- Replace current generic card rendering with category-aware card summaries.
- Show source/confidence badge on every card.
- Show three action buttons only:
  - Compare
  - Equivalent
  - Detail
- Remove default `Buy` calls to action from product cards.
- Add risk note when `validation_status` is not verified.

Good later:

- Show compact cutting-envelope bars when verified ranges exist.
- Add quick “why this matches” popover.

Not needed yet:

- Supplier offer cards.
- Product image galleries.

## Phase 3: Filters

Must-have now:

- Implement filter groups from `filter-model-proposal.json`:
  - Tool Type
  - Operation
  - Workpiece Material
  - Geometry
  - Dimensions
  - Grade / Coating
  - Standard
  - Source Confidence
  - Brand
- Keep Availability / Commercial hidden or optional.
- Make filters category-aware so tap fields do not clutter turning insert browsing.

Good later:

- Save filter presets.
- Show field coverage count, e.g. “Radius known for 82% of results.”

Not needed yet:

- SEO landing pages for every filter combination.
- Marketplace-style faceted commerce pages.

## Phase 4: Detail Modal

Must-have now:

- Rebuild tool detail as category-specific sections:
  - Identity
  - Technical specifications
  - Application range
  - Material suitability
  - Recommended use cases
  - Cross-reference alternatives
  - Risk/watch-out notes
  - Source and validation
- Add `last_checked` and confidence score visibly.
- Show “estimated” fields clearly.

Good later:

- Add source evidence drawer.
- Add source conflict view when two public sources disagree.

Not needed yet:

- Downloaded manufacturer images.
- Full PDF catalog page mirroring.

## Phase 5: Compare Matrix

Must-have now:

- Replace hard-coded compare page rows with schema-driven row groups.
- Default to same-category comparisons.
- Add “not directly comparable” warning for mixed tool types.
- Add trust/source/risk rows.
- Remove `Buy` buttons from compare.

Good later:

- User-selected priority scoring:
  - safest
  - productivity
  - tool life
  - cost-aware
  - stainless/hard material focus
- Export CSV/PDF only from ToolAdvisor’s normalized fields, with source metadata.

Not needed yet:

- Live price comparison.
- Cart checkout.

## Phase 6: Advisor Result Cards

Must-have now:

- Advisor output should use normalized fields and display:
  - product code
  - brand
  - tool type
  - key dimensions
  - material suitability
  - grade/coating
  - confidence badge
  - source badge
  - risk note
- Do not recommend products below a minimum confidence threshold unless explicitly labelled as “needs verification.”

Good later:

- Explain match basis field-by-field.
- Suggest “verify these fields before production” checklist.

Not needed yet:

- AI-generated product specs.
- Unverified cross-brand swaps as final answers.

## Phase 7: Research Automation Rules

Must-have now:

- Use source URLs as references only.
- Collect field names and page structure, not full product rows.
- Store source metadata and `last_checked`.
- Respect robots.txt, login walls, rate limits, paywalls, and copyright.
- Never reuse protected product images.

Good later:

- Add a manual review queue for field normalization.
- Add source freshness checks for known public pages.

Not needed yet:

- Automated bulk crawling of manufacturer catalogues.
- Scraping all variants from product families.

## Proposed Work Order

1. Add schema and mapper around current `window.TA_TOOLS`.
2. Add trust metadata defaults to seed records.
3. Rebuild card component data contract.
4. Rebuild detail modal around category sections.
5. Implement filter groups and category-specific visibility.
6. Rebuild compare matrix from schema rows.
7. Add advisor result card contract.
8. Add source confidence and risk flag display everywhere a recommendation appears.

## Success Criteria

- A user can filter turning inserts by ISO code/shape/radius/chipbreaker/grade/coating/material group.
- A user can filter taps by thread size/pitch/standard/hole type/flute type/tolerance/coating.
- A product card shows enough technical context to decide whether to open details.
- A detail page tells the user what is verified, what is estimated, and what to watch out for.
- A compare matrix can compare tools without pretending unlike categories are equivalent.
- ToolAdvisor remains brand-neutral and advisory, not a catalogue clone or marketplace.
