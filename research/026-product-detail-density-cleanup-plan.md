# Task 026 — Product Detail Density Cleanup Plan

**Date:** 2026-05-28  
**Type:** Planning / research only  
**Scope:** `catalog.html` product detail drawer readability cleanup  
**Rules honored:** No code changes, no `PRODUCT_DB` changes, no `directory-data.js` changes, no deploy, no SEO/canonical work, no new data fields, no PDF ingestion.

## Goal

Task 025 made product detail a real engineering decision surface. The next problem is density: too many panels now compete for attention. The cleanup goal is not to remove information. It is to make the first screen answer the decision question faster, then push supporting detail into secondary or collapsed areas.

Target user question:

> Can I use this tool for this material/operation, under what window, and what should I check before choosing it?

## Current Density Problems

### 1. Hero Area Is Too Heavy

The current hero has a large visual block plus:

- role badge
- confidence badge
- confidence band
- meta tags
- context line
- context summary card

This duplicates the same ideas: identity, context, confidence and fit. The result is visually strong but not fast enough for scanning.

### 2. Context Summary And Decision Verdict Overlap

`Context summary` shows Operation / Material / Priority. Immediately after, `Decision verdict` shows Best when / Trade-off / When not. These are all decision-level items, but they are split across two separate panels.

### 3. Operating Window Takes Too Much Vertical Space

`Operating window` currently has:

- Vc
- Feed
- ap
- Coolant
- Stability
- cuttingData note

All are important, but the section should read like one compact technical strip. The note can become secondary unless it is the only context-specific cutting data available.

### 4. Why / Watch Blocks Are Correct But Visually Equal To Everything Else

Why this fits and Watch out are high-value decision sections. However, they look like just two more panels in a long stack. They should sit immediately under the core decision summary and be visually paired.

### 5. Technical Facts Grid Is Too Long For The Primary Flow

The technical grid contains useful facts, but many are confirmation details:

- Brand
- Product
- Series
- Grade
- Coating
- Geometry
- ISO codes
- Operations
- ISO materials
- Tool life
- Application notes
- technical strip / technical detail block

This should not dominate the main decision flow. The user only needs grade / coating / geometry / ISO code immediately; the rest can be secondary.

### 6. Alternatives And Evidence Are Both Full Panels

Alternatives and Evidence are important, but they are not always first-screen decision inputs. They should remain accessible, but default collapsed or visually lighter.

### 7. Mobile Scroll Becomes Too Long

Task 025 mobile QA showed the drawer scroll is functional, but the content height is large. On mobile, the user sees many stacked full-width panels before reaching actions and evidence.

## What Should Stay At The Top

The top of the drawer should keep only decision-critical information:

1. Product identity:
   - Brand
   - Product name / grade
   - Series if present

2. Context:
   - Operation
   - ISO material
   - Catalog vs Advisor context

3. Confidence and role:
   - Role badge: Review needed / Candidate / Possible fit / Best match / Specialist option
   - Confidence score and band

4. Decision summary:
   - Best when
   - When not
   - Trade-off, shortened to one line

5. Operating window:
   - Vc
   - Feed
   - ap
   - Coolant
   - Stability

6. Why / Watch:
   - Max 2-3 bullets each

The first screen should not show the full technical grid, all alternatives, or evidence rows by default.

## What Should Become Collapsed / Secondary

Use existing information only, but demote it.

### Default Visible

- Header identity.
- Role + confidence.
- Operation/material context.
- Compact decision verdict.
- Compact operating window.
- Why this fits.
- Watch out.
- Sticky action bar.

### Default Collapsed

- Technical facts.
- Alternatives.
- Evidence.

### Secondary But Still Visible In Compact Form

Technical facts can expose a small inline summary before collapse:

- Grade
- Coating
- Geometry
- ISO code count or first ISO code

Alternatives can expose counts before collapse:

- Exact: N
- Functional: N
- Value: N
- Related: N

Evidence can expose one line before collapse:

- `Confidence reflects data quality and signal coverage, not measured cutting performance.`

## Texts To Shorten

### Decision Verdict

Current pattern:

- `Best when: selected operation/material is the primary fit.`
- `Trade-off: balanced profile for the current process context.`
- `When not: Avoid without manual validation; confidence is currently low.`

Recommended shorter labels and copy:

- `Use when`: one short clause.
- `Trade-off`: one short phrase.
- `Avoid when`: one short clause.

Examples:

- `Use when: stable ISO P turning is the target.`
- `Trade-off: tool life over max throughput.`
- `Avoid when: setup is unstable or evidence is limited.`

### Operating Window

Current note can be long:

- `No context-specific cuttingData row; using catalog range.`

Shorten:

- `Catalog range used.`
- `Context row used: Turning-P.`

### Evidence

Current sentence:

- `Confidence reflects data quality and signal coverage. It is not measured cutting performance.`

Keep this exact concept, but place it as a compact evidence note. Do not repeat it in multiple places.

### Technical Facts

`Application notes` can be long. It should be collapsed by default and line-clamped when expanded. Do not rewrite product content or invent summaries.

### Empty States

Current `No mapped records yet.` is acceptable but repeated four times in Alternatives. In collapsed summary, show counts first, then repeated empty states only inside the expanded alternatives panel.

