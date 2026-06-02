# Ingestion Candidate Schema

ToolAdvisor product database ingestion structure. Defines the shape of candidate inserts proposed for addition to the product catalog.

## Top-Level Fields

### provenance
**Type:** Object

Metadata about where and how the candidate was discovered or submitted.

- `source_type` (string): `manual`, `api`, `ocr`, `user_submission`, `vendor_feed`
- `source_id` (string): External identifier if from a feed or API
- `discovered_at` (ISO 8601): Timestamp of ingestion attempt
- `confidence` (number, 0–1): Confidence that this is a real, production insert
- `notes` (string): Free-text provenance context (e.g., "from Sandvik 2024 catalog page 42")

### product_identity
**Type:** Object

Core product identification. Uniquely identifies an insert in the market.

- `iso_code` (string): ISO designation (e.g., `CNMG120408-PM`)
- `manufacturer_code` (string): Vendor's internal part number (e.g., GC4325)
- `manufacturer_name` (string): Brand/OEM (e.g., `Sandvik Coromant`)
- `common_aliases` (array of strings): Alternative names (e.g., `[CNMG432-12T308, CNMG-432]`)

### geometry
**Type:** Object

Physical shape and dimensional properties.

- `shape_code` (string): ISO shape letter (`C`, `T`, `S`, `D`, `W`, `R`, `M`, `V`, etc.)
- `insert_type` (string): `negative`, `positive`, `semi-negative`, `chipbreaker`
- `relief_angle` (string): Nominal relief (e.g., `0°`, `7°`, `15°`)
- `clearance_angle` (number, degrees)
- `nose_radius_microns` (number or range): Nose radius in μm (e.g., 400, or `[300, 500]`)
- `cutting_edges` (number): Number of cutting edges on the insert
- `lead_angle` (number, degrees): Primary lead angle
- `chipbreaker_geometry` (string): Chipbreaker profile (e.g., `PM`, `PF`, `K`, `W`)

### material
**Type:** Object

Substrate composition and coating stack.

- `iso_material_group` (string): `P`, `M`, `K`, `N`, `S`, `H`, `O` (ISO 513)
- `base_material` (string): `cemented carbide`, `ceramic`, `CBN`, `PCD`, `HSS`
- `coating_type` (string): `none`, `CVD`, `PVD`, `multilayer`, `ceramic`
- `coating_layers` (array): Ordered list of coating materials (e.g., `[Ti(C,N), Al₂O₃, TiN]`)
- `hardness_hv` (number): Knoop hardness (optional reference value)
- `toughness_class` (string): Relative toughness descriptor (e.g., `tough`, `medium`, `hard`)

### application
**Type:** Object

Intended operational envelope: material family, operation type, and constraints.

- `workpiece_material_groups` (array): ISO workpiece groups the insert targets (e.g., `[P1, P2, P3]`)
- `primary_operation` (string): `turning`, `boring`, `facing`, `grooving`, `threading`, `milling`, `drilling`
- `secondary_operations` (array, optional)
- `feed_range_mm_rev` (object): 
  - `min` (number)
  - `max` (number)
- `depth_of_cut_mm` (object):
  - `min` (number)
  - `max` (number)
- `speed_range_m_min` (object):
  - `min` (number)
  - `max` (number)
- `finish_quality` (string): `roughing`, `semi-finishing`, `finishing`, `precision_finishing`

### cutting_data
**Type:** Object

Recommended speeds and feeds (reference envelope).

- `recommended_speed_m_min` (number): Nominal cutting speed
- `recommended_feed_mm_rev` (number): Nominal feed per revolution (turning) or per tooth (milling)
- `recommended_depth_mm` (number): Typical depth of cut
- `notes` (string): Special cutting fluid, coolant, or speed modifiers
- `data_source` (string): `vendor_datasheet`, `empirical`, `catalog`, `user_reported`

### governance
**Type:** Object

Ingestion workflow and approval state.

- `status` (string): `candidate`, `approved`, `rejected`, `pending_review`
- `approval_required` (boolean): Whether this candidate awaits human review
- `rejection_reason` (string, if rejected): Why the candidate was not added
- `reviewed_by` (string, optional): Reviewer name or ID
- `reviewed_at` (ISO 8601, optional): When the candidate was reviewed
- `traceability_id` (string): Unique identifier for audit trail (e.g., UUID)
- `version` (number): Schema version for this candidate (e.g., 1, 2)

## Example Candidate

```json
{
  "provenance": {
    "source_type": "vendor_feed",
    "source_id": "sandvik-2024-q2",
    "discovered_at": "2024-06-01T14:22:00Z",
    "confidence": 0.92,
    "notes": "Sandvik product launch bulletin, June 2024"
  },
  "product_identity": {
    "iso_code": "CNMG120408-PM",
    "manufacturer_code": "GC4325",
    "manufacturer_name": "Sandvik Coromant",
    "common_aliases": []
  },
  "geometry": {
    "shape_code": "C",
    "insert_type": "negative",
    "relief_angle": "7°",
    "clearance_angle": 7,
    "nose_radius_microns": 800,
    "cutting_edges": 8,
    "lead_angle": 0,
    "chipbreaker_geometry": "PM"
  },
  "material": {
    "iso_material_group": "P",
    "base_material": "cemented carbide",
    "coating_type": "CVD",
    "coating_layers": ["Ti(C,N)", "Al₂O₃", "TiN"],
    "hardness_hv": 2700,
    "toughness_class": "medium"
  },
  "application": {
    "workpiece_material_groups": ["P1", "P2", "P3"],
    "primary_operation": "turning",
    "secondary_operations": ["facing"],
    "feed_range_mm_rev": { "min": 0.2, "max": 0.8 },
    "depth_of_cut_mm": { "min": 1, "max": 4 },
    "speed_range_m_min": { "min": 200, "max": 500 },
    "finish_quality": "semi-finishing"
  },
  "cutting_data": {
    "recommended_speed_m_min": 350,
    "recommended_feed_mm_rev": 0.5,
    "recommended_depth_mm": 2.5,
    "notes": "Flood coolant recommended. Reduce speed 10% for interrupted cuts.",
    "data_source": "vendor_datasheet"
  },
  "governance": {
    "status": "candidate",
    "approval_required": true,
    "reviewed_by": null,
    "reviewed_at": null,
    "traceability_id": "ingn-20240601-cnmg120408pm-001",
    "version": 1
  }
}
```

## Notes

- All fields in each section should be included; use `null` if unknown.
- `iso_code` and `manufacturer_name` are minimally required to identify a candidate.
- Candidates with `confidence < 0.5` should be flagged for manual review before ingestion.
- Geometry and material fields enable cross-reference matching and equivalence ranking.
- Application and cutting_data fields drive the recommendation engine and safe-speed lookups.
