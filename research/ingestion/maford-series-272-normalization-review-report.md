# M.A. Ford Series 272 Normalization Review

- Input file path: /Users/muratonder/Desktop/ToolAdvisor/ingestion/output/pilots/maford-reamer-272-full-range-v1/rows.json
- Output file path: /Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-normalization-review.json
- Source PDF: /Users/muratonder/Desktop/MAFord_2018_Master_Catalog_Reamers.pdf
- Series: 272
- Total records reviewed: 924
- Records normalized cleanly: 924
- Records with warnings: 924
- Safe for manual review: true
- Safe for PRODUCT_DB merge: false

This file is a review-stage normalization draft only. It is outside PRODUCT_DB and must not be treated as approved production data.

`normalized_cleanly` means the core source fields were mapped without blocking normalization warnings. Non-blocking warnings are still retained for missing source fields and preserved mixed units.

## Fields Successfully Normalized

| Field | Present |
| --- | --- |
| tool_no | 924/924 |
| edp | 924/924 |
| diameter_decimal_inch | 924/924 |
| diameter_mm | 139/924 |
| diameter_wire | 106/924 |
| shank_diameter_inch | 924/924 |
| shank_diameter_mm | 139/924 |
| overall_length_inch | 785/924 |
| overall_length_mm | 139/924 |
| flute_length_inch | 785/924 |
| flute_length_mm | 139/924 |
| flutes | 924/924 |

## Fields Not Normalized

| Field | Present |
| --- | --- |
| coating_or_surface | 0/924 |
| material_grade_if_present | 0/924 |

These fields are left null because they are not present in the extracted Series 272 table rows.

## Warning Types

| Warning | Count |
| --- | --- |
| coating_or_surface_not_present_in_source_row | 924 |
| material_grade_not_present_in_source_row | 924 |
| mixed_unit_fields_preserved_without_conversion | 139 |

## Clean Record Examples

