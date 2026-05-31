# M.A. Ford Reamer 272 Parser v2 Verification

- Source file: MAFord_2018_Master_Catalog_Reamers.pdf
- Pages processed: 12/387, 20/395
- Total rows extracted: 90
- Total rows rejected: 2
- Output JSON: /Users/muratonder/Desktop/ToolAdvisor/ingestion/output/pilots/maford-reamer-272-v2-verification/rows.json

## Per-Page Results

### PDF Page 12 / Catalog Page 387

- Rows extracted: 46
- Rows rejected: 1
- First data row Y: 662.8
- Header row Y: 676.2

| Field | Present |
|---|---:|
| tool_no | 46/46 |
| edp | 46/46 |
| d1_diameter_inch | 1/46 |
| d1_diameter_wire | 14/46 |
| d1_diameter_mm | 9/46 |
| d1_diameter_decimal | 46/46 |
| d2_shank_inch | 46/46 |
| d2_shank_mm | 9/46 |
| l1_oal_inch | 37/46 |
| l1_oal_mm | 9/46 |
| l2_flute_length_inch | 37/46 |
| l2_flute_length_mm | 9/46 |
| flutes | 46/46 |

| Tool No. | EDP | D1 Inch | D1 Wire | D1 mm | D1 Decimal | D2 Inch | D2 mm | L1 Inch | L1 mm | L2 Inch | L2 mm | Flutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---:|
| 27202920 | 01081 |  | 69 |  | 0.0292 | 0.0292 |  | 1-1/2 |  | 1/4 |  | 4 |
| 27202950 | 01085 |  |  | 0.75 | 0.0295 | 0.0295 | 0.75 |  | 38 |  | 6.5 | 4 |
| 27202951 | 03620 |  |  |  | 0.0295 | 0.0295 |  | 1-1/2 |  | 1/4 |  | 4 |
| 27203000 | 03022 |  |  |  | 0.0300 | 0.0300 |  | 1-1/2 |  | 1/4 |  | 4 |
| 27203050 | 03023 |  |  |  | 0.0305 | 0.0305 |  | 1-1/2 |  | 1/4 |  | 4 |
| 27203100 | 01089 |  | 68 |  | 0.0310 | 0.0310 |  | 1-1/2 |  | 1/4 |  | 4 |
| 27203120 | 01093 | 1/32 |  |  | 0.0312 | 0.0312 |  | 1-1/2 |  | 1/4 |  | 4 |
| 27203150 | 01097 |  |  | 0.80 | 0.0315 | 0.0315 | 0.80 |  | 38 |  | 6.5 | 4 |
| 27203151 | 03621 |  |  |  | 0.0315 | 0.0315 |  | 1-1/2 |  | 1/4 |  | 4 |
| 27203200 | 01101 |  | 67 |  | 0.0320 | 0.0320 |  | 1-1/2 |  | 1/4 |  | 4 |

### PDF Page 20 / Catalog Page 395

- Rows extracted: 44
- Rows rejected: 1
- First data row Y: 662.8
- Header row Y: 676.2

| Field | Present |
|---|---:|
| tool_no | 44/44 |
| edp | 44/44 |
| d1_diameter_inch | 1/44 |
| d1_diameter_wire | 4/44 |
| d1_diameter_mm | 9/44 |
| d1_diameter_decimal | 44/44 |
| d2_shank_inch | 44/44 |
| d2_shank_mm | 9/44 |
| l1_oal_inch | 35/44 |
| l1_oal_mm | 9/44 |
| l2_flute_length_inch | 35/44 |
| l2_flute_length_mm | 9/44 |
| flutes | 44/44 |

| Tool No. | EDP | D1 Inch | D1 Wire | D1 mm | D1 Decimal | D2 Inch | D2 mm | L1 Inch | L1 mm | L2 Inch | L2 mm | Flutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---:|
| 27216300 | 03227 |  |  |  | 0.1630 | 0.1580 |  | 2-3/4 |  | 7/8 |  | 4 |
| 27216340 | 01561 |  |  | 4.15 | 0.1634 | 0.1580 | 4.01 |  | 70 |  | 22.0 | 4 |
| 27216350 | 03228 |  |  |  | 0.1635 | 0.1580 |  | 2-3/4 |  | 7/8 |  | 4 |
| 27216400 | 03229 |  |  |  | 0.1640 | 0.1580 |  | 2-3/4 |  | 7/8 |  | 4 |
| 27216450 | 03230 |  |  |  | 0.1645 | 0.1580 |  | 2-3/4 |  | 7/8 |  | 4 |
| 27216500 | 03231 |  |  |  | 0.1650 | 0.1580 |  | 2-3/4 |  | 7/8 |  | 4 |
| 27216540 | 01565 |  |  | 4.20 | 0.1654 | 0.1580 | 4.01 |  | 70 |  | 22.0 | 4 |
| 27216550 | 03232 |  |  |  | 0.1655 | 0.1580 |  | 2-3/4 |  | 7/8 |  | 4 |
| 27216600 | 01569 |  | 19 |  | 0.1660 | 0.1580 |  | 2-3/4 |  | 7/8 |  | 4 |
| 27216650 | 03233 |  |  |  | 0.1665 | 0.1580 |  | 2-3/4 |  | 7/8 |  | 4 |

## Layout Differences Found

- PDF page 12 and 20 are even-page continuation layouts with first data row around Y=662.8.
- PDF page 11 used in v1 had first data row around Y=621.8 because it includes the larger left-side product title block.
- Column x-positions remain stable across the checked pages, so x-position bucket parsing still works.
- Footer position/text differs by odd/even page, but footer rows are ignored by Tool No./EDP detection.

## Scaling Assessment

The parser appears safe to scale to catalog pages 386-407 after one more check on the final Series 272 page. The core table geometry held on page 12 and later page 20, including Tool No., EDP, decimal diameter, shank, length, and flute columns. Scaling should still keep per-page reports and stop on pages where Tool No./EDP completeness drops.

## Limitations

- Verification only processed PDF pages 12 and 20.
- Missing inch/wire/mm fields remain null and are not guessed.
- No numeric normalization, final candidate creation, AI, or PRODUCT_DB merge is performed.
