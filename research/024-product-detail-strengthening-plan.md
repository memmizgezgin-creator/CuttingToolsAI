# Task 024 — Product Detail Strengthening Plan

**Date:** 2026-05-28  
**Type:** Planning / research only  
**Scope:** Product detail modal/drawer decision-support strengthening  
**Files read:** `CLOUDFLARE_MIGRATION.md`, `TOOLADVISOR_WORKLOG.md`, `AGENT_PROTOCOL.md`, `AGENT_DISPATCHER.md`, `catalog.html`, `directory-app.jsx`, `directory-data.js`  
**Rules honored:** No code changes, no `PRODUCT_DB` changes, no `directory-data.js` changes, no deploy, no SEO/canonical work, no new agent/system rules.

## Executive Summary

The product detail experience already contains the raw ingredients of a decision screen: cutting envelope, material/operation fit, confidence, source status, risk notes, alternatives, and compare actions. The weakness is structure. The current detail view still reads partly like an enriched catalog record instead of a guided engineering decision surface.

Product Detail v1 should not require new product data. The main opportunity is to reorganize existing fields and existing derived signals into a clearer decision sequence:

1. Decision verdict: best use, confidence, context fit, and primary trade-off.
2. Operating window: Vc, feed, ap, coolant/stability assumptions.
3. Why this fits: material, operation, geometry, coating, comparable evidence.
4. Watch-outs: low confidence, narrow window, unstable setup, limited comparables.
5. Alternatives: exact equivalents, functional alternatives, value alternatives, compare.
6. Evidence: source type, confidence meaning, validation risk, last checked when available.

Success criterion: when a user clicks a product, they should see "Can I use this for my setup, why, under what limits, and what should I compare it against?" rather than just product attributes.

## Current Product Detail Modal: What It Shows

There are two relevant product detail implementations.

### `catalog.html` Product Detail Drawer

Active catalog detail opens through `openProductDetail(productId, sourceSurface, event)`.

Current content:

- Header title: brand + product name.
- Subtitle: series, operation context, ISO material context when available.
- Product visual / technical placeholder from `renderProductVisual`.
- Top badges: "Best match" and confidence percent.
- Meta tags from `renderProductMetaTags`.
- "Recommended for" summary rows from `buildDetailDecisionSummaryRows`.
- "Why this tool?" bullets from `buildDetailWhyBullets`.
- "Watch out" bullets from `buildDecisionWatchBullets`.
- Action bar: Compare, View Equivalents, Save / Shortlist.
- Technical grid:
  - Brand, product, series, grade, coating, geometry.
  - ISO codes, operations, ISO materials.
  - Vc range, feed range, ap range.
  - Tool life.
  - Confidence score and band.
- Additional technical detail from `renderToolAdvisorTechnicalDetail`.
- Application notes.
- Context-specific `cuttingData` if present.
- Why this / warning / trade-off text.
- Relation lists:
  - Exact equivalents.
  - Functional alternatives.
  - Value alternatives.
  - Related products.
- Buy links.

The current drawer is stronger than a basic catalog modal, but the order and labels still mix identity, evidence, recommendation, warnings, and commercial actions in one long scroll.

### `directory-app.jsx` React Detail Modal

The React modal uses `DetailModal({ tool, onClose, onOpenTool, tools })`.

Current content:

- Header: 3D insert visual, brand, family, tool type, product code, best-for sentence.
- ISO, grade, operation, stability, coolant chips.
- Three core spec blocks:
  - Cutting speed Vc.
  - Feed rate.
  - Depth of cut ap.
- Expanded `TrustBadge`:
  - Confidence bar.
  - Validation status.
  - Source tier.
  - Source name.
  - Last checked.
  - Risk flags.
- Supply/availability block with supplier count and estimated economics disclaimer.
- Cross-reference equivalents.
- "Engineers who picked this also considered" peer picks.
- Footer actions: Find equivalents and Add to compare.

This modal is clean, but it is still mostly descriptive. It lacks the explicit decision flow already present in `catalog.html`: why fit, watch-out, trade-off, and context-specific recommendation language.

## Missing Information for Real Decision-Making

The current data is enough for a useful v1 decision screen, but not enough for a fully reliable engineering selection system.

Missing or weak for decision-making:

- Exact insert geometry decomposition: shape, clearance, tolerance, size/IC, thickness, nose radius, chipbreaker as separate normalized fields.
- Category-specific dimensional fields:
  - Turning/milling inserts: ISO/ANSI code decomposition, radius, edge prep, chipbreaker.
  - Drills: diameter, flute length, L/D, point angle, shank, through-coolant.
  - Taps/threading: pitch/TPI, thread standard, hole type, chamfer form, tolerance, handedness.
  - Holders: interface, shank, compatible insert seats.
