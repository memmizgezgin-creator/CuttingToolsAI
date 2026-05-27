# ToolAdvisor Current Data Model Audit

Date: 2026-05-27

Scope inspected:
- `/Users/muratonder/Desktop/ToolAdvisor/index.html`
- `/Users/muratonder/Desktop/ToolAdvisor/directory-data.js`
- `/Users/muratonder/Desktop/ToolAdvisor/directory-app.jsx`
- `/Users/muratonder/Desktop/ToolAdvisor/assets/directory-app.js`
- `/Users/muratonder/Desktop/ToolAdvisor/compare.html`
- `/Users/muratonder/Desktop/ToolAdvisor/cross-reference.html`
- `/Users/muratonder/Desktop/ToolAdvisor/advisor-ai-widget.js`
- `/Users/muratonder/Desktop/ToolAdvisor/supabase-schema.sql`
- `/Users/muratonder/Desktop/ToolAdvisor/seed-supabase.js`

Note: the requested folder `/Users/muratonder/Desktop/tooladvisor-v5-final/tooladvisor-deploy/` does not exist on this machine. This audit uses the available ToolAdvisor workspace at `/Users/muratonder/Desktop/ToolAdvisor/`.

## Executive Summary

The active catalog data model is `window.TA_TOOLS` in `directory-data.js`, not `PRODUCT_DB` in `index.html`. The current dataset contains 36 tools and is optimized for a visual demo catalog: simple ISO filtering, family filtering, confidence display, quick modal details, shortlist, compare drawer, and synthetic value suggestions.

There is also a legacy Supabase schema and seeder that expect `PRODUCT_DB`, `CROSSREF_DB`, and `CROSSREF_SIGNAL_DB` in a deploy `index.html`. Those structures are not present in the inspected active frontend. This is an important model drift: the app has at least two product schema concepts, but the current browser catalog uses only `TA_TOOLS`.

The model is useful for browsing, but it is not yet strong enough for professional cutting tool selection, cross-reference validation, category-specific filtering, or serious comparison logic. The largest gaps are category-specific geometry, thread/drill/reamer/end mill dimensions, standards, material/coating composition, machine-condition constraints, evidence records, and normalized confidence metadata.

## 1. Current Product Fields

Fields directly present in `TA_TOOLS` records:

- `id`
- `brand`
- `code`
- `grade`
- `shape`
- `tone`
- `iso`
- `family`
- `op`
- `vcMin`
- `vcMax`
- `fMin`
- `fMax`
- `apMin`
- `apMax`
- `coolant`
- `stability`
- `bestFor`
- `confidence`
- `source`
- `supply`
- `equivalents`
- `lastVerified`

Fields derived after load:

- `equivIds`
- `costTier`
- `lifeRel`
- `unitPrice`
- `costPerEdge`
- `edges`
- `weeklyPicks`
- `valueIndex`
- `peerIds`
- `betterValueId`
- `betterValueDelta`

Legacy Supabase/product fields present in `supabase-schema.sql` and `seed-supabase.js`, but not aligned with active `TA_TOOLS`:

- `product_name`
- `series`
- `product_type`
- `coating`
- `geometry`
- `iso_codes`
- `operations`
- `materials`
- `vc_range`
- `fn_range`
- `ap_range`
- `tool_life`
- `application_notes`
- `top_for`
- `exact_equivalents`
- `functional_alternatives`
- `value_alternatives`
- `cutting_data`
- `buy_links`
- `image_url`

Cross-reference table fields in legacy schema:

- `insert_code`
- `ref_desc`
- `brand`
- `equivalent_code`
- `coating`
- `application`
- `apc_class`
- `sort_order`

## 2. Missing Fields for Professional Cutting Tool Comparison

Missing universal fields:

