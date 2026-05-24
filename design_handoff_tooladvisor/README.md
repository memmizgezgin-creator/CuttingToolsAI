# Handoff: ToolAdvisor — Brand-Neutral Cutting Tool Decision Platform

> Hand this entire folder to Claude Code. Start there by saying:
> *"Read `README.md` and `UX_GAPS.md` in full, then propose a build plan before touching code."*

---

## 1. Overview

**ToolAdvisor** is a brand-neutral cutting-tool decision platform for CNC machinists, manufacturing engineers, and tooling buyers. Six core sections:

| # | Section | File | Purpose |
|---|---|---|---|
| 01 | **Advisor** | `designs/ToolAdvisor.html` | Material + operation + constraints + goal → defensible tool recommendation with reasoning |
| 02 | **Catalog** | `designs/tools-directory.html` | ISO-coded cards with Vc, feed, best-for, data-confidence flags |
| 03 | **Cross-Reference** | `designs/cross-reference.html` | ISO code / grade / brand → Exact · Near · Premium · Economy matches with confidence % |
| 04 | **Compare** | `designs/compare.html` | Side-by-side technical matrix → final recommendation by goal (productivity / cost / stainless / safest) |
| 05 | **Knowledge** | `designs/knowledge.html` | Insert code reading, ISO groups, CNMG vs WNMG vs DNMG, stainless strategy, chipbreaker selection |
| 06 | **Pro** | `designs/pro.html` | Unlimited runs, deep cross-reference, multi-tool compare, exports, shared projects |

Entry map: `designs/index.html`.

---

## 2. About the Design Files

The files in `designs/` are **HTML design references** — interactive prototypes showing intended look and behavior. They are **not production code to copy directly**.

Your job is to **recreate these designs in a production-grade codebase**. The recommended stack (see §11) is **Next.js 14 (App Router) + TypeScript + Tailwind v3 + shadcn/ui**, deployed on Vercel, with Postgres (Neon or Supabase) for data. If you prefer Remix / SvelteKit / Astro that's fine — keep the visual system identical.

The prototype is single-page-per-screen HTML; the production app should be a real React component tree with proper routing, state, and a typed data layer.

---

## 3. Fidelity

**High-fidelity.** Colors, typography, spacing, ISO encoding, card structures, and component anatomy are final. Pixel-perfect recreation is expected. Animations (fade-up 200ms, card stagger 40ms) are part of the spec — see `designs/polish.css`.

What's NOT final and SHOULD be reworked in production:
- Sidebar/topbar chrome is currently injected by `page-switcher.js` post-load (FOUC workaround). In production, render it as a proper layout component.
- All "data" is hardcoded in HTML. Replace with a typed API + DB schema (see §8).
- The 3D insert renderer (`ta-3d-insert.js`) is a vanity SVG/CSS hack. In production, render lightweight SVG sprites or replace with a Three.js component if you want true 3D.

---

## 4. Design Tokens (single source of truth: `designs/tw-config.js`)

### Color palette

**Primary brand**
- `primary` `#123356` · `primary-container` `#2c4a6e` · `primary-fixed` `#d3e4ff`
- `on-primary` `#ffffff` · `inverse-primary` `#abc9f3`

**ISO material-group encoding (CRITICAL — these colors are semantic, not decorative)**
- `iso-p-blue`  `#3B82F6` — Steel (P)
- `iso-m-amber` `#F59E0B` — Stainless (M)
- `iso-k-red`   `#EF4444` — Cast iron (K)
- `iso-n-green` `#10B981` — Non-ferrous / aluminum (N)
- `iso-s-orange` `#F97316` — Superalloys (S)
- `iso-h-slate`  `#64748B` — Hardened (H)

Every catalog card, advisor result, and compare row uses these via a 4px left border + 10%-tinted chip. Do not swap them. They map to ISO 513 material groups and machinists read them at a glance.

