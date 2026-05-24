# UX Gaps — ToolAdvisor

Read this before sprint planning. These are the gaps in the current HTML prototypes — things that **should exist for a real machinist-facing decision platform but aren't designed yet**. Group A is must-have for launch. Group B is high-value next. Group C is differentiation.

---

## A. Must-have for launch

### A1. Persistent **Compare Tray**
- Currently each catalog card has a "Compare" button, but there's no visible tray showing what's selected.
- Add a floating tray bottom-right: small stacked chips of selected tools (max 4), counter, "Open Compare (3)" CTA, "Clear" link.
- Survives navigation. Stored in localStorage for guests, synced to DB for signed-in users.

### A2. Global **search + command palette** (⌘K)
- A technical user typing `CNMG 120408` should land on the tool detail in 2 keystrokes. No design exists for this.
- Indexes: tool codes, grades, brands, ISO groups, knowledge article titles. Returns mixed results grouped by type.

### A3. Tool **detail view**
- Cards have "View Details" but there's no design for the actual detail screen.
- Should include: full geometry table, all Vc/feed/DOC matrix by ISO subgroup, coating spec, chipbreaker behavior, equivalent tools (mini cross-reference), historical usage in your projects, source citations.
- Open as side drawer from catalog, full page when deep-linked.

### A4. **Empty, loading, error, no-results states**
- Every list/grid/form has a happy path only.
- Need: catalog with no filter matches; advisor that can't find a good match (this is honest UX — don't fake confidence); cross-reference miss; offline; rate-limited.

### A5. **Onboarding** — what is this thing?
- Index page is an internal MVP map. A first-time visitor needs a 60-second explainer: what this is, who it's for, why brand-neutral matters, sample run.
- Replace `index.html` with a real landing page. Move the section map to an internal `/admin` or delete it.

### A6. **Advisor — show your work**
- The hero promises "decisions you can defend." The advisor needs an expandable reasoning panel on every recommendation: which constraints knocked out which alternatives, which rule fired, the confidence score, the data sources cited.
- Without this, the tool is just another opaque recommender.

### A7. **Units toggle (metric / imperial)**
- Vc in m/min and SFM. Feed in mm/rev and IPR. DOC in mm and inches.
- Sticky per-user. Default by IP country.

### A8. **Mobile / tablet layouts**
- The catalog grid + sidebar layout assumes desktop. Real shop-floor users open this on a phone next to a CNC. Design needs:
  - Sidebar → bottom sheet on mobile
  - Compare tray collapses to a single pill
  - Card density rethought for portrait
  - Advisor wizard becomes one-question-per-screen with progress bar

### A9. **Accessibility — color is doing too much work**
- The ISO P/M/K/N/S/H color system is core. But it's the *only* encoding. Colorblind users (≈8% of male machinists) see chaos.
- Add a secondary encoding: letter chip ("P", "M", "K"…) on every left-border accent, not just the right-side pill. Pattern fills on bars. Test with deuteranopia simulation.

### A10. **Auth + plan gating UI**
- `pro.html` shows pricing, but there are no designs for: paywall hit mid-flow ("you've used your 5 free advisor runs"), upgrade modal, downgrade flow, billing portal entry, team invite, seat management.

---

## B. High-value next

### B1. **Saved projects / jobs**
- A "project" should hold: workpiece spec (drawing #, material, qty), candidate tools, machining sequence, notes, exports. The current Pro section mentions projects but there's no project-detail screen designed.

### B2. **Export**
- Compare → PDF (one-pager for the shop). Advisor result → PDF + JSON. Cross-reference → CSV. Branded but neutral header — this is sales material engineers print and hand to buyers.

### B3. **History / recent**
- "What did I look at yesterday" — recent advisor runs, recently viewed tools, recent compares. Currently invisible.

### B4. **Tool source transparency**
- The data-confidence bar is great, but tapping it should reveal: "From Sandvik product sheet v3.2, March 2024. Reviewed by ToolAdvisor team Sept 2024. Two corrections logged." Trust is the moat for a brand-neutral platform.

### B5. **Feedback loop**
- Per-recommendation: "Did this work?" thumbs + free text. Feeds back into the equivalence + scoring graph. Critical to make this neutral platform actually better than vendor catalogs.

### B6. **Notifications / alerts**
- "A new economy alternative was added for your saved tool CNMG 120408-PM." Email + in-app inbox.

### B7. **Notes / annotations on tools**
- Engineers want to scribble: "Use 0.18 mm/rev for our 17-4PH lot, the 0.25 from spec is too aggressive at our setup rigidity." Per-tool, per-project, optionally team-shared.

---

## C. Differentiation

### C1. **Reverse search — "what tool made this finish?"**
- Photo upload of a surface + Ra target → suggested geometry/coating. Vision model use case.

### C2. **Cost calculator**
- Cost-per-edge × edges-per-insert × inserts-per-job. Cycle time × machine rate. Lets buyers make economic, not just technical, decisions. Hooks into Compare.

### C3. **CAM-like starting-parameter export**
- Pick a tool, give your machine + workpiece, export Fusion 360 / Mastercam / Esprit tool library entry.

### C4. **Public, citable cross-reference URLs**
- `/x/cnmg-120408-pm` resolves to a SEO-friendly, citation-stable page. Great for forum links, RFQ emails, supplier negotiation.

### C5. **Tool-life prediction**
- Given Vc, feed, DOC, material → expected edges. Calibrated via the feedback loop (B5). Even rough estimates beat what's available now.

### C6. **API**
- Headless cross-reference + advisor. Buyers and ERP integrators will pay for this.

### C7. **Multilingual (start TR + EN + DE)**
- The user is Turkish. Manufacturing engineering is global and the catalog data is language-neutral. Translating UI + knowledge is achievable.

### C8. **Tool-condition / wear visual library**
- "What does crater wear look like? Flank wear? BUE?" Photo library + corrective parameter change. Massive SEO play, drives sign-ups.

---

## D. Quick-win polish items

- Catalog cards have data-confidence bars but no tooltip explaining the scale. Add `title=` + an info icon that opens a small popover.
- The "Best for" line is one-liner-only. Some tools need 2 lines — allow up to 2, truncate after.
- Compare matrix needs a sticky first column (the row labels) on horizontal scroll.
- No keyboard shortcuts anywhere. At minimum: `/` focuses search, `c` opens compare tray, `Esc` closes drawers/modals.
- No skip-to-content link, no visible focus rings on the custom buttons. Audit with axe.
- The "Risk notes" pattern from cross-reference is great — port it to advisor results.
- Filter pills are "instant apply." Add an "Applied filters" bar with individual ✕ chips so users see what they did.
- No deep-link to a filtered catalog view (e.g. `/catalog?family=milling&iso=k`). Hurts SEO and shareability.
- No print stylesheet. Engineers print.
- No `<meta name="theme-color">`, no OG image, no favicon. Add these before any launch.