- Verified operation envelope by material and operation, not just broad `vcRange`, `fnRange`, `apRange`.
- Machine/setup assumptions: rigidity, interrupted cut suitability, overhang, coolant pressure, horsepower limits.
- Workpiece specificity beyond ISO group: e.g. 42CrMo4, 316L, GG25, Ti-6Al-4V, Inconel 718.
- Failure mode guidance: flank wear, crater wear, notch wear, BUE, chipping, thermal cracking.
- Exact source evidence: manufacturer URL, catalog page, PDF page, source date per field.
- Real commercial data: stock status, lead time, price, supplier verification.
- Verified replacement logic: exact equivalent vs near equivalent vs avoid/substitution risk.

## Ideal Product Detail Section Structure

Recommended v1 information architecture:

### 1. Decision Header

Purpose: answer "Should I consider this tool for my current context?"

Content:

- Product identity: brand, product name/code, series, grade.
- Context line: selected operation + ISO material, or first available operation/material.
- Verdict badge:
  - Best match / Review needed / Specialist option / Safer option / Flexible option.
- Confidence badge:
  - Percent, band, source status.
- One-sentence decision summary:
  - "Best when..."
  - "Primary trade-off..."

### 2. Operating Window

Purpose: make the usable machining envelope scannable.

Content:

- Vc range.
- Feed range.
- ap range.
- Coolant assumption.
- Stability/setup assumption.
- Context-specific `cuttingData` if available.
- Clear estimate/verification language.

### 3. Why This Fits

Purpose: convert product attributes into reasoning.

Content:

- Material fit: direct ISO match or adjacent/inferred signal.
- Operation fit: direct operation tag or comparable application signal.
- Geometry/chip-control signal.
- Coating/grade fit.
- Comparable evidence count or relation coverage.

Current support:

- `buildDecisionFitBullets`.
- `buildRecommendationMethodBullets`.
- `computeRecommendationTrust`.
- `computeDecisionSignals`.

### 4. Watch-Outs / When Not To Use

Purpose: prevent over-trusting a recommendation.

Content:

- Low-confidence warning.
- Limited comparable data.
- Narrow specialist profile.
- Aggressive speed/feed warning for unstable setups.
- Material mismatch warning.
- "Pilot run required" when appropriate.

Current support:

- `buildDecisionWatchBullets`.
- `signals.whenNot`.
- `trust.warning`.

### 5. Alternatives and Next Actions

Purpose: help the user decide, compare, or substitute.

Content:

- Exact equivalents.
- Functional alternatives.
- Value alternatives.
- Related products.
- Add to compare.
- View equivalents.
- Save / shortlist.

Recommendation:

- Keep "Compare" and "View equivalents" as primary engineering actions.
- De-emphasize or remove "Buy links" from decision flow; if retained, place below evidence and label as external lookup, not a recommendation.

### 6. Evidence / Trust

Purpose: show why ToolAdvisor can be trusted without pretending certainty.

Content:

- Confidence score and band.
- Source type / source tier.
- Last checked.
- Risk flags.
- Confidence meaning.
- Generated/imported/manual source badge where available.
- Field-level source evidence later, after data enrichment.

## What Can Be Done With Current Data Without Touching PRODUCT_DB

The following can be implemented using existing data and helper functions only.

- Reorder the detail view into a decision-first layout.
- Promote existing `trust.score`, `trust.band`, `trust.why`, `trust.warning`.
- Promote existing `signals.tradeoff.line`, `signals.whenNot`, `signals.decisionLens`.
- Use current `buildDecisionFitBullets` and `buildDecisionWatchBullets` as first-class sections.
- Use `renderProductTechnicalStrip` and `renderToolAdvisorTechnicalDetail` as a compact technical spec layer.
- Use existing `vcRange`, `fnRange`, `apRange`, `cuttingData`, `toolLife`, `applicationNotes`.
- Use existing `materials`, `operations`, `isoCodes`, `geometry`, `coating`, `grade`, `series`, `productType`.
- Use existing relation arrays:
  - `exactEquivalents`.
  - `functionalAlternatives`.
  - `valueAlternatives`.
  - `relatedProducts`.
- Keep generated/imported confidence handling through existing `_isGenerated`, `confidence`, `sourceType`, and ingestion metadata.
- Build a clearer "Decision summary" without adding new records.
- Add "Not enough data" placeholders for missing section fields instead of inventing values.

## Fields That Require Data Enrichment / New Data

These should not be faked in v1.

