# Research 015 — Final Regression QA

**Date:** 2026-05-28
**Scope:** Tasks 009 + 012 + 014 post-merge regression
**Server:** localhost:8787 (ta-local, Wrangler)

## Summary

All checks passed. Zero console errors. GitHub Actions green on all recent runs.

---

## 1. Catalog (tools-directory.html)

| Check | Result |
|-------|--------|
| Page loads | ✅ |
| Nav links (Advisor / Catalog / Cross-Ref / Compare) | ✅ |
| 36 tools shown (12 per page) | ✅ |
| T-INSERT tool type chips on cards | ✅ |
| DATA CONFIDENCE bars visible (96%, 90%…) | ✅ |
| `(est.)` cost labels on cards | ✅ |

---

## 2. directory-data.js Canonical Fields (Task 014)

All 36 TA_TOOLS records verified via `window.TA_TOOLS` in-browser:

| Field | Missing records |
|-------|----------------|
| `tool_type` | 0 |
| `canonical_category` | 0 |
| `trust` | 0 |
| `workpiece_materials` | 0 |
| `economicsEstimated` | 0 (all true) |

**T07 override check:** `tool_type = "turning_insert"`, `canonical_category = "turning"` ✅ (family='Reaming' data error corrected at runtime)

**Trust tiers:**
- `validation_status = "verified"`: 19 records
- `source_tier = "estimated"`: 3 records

**Sample T01 (CNMG 120408-PM):**
```json
{
  "tool_type": "turning_insert",
  "canonical_category": "turning",
  "product_code": "CNMG 120408-PM",
  "trust": {
    "source_tier": "manufacturer",
    "validation_status": "verified",
    "confidence_score": 96,
    "risk_flags": []
  },
  "economicsEstimated": true
}
```

---

## 3. Product Card Detail Modal (Task 009 TrustBadge)

Opened CNMG 120408-PM modal. Trust section verified:

| Check | Result |
|-------|--------|
| DATA CONFIDENCE bar + 96% | ✅ |
| "Verified" badge | ✅ |
| SOURCE TIER: Manufacturer data | ✅ |
| SOURCE: Manufacturer data | ✅ |
| CHECKED: 2024-08-01 | ✅ |
| t.trust data flowing from directory-data.js | ✅ |

---

## 4. Compare Screen (Task 012)

| Check | Result |
|-------|--------|
| Page loads | ✅ |
| 3 header cards (Sandvik/Kennametal/Walter) | ✅ |
| TURNING INSERT chips on all 3 cards | ✅ |
| TOOL TYPE row (row 1, Turning insert × 3) | ✅ |
| Zebra striping (odd=white, even=#f4f3f6) | ✅ |
| DATA CONFIDENCE row (96% / 89% / 94% + Verified) | ✅ |
| SOURCE row (Manufacturer data + brand + date) | ✅ |
| DATA RISKS row (None × 3) | ✅ |
| COST TIER `(est.)` labels | ✅ |
| Disclaimer: "Cost tier and tool life are estimates…" | ✅ |

**Zebra striping (inline `<style>` fallback — CSS parser bug workaround):**
```
row 0: rgb(255, 255, 255) ✅
row 1: rgb(244, 243, 246) ✅
row 2: rgb(255, 255, 255) ✅
row 3: rgb(244, 243, 246) ✅
row 4: rgb(255, 255, 255) ✅
row 5: rgb(244, 243, 246) ✅
```

---

## 5. Other Pages

| Page | Loads | Nav intact |
|------|-------|------------|
| ToolAdvisor.html | ✅ | ✅ |
| cross-reference.html | ✅ | ✅ |
| compare.html | ✅ | ✅ |
| tools-directory.html | ✅ | ✅ |

---

## 6. Console Errors

```
No console errors (level: error)
```
✅ Zero errors across catalog, modal, compare.

---

## 7. GitHub Actions

| Run | Workflow | Result |
|-----|----------|--------|
| Task 014 canonical schema | ToolAdvisor Guard | ✅ success (7s) |
| Task 014 pages build | pages-build-deployment | ✅ success (46s) |
| Task 012 compare trust | ToolAdvisor Guard | ✅ success (8s) |

**Guard warnings (non-blocking):**
- `directory-data.js` modified — non-record change (canonical fields) → review required ⚠️ (expected)
- `TOOLADVISOR_WORKLOG.md` not updated in Task 014 commit ⚠️ (minor — worklog updated in this task)

---

## 8. Known Gaps / Future Work

| Item | Priority | Notes |
|------|----------|-------|
| Phase B compare: dynamic rewire to `window.TA_TOOLS` | Low | Static hardcoded data in compare.html is acceptable for now |
| `TOOLADVISOR_WORKLOG.md` not in Task 014 commit | Resolved | Updated in Task 015 commit |
| `tasks/done/002-canonical-schema-migration.md` untracked | Low | Not yet committed; safe to add in a future cleanup task |

---

## Verdict

**✅ PASS — All regression checks green. Tasks 009 / 012 / 014 behave correctly in production-equivalent preview.**
