#!/usr/bin/env node

/**
 * Create 20-record non-insert adapted preview for M.A. Ford Series 272
 *
 * Transforms validated candidates into non-insert schema shape.
 * Does NOT modify PRODUCT_DB or frontend.
 * Output remains a preview artifact for review.
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = '/Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-product-candidates.json';
const PREVIEW_IDS = [
  "preview-maford-272-001-27201300-03000",
  "preview-maford-272-002-27201350-01001",
  "preview-maford-272-003-27201380-01005",
  "preview-maford-272-004-27201400-03001",
  "preview-maford-272-005-27201450-01009",
  "preview-maford-272-006-27219050-03276",
  "preview-maford-272-007-27219090-01653",
  "preview-maford-272-008-27219100-01657",
  "preview-maford-272-009-27219150-03277",
  "preview-maford-272-010-27219200-03278",
  "preview-maford-272-011-27259050-02023",
  "preview-maford-272-012-27259380-02025",
  "preview-maford-272-013-27260940-02027",
  "preview-maford-272-014-27262500-02029",
  "preview-maford-272-015-27262990-02031",
  "preview-maford-272-016-27201570-01017",
  "preview-maford-272-017-27201770-01025",
  "preview-maford-272-018-27201970-01033",
  "preview-maford-272-019-27202170-01045",
  "preview-maford-272-020-27201500-03002"
];

function extractToolNoAndEdpFromId(previewId) {
  // preview-maford-272-NNN-TOOLNO-EDP
  // e.g., preview-maford-272-001-27201300-03000
  const parts = previewId.split('-');
  if (parts.length >= 6) {
    return {
      toolNo: parts[4], // parts[0]=preview, [1]=maford, [2]=272, [3]=NNN, [4]=TOOLNO, [5]=EDP
      edp: parts[5]
    };
  }
  return null;
}

function detectUnitSystem(candidate) {
  const dims = candidate.normalized_dimensional_fields;

  const hasInch =
    dims.diameter?.d1_diameter_inch_fraction ||
    dims.diameter?.d1_diameter_decimal_inch?.value ||
    dims.shank_diameter?.inch?.value ||
    dims.overall_length?.inch?.value ||
    dims.flute_length?.inch?.value;

  const hasMM =
    dims.diameter?.d1_diameter_mm?.value ||
    dims.shank_diameter?.mm?.value ||
    dims.overall_length?.mm?.value ||
    dims.flute_length?.mm?.value;

  if (hasInch && hasMM) return "mixed";
  if (hasInch) return "inch";
  if (hasMM) return "metric";
  return "unknown";
}

function buildDimensionsBlock(candidate) {
  const dims = candidate.normalized_dimensional_fields;

  return {
    D1: {
      inch_fraction: dims.diameter?.d1_diameter_inch_fraction?.value || null,
      wire: dims.diameter?.d1_diameter_wire?.value || null,
      mm: dims.diameter?.d1_diameter_mm?.value || null,
      decimal_inch: dims.diameter?.d1_diameter_decimal_inch?.value || null,
      source_fields: [
        dims.diameter?.d1_diameter_inch_fraction?.source_field,
        dims.diameter?.d1_diameter_wire?.source_field,
        dims.diameter?.d1_diameter_mm?.source_field,
        dims.diameter?.d1_diameter_decimal_inch?.source_field
      ].filter(Boolean)
    },
    D2: {
      inch: dims.shank_diameter?.inch?.value || null,
      mm: dims.shank_diameter?.mm?.value || null,
      source_fields: [
        dims.shank_diameter?.inch?.source_field,
        dims.shank_diameter?.mm?.source_field
      ].filter(Boolean)
    },
    L1: {
      inch: dims.overall_length?.inch?.value || null,
      mm: dims.overall_length?.mm?.value || null,
      source_fields: [
        dims.overall_length?.inch?.source_field,
        dims.overall_length?.mm?.source_field
      ].filter(Boolean)
    },
    L2: {
      inch: dims.flute_length?.inch?.value || null,
      mm: dims.flute_length?.mm?.value || null,
      source_fields: [
        dims.flute_length?.inch?.source_field,
        dims.flute_length?.mm?.source_field
      ].filter(Boolean)
    },
    flutes: parseInt(dims.flutes?.value) || null,
    lead_angle: dims.lead_angle ? {
      value: dims.lead_angle.value,
      unit: dims.lead_angle.unit || "degree"
    } : null,
    cutting_direction: dims.cutting_direction || null,
    unit_system: detectUnitSystem(candidate),
    raw_mixed_units: candidate.raw_fields?.mixed_unit_note || null
  };
}

function buildOptionalFields() {
  return {
    iso_code: null,
    grade: null,
    coating: null,
    material_suitability: "review_required",
    cutting_data: null
  };
}

function buildDisplayRules() {
  return {
    identity_fallback: "product_code/tool_no",
    missing_iso_behavior: "show_tool_no_as_primary_code",
    missing_grade_behavior: "show_not_specified_in_source",
    missing_coating_behavior: "show_not_specified_in_source",
    source_traceability_required: true
  };
}

function adaptCandidate(previewId, candidate, index) {
  return {
    id: previewId,
    brand: candidate.brand,
    category: "reaming",
    product_family: candidate.product_family,
    product_type: candidate.product_type,
    series: candidate.series,
    product_code: candidate.tool_no,
    manufacturer_order_code: candidate.tool_no,
    tool_no: candidate.tool_no,
    edp: candidate.edp,
    display_identity: `${candidate.brand} Series ${candidate.series} ${candidate.product_type} ${candidate.tool_no}`,
    dimensions: buildDimensionsBlock(candidate),
    optional_fields: buildOptionalFields(),
    source_traceability: {
      source_pdf: candidate.source_traceability.source_pdf,
      pdf_page: candidate.source_traceability.pdf_page,
      catalog_page: candidate.source_traceability.catalog_page,
      row_index: candidate.source_traceability.row_index,
      parser_name: candidate.source_traceability.parser_name,
      parser_version: candidate.source_traceability.parser_version,
      raw_row: candidate.source_traceability.raw_row
    },
    confidence: {
      level: "review_high",
      score: 90,
      basis: [
        "format_specific_parser_validated_on_manual_sample",
        "automated_validation_passed_all_924_records",
        "source_traceability_preserved",
        "not_human_approved_for_merge"
      ],
      safe_for_direct_PRODUCT_DB_merge: false
    },
    warnings: candidate.warnings || [],
    frontend_display_rules: buildDisplayRules(),
    merge_status: "preview_only_not_merged"
  };
}

function main() {
  console.log('Reading candidates file...');
  const candidatesData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

  const candidatesByToolNo = {};
  candidatesData.candidates.forEach(c => {
    const key = `${c.tool_no}-${c.edp}`;
    candidatesByToolNo[key] = c;
  });

  console.log(`Loaded ${candidatesData.candidates.length} candidates`);

  const adaptedRecords = [];
  const notFound = [];

  PREVIEW_IDS.forEach((previewId, index) => {
    const parsed = extractToolNoAndEdpFromId(previewId);
    if (!parsed) {
      notFound.push({ previewId, reason: "could not parse ID" });
      return;
    }

    const key = `${parsed.toolNo}-${parsed.edp}`;
    const candidate = candidatesByToolNo[key];

    if (!candidate) {
      notFound.push({ previewId, toolNo: parsed.toolNo, edp: parsed.edp });
    } else {
      const adapted = adaptCandidate(previewId, candidate, index + 1);
      adaptedRecords.push(adapted);
    }
  });

  if (notFound.length > 0) {
    console.error(`⚠ Warning: ${notFound.length} records not found in candidates:`);
    notFound.forEach(nf => {
      console.error(`  - ${nf.previewId} (${nf.toolNo}-${nf.edp})`);
    });
  }

  const output = {
    source_input: INPUT_FILE,
    adapter_schema: "/Users/muratonder/Desktop/ToolAdvisor/research/ingestion/non-insert-schema-adapter-plan.md",
    generated_at: new Date().toISOString(),
    restrictions: {
      product_db_merge: false,
      frontend_changes: false,
      ai_used: false,
      series_scope: "272"
    },
    preview_record_count: adaptedRecords.length,
    safe_for_direct_PRODUCT_DB_merge: false,
    product_db_untouched: true,
    frontend_files_untouched: true,
    warning_counts: {
      coating_or_surface_not_present_in_source_row: adaptedRecords.length,
      material_grade_not_present_in_source_row: adaptedRecords.length,
      mixed_unit_fields_preserved_without_conversion: adaptedRecords.filter(r =>
        r.dimensions.unit_system === "mixed"
      ).length
    },
    records: adaptedRecords
  };

  const outputPath = '/Users/muratonder/Desktop/ToolAdvisor/research/ingestion/maford-series-272-non-insert-adapted-preview-20.json';
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`✅ Adapted ${adaptedRecords.length} records`);
  console.log(`📄 Output: ${outputPath}`);
}

main();
