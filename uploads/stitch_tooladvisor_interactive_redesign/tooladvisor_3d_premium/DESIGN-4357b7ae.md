---
name: ToolAdvisor 3D Premium
colors:
  surface: '#faf9fc'
  surface-dim: '#dad9dd'
  surface-bright: '#faf9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f3f6'
  surface-container: '#eeedf1'
  surface-container-high: '#e9e8eb'
  surface-container-highest: '#e3e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#43474e'
  inverse-surface: '#2f3033'
  inverse-on-surface: '#f1f0f4'
  outline: '#73777f'
  outline-variant: '#c3c6cf'
  surface-tint: '#436085'
  primary: '#123356'
  on-primary: '#ffffff'
  primary-container: '#2c4a6e'
  on-primary-container: '#9cbae4'
  inverse-primary: '#abc9f3'
  secondary: '#735b28'
  on-secondary: '#ffffff'
  secondary-container: '#fedb9c'
  on-secondary-container: '#785f2b'
  tertiary: '#313332'
  on-tertiary: '#ffffff'
  tertiary-container: '#484948'
  on-tertiary-container: '#b8b8b6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e4ff'
  primary-fixed-dim: '#abc9f3'
  on-primary-fixed: '#001c38'
  on-primary-fixed-variant: '#2a486c'
  secondary-fixed: '#ffdea3'
  secondary-fixed-dim: '#e3c285'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#594312'
  tertiary-fixed: '#e3e2e0'
  tertiary-fixed-dim: '#c7c6c5'
  on-tertiary-fixed: '#1a1c1b'
  on-tertiary-fixed-variant: '#464746'
  background: '#faf9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e3e2e5'
  ink-text: '#1A1A2E'
  surface-card: '#FFFFFF'
  sidebar-bg: '#F5F2EE'
  border-warm: '#E8E4DE'
  skeleton-shimmer: '#F0EDE8'
  iso-p-blue: '#3B82F6'
  iso-m-amber: '#F59E0B'
  iso-k-red: '#EF4444'
  iso-n-green: '#10B981'
  iso-s-orange: '#F97316'
  iso-h-slate: '#64748B'
  glass-backdrop: rgba(26, 26, 46, 0.5)
typography:
  display-hero:
    fontFamily: Nunito
    fontSize: 36px
    fontWeight: '800'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  section-heading:
    fontFamily: Nunito
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
  product-grade:
    fontFamily: Nunito
    fontSize: 24px
    fontWeight: '700'
    lineHeight: '1.2'
  body-lg:
    fontFamily: DM Sans
    fontSize: 19px
    fontWeight: '400'
    lineHeight: '1.7'
  body-md:
    fontFamily: DM Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.7'
  label-caps:
    fontFamily: DM Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: '1.0'
    letterSpacing: 0.06em
  technical-data:
    fontFamily: DM Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
  nav-item:
    fontFamily: Nunito
    fontSize: 15px
    fontWeight: '500'
    lineHeight: '1.0'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  card-padding: 20px
  container-margin: 32px
  gutter: 24px
  sidebar-width: 260px
  stack-gap-sm: 8px
  stack-gap-md: 16px
  stack-gap-lg: 24px
---

Redesign ToolAdvisor — a brand-neutral precision cutting tool intelligence platform for CNC engineers and machinists. This is a B2B SaaS product, not a catalog. It needs to feel premium, warm, and deeply human — like the best Swiss tool catalog came to life as a web app.

## Core Aesthetic

Warm white base: #FAF9F7. Never cold, never clinical.
Deep ink text: #1A1A2E. Warm charcoal, never pure black.
Primary accent: #2C4A6E. Deep slate, trustworthy.
Warm gold highlight: #C8A96E. Used sparingly for active states and highlights.
All surfaces: soft white #FFFFFF cards with barely-there shadows.
No dark backgrounds anywhere in the main UI.
No neon. No purple gradients. No sharp corners anywhere.

## Typography — Soft and Round

Headings: "Nunito" — rounded, warm, engineered to feel approachable not corporate. Bold weights for hero text.
Body: "DM Sans" — geometric but soft, excellent readability at 17-19px, line-height 1.7.
Codes and specs: "DM Mono" — technical, precise, used for Vc/fn/ap values, insert codes, ISO designations.
Font sizes: generous. 28-36px for section headings, 18px body minimum, 13px minimum for labels.
Letter-spacing: slightly loose on uppercase labels (+0.06em). Tight on display headings (-0.02em).

## 3D Visual Design — The Signature Element

Every product card features a 3D-rendered insert geometry floating above the card surface.
3D effects achieved with CSS perspective transforms + layered box shadows + subtle rotation on hover.
Insert shapes rendered as SVG with 3D depth illusion: top face lighter, side faces darker, drop shadow below.
On hover: insert rotates 15 degrees on Y-axis with smooth 400ms ease, shadow deepens and shifts — feels like picking up a real tool.
ISO material group badges appear as floating 3D pill tags with depth shadow.
Hero section: large 3D insert geometry as background decoration, slowly rotating (20s loop, subtle).
Tab transitions: content slides in with 3D perspective — new tab comes from slight depth (scale 0.97 → 1.0) with fade, 300ms ease-out.
Modal open: content scales from 0.93 to 1.0 with perspective tilt, 260ms ease-out. Feels like a card being placed on the table.
Sidebar ISO group selection: selected item gets a 3D left-tab indicator with depth.