```json
[
  {
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 1,
    "tool_no": "27201300",
    "edp": "03000",
    "diameter": {
      "d1_diameter_inch": null,
      "d1_diameter_wire": null,
      "d1_diameter_mm": null,
      "d1_diameter_decimal_inch": {
        "value": "0.0130",
        "unit": "inch_decimal",
        "source_field": "d1_diameter_decimal",
        "conversion_applied": false
      }
    },
    "shank_diameter": {
      "inch": {
        "value": "0.0130",
        "unit": "inch",
        "source_field": "d2_shank_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "overall_length": {
      "inch": {
        "value": "1-1/2",
        "unit": "inch",
        "source_field": "l1_oal_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flute_length": {
      "inch": {
        "value": "3/16",
        "unit": "inch",
        "source_field": "l2_flute_length_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flutes": {
      "value": "4",
      "source_field": "flutes",
      "conversion_applied": false
    },
    "unit_system": "inch",
    "normalization_status": "normalized_cleanly",
    "normalization_warnings": [
      "coating_or_surface_not_present_in_source_row",
      "material_grade_not_present_in_source_row"
    ]
  },
  {
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 2,
    "tool_no": "27201350",
    "edp": "01001",
    "diameter": {
      "d1_diameter_inch": null,
      "d1_diameter_wire": {
        "value": "80",
        "unit": "wire_size",
        "source_field": "d1_diameter_wire",
        "conversion_applied": false
      },
      "d1_diameter_mm": null,
      "d1_diameter_decimal_inch": {
        "value": "0.0135",
        "unit": "inch_decimal",
        "source_field": "d1_diameter_decimal",
        "conversion_applied": false
      }
    },
    "shank_diameter": {
      "inch": {
        "value": "0.0135",
        "unit": "inch",
        "source_field": "d2_shank_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "overall_length": {
      "inch": {
        "value": "1-1/2",
        "unit": "inch",
        "source_field": "l1_oal_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flute_length": {
      "inch": {
        "value": "3/16",
        "unit": "inch",
        "source_field": "l2_flute_length_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flutes": {
      "value": "4",
      "source_field": "flutes",
      "conversion_applied": false
    },
    "unit_system": "inch",
    "normalization_status": "normalized_cleanly",
    "normalization_warnings": [
      "coating_or_surface_not_present_in_source_row",
      "material_grade_not_present_in_source_row"
    ]
  },
  {
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 3,
    "tool_no": "27201380",
    "edp": "01005",
    "diameter": {
      "d1_diameter_inch": null,
      "d1_diameter_wire": null,
      "d1_diameter_mm": {
        "value": "0.35",
        "unit": "mm",
        "source_field": "d1_diameter_mm",
        "conversion_applied": false
      },
      "d1_diameter_decimal_inch": {
        "value": "0.0138",
        "unit": "inch_decimal",
        "source_field": "d1_diameter_decimal",
        "conversion_applied": false
      }
    },
    "shank_diameter": {
      "inch": {
        "value": "0.0138",
        "unit": "inch",
        "source_field": "d2_shank_inch",
        "conversion_applied": false
      },
      "mm": {
        "value": "0.35",
        "unit": "mm",
        "source_field": "d2_shank_mm",
        "conversion_applied": false
      }
    },
    "overall_length": {
      "inch": null,
      "mm": {
        "value": "38",
        "unit": "mm",
        "source_field": "l1_oal_mm",
        "conversion_applied": false
      }
    },
    "flute_length": {
      "inch": null,
      "mm": {
        "value": "5.0",
        "unit": "mm",
        "source_field": "l2_flute_length_mm",
        "conversion_applied": false
      }
    },
    "flutes": {
      "value": "4",
      "source_field": "flutes",
      "conversion_applied": false
    },
    "unit_system": "mixed",
    "normalization_status": "normalized_cleanly",
    "normalization_warnings": [
      "coating_or_surface_not_present_in_source_row",
      "material_grade_not_present_in_source_row",
      "mixed_unit_fields_preserved_without_conversion"
    ]
  },
  {
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 4,
    "tool_no": "27201400",
    "edp": "03001",
    "diameter": {
      "d1_diameter_inch": null,
      "d1_diameter_wire": null,
      "d1_diameter_mm": null,
      "d1_diameter_decimal_inch": {
        "value": "0.0140",
        "unit": "inch_decimal",
        "source_field": "d1_diameter_decimal",
        "conversion_applied": false
      }
    },
    "shank_diameter": {
      "inch": {
        "value": "0.0140",
        "unit": "inch",
        "source_field": "d2_shank_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "overall_length": {
      "inch": {
        "value": "1-1/2",
        "unit": "inch",
        "source_field": "l1_oal_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flute_length": {
      "inch": {
        "value": "3/16",
        "unit": "inch",
        "source_field": "l2_flute_length_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flutes": {
      "value": "4",
      "source_field": "flutes",
      "conversion_applied": false
    },
    "unit_system": "inch",
    "normalization_status": "normalized_cleanly",
    "normalization_warnings": [
      "coating_or_surface_not_present_in_source_row",
      "material_grade_not_present_in_source_row"
    ]
  },
  {
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 5,
    "tool_no": "27201450",
    "edp": "01009",
    "diameter": {
      "d1_diameter_inch": null,
      "d1_diameter_wire": {
        "value": "79",
        "unit": "wire_size",
        "source_field": "d1_diameter_wire",
        "conversion_applied": false
      },
      "d1_diameter_mm": null,
      "d1_diameter_decimal_inch": {
        "value": "0.0145",
        "unit": "inch_decimal",
        "source_field": "d1_diameter_decimal",
        "conversion_applied": false
      }
    },
    "shank_diameter": {
      "inch": {
        "value": "0.0145",
        "unit": "inch",
        "source_field": "d2_shank_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "overall_length": {
      "inch": {
        "value": "1-1/2",
        "unit": "inch",
        "source_field": "l1_oal_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flute_length": {
      "inch": {
        "value": "3/16",
        "unit": "inch",
        "source_field": "l2_flute_length_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flutes": {
      "value": "4",
      "source_field": "flutes",
      "conversion_applied": false
    },
    "unit_system": "inch",
    "normalization_status": "normalized_cleanly",
    "normalization_warnings": [
      "coating_or_surface_not_present_in_source_row",
      "material_grade_not_present_in_source_row"
    ]
  }
]
```

## Warning Record Examples