- Manufacturer part number normalization and canonical SKU.
- Product category and subtype separate from marketing family.
- Standard designation parser output, for example ISO 1832 insert attributes.
- Metric/imperial unit metadata per value.
- Material group support as primary and secondary ranges, not a single `iso` letter.
- Workpiece material details beyond ISO group: alloy, hardness, tensile strength, heat treatment.
- Operation taxonomy: turning, milling, drilling, threading, reaming, grooving should not share a single flat `op`.
- Geometry details: insert shape, clearance, tolerance, chipbreaker, hand, size, thickness, nose radius, edge prep, rake, relief.
- Tool body/holder compatibility.
- Coating family and coating stack.
- Substrate/carbide grade family.
- Application envelope by material and operation, not one global Vc/feed/ap range.
- Feed unit context: `mm/rev`, `mm/tooth`, `mm/min`, thread pitch, chip load.
- Coolant delivery requirements: dry, flood, MQL, through-coolant, high pressure, minimum pressure/flow.
- Machine/setup constraints: rigidity, interrupted cut suitability, spindle limits, holder overhang, runout, workholding.
- Tool life evidence and test conditions.
- Price basis, currency, pack size, price date, supplier region.
- Availability/lead time source.
- Cross-reference match evidence and risk rationale.
- Data provenance per field.
- Data confidence breakdown per field and source.

## 3. Inconsistent or Weak Fields

- `family` mixes true categories and misclassified records. Example: T07 has `family:'Reaming'` but code/comment suggest threading prep. T14 is an `A-TAP` but listed as `Drilling`.
- `op` is too flat. Values like `Roughing`, `Mixed`, `Prep`, `Solid`, `Indexable`, `HSM`, `External`, `Grooving` are not comparable across families.
- `shape` is insert-oriented. Solid tools use `'-'`, so drills, taps, reamers and end mills lose their real geometry.
- `iso` is a single letter. Many tools support multiple ISO groups, priority groups, or material-specific cutting data.
- `fMin` and `fMax` are treated as `mm/rev` everywhere. Milling should usually use `fz` in mm/tooth; threading uses pitch/feed tied to thread pitch; drilling and reaming need feed per revolution with diameter context.
- `apMin` and `apMax` mean different things by category: depth of cut for turning/milling, drilling depth is not `ap`, reaming stock allowance is not `ap`.
- `coolant` is free text and mixes delivery type and pressure: `Wet/Dry`, `MQL/Dry`, `High-P`.
- `stability` is a simple label without criteria.
- `bestFor` is free text and not machine-readable.
- `source` is a coarse label, not a provenance record.
- `confidence` is a single product-level number with no per-field confidence.
- `supply` is a count, not linked to supplier records, region, stock or date.
- `costTier`, `lifeRel`, `unitPrice`, `costPerEdge`, `weeklyPicks`, and `valueIndex` are synthetic and should not be treated as verified commercial data.
- `equivIds` is derived only from same shape, same ISO, same family. This is too weak for real cross-reference.
- `compare.html` is static sample content, not driven by selected `TA_TOOLS`.
- `cross-reference.html` is static sample content, not driven by `TA_TOOLS` or a live cross-reference database.

## 4. Normalized Mandatory Fields

Recommended mandatory base fields:

- `id`
- `canonical_code`
- `manufacturer`
- `manufacturer_part_number`
- `brand`
- `category`
- `subcategory`
- `product_type`
- `standard_system`
- `designation_raw`
- `designation_normalized`
- `iso_material_groups`
- `primary_material_group`
- `operations`
- `geometry`
- `grade`
- `coating`
- `cutting_data`
- `application_constraints`
- `data_confidence`
- `sources`
- `last_verified_at`
- `status`

Recommended mandatory data-confidence fields:

- `field_confidence`
- `source_count`
- `source_types`
- `verification_status`
- `last_verified_at`
- `conflict_flags`
- `estimated_fields`

Recommended mandatory per-category field groups:

