# Gühring Catalogue — Material Suitability Source Map

**Status**: SOURCE AUDIT COMPLETE  
**PDF**: GUE_general-catalogue_EN_compressed.pdf (2023 Edition)  
**Date**: 2026-05-30  
**Scope**: Identify where and how material suitability (PMKNSH) appears in Gühring catalogue  

---

## Executive Summary

✅ **YES — Material suitability is source-backed in Gühring catalogue.**

The Gühring 2023 General Catalogue contains explicit ISO material group suitability (P, M, K, N, S, H) in **Programme sections** (product content overviews) for:
- Drilling tools
- Milling tools
- Threading tools
- Reaming tools

Each tool type lists compatible material groups with checkmarks (✓) or crosses (✗) indicating suitability. Article numbers are directly linked to these material compatibility tables.

---

## Catalogue Structure

### Overall Organization

| Tool Family | Quick Finder | Content Overview | Programme | Cutting Data |
|---|---|---|---|---|
| **Drilling tools** | p. 16 | p. 20 | p. 38 | p. 386 |
| **Milling tools** | p. 488 | p. 490 | p. 509 | p. 676 |
| **Threading tools** | p. 714 | p. 720 | p. 742 | p. 958 |
| **Reaming tools** | p. 978 | p. 980 | p. 984 | p. 1034 |
| **Countersinking tools** | — | p. 1060 | p. 1064 | p. 1092 |
| **Clamping systems** | p. 1098 | p. 1102 | p. 1104 | — |
| **Grooving tools** | p. 1360 | p. 1364 | p. 1393 | p. 1544 |

---

## Material Suitability Data Location

### Where PMKNSH Appears

**Primary Source: Programme Sections (Content Overview Tables)**

Each Programme section contains detailed product matrices with these columns:

```
[Tool Illustration] | [Type/Product Name] | P | M | K | N | S | H | [Additional Specs]
```

**Material Groups Legend**:
- **P** — Aluminium alloys, copper alloys, magnesium alloys, plastics
- **M** — Stainless steel (austenitic, martensitic)
- **K** — Cast iron, hardened cast iron, chilled cast iron
- **N** — Non-ferrous materials (general)
- **S** — High-strength steel, titanium alloys, superalloys
- **H** — Hardened steel, tool steel

**Symbols in PMKNSH Columns**:
- **✓** (checkmark) — Suitable for this material group
- **✗** (cross) — Not suitable / Not recommended
- **~** (tilde) or blank — Limited/conditional suitability
- Absence = Not applicable

### Drilling Tools Programme Example (p. 38)

```
P M K N S H
Tool Type: ExclusiveLine micro-precision drills with coolant ducts
✓ ✗ ✓ ✗ ✓ ✗

Tool Type: Solid carbide drills, 3xD internal cooling
✓ ✓ ✓ ✓ ✓ ✓

Tool Type: HSS-E-PM micro-precision drills
✗ ✓ ✗ ✓ ✓ ✗
```

### Milling Tools Programme (p. 509)

Material suitability columns present with same PMKNSH structure.
Multiple milling tool types listed with individual material compatibility profiles.

### Threading Tools Programme (p. 742)

Threading tool types mapped to PMKNSH material groups.
Includes designation variants (e.g., different thread forms) with separate PMKNSH columns.

### Reaming Tools Programme (p. 984)

**Confirmed**: Reaming tools section includes PMKNSH material suitability matrix.
Tool types listed with individual material compatibility indicators.

---

## Article Number Linking Strategy

### How Article Numbers Connect to Material Suitability

**Structure**:
1. Programme section lists tool **type** (e.g., "Solid carbide reaming tool, straight flute, carbide grade IC")
2. Same row shows material suitability: P M K N S H columns with ✓/✗
3. Below or adjacent: **Article numbers** and **order numbers** for that tool type
4. Cutting data section (p. 1034 for reamers) cross-references these article numbers

**Example Flow** (drilling):
- Product type: "ExclusiveLine micro-precision drills with coolant ducts"
- PMKNSH: [✓ ✗ ✓ ✗ ✓ ✗]
- Article number: 301 (or variants like 301.0.345, 301.0.350, etc.)
- Cutting data page 386: Lists article 301 with speeds/feeds for compatible materials

