# Copy-paste this into Claude Code

When you open this handoff folder in Claude Code, paste the prompt below as your first message. Don't shorten it — every line is doing work.

---

```
You are taking over a design handoff. Read these two files IN FULL before doing anything else:

1. README.md
2. UX_GAPS.md

Then read every HTML file in designs/ at least once. Skim tw-config.js and polish.css carefully — those are the design tokens and motion spec.

Once you've read everything, do NOT start coding. Instead:

(a) Summarize back to me in 8–12 bullets what you understand the product to be, who it's for, and the six core screens.

(b) Propose a build plan as a numbered list of sprints. Use the suggested sprint plan in README §12 as a starting point, but tell me what you'd change and why.

(c) List every assumption you're making that isn't explicitly in the README — especially around data sources, the recommendation rule engine, auth choice, and hosting.

(d) Ask me up to 8 clarifying questions. Prioritize questions whose answers most change the architecture.

Only after I respond to (a)–(d) should you scaffold the project.

Stack baseline (deviate only with reason): Next.js 14 App Router + TypeScript + Tailwind v3 + shadcn/ui + Drizzle + Postgres (Neon) + NextAuth + Vercel.

Hard rules:
- The ISO color system (P=blue M=amber K=red N=green S=orange H=slate) is semantic, not decorative. Do not change it.
- Do not ship LLM calls in the critical recommendation path on day one. Deterministic rule engine first.
- Do not bulk-import vendor catalogs without data_source + data_confidence flags. Trust signals are core to positioning.
- Mobile-first for the Advisor wizard. Desktop-first is fine for Catalog/Compare.
- Accessibility is not a sprint 5 polish item — the ISO color encoding needs a secondary letter+pattern encoding from sprint 1.
```

---

## Optional second message — if you want a faster start

If you'd rather skip the planning loop and just have it scaffold immediately, send this instead:

```
Read README.md and UX_GAPS.md, then scaffold a Next.js 14 + TypeScript + Tailwind + shadcn/ui project named "tooladvisor" with:

- tailwind.config.ts populated from designs/tw-config.js (every token)
- next/font/google set up for Nunito + DM Sans + DM Mono
- app/(app)/layout.tsx with the sidebar+topbar chrome from the prototype
- Empty route stubs for: /catalog, /advisor, /cross-reference, /compare, /knowledge, /pro, /profile
- Drizzle schema from README §8, with a seed script for 20 sample tools across all 6 ISO groups
- shadcn components installed: Button, Card, Dialog, Sheet, Input, Select, Badge, Form, Toast

After scaffolding, run the dev server and screenshot the /catalog route so I can sanity-check the visual port.
```