- Inserts: ISO designation attributes and edge geometry.
- Drills: diameter, flute length, overall length, shank, point angle, coolant-through, depth ratio.
- Taps: thread standard, thread size, pitch, tolerance class, chamfer form, flute type, hole type.
- Reamers: nominal diameter, tolerance, flute count, lead geometry, stock allowance.
- End mills: diameter, flute count, corner geometry, helix, LOC, OAL, shank, center-cutting.

## 5. Optional Fields

Fields that should stay optional:

- `marketing_name`
- `series`
- `image_url`
- `model_3d_url`
- `buy_links`
- `datasheet_url`
- `cad_url`
- `video_url`
- `community_pick_count`
- `user_notes`
- `review_summary`
- `alternative_notes`
- `recommended_use_cases`
- `avoid_when`
- `regional_availability`
- `price_history`
- `sustainability_notes`
- `legacy_codes`

## 6. Currently Supported Categories

Active family filter values:

- `Turning`
- `Milling`
- `Drilling`
- `Threading`
- `Reaming`

Active ISO material filters:

- `P` Steel
- `M` Stainless
- `K` Cast iron
- `N` Non-ferrous
- `S` Superalloy
- `H` Hardened

Active operations by family:

- Turning: `Finishing`, `Mixed`, `Roughing`
- Milling: `Face`, `HSM`, `High-feed`, `Shoulder`
- Drilling: `Indexable`, `Roughing`, `Solid`
- Threading: `External`, `Grooving`, `Internal`
- Reaming: `Finishing`, `Prep`

Important caveat: these categories are UI-supported, but the field model is still insert-centric and does not correctly represent all categories.

## 7. Categories to Support Next

Highest priority:

- Turning inserts and holders.
- Milling inserts and milling cutters.
- Solid carbide end mills.
- Indexable drills and solid carbide drills.
- Taps.
- Reamers.
- Grooving and parting tools as their own category, not under threading.

Next expansion:

- Thread mills.
- Boring bars and boring heads.
- Toolholders/adapters.
- U-drills/spade drills.
- Countersinks/counterbores.
- Form tools.

## 8. Requirements for Taps, Drills, Reamers and End Mills

Taps:

- Thread standard: ISO metric, UN, UNC, UNF, NPT, BSP, etc.
- Thread size, pitch/TPI, tolerance class.
- Tap style: cutting, forming, spiral point, spiral flute, straight flute.
- Hole type: blind, through.
- Chamfer form and chamfer length.
- Material: HSS, HSSE, PM-HSS, carbide.
- Coating and surface treatment.
- Shank standard, square size, OAL, thread length.
- Coolant capability.
- Recommended tapping speed and lubricant.
- Synchronised/rigid tapping compatibility.

Drills:

- Diameter, flute length, overall length, shank diameter/type.
- Drill type: solid carbide, HSS, indexable, exchangeable-tip.
- Length ratio: 3xD, 5xD, 8xD, 12xD, etc.
- Point angle, point geometry, web thinning.
- Flute count and helix.
- Through-coolant support.
- Hole tolerance expectation.
- Entry/exit/interrupted-surface suitability.
- Feed per revolution and speed by material and diameter.

Reamers:

- Nominal diameter and tolerance class.
- Adjustable/fixed, machine/hand, carbide/HSS.
- Flute count, flute type, left/right hand spiral.
- Lead/chamfer geometry.
- Stock allowance range.
- Hole tolerance, surface finish expectation.
- Coolant and lubrication requirements.
- Pre-hole diameter requirements.

End mills:

- Cutter diameter, shank diameter, length of cut, overall length, neck length.
- Flute count, helix angle, rake, variable pitch/helix.
- Corner geometry: sharp, chamfer, radius, ball nose.
- Center cutting, ramping, plunging, slotting suitability.
- Coating and substrate.
- Application: roughing, finishing, HSM, trochoidal, aluminum, hard milling.
- Cutting data by material: Vc, fz, ae, ap.
- Tool engagement limits and stability guidance.