**Surface / warm catalog accents**
- `background` / `surface` `#FAF9F7` (warm off-white — overrides cool `#faf9fc` in polish.css)
- `surface-card` `#FFFFFF`
- `surface-container-low` `#f4f3f6` · `surface-container` `#eeedf1`
- `sidebar-bg` `#F5F2EE` · `border-warm` `#E8E4DE`
- `ink-text` `#1A1A2E` (headings) · `on-surface` `#1a1c1e` · `on-surface-variant` `#43474e`
- `outline` `#73777f` · `outline-variant` `#c3c6cf`

**Semantic**
- `error` `#ba1a1a` · `error-container` `#ffdad6`
- Secondary (amber accent): `secondary` `#735b28` · `secondary-container` `#fedb9c`

### Typography

| Token | Family | Size | LH | Weight | LS | Usage |
|---|---|---|---|---|---|---|
| `display-hero` | Nunito | 36px (44–76 on hero) | 1.2 | 800 | -0.02em | Page H1 |
| `section-heading` | Nunito | 28px | 1.3 | 700 | — | Section H2 |
| `product-grade` | Nunito | 24px | 1.2 | 700 | — | Insert/tool code (e.g. CNMG 120408-PM) |
| `body-lg` | DM Sans | 19px | 1.7 | 400 | — | Hero subhead |
| `body-md` | DM Sans | 17px | 1.7 | 400 | — | Body |
| `nav-item` | Nunito | 15px | 1.0 | 500 | — | Sidebar links |
| `technical-data` | DM Mono | 14px | 1.4 | 500 | — | Vc, feed, hex codes, ISO grades |
| `label-caps` | DM Sans | 13px | 1.0 | 600 | 0.06em | Eyebrow labels (UPPERCASE) |

Three families only: **Nunito** (display), **DM Sans** (body), **DM Mono** (technical data). Don't add a 4th.

### Spacing

| Token | px |
|---|---|
| `gutter` | 24 |
| `card-padding` | 20 |
| `container-margin` | 32 |
| `sidebar-width` | 260 |
| `stack-gap-sm/md/lg` | 8 / 16 / 24 |

### Radius
`DEFAULT` 4 · `lg` 8 · `xl` 12 · cards `18px` (hardcoded `rounded-[18px]`) · `full` 9999

### Shadows
```css
.card-shadow {
  box-shadow:
    0 4px 6px -1px rgba(0,0,0,.05),
    0 2px 4px -1px rgba(0,0,0,.03);
}
```
Hover: `translateY(-4px)` + slightly deeper shadow, 300ms.

### Motion
- Page enter: `ta-fade-up` 200ms cubic-bezier(.4,0,.2,1)
- Grid cards: 40ms stagger up to 8 children
- `prefers-reduced-motion` disables all animation
- Keep it subtle — engineers, not consumers

### Icons
- **Material Symbols Outlined** via Google Fonts variable axis
- Default: `FILL 0, wght 400, opsz 24`
- Active/selected: `[data-icon-fill]`
- Nav/bold labels: `[data-icon-weight="500"]`
- Hero/display: `[data-icon-weight="300"]`

---

## 5. Screens — detailed specs

### 5.1 Advisor (`designs/ToolAdvisor.html`)

**Purpose.** Five-input wizard returning a ranked tool recommendation with reasoning.

**Inputs** (each its own step or a single long form — see prototype):
1. **Material** (ISO group P/M/K/N/S/H, then specific alloy)
2. **Operation** (turning / milling / drilling / threading / reaming) + sub-op (roughing / finishing / interrupted / continuous)
3. **Machine constraints** (rigidity, max RPM, max power kW, coolant: flood / MQL / dry)
4. **Workpiece constraints** (diameter range, length, surface finish target Ra, tolerance class)
5. **Goal** (productivity / cost-per-part / safest / surface quality / stainless-specific)

**Output card.** Recommended tool (with ISO-color left border), 2 alternatives, reasoning bullet list, computed Vc/feed/DOC starting parameters, risk flags, "Open in Compare" CTA, "Save to project" CTA.

**Hero.** Annotated SVG insert blueprint (right column on lg+). Headline `Neutral cutting tool selection. Faster.` (amber accent on "Faster.")

