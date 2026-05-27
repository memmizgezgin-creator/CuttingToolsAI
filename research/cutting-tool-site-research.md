# Cutting Tool Site Research

Research date: 2026-05-27

Scope: public, high-level product-structure intelligence only. This document records category models, filter names, attribute patterns, comparison fields, terminology, and source URL references. It does not copy full product databases, protected descriptions, product images, or proprietary catalogue tables.

## Executive Findings

Cutting-tool sites converge on a few stable product intelligence patterns:

- Category first: turning, milling, drilling/holemaking, threading/tapping, reaming, grooving/parting, and holders/adapters.
- Filters are mostly structured around geometry, size, grade/coating, material suitability, operation, coolant, standards, and availability.
- Detail pages commonly separate classification, dimensional specs, application/material suitability, cutting data, downloads/CAD, and related variants.
- The most useful neutral data language is ISO/GTC/ISO 13399-style attribute naming, but ToolAdvisor should expose machinist-friendly labels rather than raw codes only.
- Product decisions need confidence and validation metadata as first-class fields. Current ToolAdvisor already has confidence/source fields, but they are too coarse for robust advisory and comparison.

## Source Examples Reviewed

The following pages were sampled for structural intelligence only:

- Sandvik Coromant product detail example: https://www.sandvik.coromant.com/en-us/product-details?c=390R-070204E-ML+++++1040
- Kennametal turning insert category/detail examples: https://www.kennametal.com/us/en/products/metalworking-tools/turning/od-and-id-turning/fix8/inserts.html and https://www.kennametal.com/us/en/products/p.ng.1114582.html
- Tungaloy product and catalogue examples: https://tungaloy.com/us/product/turning/t500-series/ and https://webshop.tungaloyamerica.com/catalogue/product/2066936
- Mitsubishi Materials web catalogue examples: https://www.mitsubishicarbide.net/mhg/enuk/solid_end_mills/10000505/20075968 and https://www.mitsubishicarbide.net/contents/mhg/enuk/html/product/product_guide/information/milling/index.html
- Guhring tap examples: https://guhring.com/Catalogs/CatalogSelected/170 and https://guhring.com/ProductsServices/SeriesDetails?Series=169
- Hoffmann Group product examples: https://www.hoffmann-group.com/US/en/hus/p/191620-6 and https://www.hoffmann-group.com/US/en/hus/p/203094-8
- ToolsUnited ISO/GTC-style article examples: https://toolsunited.com/EN/Article/Details/24696400131046244?dataSource=toolsUnited&print=False and https://toolsunited.com/EN/Article/Details/24696400130921100?dataSource=toolsUnited&print=False
- MachiningCloud data-platform positioning: https://www.machiningcloud.com/enterprise/
- Dormer Pramet tap example: https://dormerpramet.com/us/en_US/p/5976338
- Narex machine tap examples: https://www.narexzd.com/machine-taps/4280-machine-tap-with-right-hand-spiral-flutes-40--/ and https://www.narexzd.com/machine-taps/4280nx-machine-tap-with-right-hand-spiral-flutes-40--/
- MSC-style distributor spec example: https://www.mscdirect.com/product/details/54944947

## Common Product Categories

Must-have now:

- Turning inserts
- Milling inserts
- Solid drills and indexable drill inserts
- Machine taps and hand taps
- Threading inserts/tools
- Reamers
- End mills

Good later:

- Grooving and parting inserts, because current ToolAdvisor data already partially maps them under threading/grooving.
- Thread mills, countersinks, boring bars, modular heads.
- Tool assemblies and CAD/CAM export readiness.

Not needed yet:

- Tool holders as primary catalogue records.
- Grinding wheels, abrasives, metrology, workholding, coolant, machines.
- Marketplace/cart/checkout taxonomy.

## Category Attribute Patterns

### Turning Inserts

Common source field names:

- ISO code / ANSI code / catalog ID
- Insert shape / insert shape code
- Clearance angle / relief angle
- Tolerance class
- Insert size / inscribed circle / cutting edge length
- Thickness
- Corner radius / nose radius
- Chipbreaker / chipformer / insert geometry
- Grade
- Coating
- Substrate / cutting edge material
- Material grade / ISO material group P/M/K/N/S/H
- Hand / cutting direction / insert hand
- Operation: finishing, medium, roughing
- Cutting data: Vc, feed, ap
- Coolant / wet-dry suitability

ToolAdvisor interpretation:

- Treat ISO/ANSI code as identity and geometry decoder.
- Treat chipbreaker + grade + coating as application behavior, not mere text labels.
- Keep material group as structured array with strength/priority, not one flat `iso` value.

### Milling Inserts

Common source field names:

- ISO/ANSI code
- Insert shape
- Insert size and shape
- Corner radius
- Cutting edge count
- Insert thickness
- Cutting edge length
- Grade/coating
- Workpiece material
- Cutter family compatibility
- Lead angle / entering angle where available
- Max depth of cut
- Operation: face, shoulder, high-feed, profile, slotting

ToolAdvisor interpretation:

- Milling insert records need both insert geometry and compatible cutter/application family.
- Comparison should not compare face/shoulder/high-feed inserts as equivalent unless the operation family overlaps.

### Drills

Common source field names:

- Diameter
- Drill length type / jobber / stub / extra length
- Overall length
- Flute length
- Usable length
- L/D ratio
- Point angle
- Shank type and shank diameter
- Coolant-through / internal coolant
- Coating/finish
- Tool material: HSS, HSCo, PM-HSS, carbide
- Hole tolerance
- Workpiece material suitability

ToolAdvisor interpretation:

- Diameter, L/D ratio, coolant-through, coating, and material suitability drive first-screen filtering.
- Point angle and flute geometry are important detail/compare fields.

### Taps

Common source field names:

- Thread size
- Thread pitch / TPI
- Thread standard: Metric, MF, UNC, UNF, NPT, BSP, etc.
- Standard: DIN 371, DIN 376, ISO 529, ANSI
- Hole type: blind / through
- Tap type: machine tap / hand tap / form tap / spiral flute / spiral point / straight flute
- Flute type
- Flute helix angle
- Chamfer form / lead
- Tolerance: 6H, 6HX, H limit, class of fit
- Coating/finish
- Tool material
- Shank diameter
- Square drive / drive size
- Overall length
- Thread length / cutting length
- Coolant supply
- Cutting direction: RH/LH

ToolAdvisor interpretation:

- Taps require thread standard + size + pitch as identity, not just product code.
- Hole type and tap type should be primary filters because blind/through mismatch is a high-risk failure mode.

### End Mills

Common source field names:

- Cutter diameter
- Number of flutes
- Cutting edge length / flute length
- Overall length
- Shank diameter
- Neck length / functional length
- Corner radius / chamfer / ball radius
- Coating
- Tool material
- Helix angle
- Center-cutting
- Coolant-through
- Cutting direction
- Machining strategy: HPC, HSM, TPC, roughing, finishing
- Workpiece material suitability

ToolAdvisor interpretation:

- Distinguish end mills from indexable milling inserts in schema and UI.
- End mill comparisons should emphasize diameter, flute count, flute length, coating, helix, corner style, and material group.

### Reamers

Common source field names:

- Nominal diameter
- Tolerance class / achieved hole tolerance
- Flute count
- Flute type
- Overall length
- Cutting length
- Shank type/diameter
- Coating/material
- Coolant-through
- Application material

ToolAdvisor interpretation:

- Reamers are precision/hole-quality tools. Detail and compare pages should foreground tolerance, diameter, material suitability, and coolant.

## Product Detail Page Structure Observed

Typical manufacturer/distributor structure:

- Breadcrumb category path
- Product family and product code
- Variant table or variant selector
- Classification fields
- Dimensional specification table
- Application/workpiece material icons or rows
- Grade/coating/material information
- Cutting data or application data
- Downloads: datasheet, CAD, catalogue page, product report
- Related products/compatible holders
- Stock/commercial fields on distributor pages

ToolAdvisor should reuse the structure but reframe it as advisory:

- What it is
- Where it fits
- Why it is suitable
- What to verify
- What alternatives are plausible
- What evidence supports the recommendation

## Normalized Terminology

Use these UI labels:

- Tool type
- Product code
- Brand
- Product family
- Operation
- Workpiece material
- ISO material group
- Geometry
- Key dimensions
- Grade
- Coating
- Tool material
- Coolant
- Cutting direction
- Standard
- Application range
- Recommended envelope
- Confidence
- Source
- Last checked
- Risk flags

Avoid these as primary labels:

- Generic “catalog”
- “Buy”
- “Best product” without context
- “Manufacturer recommended” unless source is verified and URL/page is recorded
- Commercial rank as an advisory rank

## Best-Practice Implications For ToolAdvisor

Must-have now:

- Move from one generic product row shape to category-specific `specs`.
- Add trust metadata to every product record.
- Replace hard-coded demo fields with normalized filter groups.
- Keep “source URL” and “last checked” visible in detail pages.
- Add risk notes to advisor and compare cards.

Good later:

- ISO 13399/GTC property-code mapping for imports and audits.
- Variant group handling for product families with many dimensions.
- “Evidence panel” that shows why a field is trusted.
- Structured cutting-data ranges per material and operation.

Not needed yet:

- Full manufacturer catalogue mirroring.
- Protected image reuse.
- Cart/checkout.
- Holder assembly modelling beyond compatibility notes.