## Page Transitions and Motion

Tab switch: 300ms — opacity fade + translateY(10px) → translateY(0) + subtle scale 0.98 → 1.0. Content floats in.
Card hover: 200ms — translateY(-4px) + shadow deepens + 3D insert rotates. Smooth, satisfying, premium.
Card stagger load: cards appear with 50ms offset between each. Row 1 at 0ms, row 2 at 50ms, row 3 at 100ms.
Search filter: results re-sort with a 250ms layout transition. No hard snapping.
Sidebar filter selection: 180ms background fill + left border glows.
All motion: cubic-bezier(0.4, 0, 0.2, 1) — the Material Design easing curve, feels natural.
Scroll behavior: smooth. Sections with sticky headers.
Loading skeleton: warm shimmer sweep (#F0EDE8 → #E8E4DE → #F0EDE8), never a spinner.

## Product Cards — 3D Engineering Cards

Card size: 280px wide, generous padding 20px.
Border radius: 18px. No sharp corners anywhere.
Left accent border: 4px, ISO group color (P=blue, M=amber, K=red, N=green, S=orange, H=slate).
Top section: 3D insert geometry illustration — SVG-based, diamond/square/triangle shape per insert type, with depth shading. Fills 40% of card height.
Brand name: small DM Mono uppercase, #8A8A9A.
Product grade: 24px Nunito Bold, #1A1A2E.
Coating + chipbreaker: pill badges, soft background, 20px border-radius.
Vc range: thin progress bar visualization, warm blue fill, rounded ends.
Hover state: card lifts 4px, shadow spreads, 3D insert rotates slightly. Feels alive.
Click: expands into a full detail modal.

## Product Detail Modal — 3D Showcase

Modal opens with 3D scale animation from card position.
Left panel: large rotating 3D insert illustration, 200px, slow continuous rotation (15s loop).
Right panel: full spec table — ISO code, substrate, coating, Vc/fn/ap ranges, chipbreaker options.
Tab row inside modal: Applications / Cross-Reference / Alternatives.
Cross-reference tab: side-by-side brand comparison cards with brand logos.
Background: frosted glass backdrop blur(8px) rgba(26,26,46,0.5).
Close: top-right soft X, hover turns warm gold. Escape key closes.
Exit animation: scale down + fade, 180ms.

## ISO Material Group Sidebar

Each group as a rounded card: 16px radius, white background, left color stripe 5px.
Icon: simple geometric SVG representing the material (steel chip, stainless curl, cast iron grain, aluminium surface, titanium crystal, hardened edge).
Group name: 16px Nunito SemiBold.
Subgroup description: 13px DM Sans, #6B7280.
Selected state: very light tint (8% group color) background, gold left indicator, card lifts 2px.
Hover: 150ms background tint, cursor pointer.

## Navigation

Left sidebar: warm #F5F2EE background. Not dark, not grey.
Logo: "ToolAdvisor" in Nunito ExtraBold 20px + small "CUTTING TOOL INTELLIGENCE" in DM Mono 10px tracking-widest below.
Nav items: Nunito Medium 15px. Icons: 20px rounded SVG line icons (1.5px stroke).
Active: warm gold left indicator 3px + #1A1A2E text + very light gold tint background.
Pro badge: soft amber pill "PRO" next to locked features.
Bottom: user avatar + plan badge + settings gear.

## Search Experience

Search bar: 52px tall, 14px border-radius, warm border #E8E4DE, focus glow rgba(44,74,110,0.15).
Live results dropdown: card style, max 6 results, each with mini 3D insert thumbnail + grade + brand + ISO group badge.
Dropdown appears with 200ms slide-down ease. Disappears with 150ms fade.
"No results" state: friendly empty illustration + suggestion chips.

## Comparison Feature — Multi-Column 3D Layout

Side-by-side comparison panel: 2 or 3 products simultaneously.
Each column: full product card expanded vertically.
Top: 3D insert illustration, larger, 160px.
Spec rows align horizontally across columns for easy comparison.
Better value highlighted with warm gold background on that cell.
Drag and drop to reorder columns.
Column header: brand logo + product grade in large Nunito Bold.

## Freemium Pro Gate

Not a modal block. A soft frosted overlay on the feature area.
Centered upgrade card: warm white, 20px radius, Nunito heading, DM Sans body.
CTA button: #2C4A6E, white Nunito SemiBold, 12px radius, 48px height.
Secondary: "See what's included →" text link in warm gold.
Copy: matter-of-fact. "This feature requires Pro." Not pushy.

## What to Absolutely Avoid

No dark sidebars or dark backgrounds in the main interface.
No sharp 0px border-radius anywhere visible.
No icon fonts — SVG only.
No spinner loading indicators — skeleton shimmer only.
No jarring instant transitions — everything moves.
No Inter, Roboto, or Arial — Nunito + DM Sans + DM Mono only.
No solid color section dividers.
No box shadows with colored tints — black-based semi-transparent only.
No ALL-CAPS headings.
No purple gradients on white.

## Reference Feel

Imagine a senior precision engineer opening a tool selection platform and immediately thinking: "This was built for me." Premium Swiss catalog warmth. Linear.app level of polish. 3D product visualization that makes you want to explore. A UI so smooth you forget it's a tool catalog and just enjoy using it.