## 9. Requirements for Data Confidence Layer

The current `confidence` number should become a layered confidence object:

- Product identity confidence.
- Geometry confidence.
- Grade/coating confidence.
- Cutting data confidence.
- Cross-reference confidence.
- Commercial/availability confidence.
- Recommendation confidence.

Each confidence score should be explainable from:

- Source type: manufacturer catalog, distributor catalog, datasheet, scraped page, engineer review, user feedback, generated estimate.
- Source URL or document reference.
- Retrieval date.
- Last verification date.
- Field-level evidence.
- Conflict status.
- Estimation method.
- Reviewer identity or workflow status.

Recommended statuses:

- `verified_manufacturer`
- `verified_distributor`
- `engineer_reviewed`
- `multi_source_match`
- `single_source`
- `estimated`
- `conflict`
- `stale`

## 10. Requirements for Category-Specific Filters

The current filters are universal: search, family, ISO, operation, confidence and sort. Professional filtering needs a schema-driven filter registry by category.

Universal filters:

- Category.
- Manufacturer/brand.
- ISO material group.
- Operation.
- Grade family.
- Coating family.
- Coolant capability.
- Confidence threshold.
- Source quality.
- Availability region.

Insert filters:

- Shape, clearance, tolerance, size, thickness, nose radius.
- Chipbreaker.
- Hand.
- Insert type.

Drill filters:

- Diameter range.
- Length ratio.
- Tool material.
- Through-coolant.
- Shank type.
- Point angle.

Tap filters:

- Thread standard.
- Thread size.
- Pitch/TPI.
- Tolerance class.
- Hole type.
- Tap style.
- Material and coating.

Reamer filters:

- Diameter range.
- Tolerance class.
- Flute count.
- Reamer type.
- Stock allowance.

End mill filters:

- Diameter range.
- Flute count.
- Corner type/radius.
- Helix.
- LOC/OAL.
- Center cutting.
- Application strategy.

## 11. Requirements for Stronger Product Detail Page

The current detail modal shows identity, basic specs, confidence, supply, equivalents and peer picks. It should become a data-backed product detail page or deep modal with:

- Canonical product identity and manufacturer links.
- Full decoded designation.
- Category-specific technical geometry table.
- Cutting data by material and operation.
- Holder/tool body compatibility.
- Application limits and avoid conditions.
- Confidence explanation with source evidence.
- Cross-reference section with match reasons.
- Commercial section with pack size, price basis, suppliers, lead time and date.
- Downloads: datasheet, CAD/model, CSV/JSON export.
- Change history and last verification.
- Similar tools and alternatives with explainable differences.
- Clear warning when data is estimated or incomplete.

## 12. Requirements for Serious Comparison Logic

The current comparison experience is mostly static and visual. Serious comparison needs:

- Dynamic loading from selected products in local storage or URL state.
- A normalized comparison schema that supports missing and category-specific fields.
- Compatibility gating: do not compare taps against turning inserts as if fields mean the same thing.
- Match/scoring dimensions with weights per category.
- Unit conversion and display-unit consistency.
- Material- and operation-specific cutting envelope comparison.
- Risk scoring based on geometry mismatch, material mismatch, coolant mismatch, holder mismatch and source confidence.
- Explainable comparison outputs: exact, equivalent, functional alternative, value alternative, not recommended.
- Baseline selection and delta calculations.
- Evidence and confidence per compared field.
- Exportable decision report.

## Implementation Direction, No Code Yet

Start by defining a canonical product schema and category-specific extensions. Then migrate `TA_TOOLS` into that schema with explicit `estimated` flags for synthetic values. After that, rebuild filters, detail rendering, cross-reference and comparison around the normalized schema.

Do not treat current synthetic economics or cross-reference derivations as professional-grade data. They are useful placeholders only.
