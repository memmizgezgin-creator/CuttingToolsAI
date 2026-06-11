/**
 * CuttingToolsAI — canonical brand mapping (single source of truth)
 * =================================================================
 * The rule was established in the 2026-06-11 catalog metrics job and is
 * documented in js/catalog-metrics.js. The EXECUTABLE mapping lives here and
 * only here — imported by:
 *   scripts/normalize-brands.js          (DB normalization)
 *   scripts/verify-catalog-metrics.mjs   (metrics verification)
 *   scripts/verify-brand-normalization.mjs (normalization verification)
 * Do not define a second copy of this mapping anywhere.
 *
 * Rule: case-insensitive; any spelling starting with "sandvik"
 * (e.g. "Sandvik Coromant") counts as Sandvik, the same manufacturer.
 */

'use strict';

// normalized key → canonical display spelling (the dominant form in the DB)
const CANONICAL_DISPLAY = {
  'gühring':    'Gühring',
  'iscar':      'ISCAR',
  'sandvik':    'Sandvik',
  'walter':     'Walter',
  'kennametal': 'Kennametal',
  'kyocera':    'Kyocera',
  'tungaloy':   'Tungaloy',
  'yg-1':       'YG-1',
};

function normalizeBrand(b) {
  const k = String(b || '').trim().toLowerCase();
  return k.startsWith('sandvik') ? 'sandvik' : k;
}

// Canonical display spelling for any raw brand value. Unknown brands pass
// through trimmed but otherwise untouched (new brands arrive via ingestion
// review, not silent rewriting).
function canonicalBrand(b) {
  return CANONICAL_DISPLAY[normalizeBrand(b)] || String(b || '').trim();
}

module.exports = { normalizeBrand, canonicalBrand, CANONICAL_DISPLAY };
