# ToolAdvisor Market Analysis — 2026-06-02

## Critical Findings

### Competitive Reality Check
ToolAdvisor cannot compete as a generic "speeds & feeds calculator."
- **Harvey Machining Advisor Pro**: Free
- **FSWizard PRO**: One-time $18.99
- **Money is in**: Sourced data, PDF technical reports, risky cross-reference analysis, enterprise data/API

### Local Signal (Critical)
reports/2026-06-02.json shows **908 candidate inserts** but **missing source_page and raw_row_ref across all records**. 
Until traceability is fixed, no paid report/API claims should be made. Traceability is a commercial prerequisite, not a feature.

---

## 1. Competitor / Benchmark Analysis

### MachiningCloud
- **Price**: Standard $39/mo; premium tiers include Tool Advisor, CAM export, ISO 13399, API license
- **ToolAdvisor differentiation**: Not a catalog by scale, but "proof chain + risk rationale + brand-neutral cross-reference"
- **Link**: m.machiningcloud.com

### Hoffmann ToolScout
- **Strength**: Downloadable PDF cutting data + economic analysis
- **What NOT to copy**: eShop
- **What TO copy**: Brand-neutral decision PDF with "source page, raw row, risk flags, decision rationale"

### Gühring Navigator
- **Strength**: "Value for money" vs "performance winner" differentiation
- **ToolAdvisor translation**: Brand-neutral axis "small series / high performance / low risk"

### Kennametal Collaboration Space
- **Strength**: Project, team, machine, and reporting workflow
- **ToolAdvisor scope (for now)**: Don't do full project management. Only produce "decision snapshot" PDFs.

---

## 2. Revenue Model Validation

### ✅ Freemium / Pro (REALISTIC, medium-term potential)
- MVP: Free search + paid sourced PDF export / saved comparisons
- Trust risk: Low

### ✅ B2B Team Selection Consulting (REALISTIC, high learning value short-term)
- MVP: Upload PDF + use scenarios → sourced recommendation report within 48h
- Trust risk: Low

### ✅ PDF Technical Analysis Report (BEST FIRST REVENUE MODEL)
- MVP: Single manufacturer PDF → "fit, missing data, risk, alternative conditions" report
- Example: User uploads Sandvik datasheet page → get ToolAdvisor-attributed recommendation with traceability

### ⚠️ Cross-Reference Premium (HIGH POTENTIAL but dangerous before traceability)
- MVP: "Possible equivalent" + confidence level; NO definitive equivalence claims
- Risk: Traceability incomplete

### ❌ TRASH / DO NOT PURSUE
**Sponsored product recommendation** — looks like quick revenue but breaks ToolAdvisor's core trust promise

### 🔄 LATER (not now)
- Supplier lead generation / distributor routing (realistic; must be completely separate from ranking)
- Technical data API / enterprise license (high potential; requires 100% source-approvable dataset first)
  - ToolsUnited charges $1,200+/year for data export; market exists
- Education / tooling knowledge (low-medium potential; not generic blog, sourced checklist + case PDF)

---

## 3. Product & Data Strategy

### 🎯 Immediate Priority: Data Approval, Not Data Growth
**SCHEMA.md mandatory provenance fields must be the commercial quality gate.**
- source_file, source_page, raw_row_ref, extraction_method are non-negotiable
- 908 candidates with missing traceability = not ready for any paid output

### 🎯 Category Priority Order
1. **Drill** — fastest (existing data volume, simple geometry)
2. **Reamer** — high decision value (tolerance/finish complexity)
3. **Insert** — valuable for cross-reference but risky (chipbreaker/grade/holder matching)
4. **Mill** — machine rigidity and toolpath dependent
5. **Bore** — lower revenue priority

### 🎯 Data Sources
- **ISO 13399 / GTC** as target format, not replacement for raw PDF
- ISO 13399 is current standard for cutting tool data exchange
- Sandvik validates GTC/ISO 13399 download model (sandvik.coromant.com)

---

## 4. User & Buying Behavior

### The Problem People Pay For
- Wrong tool selection → breakage
- Setup delays
- Understanding real machine/holder risk (aggressive catalog data vs. what my machine actually handles)
- Reddit MAP threads show users stuck on "theoretical value vs. what will my machine handle?"

### What Does NOT Make Money
- Beautiful catalog page
- 3D showcase
- Generic feed-speed calculator
- SEO content pile

### What Positions ToolAdvisor as Serious Engineering Tool
- Source page reference
- Raw row reference
- Null for missing fields (not invented defaults)
- Confidence score
- Risk flags
- PDF decision summary

---

## 5. Daily 3 Actions

### [IMMEDIATELY]
**908 candidates missing source_page + raw_row_ref = no paid report/API claims until fixed.**

### [THIS WEEK]
Define paid "PDF Technical Analysis Report" pilot for ONE category (drill or reamer); produce 3 example reports.

### [DON'T DO (yet)]
- Sponsored ranking
- Generic calculator monetization
- UI/SEO redesign
- Automated PRODUCT_DB merge

---

**Next Review**: 2026-06-09
**Owner**: Product & Data Team
**Status**: Strategy locked, data traceability blocking all revenue moves