### 5.2 Catalog (`designs/tools-directory.html`)

**Purpose.** Browsable, filterable index of all tools.

**Layout.** `ml-sidebar-width` main + left sidebar (injected by `page-switcher.js`). Top: breadcrumb → title → "Advanced Filters" + grid/list toggle. Below: tool-family chip row (All / Turning / Milling / Drilling / Threading / Reaming). Sidebar holds ISO material refinement.

**Card anatomy** (`rounded-[18px] card-shadow border-l-4 border-iso-{group}`):
- Top row: brand label (DM Mono, eyebrow) + product code (Nunito 24/700) ← left · 3D insert glyph + ISO chip → right
- `Turning Insert · Grade GC4325` line
- Vc range · Feed range (DM Mono, right-aligned)
- Best-for label (1 line)
- Data confidence: 14px-wide bar + percentage + source flag (Manufacturer data / Manufacturer + reviewed / Estimated)
- Bottom: `View Details` (primary) + `Compare` (outline w/ `fact_check` icon)

### 5.3 Cross-Reference (`designs/cross-reference.html`)

**Purpose.** "I have an X — what's the equivalent in Y?"

Input: ISO code OR brand+grade. Output: 4 tiers — **Exact** · **Near** · **Premium** · **Economy** — each with a card stack, confidence %, and risk notes (e.g. "Different chipbreaker — verify at finishing pass").

### 5.4 Compare (`designs/compare.html`)

**Purpose.** Side-by-side decision matrix (2–4 tools).

Rows: brand · grade · Vc · feed · DOC · coating · chipbreaker · ISO group · price-tier · availability · data-confidence. Bottom: "**Recommended by goal**" pill row — clicking a goal (Productivity / Cost-per-part / Stainless / Safest) highlights the winning column and explains why.

Quantitative rows use a horizontal bar viz (see `polish.css` "COMPARE MATRIX" section).

### 5.5 Knowledge (`designs/knowledge.html`)

Long-form engineering content. Left TOC sidebar, right reading column. Articles: insert code reading, ISO 513 groups, CNMG/WNMG/DNMG geometry comparison, stainless strategy, chipbreaker selection. Render from MDX in production.

### 5.6 Pro (`designs/pro.html`)

Plan + projects. Three-tier pricing (Free / Pro / Team). Pro features: unlimited advisor runs, multi-tool compare (>2), exports (PDF/CSV), shared projects, deep cross-reference (4 tiers vs 2 in free).

### 5.7 Profile (`designs/profile.html`)

Account settings, saved tools, recent advisor runs, projects.

---

## 6. Shared chrome (sidebar + topbar)

Currently every HTML page ships an inline `<aside>` + `<header>` AS FALLBACK, then `page-switcher.js` removes them and injects fresh chrome marked with `[data-ta-chrome]`. The CSS in `polish.css` hides the legacy chrome on first paint to prevent FOUC.

**In production:** make this a **single layout component** (`app/(app)/layout.tsx` in Next.js App Router) and stop hiding/replacing. The sidebar should hold:
- Logo / wordmark (top)
- Main nav (Advisor · Catalog · Cross-Ref · Compare · Knowledge)
- Pro / Account (bottom)
- Width 260px, `bg-sidebar-bg` (`#F5F2EE`), no shadow, hairline right border `border-warm`

---

## 7. Interactions & Behavior

- **Hover on cards:** `translateY(-4px)` + deeper shadow, 300ms `cubic-bezier(.4,0,.2,1)`
- **Click "Compare" on a catalog card:** add tool to compare tray (persistent across navigation), max 4, show floating tray at bottom-right with "Open Compare (3)" CTA
- **Click "View Details":** open a side drawer (`designs/modals.css` / `modals.js` shows the pattern) — don't navigate away
- **Advisor results:** animate in row-by-row, 80ms stagger
- **Form validation:** inline, below field, `text-error` color, never block submit until user attempts it
- **Empty states:** every list/grid needs one. Use a single-line message + DM Mono technical sub-line + primary CTA
- **Loading states:** skeleton with `skeleton-shimmer` (`#F0EDE8`) animated background, never spinners on >200ms loads
- **Reduce motion:** respect `prefers-reduced-motion`, polish.css already handles it

