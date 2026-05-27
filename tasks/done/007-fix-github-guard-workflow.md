# Task 007 — Fix GitHub Guard Workflow

**Status:** done  
**Type:** implementation  
**Created:** 2026-05-27  
**Approved by:** Owner

## Goal
Fix the ToolAdvisor Guard GitHub Actions workflow:
1. PRODUCT_DB check must catch `directory-data.js` (was broken)
2. Detect TA_TOOLS base record edits specifically
3. Upgrade `actions/checkout@v4` to `@v6` (Node.js 24 compatible)
4. Add `AGENT_PROTOCOL.md` to critical files check

## File Changed
`.github/workflows/ta-guard.yml`

## Result
✅ All 4 fixes applied and verified.
