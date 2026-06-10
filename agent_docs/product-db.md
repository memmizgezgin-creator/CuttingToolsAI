# Product Database

> **Role — CLARIFICATION (2026-06-10):** PRODUCT_DB is the AI's reference layer, not a user-facing catalog. The KIRILMAZ KURAL forbids catalog/store POSITIONING, not internal DB growth: more verified catalog data = fewer hallucinations = stronger "it knows my tooling" trust. Growing this DB via PDF ingestion (with human review, see `REVIEW_WORKFLOW.md`) is encouraged. Forbidden: user-facing catalog/SKU-search/store features.

## PRODUCT_DB Format (per entry)
```js
{
  id: 'unique-id',
  brand: 'Sandvik',
  grade: 'GC4325',
  coating: 'CVD',
  geometry: 'CNMG120408-MF',
  isoCodes: ['P15', 'P25'],          // ISO group + application range
  operations: ['turning'],            // turning | milling | drilling | threading | grooving
  materials: ['carbon-steel', 'alloy-steel'],
  vcRange: [200, 380],               // m/min
  fnRange: [0.15, 0.5],             // mm/rev
  apRange: [0.5, 6],                // mm
  toolLife: 'above-average',
  applicationNotes: '...',
  buyLinks: [{ supplier: 'name', url: '...', price: null }],
  imageUrl: null
}
```

## ISO Groups
- P: Carbon & alloy steel (blue)
- M: Stainless steel (yellow)
- K: Cast iron (red)
- N: Non-ferrous / aluminum (green)
- S: Superalloys / titanium (orange)
- H: Hardened steel (gray)

## Operations
- Turning: external, internal, facing, profiling
- Milling: face, shoulder, slot, copy, plunge
- Drilling: solid carbide, indexable, deep hole
- Threading: external, internal, whirling
- Grooving: external, internal, face, parting

## Current DB Size
53 products across 10 brands:
Sandvik (GC4325, GC2220, GC1130, H13A, CB7025)
ISCAR (IC8250, IC8150, IC830, IC806, IB50)
Kennametal (KC5010, KCSM30, KCU25, KD120)
Walter (WPP10S, WPP20S)
Tungaloy (T9115, T9125, AH3225)
Mitsubishi (MC6025)
OSG (AE-VTSS DLC)

## Cross-Reference DB
Currently ~22 codes with 7-8 brand equivalents each:
CNMG120408, WNMG080408, DCMT11T304, SNMG120408, APMT1604PDER

## Toolholder Taxonomy (planned layer 2)
- ER collet chucks
- Hydraulic chucks
- Shrink fit
- Weldon flat
- Modular: Sandvik Capto, Kennametal KM
- Spindle interfaces: BT30/40/50, CAT40/50, HSK-A63
