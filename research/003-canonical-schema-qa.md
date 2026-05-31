# Task 003 — Canonical Schema QA Report

**Date:** 2026-05-27  
**Task:** Verify that Task 002 canonical schema additions did not break the site.  
**Tester:** Claude Code (automated browser verification via Claude Preview MCP)  
**Server:** `python3 -m http.server 8787` — local static server at `/Users/muratonder/Desktop/ToolAdvisor/`

---

## Overall Result: ✅ PASS

No regressions. All 36 records load. All UI features work. Zero JS errors introduced by Task 002.

---

## Check Results

| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | Site opens locally | ✅ PASS | HTTP 200 on all pages |
| 2 | `window.TA_TOOLS.length === 36` | ✅ PASS | Confirmed in browser context |
| 3 | Product cards render | ✅ PASS | "12 shown of 36 matching" on catalog load |
| 4 | ISO filter (P group) | ✅ PASS | Filter returns exactly 14 tools — correct |
| 5 | Family filter (Milling) | ✅ PASS | All 8 milling codes visible after filter |
| 6 | Search | ✅ PASS | "Sandvik" search filters correctly within active family |
| 7 | Product detail modal | ✅ PASS | Opens, renders all sections (Vc, Feed, Ap, Confidence, Source, Supply) |
| 8 | compare.html | ✅ PASS | HTTP 200, zero JS errors, h1 renders |
| 9 | ToolAdvisor.html | ✅ PASS | HTTP 200, zero JS errors, h1 renders |
| 10 | cross-reference.html | ✅ PASS | HTTP 200 |
| 11 | Console errors (all pages) | ✅ PASS | Zero JS errors on any page |
| 12 | Original flat fields intact | ✅ PASS | 0 broken records (id, brand, code, grade, iso, family, vcMin/Max, costTier, weeklyPicks, equivIds all present) |
| 13 | Canonical fields present | ✅ PASS | 0 records missing trust, tool_type, canonical_category, product_code, workpiece_materials, economicsEstimated |
| 14 | T14 family field preserved | ✅ PASS | `family: 'Drilling'` unchanged; canonical override is additive |
| 15 | All economics flagged estimated | ✅ PASS | `economicsEstimated: true` on all 36 records |

---

## Canonical Field Verification (in-browser)

Verified in live browser context against `window.TA_TOOLS`:

```json
{
  "totalRecords": 36,
  "trust_counts": {
    "verified": 19,
    "partially_verified": 14,
    "estimated": 3
  },
  "tool_type_counts": {
    "turning_insert": 18,
    "milling_insert": 8,
    "threading_insert": 5,
    "reamer": 2,
    "tap": 1,
    "solid_drill": 1,
    "indexable_drill_insert": 1
  },
  "allEconomicsEstimated": true,
  "missingCanonicalFields": [],
  "brokenOriginalFields": []
}
```

**Sample trust block (T01 — Sandvik CNMG 120408-PM):**
```json
{
  "source_tier": "manufacturer",
  "validation_status": "verified",
  "confidence_score": 96,
  "source_name": "Manufacturer data",
  "source_url": null,
  "last_checked": "2024-08-01",
  "risk_flags": []
}
```

**T14 canonical override verified additive (family field unchanged):**
```
family: "Drilling"           ← original preserved
tool_type: "tap"             ← canonical override
canonical_category: "tapping" ← canonical override
```

---

## Console Warnings (pre-existing, not introduced by Task 002)

All warnings existed before Task 002 and are unrelated to the schema change:

| Warning | Source | Pre-existing |
|---------|--------|-------------|
| `cdn.tailwindcss.com should not be used in production` | Tailwind CDN | ✅ Yes |
| `You are using the in-browser Babel transformer` | Babel CDN | ✅ Yes |
| `Download the React DevTools` | React dev build | ✅ Yes |

Zero new warnings. Zero errors.

---

## Product Detail Modal — Verified Sections

Opened detail modal for **SCGT 120408-AL (Mitsubishi, Milling, ISO N)**:

- ✅ Header: `MITSUBISHI · MILLING`
- ✅ Product code: `SCGT 120408-AL`
- ✅ Description: `Aluminium high-speed mill`
- ✅ Material group: `ISO N · NON-FERROUS`
- ✅ Grade: `AP25N`
- ✅ Operation: `HSM`
- ✅ Cutting Speed Vc: `600–1200 m/min`
- ✅ Feed Rate: `0.1–0.25 mm/rev`
- ✅ Depth of Cut Ap: `0.5–3 mm`
- ✅ Data Confidence: `93%`
- ✅ Source: `Manufacturer data · verified 2024-09`
- ✅ Supply: `4 verified suppliers`
- ✅ Find equivalents button
- ✅ Add to Compare button

---

## Filter Accuracy Check

| Filter | Expected count | Actual count | Match |
|--------|---------------|--------------|-------|
| All tools (no filter) | 36 | 36 | ✅ |
| ISO P (Steel) | 14 | 14 | ✅ |
| Family: Milling | 8 | 8 | ✅ |

---

## Notes

- `compare.html` and `ToolAdvisor.html` do not load `directory-data.js` — this is expected. They are independent pages.
- `window.TA_TOOLS` is only available on `tools-directory.html` (loaded via `directory-data.js` + `directory-app.jsx`).
- The canonical fields are purely additive. The UI reads original fields (`code`, `iso`, `family`, `op`, `vcMin`, etc.) — it does not read `trust`, `tool_type`, or `workpiece_materials`. No UI code path was changed.
- The new `economicsEstimated: true` flag is not read by any UI component — it is metadata for future data consumers.

---

## Conclusion

Task 002 canonical schema migration is **safe**. No breakage. All 36 records load correctly in browser. All filters, search, detail modals, and navigation work as before. Canonical fields are additive and invisible to the current UI layer.