```json
[
  {
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 1,
    "tool_no": "27201300",
    "edp": "03000",
    "diameter": {
      "d1_diameter_inch": null,
      "d1_diameter_wire": null,
      "d1_diameter_mm": null,
      "d1_diameter_decimal_inch": {
        "value": "0.0130",
        "unit": "inch_decimal",
        "source_field": "d1_diameter_decimal",
        "conversion_applied": false
      }
    },
    "shank_diameter": {
      "inch": {
        "value": "0.0130",
        "unit": "inch",
        "source_field": "d2_shank_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "overall_length": {
      "inch": {
        "value": "1-1/2",
        "unit": "inch",
        "source_field": "l1_oal_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flute_length": {
      "inch": {
        "value": "3/16",
        "unit": "inch",
        "source_field": "l2_flute_length_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flutes": {
      "value": "4",
      "source_field": "flutes",
      "conversion_applied": false
    },
    "unit_system": "inch",
    "normalization_status": "normalized_cleanly",
    "normalization_warnings": [
      "coating_or_surface_not_present_in_source_row",
      "material_grade_not_present_in_source_row"
    ]
  },
  {
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 2,
    "tool_no": "27201350",
    "edp": "01001",
    "diameter": {
      "d1_diameter_inch": null,
      "d1_diameter_wire": {
        "value": "80",
        "unit": "wire_size",
        "source_field": "d1_diameter_wire",
        "conversion_applied": false
      },
      "d1_diameter_mm": null,
      "d1_diameter_decimal_inch": {
        "value": "0.0135",
        "unit": "inch_decimal",
        "source_field": "d1_diameter_decimal",
        "conversion_applied": false
      }
    },
    "shank_diameter": {
      "inch": {
        "value": "0.0135",
        "unit": "inch",
        "source_field": "d2_shank_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "overall_length": {
      "inch": {
        "value": "1-1/2",
        "unit": "inch",
        "source_field": "l1_oal_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flute_length": {
      "inch": {
        "value": "3/16",
        "unit": "inch",
        "source_field": "l2_flute_length_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flutes": {
      "value": "4",
      "source_field": "flutes",
      "conversion_applied": false
    },
    "unit_system": "inch",
    "normalization_status": "normalized_cleanly",
    "normalization_warnings": [
      "coating_or_surface_not_present_in_source_row",
      "material_grade_not_present_in_source_row"
    ]
  },
  {
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 3,
    "tool_no": "27201380",
    "edp": "01005",
    "diameter": {
      "d1_diameter_inch": null,
      "d1_diameter_wire": null,
      "d1_diameter_mm": {
        "value": "0.35",
        "unit": "mm",
        "source_field": "d1_diameter_mm",
        "conversion_applied": false
      },
      "d1_diameter_decimal_inch": {
        "value": "0.0138",
        "unit": "inch_decimal",
        "source_field": "d1_diameter_decimal",
        "conversion_applied": false
      }
    },
    "shank_diameter": {
      "inch": {
        "value": "0.0138",
        "unit": "inch",
        "source_field": "d2_shank_inch",
        "conversion_applied": false
      },
      "mm": {
        "value": "0.35",
        "unit": "mm",
        "source_field": "d2_shank_mm",
        "conversion_applied": false
      }
    },
    "overall_length": {
      "inch": null,
      "mm": {
        "value": "38",
        "unit": "mm",
        "source_field": "l1_oal_mm",
        "conversion_applied": false
      }
    },
    "flute_length": {
      "inch": null,
      "mm": {
        "value": "5.0",
        "unit": "mm",
        "source_field": "l2_flute_length_mm",
        "conversion_applied": false
      }
    },
    "flutes": {
      "value": "4",
      "source_field": "flutes",
      "conversion_applied": false
    },
    "unit_system": "mixed",
    "normalization_status": "normalized_cleanly",
    "normalization_warnings": [
      "coating_or_surface_not_present_in_source_row",
      "material_grade_not_present_in_source_row",
      "mixed_unit_fields_preserved_without_conversion"
    ]
  },
  {
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 4,
    "tool_no": "27201400",
    "edp": "03001",
    "diameter": {
      "d1_diameter_inch": null,
      "d1_diameter_wire": null,
      "d1_diameter_mm": null,
      "d1_diameter_decimal_inch": {
        "value": "0.0140",
        "unit": "inch_decimal",
        "source_field": "d1_diameter_decimal",
        "conversion_applied": false
      }
    },
    "shank_diameter": {
      "inch": {
        "value": "0.0140",
        "unit": "inch",
        "source_field": "d2_shank_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "overall_length": {
      "inch": {
        "value": "1-1/2",
        "unit": "inch",
        "source_field": "l1_oal_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flute_length": {
      "inch": {
        "value": "3/16",
        "unit": "inch",
        "source_field": "l2_flute_length_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flutes": {
      "value": "4",
      "source_field": "flutes",
      "conversion_applied": false
    },
    "unit_system": "inch",
    "normalization_status": "normalized_cleanly",
    "normalization_warnings": [
      "coating_or_surface_not_present_in_source_row",
      "material_grade_not_present_in_source_row"
    ]
  },
  {
    "pdf_page": 11,
    "catalog_page": 386,
    "row_index": 5,
    "tool_no": "27201450",
    "edp": "01009",
    "diameter": {
      "d1_diameter_inch": null,
      "d1_diameter_wire": {
        "value": "79",
        "unit": "wire_size",
        "source_field": "d1_diameter_wire",
        "conversion_applied": false
      },
      "d1_diameter_mm": null,
      "d1_diameter_decimal_inch": {
        "value": "0.0145",
        "unit": "inch_decimal",
        "source_field": "d1_diameter_decimal",
        "conversion_applied": false
      }
    },
    "shank_diameter": {
      "inch": {
        "value": "0.0145",
        "unit": "inch",
        "source_field": "d2_shank_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "overall_length": {
      "inch": {
        "value": "1-1/2",
        "unit": "inch",
        "source_field": "l1_oal_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flute_length": {
      "inch": {
        "value": "3/16",
        "unit": "inch",
        "source_field": "l2_flute_length_inch",
        "conversion_applied": false
      },
      "mm": null
    },
    "flutes": {
      "value": "4",
      "source_field": "flutes",
      "conversion_applied": false
    },
    "unit_system": "inch",
    "normalization_status": "normalized_cleanly",
    "normalization_warnings": [
      "coating_or_surface_not_present_in_source_row",
      "material_grade_not_present_in_source_row"
    ]
  }
]
```

## Review Decision

- Safe for manual review: true
- Not safe for PRODUCT_DB merge: true
- Reason: records are traceable and structurally normalized, but coating/material-grade fields are unavailable from this source row set and no human approval has occurred.