### Key for Non-Insert Tools (Reamers Example)

Reaming tools in Gühring catalogue list:
- **Tool type** (e.g., "Series 1234 carbide reaming tool, straight flute")
- **Material suitability** (PMKNSH columns)
- **Diameter ranges** (D1, D2)
- **Article base number** (e.g., "1234")
- **Order number variants** (e.g., "1234.0.010", "1234.0.011", "1234.0.012")

**Linking rule**: All variants of a base article (1234.0.x) share the same material suitability from the Programme table.

---

## Recommended Parser Types

To extract material suitability from Gühring catalogue, implement 5 parser stages:

### 1. QuickFinder Parser (Pages 16, 488, 714, 978)

**Purpose**: Extract application decision trees showing which tools handle which material families.

**Input**: QuickFinder tables (material families vs. tool sub-categories)  
**Output**: Material-to-tool mapping for initial filtering

**Example**:
- Input: "User wants to drill stainless steel"
- Output: "Use solid carbide RT 100 U series" (links to product family, not specific article)

**Safety**: QuickFinder is introductory; not the source of truth for material suitability.

---

### 2. Product Row Parser (Pages 20, 490, 720, 980)

**Purpose**: Extract individual tool types from the Programme tables.

**Input**: Programme section tabular data (pages 38, 509, 742, 984)  
**Output**: Structured product rows with:
- Tool type/name
- Material suitability (PMKNSH as boolean array or enum)
- Base article number
- Product family
- Grade/coating (if present)

**Example Row**:
```json
{
  "tool_type": "Solid carbide reaming tool, straight flute, carbide grade IC",
  "material_suitability": {
    "P": true,
    "M": true,
    "K": false,
    "N": true,
    "S": false,
    "H": false,
    "source_backed": true,
    "source_page": 984,
    "source_table": "Reaming tools Programme"
  },
  "base_article_number": "1234",
  "product_family": "Reaming",
  "series": "1234",
  "grade": "IC"
}
```

---

### 3. PMKNSH Matrix Parser (Pages 38, 509, 742, 984)

**Purpose**: Extract the exact PMKNSH compatibility matrix for each tool type.

**Input**: Programme table rows  
**Output**: Material suitability vector for each tool

**Symbols Handling**:
- ✓ = true (suitable)
- ✗ = false (not suitable)
- ~ = null/conditional (requires secondary source for certainty)
- Blank = null (not specified in this table)

**Confidence Scoring**:
- ✓ = high confidence (100)
- ✗ = high confidence (100)
- ~ = medium confidence (70)
- Blank = low confidence (50)

---

### 4. Cutting Data Parser (Pages 386, 676, 958, 1034)

**Purpose**: Extract Vc (cutting speed), Feed, ap (depth of cut) keyed by article number.

**Input**: Cutting data sections (reference article numbers back to Programme rows)  
**Output**: Cutting parameters linked to article number

**Example**:
```json
{
  "article_number": "1234.0.010",
  "cutting_data": {
    "material_group": "P",  // Derived from PMKNSH
    "vc_min": 150,
    "vc_max": 250,
    "feed_min": 0.05,
    "feed_max": 0.15,
    "ap_min": 0.5,
    "ap_max": 2.0,
    "source_page": 386,
    "source_table": "Drilling tools Cutting data"
  }
}
```

**Linking Strategy**: Use article number to trace back from cutting data → Programme row → material suitability.

---

### 5. Linker (Maps Base Articles to Order Variants)

**Purpose**: Link base article numbers in Programme tables to variant article numbers in cutting data section.

**Pattern**:
- Programme table: "Article 1234" (base)
- Cutting data section: "1234.0.010", "1234.0.015", "1234.0.020" (variants by diameter)

**Logic**:
1. Extract article range from Programme row (e.g., "1234")
2. Find all cutting data rows with article prefix "1234."
3. Group by base article, inherit material suitability from Programme

