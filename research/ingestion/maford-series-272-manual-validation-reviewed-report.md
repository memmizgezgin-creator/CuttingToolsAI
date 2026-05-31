# M.A. Ford Series 272 Manual Validation Reviewed Sample

- Manual sample validation passed.
- This validates the parser behavior on sampled rows only.
- Full 924-row validation still needs an automated validation pass.
- PRODUCT_DB merge is still blocked.
- Next safe step: create a validation pass script for all 924 normalized review records.

## Summary

- Reviewed records: 13
- Passed records: 13
- Failed records: 0
- Uncertain records: 0
- Pages reviewed: 11, 20, 21, 32
- Row alignment concerns: 0
- Safe for validation pass script: true
- Safe for PRODUCT_DB merge: false

## Even Page Note

Even pages 20 and 32 have horizontal page offset relative to odd pages, but row values align with their own shifted headers.

## Reviewed Records

| sample_id | pdf_page | catalog_page | row_index | tool_no | edp | validation_status |
| --- | --- | --- | --- | --- | --- | --- |
| maford-272-sample-001 | 11 | 386 | 1 | 27201300 | 03000 | valid_manual_sample |
| maford-272-sample-002 | 11 | 386 | 2 | 27201350 | 01001 | valid_manual_sample |
| maford-272-sample-003 | 11 | 386 | 3 | 27201380 | 01005 | valid_manual_sample |
| maford-272-sample-004 | 20 | 395 | 43 | 27217910 | 01613 | valid_manual_sample |
| maford-272-sample-005 | 20 | 395 | 44 | 27217950 | 03256 | valid_manual_sample |
| maford-272-sample-006 | 21 | 396 | 1 | 27218000 | 01617 | valid_manual_sample |
| maford-272-sample-007 | 32 | 407 | 12 | 27260940 | 02027 | valid_manual_sample |
| maford-272-sample-008 | 32 | 407 | 13 | 27262500 | 02029 | valid_manual_sample |
| maford-272-sample-009 | 32 | 407 | 14 | 27262990 | 02031 | valid_manual_sample |
| maford-272-sample-010 | 11 | 386 | 9 | 27201570 | 01017 | valid_manual_sample |
| maford-272-sample-011 | 11 | 386 | 14 | 27201770 | 01025 | valid_manual_sample |
| maford-272-sample-012 | 11 | 386 | 19 | 27201970 | 01033 | valid_manual_sample |
| maford-272-sample-013 | 11 | 386 | 24 | 27202170 | 01045 | valid_manual_sample |

## Blocking Notes

- Do not merge into PRODUCT_DB from this reviewed sample.
- Do not treat the 924-row normalized review file as fully validated yet.
- Do not infer missing coating or material grade fields.
