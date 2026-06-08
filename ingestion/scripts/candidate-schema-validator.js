const REQUIRED_FIELDS = [
  'id',
  'source_file',
  'source_page',
  'raw_row_ref',
  'source_type',
  'source_name',
  'extraction_method',
  'confidence_score',
  'confidence_reason',
  'risk_flags',
  'validation_status',
  'ai_inferred_fields',
  'last_checked'
];

const NULLABLE_SCHEMA_FIELDS = [
  'designation',
  'article_no',
  'product_family',
  'brand',
  'type',
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
  'iso_grade',
  'insert_shape',
  'chipbreaker',
  'iso_materials',
  'operations',
  'vc_min',
  'vc_max',
  'feed_min',
  'feed_max',
  'cutting_data_by_material',
  'raw_table_ref'
];

const TECHNICAL_FIELDS = [
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
  'iso_grade',
  'insert_shape',
  'chipbreaker',
  'iso_materials',
  'operations',
  'vc_min',
  'vc_max',
  'feed_min',
  'feed_max',
  'cutting_data_by_material'
];

const CANDIDATE_SCHEMA_FIELDS = new Set([
  ...REQUIRED_FIELDS,
  ...NULLABLE_SCHEMA_FIELDS
]);

const GEOMETRY_FIELDS = [
  'diameter_d1_mm',
  'diameter_d2_mm',
  'oal_l1_mm',
  'flute_length_l2_mm',
  'flutes'
];

const CUTTING_DATA_FIELDS = ['vc_min', 'vc_max', 'feed_min', 'feed_max', 'cutting_data_by_material'];
const ALLOWED_STATUSES = new Set(['extracted_candidate', 'needs_review', 'approved_for_merge', 'rejected', 'merged']);
const LOW_CONFIDENCE_THRESHOLD = 60;

function isMissing(value) {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0);
}

function hasValue(value) {
  return !isMissing(value);
}

function addFlag(flags, flag) {
  if (!flags.includes(flag)) flags.push(flag);
}

function keepUnknownSchemaFieldsNull(candidate) {
  for (const field of NULLABLE_SCHEMA_FIELDS) {
    if (candidate[field] === undefined) candidate[field] = null;
  }
}

function missingRequiredFields(candidate) {
  return REQUIRED_FIELDS.filter((field) => {
    const value = candidate[field];
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (field === 'source_page' && Array.isArray(value) && value.length === 0) return true;
    return false;
  });
}

function validateTypes(candidate, errors) {
  if (typeof candidate.id !== 'string' || candidate.id.trim() === '') errors.push('INVALID_ID');
  if (typeof candidate.source_file !== 'string' || candidate.source_file.trim() === '') errors.push('INVALID_SOURCE_FILE');
  if (
    !Number.isInteger(candidate.source_page) &&
    !(Array.isArray(candidate.source_page) && candidate.source_page.length > 0 && candidate.source_page.every(Number.isInteger))
  ) {
    errors.push('INVALID_SOURCE_PAGE');
  }
  if (typeof candidate.raw_row_ref !== 'string' || candidate.raw_row_ref.trim() === '') errors.push('INVALID_RAW_ROW_REF');
  if (candidate.raw_table_ref !== null && typeof candidate.raw_table_ref !== 'string') errors.push('INVALID_RAW_TABLE_REF');
  if (typeof candidate.source_type !== 'string' || candidate.source_type.trim() === '') errors.push('INVALID_SOURCE_TYPE');
  if (typeof candidate.source_name !== 'string' || candidate.source_name.trim() === '') errors.push('INVALID_SOURCE_NAME');
  if (typeof candidate.extraction_method !== 'string' || candidate.extraction_method.trim() === '') {
    errors.push('INVALID_EXTRACTION_METHOD');
  }
  if (!Number.isInteger(candidate.confidence_score) || candidate.confidence_score < 0 || candidate.confidence_score > 100) {
    errors.push('INVALID_CONFIDENCE_SCORE');
  }
  if (typeof candidate.confidence_reason !== 'string' || candidate.confidence_reason.trim() === '') {
    errors.push('INVALID_CONFIDENCE_REASON');
  }
  if (!Array.isArray(candidate.risk_flags)) errors.push('INVALID_RISK_FLAGS');
  if (!Array.isArray(candidate.ai_inferred_fields)) errors.push('INVALID_AI_INFERRED_FIELDS');
  if (!ALLOWED_STATUSES.has(candidate.validation_status)) errors.push('INVALID_VALIDATION_STATUS');
  if (typeof candidate.last_checked !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.last_checked)) {
    errors.push('INVALID_LAST_CHECKED');
  }
}

function validateAiInferredFields(candidate, errors) {
  if (!Array.isArray(candidate.ai_inferred_fields)) return;
  for (const field of candidate.ai_inferred_fields) {
    if (!CANDIDATE_SCHEMA_FIELDS.has(field)) {
      errors.push(`INVALID_AI_INFERRED_FIELD_${String(field).toUpperCase()}`);
      continue;
    }
    if (isMissing(candidate[field])) {
      errors.push(`AI_INFERRED_FIELD_HAS_NO_VALUE_${field.toUpperCase()}`);
    }
  }
}

function sourceEvidenceSet(candidate, options) {
  const evidence = options.sourceEvidenceFields ?? candidate.source_evidence_fields;
  if (!evidence) return null;
  if (!Array.isArray(evidence)) return new Set();
  return new Set(evidence);
}