---

## 8. Data layer (build this — none exists yet)

### Suggested schema (Postgres)

```sql
-- ISO material groups (seed: 6 rows P/M/K/N/S/H)
iso_groups (code TEXT PK, name TEXT, color_hex TEXT, description TEXT)

-- Tools (the catalog)
tools (
  id UUID PK,
  brand TEXT NOT NULL,                  -- 'Sandvik' | 'Iscar' | 'Kennametal' | 'Mitsubishi' | …
  iso_code TEXT NOT NULL,               -- 'CNMG 120408-PM'
  grade TEXT NOT NULL,                  -- 'GC4325'
  family TEXT NOT NULL,                 -- 'turning' | 'milling' | 'drilling' | 'threading' | 'reaming'
  shape CHAR(1),                        -- 'C' | 'V' | 'W' | 'D' | 'T' | 'S' | 'R'
  iso_group_code TEXT REFERENCES iso_groups,
  vc_min NUMERIC, vc_max NUMERIC,       -- m/min
  feed_min NUMERIC, feed_max NUMERIC,   -- mm/rev
  doc_min NUMERIC, doc_max NUMERIC,     -- mm
  coating TEXT,
  chipbreaker TEXT,
  best_for TEXT,                        -- 1-line label
  data_confidence INT,                  -- 0..100
  data_source TEXT,                     -- 'manufacturer' | 'manufacturer+reviewed' | 'estimated'
  price_tier INT,                       -- 1..4
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Cross-reference equivalence graph
tool_equivalents (
  source_tool_id UUID REFERENCES tools,
  target_tool_id UUID REFERENCES tools,
  tier TEXT,                            -- 'exact' | 'near' | 'premium' | 'economy'
  confidence INT,                       -- 0..100
  risk_notes TEXT,
  PRIMARY KEY (source_tool_id, target_tool_id)
)

-- Saved by user
projects (id UUID PK, user_id UUID, name TEXT, created_at TIMESTAMPTZ)
project_tools (project_id UUID, tool_id UUID, note TEXT, PRIMARY KEY(project_id, tool_id))
advisor_runs (id UUID PK, user_id UUID, inputs JSONB, result_tool_id UUID, created_at TIMESTAMPTZ)

users (id UUID PK, email TEXT UNIQUE, plan TEXT DEFAULT 'free', created_at TIMESTAMPTZ)
```

### API surface (suggested REST or tRPC)

- `GET  /api/tools?family=&iso_group=&q=&page=` → paginated catalog
- `GET  /api/tools/:id` → detail
- `POST /api/advisor/recommend` → body = inputs, returns ranked recommendations + reasoning
- `GET  /api/cross-reference?iso_code=&brand=&grade=` → 4 tiers
- `POST /api/compare` → body = tool_ids[], returns matrix
- `POST /api/projects` · `POST /api/projects/:id/tools`
- Auth: NextAuth + email-link, or Clerk if you want it faster

---

## 9. Production stack (recommended)

```
Frontend:  Next.js 14 (App Router) · TypeScript · Tailwind v3 · shadcn/ui
State:     React Server Components for reads, Server Actions for writes,
           TanStack Query for client cache where needed
DB:        Postgres (Neon or Supabase) + Drizzle ORM
Auth:      NextAuth (email magic link) or Clerk
Hosting:   Vercel (frontend) + Neon (DB)
Search:    Postgres trigram (pg_trgm) initially; Meilisearch if catalog grows >50k tools
Analytics: PostHog (privacy-friendly, self-hostable)
Files:     Vercel Blob or Cloudflare R2 (for tool images down the line)
```

Copy `tw-config.js` colors/spacing/fonts directly into `tailwind.config.ts`. The class names already match shadcn's conventions.

---

## 10. Assets

