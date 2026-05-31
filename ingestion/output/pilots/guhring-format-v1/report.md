# Gühring Format Pilot v1

- Source file: GUE_general-catalogue_EN_compressed.pdf
- Pages processed: 337, 338, 339, 340
- Tables processed: 337, 338, 339, 340
- Rows inspected: 234
- Clean units produced: 572
- Rejected rows: 1
- Output JSON: /Users/muratonder/Desktop/ToolAdvisor/ingestion/output/pilots/guhring-format-v1/clean-units.json

## Confidence Distribution

| Confidence | Units |
|---|---:|
| 90-100 | 572 |
| 75-89 | 0 |
| 60-74 | 0 |
| <60 | 0 |

## Examples of Clean Units

| Page | Table | Row | Article no. | Shank/type | Diameter/size values | Length values | Confidence |
|---:|---:|---:|---|---|---|---|---:|
| 337 | 337 | 2 | 245 11.100 | MK-1 | 11.100 | 175.0, 94.0 | 100 |
| 337 | 337 | 2 | 245 17.250 | MK-2 | 17.250 | 228.0, 130.0 | 100 |
| 337 | 337 | 2 | 654 17.250 | MK-2 | 17.250 | 228.0, 130.0 | 100 |
| 337 | 337 | 3 | 245 11.110 | MK-1 | 11.110, 7/16 | 175.0, 94.0 | 100 |
| 337 | 337 | 3 | 654 11.110 | MK-1 | 11.110, 7/16 | 175.0, 94.0 | 100 |
| 337 | 337 | 3 | 245 17.300 | MK-2 | 17.300 | 228.0, 130.0 | 100 |
| 337 | 337 | 4 | 245 11.200 | MK-1 | 11.200 | 175.0, 94.0 | 100 |
| 337 | 337 | 4 | 654 11.200 | MK-1 | 11.200 | 175.0, 94.0 | 100 |
| 337 | 337 | 4 | 245 17.400 | MK-2 | 17.400 | 228.0, 130.0 | 100 |
| 337 | 337 | 5 | 245 11.250 | MK-1 | 11.250 | 175.0, 94.0 | 100 |
| 337 | 337 | 5 | 654 11.250 | MK-1 | 11.250 | 175.0, 94.0 | 100 |
| 337 | 337 | 5 | 245 17.460 | MK-2 | 17.460, 11/16 | 228.0, 130.0 | 100 |
| 337 | 337 | 6 | 245 11.300 | MK-1 | 11.300 | 175.0, 94.0 | 100 |
| 337 | 337 | 6 | 245 17.500 | MK-2 | 17.500 | 228.0, 130.0 | 100 |
| 337 | 337 | 6 | 654 17.500 | MK-2 | 17.500 | 228.0, 130.0 | 100 |
| 337 | 337 | 7 | 245 11.500 | MK-1 | 11.500 | 175.0, 94.0 | 100 |
| 337 | 337 | 7 | 654 11.500 | MK-1 | 11.500 | 175.0, 94.0 | 100 |
| 337 | 337 | 7 | 245 17.600 | MK-2 | 17.600 | 228.0, 130.0 | 100 |
| 337 | 337 | 8 | 245 11.510 | MK-1 | 11.510, 29/64 | 175.0, 94.0 | 100 |
| 337 | 337 | 8 | 654 11.510 | MK-1 | 11.510, 29/64 | 175.0, 94.0 | 100 |
| 337 | 337 | 8 | 245 17.700 | MK-2 | 17.700 | 228.0, 130.0 | 100 |
| 337 | 337 | 9 | 245 11.600 | MK-1 | 11.600 | 175.0, 94.0 | 100 |
| 337 | 337 | 9 | 245 17.750 | MK-2 | 17.750 | 228.0, 130.0 | 100 |
| 337 | 337 | 9 | 654 17.750 | MK-2 | 17.750 | 228.0, 130.0 | 100 |
| 337 | 337 | 10 | 245 11.700 | MK-1 | 11.700 | 175.0, 94.0 | 100 |
| 337 | 337 | 10 | 245 17.800 | MK-2 | 17.800 | 228.0, 130.0 | 100 |
| 337 | 337 | 11 | 245 11.750 | MK-1 | 11.750 | 175.0, 94.0 | 100 |
| 337 | 337 | 11 | 654 11.750 | MK-1 | 11.750 | 175.0, 94.0 | 100 |
| 337 | 337 | 11 | 245 17.860 | MK-2 | 17.860, 45/64 | 228.0, 130.0 | 100 |
| 337 | 337 | 12 | 245 11.800 | MK-1 | 11.800 | 175.0, 94.0 | 100 |

## Rejected Rows

| Page | Table | Row | Reason | Raw row |
|---:|---:|---:|---|---|
| 338 | 338 | 68 | no recognizable metric group | 38.500 1 33/64 MK-4 / 349.0 / 200.0 / 245 38.500 |

## Remaining Ambiguity

- The pilot infers column groups from repeated metric size starts, not original PDF geometry.
- Article variants such as `245` and `654` for the same diameter are emitted as separate units with the same inherited dimensions.
- The first table header only preserves unit labels, so `length_values` are not yet named as L1/L2.
- Page-level family context such as HSS/HSCO drills appears inside some rows, not as stable metadata for every unit.

## Scaling Assessment

This page format is worth scaling to adjacent pages with the same Morse taper drill layout. It should not be applied globally yet; first add named column fields for this format and verify another 10-page range manually.
