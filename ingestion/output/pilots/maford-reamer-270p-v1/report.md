# M.A. Ford Reamer 270P Parser v1

- Source file: MAFord_2018_Master_Catalog_Reamers.pdf
- PDF page processed: 9
- Catalog page: 384
- Rows extracted: 43
- Rows rejected: 3
- Output JSON: /Users/muratonder/Desktop/ToolAdvisor/ingestion/output/pilots/maford-reamer-270p-v1/rows.json

## Field Completeness

| Field | Present |
|---|---:|
| d1_diameter_inch_range | 43/43 |
| d1_diameter_mm_range | 43/43 |
| d2_shank_inch | 43/43 |
| d2_shank_mm | 43/43 |
| l1_oal_inch | 43/43 |
| l1_oal_mm | 43/43 |
| l2_flute_length_inch | 43/43 |
| l2_flute_length_mm | 43/43 |
| flutes | 43/43 |

## 10 Example Rows

| D1 inch | D1 mm | D2 inch | D2 mm | L1 inch | L1 mm | L2 inch | L2 mm | Flutes |
|---|---|---|---|---|---|---|---|---:|
| .0434-.0519 | 01.10-1.31 | .043 | 1.09 | 1-1/2 | 38 | 3/8 | 9.5 | 4 |
| .0520-.0590 | 01.32-1.49 | .046 | 1.17 | 1-1/2 | 38 | 3/8 | 9.5 | 4 |
| .0591-.0660 | 01.50-1.67 | .058 | 1.47 | 1-1/2 | 38 | 3/8 | 9.5 | 4 |
| .0661-.0740 | 01.68-1.87 | .065 | 1.65 | 1-3/4 | 44 | 1/2 | 12.5 | 4 |
| .0741-.0810 | 01.88-2.05 | .073 | 1.85 | 1-3/4 | 44 | 1/2 | 12.5 | 4 |
| .0811-.0890 | 02.06-2.26 | .080 | 2.03 | 2 | 51 | 1/2 | 12.5 | 4 |
| .0891-.0970 | 02.27-2.46 | .088 | 2.24 | 2 | 51 | 1/2 | 12.5 | 4 |
| .0971-.1050 | 02.47-2.66 | .096 | 2.44 | 2-1/4 | 57 | 5/8 | 16 | 4 |
| .1051-.1130 | 02.67-2.87 | .104 | 2.64 | 2-1/4 | 57 | 5/8 | 16 | 4 |
| .1131-.1210 | 02.88-3.07 | .112 | 2.84 | 2-1/4 | 57 | 5/8 | 16 | 4 |

## Rejected Rows

| Y | Raw row | Reason |
|---:|---|---|
| 604.8 | Series 270P / D2 / L1 / L2 | not_270p_data_row |
| 593.3 | D1 Diameter / Shank / OAL / Flute Length | not_270p_data_row |
| 582.0 | Inch / mm / Inch / mm / Inch / mm / Inch / mm / Flutes | not_270p_data_row |

## Limitations

- This parser only reads uploaded PDF page 9 / catalog page 384.
- It uses page-specific x-position filtering and row patterns, not a general M.A. Ford parser.
- It preserves inch fractions as strings and does not normalize numeric units.
- It does not create final ToolAdvisor candidates and does not touch PRODUCT_DB.

## Scaling Assessment

This parser is likely scalable to Series 270 / 270L / 272 if those pages preserve the same nine-column geometry. The next step should test one page from each series and parameterize the series/product metadata.
