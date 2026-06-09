# CuttingToolsAI — The Why Layer (Field Knowledge Base)

> Purpose: this file feeds the AI advisor's system prompt. It contains knowledge that does NOT
> exist in catalogs — the judgment layer from 20+ years on the shop floor (Gühring, TaeguTec,
> Machine Total). Catalogs say WHAT. This file says WHY, and WHEN THE CATALOG LIES.
>
> Rules for filling:
> - One cell at a time. A single paragraph is enough. No pressure to complete rows.
> - Write in any language (TR is fine) — Claude converts to EN and integrates into the prompt.
> - Every entry should answer one of: "Why this choice?", "When does the catalog value fail
>   in practice?", "What does the operator actually see at the machine?"
> - Skip cells where you have nothing first-hand. Empty is better than catalog-copy.
> - KIRILMAZ KURAL applies: this is judgment knowledge, never SKU data.

Status legend: [ ] empty · [~] partial · [x] done

---

## 1. TURNING

### 1.1 Geometry & rake — why, not what
- [ ] P (steel): when to deviate from the default -PM/-MM chipbreaker recommendation, and what the chips tell you
- [ ] M (stainless): why positive rake + sharp PVD edge matters on 316L specifically — work-hardening mechanics as seen at the machine, not in theory
- [ ] S (superalloy): edge prep (honed vs sharp) trade-off on Inconel — what fails first and how it looks
- [ ] H (hardened): CBN vs coated carbide decision point in real shops (batch size, machine rigidity), not just HRC number
- [x] Over-reinforced edges on hard materials show a plowing signature: sound change, chip/tool visual change, edge discoloration without coolant, and measurably degrading feed on the machine display. When you see this pattern, back off the edge prep, not the speed.

### 1.2 Grades & coatings — when the catalog value lies
- [ ] Why a CVD grade that performs in the catalog test bar fails on interrupted cuts — what the catalog test doesn't replicate
- [ ] GC4325-class grades: where the stated Vc range is honest and where you derate (old machines, thin walls, long overhang)
- [ ] PVD vs CVD on M group: the real decision rule you used when advising customers

### 1.3 Cutting data — field corrections
- [ ] fn vs flank wear: the "increase feed to reduce wear" advice — when it works, when it destroys the part
- [ ] Coolant: when wet turning of P-steel is actually worse (thermal cracking in interrupted cuts)
- [ ] Vc derating rules of thumb by machine condition / setup rigidity

### 1.4 Failure diagnosis — what the operator actually sees
- [x] Diagnostic chain: (1) sound — deviation from the machine's known tone is the first signal; (2) chip form — readable live during the cut; (3) dimension and surface on the finished part — the last and slowest signal. Chip reading is material-relative: on soft gummy materials the chip must break SHORT (long chips smear and weld; geometry is sharper); on hard materials a LONG chip is a HEALTH sign (steady cutting; edge is reinforced). Never judge chip length without asking the material first.
- [ ] Flank wear vs notch wear vs crater: how to tell at the machine with a loupe, and the ONE parameter to change first for each
- [ ] BUE on stainless: early visual/audible signs before the insert chips
- [ ] Plastic deformation: how it looks vs how chipping looks (commonly confused)

---

## 2. MILLING

### 2.1 Geometry & approach
- [ ] Why 45° face mills forgive weak setups and 90° shoulder mills don't — entry shock explained from the floor
- [ ] APMT/APKT class inserts: where the cheap clones actually differ (edge prep consistency, not substrate)
- [ ] Ball nose on hardened steel: effective diameter / effective Vc mistake everyone makes

### 2.2 Stability & real-world derating
- [ ] Chip thinning: when to apply the formula and when the machine's rigidity makes it pointless
- [ ] Climb vs conventional on old machines with backlash — the rule you gave customers
- [ ] Long overhang: how much to drop ap/ae in practice (your numbers, not the textbook)

### 2.3 Failure diagnosis
- [ ] Insert chipping on entry vs exit — how to tell from the wear pattern and what each means
- [ ] Why one pocket of the cutter wears faster (runout) and how operators misdiagnose it as a grade problem

---

## 3. DRILLING

### 3.1 Point geometry — why
- [x] Point angle is never an isolated choice; it is the visible end of a geometry package. Material dictates the package first: point angle, relief (back) angle, helix angle, single vs double facet relief, and the backward taper of the cutting section are decided together (premium grinding practice adjusts the backward inclination of the cutting land together with the point angle). Never recommend a point angle alone — couple it with relief and helix context, and warn that regrinding only the point angle on a geometry designed as a package degrades the design intent.
- [ ] Helix angle: chip evacuation vs rigidity trade-off — the symptom when it's wrong (bird-nesting, packing)
- [ ] Back taper and margin design: why some drills "squeal" in deep holes and what that predicts

### 3.2 Coolant & deep hole
- [ ] Through-coolant pressure thresholds in practice: when external coolant genuinely cannot work anymore (L/D ratio rule from experience)
- [ ] Peck drilling: when modern drills make pecking counterproductive

### 3.3 Failure diagnosis
- [x] On aluminum (N), chip smearing is often a SECONDARY symptom of corner wear: the outer corner dulls, the edge plows a wider zone instead of shearing thin, and the chip welds to the tool. First question on N-group smearing: edge condition ("inspect the outer corner — still sharp?"), before coolant or parameters.
- [ ] Corner wear vs margin wear vs chisel edge wear — root cause of each in one line
- [ ] Oversized holes: the 3 causes in order of how often you actually saw them

---

## 4. THREADING / GROOVING / PARTING

- [ ] Threading: why full-profile inserts win on volume work despite cost — the scrap math
- [ ] Threading infeed method (radial vs flank vs modified): what you actually recommended and why
- [ ] Parting: width selection vs material savings — the false economy of narrow inserts
- [ ] Grooving: why coolant placement matters more here than in turning

---

## 5. CROSS-BRAND JUDGMENT (the brand-neutral edge)

- [x] Small and mid-size shops rarely resist equivalents out of habit; the numbers decide. The adoption pattern is: buy ONE trial unit, test it on a real job, and if it performs, the brand stops mattering. Never push a bulk switch — frame every equivalent recommendation as a low-risk single-unit trial, judged against the process requirement.
- [x] Large-volume OEMs behave differently: high quantities mean they default to established brands, because the premium includes application support — when a problem appears, the supplier's engineers come on site and own the fix. For high-volume series production, "premium brand + application support" can genuinely be the right recommendation. Brand-neutral means honest about this too.
- [ ] Grade equivalence tables: where official cross-refs are honest and where "equivalent" grades behave differently in the field (specific pairs you remember)
- [ ] When to recommend the premium brand despite price, and when the second-tier brand is genuinely identical
- [ ] The questions a good distributor asks before recommending — encode your sales-engineering checklist

---

## 6. META RULES (how the AI should reason)

- [x] A tool is never better in isolation; it is better FOR a process chain. Example: an outstanding surface finish caused a failure because paint could no longer adhere. Before declaring tool A better than tool B, ask what happens to the surface next (coating, painting, bonding, sealing, fits). "Better finish" can be a defect.
- [ ] Always ask for: machine condition/rigidity, batch size, coolant capability — before trusting catalog Vc
- [ ] Confidence language: when to say "this is standard practice" vs "this depends on your setup, test at the low end"
- [ ] Red lines: what the AI should never claim without data (tool life numbers, exact cost savings)

---

*Workflow: each morning Claude sends one question targeting one cell. Murat answers in one
paragraph (TR ok). Claude converts, integrates into the advisor system prompt, marks the cell [x].
20 cells ≈ an advisor GPT cannot copy.*
