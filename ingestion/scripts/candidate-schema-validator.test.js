const assert = require('assert');
const { buildCandidateValidation } = require('./candidate-schema-validator');

function baseCandidate(overrides = {}) {
  return {
    id: 'test-2026-0001',
    source_file: 'test-catalog.pdf',
    source_page: 12,
    raw_row_ref: 'raw-page-text/test-catalog.pdf#page-12-row-1',
    raw_table_ref: null,
    source_type: 'manufacturer_catalogue',
    source_name: 'Test Catalogue',
    extraction_method: 'pdf-table',
    designation: 'Test Tool 100',
    article_no: '100',
    product_family: 'Test Family',
    brand: 'Test Brand',
    type: 'drill',
    diameter_d1_mm: 10,
    diameter_d2_mm: 10,
    oal_l1_mm: 80,
    flute_length_l2_mm: 40,
    flutes: 2,
    handedness: 'RH',
    shank_type: 'cylindrical',
    tolerance_d1: 'h6',
    din_norm: 'DIN 6537',
    coating: 'TiAlN',
    substrate: 'carbide',
    iso_grade: null,
    insert_shape: null,
    chipbreaker: null,
    iso_materials: ['P'],
    operations: ['drilling'],
    vc_min: 80,
    vc_max: 120,
    feed_min: 0.05,
    feed_max: 0.12,
    cutting_data_by_material: null,
    confidence_score: 90,
    confidence_reason: 'All test values are source-backed.',
    risk_flags: [],
    validation_status: 'extracted_candidate',
    ai_inferred_fields: [],
    last_checked: '2026-06-02',
    source_evidence_fields: [
      'diameter_d1_mm',
      'diameter_d2_mm',
      'oal_l1_mm',
      'flute_length_l2_mm',
      'flutes',
      'handedness',
      'shank_type',
      'tolerance_d1',
      'din_norm',
      'coating',
      'substrate',
      'iso_materials',
      'operations',
      'vc_min',
      'vc_max',
      'feed_min',
      'feed_max'
    ],
    ...overrides
  };
}

{
  const result = buildCandidateValidation(baseCandidate());
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.candidate.validation_status, 'extracted_candidate');
}

{
  const candidate = baseCandidate();
  delete candidate.source_file;
  const result = buildCandidateValidation(candidate);
  assert.strictEqual(result.valid, false);
  assert(result.errors.includes('MISSING_REQUIRED_SOURCE_FILE'));
  assert(result.candidate.risk_flags.includes('MISSING_SOURCE_FILE'));
  assert.strictEqual(result.candidate.validation_status, 'needs_review');
}

{
  const candidate = baseCandidate();
  delete candidate.risk_flags;
  delete candidate.confidence_reason;
  candidate.confidence_score = 101;
  candidate.validation_status = 'candidate';
  const result = buildCandidateValidation(candidate);
  assert.strictEqual(result.valid, false);
  assert(result.errors.includes('MISSING_REQUIRED_RISK_FLAGS'));
  assert(result.errors.includes('MISSING_REQUIRED_CONFIDENCE_REASON'));
  assert(result.errors.includes('INVALID_RISK_FLAGS'));
  assert(result.errors.includes('INVALID_CONFIDENCE_SCORE'));
  assert(result.errors.includes('INVALID_VALIDATION_STATUS'));
  assert.strictEqual(result.candidate.validation_status, 'needs_review');
}

{
  const candidate = baseCandidate();
  delete candidate.coating;
  delete candidate.substrate;
  delete candidate.cutting_data_by_material;
  const result = buildCandidateValidation(candidate);
  assert.strictEqual(result.candidate.coating, null);
  assert.strictEqual(result.candidate.substrate, null);
  assert.strictEqual(result.candidate.cutting_data_by_material, null);
}

{
  const candidate = baseCandidate({
    coating: 'InventedCoat',
    source_evidence_fields: ['diameter_d1_mm']
  });
  const result = buildCandidateValidation(candidate);
  assert.strictEqual(result.valid, false);
  assert(result.errors.includes('UNSUPPORTED_TECHNICAL_VALUE_COATING'));
  assert(result.candidate.risk_flags.includes('UNSUPPORTED_TECHNICAL_VALUE'));
}

{
  const candidate = baseCandidate({
    iso_materials: ['P', 'M'],
    ai_inferred_fields: ['iso_materials'],
    source_evidence_fields: ['diameter_d1_mm']
  });
  const result = buildCandidateValidation(candidate);
  assert.strictEqual(result.errors.includes('UNSUPPORTED_TECHNICAL_VALUE_ISO_MATERIALS'), false);
  assert(result.candidate.ai_inferred_fields.includes('iso_materials'));
  assert.strictEqual(result.candidate.validation_status, 'needs_review');
}

{
  const candidate = baseCandidate({
    ai_inferred_fields: ['not_in_schema']
  });
  const result = buildCandidateValidation(candidate);
  assert.strictEqual(result.valid, false);
  assert(result.errors.includes('INVALID_AI_INFERRED_FIELD_NOT_IN_SCHEMA'));
  assert.strictEqual(result.candidate.validation_status, 'needs_review');
}

{
  const result = buildCandidateValidation(baseCandidate({ confidence_score: 45 }));
  assert.strictEqual(result.valid, true);
  assert(result.candidate.risk_flags.includes('LOW_CONFIDENCE'));
  assert.strictEqual(result.candidate.validation_status, 'needs_review');
}

{
  const result = buildCandidateValidation(baseCandidate({
    diameter_d1_mm: null,
    diameter_d2_mm: null,
    oal_l1_mm: null,
    flute_length_l2_mm: null,
    flutes: null,
    risk_flags: []
  }));
  assert.strictEqual(result.valid, true);
  assert(result.candidate.risk_flags.includes('MISSING_DIMENSIONS'));
  assert.strictEqual(result.candidate.validation_status, 'needs_review');
}

console.log('candidate-schema-validator tests passed');
