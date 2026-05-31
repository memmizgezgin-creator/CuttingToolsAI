# M.A. Ford Series 272 Boundary Check

- Page selected: PDF page 32 / catalog page 407
- Why selected: catalog page 407 is the last page in the expected Series 272 product table range; catalog page 408 switches to troubleshooting/technical content.
- Rows extracted: 14
- Rows rejected: 1
- Layout status: stable
- safe_to_scale: true
- Recommended full range if safe: catalog pages 386-407 / PDF pages 11-32
- Output JSON: /Users/muratonder/Desktop/ToolAdvisor/ingestion/output/pilots/maford-reamer-272-boundary-check/rows.json

## Field Completeness

| Field | Present |
|---|---:|
| tool_no | 14/14 |
| edp | 14/14 |
| d1_diameter_inch | 10/14 |
| d1_diameter_wire | 0/14 |
| d1_diameter_mm | 4/14 |
| d1_diameter_decimal | 14/14 |
| d2_shank_inch | 14/14 |
| d2_shank_mm | 4/14 |
| l1_oal_inch | 0/14 |
| l1_oal_mm | 14/14 |
| l2_flute_length_inch | 10/14 |
| l2_flute_length_mm | 4/14 |
| flutes | 14/14 |

## 10 Example Rows

| Tool No. | EDP | D1 Decimal | D2 Inch | L1 Inch | L2 Inch | Flutes |
|---|---|---|---|---|---|---:|
| 27250000 | 02007 | 0.5000 | 0.4700 |  | 1-1/2 | 6 |
| 27250100 | 03618 | 0.5010 | 0.4700 |  | 1-1/2 | 6 |
| 27251180 | 02009 | 0.5118 | 0.5050 |  |  | 6 |
| 27251560 | 02011 | 0.5156 | 0.5050 |  | 1-1/2 | 6 |
| 27253120 | 02013 | 0.5312 | 0.5050 |  | 1-1/2 | 6 |
| 27254690 | 02015 | 0.5469 | 0.5350 |  | 1-1/2 | 6 |
| 27255120 | 02017 | 0.5512 | 0.5350 |  |  | 6 |
| 27256250 | 02019 | 0.5625 | 0.5350 |  | 1-1/2 | 6 |
| 27257810 | 02021 | 0.5781 | 0.5650 |  | 1-3/4 | 6 |
| 27259050 | 02023 | 0.5905 | 0.5650 |  |  | 6 |

## Notes

- This check only processed the selected boundary page.
- Missing optional inch/wire/mm fields remain null.
- No final ToolAdvisor candidates, AI, or PRODUCT_DB merge was performed.