The prototype uses **no external image assets** other than:
- Google Fonts: Nunito, DM Sans, DM Mono, Material Symbols Outlined
- Inline SVG (insert blueprints in `ToolAdvisor.html` hero, 3D insert glyphs in `ta-3d-insert.js`)

When you ship: keep self-hosted Google Fonts via `next/font/google` to avoid the CDN hop and CLS.

---

## 11. Files in this bundle

```
design_handoff_tooladvisor/
├── README.md                ← you are here
├── UX_GAPS.md               ← what's missing UX-wise — read this BEFORE building
└── designs/                 ← HTML reference prototypes (not production code)
    ├── index.html           ← entry map
    ├── ToolAdvisor.html     ← advisor screen
    ├── tools-directory.html ← catalog
    ├── cross-reference.html ← cross-reference
    ├── compare.html         ← compare matrix
    ├── knowledge.html       ← knowledge base
    ├── pro.html             ← pricing / plans
    ├── profile.html         ← account
    ├── tw-config.js         ← Tailwind tokens — port directly to tailwind.config.ts
    ├── polish.css           ← global animations + compare-matrix viz
    ├── modals.css           ← side-drawer pattern
    ├── modals.js
    ├── page-switcher.js     ← chrome injection (delete in production)
    ├── ta-3d-insert.js      ← 3D insert SVG generator
    └── ta-tool-icons.js     ← tool family icons
```

---

## 12. First sprint suggestion (for Claude Code)

**Sprint 0 — Foundation (1 day)**
1. `npx create-next-app@latest tooladvisor --typescript --tailwind --app`
2. Port `tw-config.js` → `tailwind.config.ts`. Verify every token resolves.
3. Set up `next/font/google` for Nunito + DM Sans + DM Mono.
4. Add shadcn/ui, install Button, Card, Dialog, Sheet, Input, Select, Badge.
5. Build `app/(app)/layout.tsx` with sidebar + topbar (replacing `page-switcher.js`).

**Sprint 1 — Catalog read-only (2 days)**
6. Drizzle schema (see §8), seed 20–40 tools across all 6 ISO groups.
7. `/catalog` route — RSC fetches tools, renders cards. Family chip filter via URL search params.
8. `/tools/[id]` side drawer detail (Sheet from shadcn).

**Sprint 2 — Compare + Cross-Reference (2 days)**
9. Compare tray (client-side, persisted in localStorage + signed-in users sync to DB).
10. `/compare` matrix screen.
11. `/cross-reference` — initially manual `tool_equivalents` table, later derive heuristically.

**Sprint 3 — Advisor (3 days)**
12. Wizard form (react-hook-form + zod).
13. `POST /api/advisor/recommend` — start with a deterministic rule engine over the tools table, NOT an LLM. ISO group → family → constraints → goal → ranked SQL filter + scoring. LLM is a v2 enhancement and adds latency + cost.
14. Result page reusing card components.

**Sprint 4 — Auth + Projects + Pro (2 days)**
15. NextAuth email magic link.
16. `/projects` CRUD.
17. Stripe + Pro plan gating.

**Sprint 5 — Knowledge + polish (1 day)**
18. MDX content for `/knowledge`.
19. Empty/loading/error states everywhere. Accessibility pass (focus rings, ARIA on the ISO chips).

---

## 13. Things to NOT do

- ❌ Do not change the ISO color encoding. P=blue, M=amber, K=red, N=green, S=orange, H=slate. Machinists rely on this.
- ❌ Do not ship the chrome-injection pattern (`page-switcher.js`). It's a prototype FOUC workaround.
- ❌ Do not add a 4th font family.
- ❌ Do not use LLMs in the critical recommendation path on day one. Deterministic rule engine first, LLM as "explain this recommendation in plain English" layer second.
- ❌ Do not bulk-import manufacturer catalogs without a `data_source` + `data_confidence` flag. Trust signals are core to the product positioning.
- ❌ Do not invent saturated marketing colors. The warm `#FAF9F7` background is deliberate — it's a technical tool, not a SaaS landing page.