## Decision-First Hierarchy

Recommended hierarchy for Product Detail density cleanup:

### Tier 1 — First Screen

Purpose: immediate choice support.

Layout:

1. Compact header:
   - Product title.
   - Context line.
   - Role + confidence.

2. One decision panel:
   - `Use when`
   - `Avoid when`
   - `Trade-off`

3. One operating strip:
   - Vc / feed / ap / coolant / stability

4. Two-column decision evidence:
   - Why this fits
   - Watch out

5. Sticky action bar:
   - Compare
   - View equivalents
   - Save

### Tier 2 — Expand For Detail

Purpose: validation after the first decision.

Collapsed sections:

- Technical facts
- Alternatives
- Evidence

### Tier 3 — Deep Technical Detail

Purpose: inspect the record, not decide from scratch.

Inside expanded Technical facts:

- Technical strip
- Grade / coating / geometry
- ISO codes
- Operations
- Materials
- Tool life
- Application notes
- `renderToolAdvisorTechnicalDetail(product)`

## Mobile Readability Risks

### Risk 1: Large Visual Pushes Decision Below Fold

The visual block consumes too much vertical space on mobile. The first mobile viewport should show title, role/confidence, and at least part of the decision verdict.

Recommendation:

- Reduce visual height on mobile.
- Place visual below decision summary on mobile, or make it compact.

### Risk 2: Three-Column Cards Collapse Into Long Stack

Decision verdict and operating window currently use grid cards. On mobile these become many stacked cards.

Recommendation:

- Replace mobile cards with dense rows:
  - label left
  - value right

### Risk 3: Alternatives Create Repeated Empty Blocks

On sparse products, four alternative panels can show four empty states. On mobile this looks like dead content.

Recommendation:

- Show alternatives as collapsed summary counts first.
- Only show empty states after user expands.

### Risk 4: Sticky Action Bar Can Arrive Too Late

If actions remain at the bottom, mobile users may need long scroll before compare/equivalent/save.

Recommendation:

- Keep actions sticky at bottom of drawer.
- Ensure it does not cover Evidence or Alternatives content.

### Risk 5: Evidence Competes With Decision Copy

Evidence is necessary for trust, but not as a large panel above actions.

Recommendation:

- Keep a single compact confidence note visible.
- Put source/risk rows in collapsed Evidence.

## PRODUCT_DB-Free V1 Scope

This cleanup can be implemented without touching product data.

Allowed implementation scope for a future Task 027:

- `catalog.html` only.
- Restructure `openProductDetail` HTML output.
- Reuse:
  - `computeRecommendationTrust`
  - `computeDecisionSignals`
  - `buildDecisionFitBullets`
  - `buildDecisionWatchBullets`
  - `renderProductTechnicalStrip`
  - `renderToolAdvisorTechnicalDetail`
  - existing relation arrays
  - existing `vcRange`, `fnRange`, `apRange`, `cuttingData`, `toolLife`, `applicationNotes`
- Convert Technical facts / Alternatives / Evidence to native `<details>` or equivalent existing disclosure style.
- Keep all content accessible in the DOM when expanded.
- Keep Compare / View equivalents / Save actions using existing functions.

Out of scope:

- No new fields.
- No new product data.
- No PDF ingestion.
- No SEO/canonical.
- No new product page route.
- No new recommendation algorithm.
- No commercial or supplier feature.

## Proposed V1 Cleanup Sequence

1. Merge `Context summary` into header or Decision verdict.
2. Reduce hero to identity + context + confidence.
3. Convert Decision verdict to three short rows.
4. Convert Operating window into one dense strip.
5. Keep Why / Watch visible and paired.
6. Collapse Technical facts by default with a compact summary row.
7. Collapse Alternatives by default with counts.
8. Collapse Evidence by default with one always-visible confidence note.
9. Keep sticky action bar visible.
10. Verify mobile first viewport shows decision content, not only image/header.

## QA Plan

Manual QA for future implementation:

- Open detail from product card.
- Verify first viewport shows:
  - product identity
  - role/confidence
  - context
  - decision verdict or operating window
- Verify no information from Task 025 is removed, only moved or collapsed.
- Verify Technical facts expands and includes existing fields.
- Verify Alternatives expands and shows exact / functional / value / related records.
- Verify Evidence expands and shows source / confidence / risk explanation.
- Verify low-confidence products still use cautious role labels.
- Verify no long marketing-style copy appears.
- Verify missing values show neutral fallback, not invented values.
- Verify Compare action works.
- Verify View equivalents works.
- Verify Save / Shortlist works.
- Verify ESC / overlay / close restore body scroll.
- Verify mobile drawer scroll and sticky action bar do not overlap final content.
- Verify category-specific filters still work after returning to catalog.
- Verify browser console has no errors.

Suggested checks:

- `catalog.html` initial render.
- 266 product cards render.
- Detail modal opens from card and quick view.
- Detail modal opens with active material/operation filters.
- `npm run build`.
- `scripts/ta-postflight.sh`.

## Success Criteria

The modal still contains the same decision support information, but the user can answer the primary choice question within the first screen:

- Is this a candidate?
- What window can I start from?
- Why does it fit?
- What should I watch before choosing it?

Everything else should support validation, not interrupt the initial decision.