function findUnsupportedTechnicalValues(candidate, options) {
  const sourceFields = sourceEvidenceSet(candidate, options);
  const inferredFields = new Set(candidate.ai_inferred_fields || []);
  const technicalValues = TECHNICAL_FIELDS.filter((field) => hasValue(candidate[field]));

  if (sourceFields) {
    return technicalValues.filter((field) => !sourceFields.has(field) && !inferredFields.has(field));
  }

  if (isMissing(candidate.source_page) || isMissing(candidate.raw_row_ref)) return technicalValues;
  return [];
}

function hasImpossibleDimension(candidate) {
  const d1 = candidate.diameter_d1_mm;
  const l1 = candidate.oal_l1_mm;
  const numericDimensions = ['diameter_d1_mm', 'diameter_d2_mm', 'oal_l1_mm', 'flute_length_l2_mm'];

  if (numericDimensions.some((field) => candidate[field] !== null && (typeof candidate[field] !== 'number' || candidate[field] <= 0))) {
    return true;
  }
  if (d1 !== null && d1 > 500) return true;
  if (d1 !== null && l1 !== null && l1 < d1) return true;
  return false;
}

function buildCandidateValidation(candidate, options = {}) {
  const normalized = { ...candidate };
  keepUnknownSchemaFieldsNull(normalized);

  const errors = missingRequiredFields(normalized).map((field) => `MISSING_REQUIRED_${field.toUpperCase()}`);
  validateTypes(normalized, errors);

  if (!Array.isArray(normalized.risk_flags)) normalized.risk_flags = [];
  if (!Array.isArray(normalized.ai_inferred_fields)) normalized.ai_inferred_fields = [];
  if (Array.isArray(options.aiInferredFields)) {
    for (const field of options.aiInferredFields) {
      if (!normalized.ai_inferred_fields.includes(field)) normalized.ai_inferred_fields.push(field);
    }
  }
  if (options.newRecord !== false) normalized.validation_status = 'extracted_candidate';

  validateAiInferredFields(normalized, errors);

  if (isMissing(normalized.brand)) addFlag(normalized.risk_flags, 'MISSING_BRAND');
  if (isMissing(normalized.source_file)) addFlag(normalized.risk_flags, 'MISSING_SOURCE_FILE');
  if (isMissing(normalized.source_page)) addFlag(normalized.risk_flags, 'MISSING_SOURCE_PAGE');
  if (isMissing(normalized.raw_row_ref)) addFlag(normalized.risk_flags, 'MISSING_RAW_ROW_REF');
  if (isMissing(normalized.source_type)) addFlag(normalized.risk_flags, 'MISSING_SOURCE_TYPE');
  if (isMissing(normalized.source_name)) addFlag(normalized.risk_flags, 'MISSING_SOURCE_NAME');
  if (isMissing(normalized.extraction_method)) addFlag(normalized.risk_flags, 'MISSING_EXTRACTION_METHOD');
  if (isMissing(normalized.designation) && isMissing(normalized.article_no)) addFlag(normalized.risk_flags, 'MISSING_IDENTITY');
  if (GEOMETRY_FIELDS.every((field) => isMissing(normalized[field]))) addFlag(normalized.risk_flags, 'MISSING_DIMENSIONS');
  if (CUTTING_DATA_FIELDS.every((field) => isMissing(normalized[field]))) addFlag(normalized.risk_flags, 'MISSING_CUTTING_DATA');
  if (isMissing(normalized.coating)) addFlag(normalized.risk_flags, 'MISSING_COATING');
  if (isMissing(normalized.iso_materials)) addFlag(normalized.risk_flags, 'MISSING_ISO_MATERIALS');
  if (isMissing(normalized.operations)) addFlag(normalized.risk_flags, 'MISSING_OPERATION');
  if (normalized.confidence_score < LOW_CONFIDENCE_THRESHOLD) addFlag(normalized.risk_flags, 'LOW_CONFIDENCE');
  if (normalized.ai_inferred_fields.includes('type')) addFlag(normalized.risk_flags, 'AI_INFERRED_CATEGORY');
  if (normalized.ai_inferred_fields.includes('product_family')) addFlag(normalized.risk_flags, 'PRODUCT_FAMILY_UNCERTAIN');
  const unsupportedTechnicalValues = findUnsupportedTechnicalValues(normalized, options);
  if (unsupportedTechnicalValues.length) {
    addFlag(normalized.risk_flags, 'UNSUPPORTED_TECHNICAL_VALUE');
    for (const field of unsupportedTechnicalValues) errors.push(`UNSUPPORTED_TECHNICAL_VALUE_${field.toUpperCase()}`);
  }
  if (hasImpossibleDimension(normalized)) {
    addFlag(normalized.risk_flags, 'IMPOSSIBLE_DIMENSION');
    errors.push('IMPOSSIBLE_DIMENSION');
  }

  const needsReview =
    errors.length > 0 ||
    normalized.confidence_score < LOW_CONFIDENCE_THRESHOLD ||
    normalized.risk_flags.length > 0;

  if (needsReview) normalized.validation_status = 'needs_review';

  return {
    candidate: normalized,
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  REQUIRED_FIELDS,
  NULLABLE_SCHEMA_FIELDS,
  TECHNICAL_FIELDS,
  CANDIDATE_SCHEMA_FIELDS,
  buildCandidateValidation
};