- Normalized insert code decomposition.
- Exact chipbreaker code and chipbreaker application class.
- Nose radius, thickness, IC/size, clearance, tolerance, edge prep.
- Holder compatibility and insert-seat compatibility.
- Material subtype suitability and hardness ranges.
- Operation-specific cutting data by material and condition.
- Coolant pressure and MQL/dry limitations by material.
- Interrupted cut suitability as a verified field.
- Surface finish expectation.
- Tool life benchmarks from tests or manufacturer data.
- Real supplier stock, price, lead time.
- Source URL / PDF page / manufacturer catalog edition per field.
- Evidence chain for each cutting data range.
- Verified exact-equivalent confidence tiers.

## Product Detail v1: Practical Scope

Recommended v1 is a UI/content restructuring task, not a data task.

Scope:

- Target `catalog.html` product detail drawer first, because it is the active catalog page and already has the richer decision-signal functions.
- Keep `PRODUCT_DB` unchanged.
- Keep `directory-data.js` unchanged.
- Do not alter SEO/canonical behavior.
- Do not deploy.

Proposed v1 sections:

1. Header: identity + context + confidence + role badge.
2. Decision verdict: best when, trade-off, when not.
3. Operating window: Vc/feed/ap/coolant/stability/cuttingData.
4. Why this fits: 3 bullets.
5. Watch out: 3 bullets.
6. Technical facts: existing detail grid, compressed.
7. Alternatives: exact, functional, value, related.
8. Evidence: source/confidence/risk explanation.
9. Actions: Compare, View equivalents, Save.

Non-goals for v1:

- No new product fields.
- No data enrichment.
- No generated engineering claims beyond existing derived signals.
- No full product page route.
- No SEO/canonical work.
- No checkout/marketplace behavior.

## Risks

- Overclaiming risk: "Best match" can feel too definitive when confidence is moderate or low. Use "Review needed" or "Candidate" when trust is low.
- Derived-signal opacity: current confidence is signal coverage, not lab-verified performance. The detail page must say this clearly.
- Mixed product categories: inserts, drills, threading, grooving, holders and generated products do not have equal data depth.
- Missing fields: some sections may become sparse unless empty states are handled cleanly.
- Buy-link ambiguity: supplier/buy links can make ToolAdvisor look transactional rather than advisory.
- Context confusion: if no active material/operation filter exists, the modal may infer from the product's first material/operation. The UI should label this as "catalog context" or "default product context."
- Duplicate surfaces: `catalog.html` and `directory-app.jsx` can diverge if only one is improved. For v1, declare `catalog.html` as the active target and leave React modal as a later alignment task.
- Synthetic economics: cost/tool-life/value signals must remain visibly estimated.

## QA Plan

Because v1 is a future implementation, QA should focus on behavior and content integrity.

Manual QA:

- Open product detail from catalog card "View details".
- Open product detail from product visual quick view.
- Open detail after applying ISO material filter.
- Open detail after applying operation/category filter.
- Verify title, subtitle, role badge, confidence and context are coherent.
- Verify Vc/feed/ap values are not invented and use existing fields.
- Verify "Why this fits" has no more than 3 clear bullets.
- Verify "Watch out" appears for low-confidence and limited-comparable products.
- Verify products with sparse fields show `—` or neutral copy instead of fabricated values.
- Verify generated/imported products retain confidence and source warnings.
- Verify Compare button adds selected product and compare bar still works.
- Verify View Equivalents works only when an equivalent lookup exists.
- Verify Save / Shortlist still works.
- Verify ESC, overlay click and close controls restore body scroll.
- Verify mobile drawer scroll and sticky action area do not hide content.

Regression QA:

- Catalog initial render.
- Product filters and contextual advanced filters.
- Product search and suggestions.
- Compare drawer and compare modal/page flow.
- Recently viewed products.
- Report error flow.
- Console error check.

Suggested automated/local checks for implementation task:

- Syntax check if the implementation edits inline JavaScript.
- `npm run build`.
- `scripts/ta-postflight.sh`.
- Browser verification of `catalog.html`.

## Recommended Next Task

Task 025 should be an implementation task scoped to `catalog.html` only:

- Convert the product detail drawer into the v1 decision-section structure above.
- Reuse existing helper functions and existing data only.
- Do not touch `PRODUCT_DB`, `directory-data.js`, `index.html`, deployment config, SEO/canonical, or Cloudflare files.

## Files Changed In This Task

- `research/024-product-detail-strengthening-plan.md` created.
- `TOOLADVISOR_WORKLOG.md` updated.

No application code was changed. No `PRODUCT_DB` changes were made. `directory-data.js` was not changed. No deploy was performed.