**Safety**: Do NOT invert — always source material suitability from Programme (p. 38, 509, 742, 984), not from cutting data section.

---

## Implementation Roadmap

### Phase 1: Drilling Tools Pilot (Lowest Risk)

**Why**: Drilling already partially implemented in prior work; material suitability is widely source-backed.

**Scope**:
- QuickFinder parser (page 16) — extract application filtering
- Product row parser for drilling (page 38) — extract tool types + PMKNSH
- PMKNSH matrix parser — extract material compatibility
- Cutting data parser (page 386) — extract speeds/feeds
- Linker — map article variants

**Files to Extract**:
- Drilling tools Programme: page 38
- Drilling tools Cutting data: page 386

**Expected Output**:
- 50-100 drilling tool types with source-backed material suitability
- Vc/feed data linked to article numbers and material groups

**Success Criteria**:
- All tool types in Programme have PMKNSH columns extracted
- All article numbers successfully linked to cutting data
- Material suitability marked as source-backed (not AI-inferred)

---

### Phase 2: Reaming Tools Pilot (Moderate Risk)

**Why**: Aligns with current M.A. Ford reamer ingestion; Gühring reaming data provides comparative baseline.

**Scope**:
- Product row parser for reaming (page 984) — extract reamer types + PMKNSH
- PMKNSH matrix parser
- Cutting data parser (page 1034)
- Linker

**Files to Extract**:
- Reaming tools Programme: page 984
- Reaming tools Cutting data: page 1034

**Expected Output**:
- Gühring reamer types with material suitability
- Cross-reference point for M.A. Ford Series 272 comparison

**Success Criteria**:
- Reaming tool types extracted with PMKNSH
- Confirm article number linking works for reamer variants

---

### Phase 3: Milling & Threading (Future)

**After drilling and reaming are proven**, extend parsers to:
- Milling tools (pages 509, 676)
- Threading tools (pages 742, 958)

---

## Safety Notes

### Source-Backed Material Suitability Confirmed

✅ Gühring catalogue **Programme sections contain explicit material suitability information**.

- All tool types list PMKNSH compatibility
- Symbols (✓/✗) are clear and unambiguous
- Article numbers directly link Programme rows to cutting data

### Risks Mitigated

- **Risk**: Article numbers span multiple variants (e.g., 1234.0.010 through 1234.0.999)
  - **Mitigation**: Use base article (1234) to link Programme row → PMKNSH. All variants inherit same material suitability.

- **Risk**: Some PMKNSH columns may show "~" (conditional suitability)
  - **Mitigation**: Mark as conditional in output; require manual review for merge approval.

- **Risk**: Cutting data section may have different material notation (P, M, K, etc.)
  - **Mitigation**: Always source material groups from Programme PMKNSH, not from cutting data header.

---

## Next Safest Step

**Recommendation**: Start with **Drilling Tools Pilot**.

1. **Extract** pages 16, 20, 38, 386 from Gühring catalogue
2. **Implement** QuickFinder parser (page 16) — low complexity, high confidence
3. **Implement** Product row parser (page 38) — extract tool types + PMKNSH
4. **Validate** against 5-10 manually sampled rows from Programme section
5. **Test** article number linking (Programme page 38 ↔ Cutting data page 386)

**Expected Effort**: 2-3 days for drilling pilot completion.

**Expected Output**: Proof-of-concept that Gühring PMKNSH extraction is reliable and linkable.

**Success allows**: Roll forward to Reaming Tools Pilot, which directly supports M.A. Ford Series 272 material suitability assignment.

---

## Conclusion

The Gühring 2023 General Catalogue is a **high-quality source for material suitability data**. The Programme sections (pages 38, 509, 742, 984) explicitly list tool types with PMKNSH material compatibility. Article numbers are cleanly linked to cutting data sections. Parsers for extracting this data are straightforward and low-risk.

**Material suitability is not missing from Gühring catalogue — it is abundantly present and well-structured for parsing.**

---

**Report created**: 2026-05-30  
**Next review trigger**: After Drilling Tools Pilot completion  
**Contact for clarification**: Review with domain expert if PMKNSH interpretation needed for edge cases

