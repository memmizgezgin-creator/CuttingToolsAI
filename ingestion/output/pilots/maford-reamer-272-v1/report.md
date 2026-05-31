# M.A. Ford Reamer 272 Parser v1

- Source file: MAFord_2018_Master_Catalog_Reamers.pdf
- PDF page processed: 11
- Catalog page: 386
- Rows extracted: 42
- Rows rejected: 1
- Output JSON: /Users/muratonder/Desktop/ToolAdvisor/ingestion/output/pilots/maford-reamer-272-v1/rows.json

## Field Completeness

| Field | Present |
|---|---:|
| tool_no | 42/42 |
| edp | 42/42 |
| d1_diameter_inch | 1/42 |
| d1_diameter_wire | 11/42 |
| d1_diameter_mm | 8/42 |
| d1_diameter_decimal | 42/42 |
| d2_shank_inch | 42/42 |
| d2_shank_mm | 8/42 |
| l1_oal_inch | 34/42 |
| l1_oal_mm | 8/42 |
| l2_flute_length_inch | 34/42 |
| l2_flute_length_mm | 8/42 |
| flutes | 42/42 |

## 10 Example Rows

| Tool No. | EDP | D1 Inch | D1 Wire | D1 mm | D1 Decimal | D2 Inch | D2 mm | L1 Inch | L1 mm | L2 Inch | L2 mm | Flutes |
|---|---|---|---|---|---|---|---|---|---|---|---|---:|
| 27201300 | 03000 |  |  |  | 0.0130 | 0.0130 |  | 1-1/2 |  | 3/16 |  | 4 |
| 27201350 | 01001 |  | 80 |  | 0.0135 | 0.0135 |  | 1-1/2 |  | 3/16 |  | 4 |
| 27201380 | 01005 |  |  | 0.35 | 0.0138 | 0.0138 | 0.35 |  | 38 |  | 5.0 | 4 |
| 27201400 | 03001 |  |  |  | 0.0140 | 0.0140 |  | 1-1/2 |  | 3/16 |  | 4 |
| 27201450 | 01009 |  | 79 |  | 0.0145 | 0.0145 |  | 1-1/2 |  | 3/16 |  | 4 |
| 27201500 | 03002 |  |  |  | 0.0150 | 0.0150 |  | 1-1/2 |  | 3/16 |  | 4 |
| 27201550 | 03003 |  |  |  | 0.0155 | 0.0155 |  | 1-1/2 |  | 3/16 |  | 4 |
| 27201560 | 01013 | 1/64 |  |  | 0.0156 | 0.0156 |  | 1-1/2 |  | 3/16 |  | 4 |
| 27201570 | 01017 |  |  | 0.40 | 0.0157 | 0.0157 | 0.40 |  | 38 |  | 5.0 | 4 |
| 27201600 | 01021 |  | 78 |  | 0.0160 | 0.0160 |  | 1-1/2 |  | 3/16 |  | 4 |

## Rejected Rows

| Y | Raw row | Reason |
|---:|---|---|
| 635.2 | Tool No. / EDP / Inch / Wire / mm / Decimal / Inch / mm / Inch / mm / Inch / mm / Flutes | not_272_data_row |

## Limitations

- This parser only reads PDF page 11 / catalog page 386.
- Missing inch, wire, metric, or mm length values are preserved as null; no values are guessed.
- It uses page-specific x-position buckets and is not yet a general Series 272 parser.
- It does not create final ToolAdvisor candidates and does not touch PRODUCT_DB.

## Scaling Assessment

This parser can likely scale to catalog pages 386-407 if the Tool No./EDP table geometry remains stable. Before scaling, test page 12 and the final Series 272 page to confirm continuation headers, blank columns, and footer text behave the same way.
