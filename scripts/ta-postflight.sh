#!/bin/bash
# ToolAdvisor — Post-flight check
# Codex iş bitirdikten sonra çalıştır: ./scripts/ta-postflight.sh

ROOT="/Users/muratonder/Desktop/ToolAdvisor"
WARN=0

ok()   { echo "  ✅  $1"; }
fail() { echo "  ❌  $1"; ((WARN++)); }
warn() { echo "  ⚠️   $1"; ((WARN++)); }

echo ""
echo "══════════════════════════════════════════"
echo "  ToolAdvisor Post-flight Check"
echo "══════════════════════════════════════════"
echo ""

cd "$ROOT" || { echo "❌ Cannot access root"; exit 1; }

# 1. Git değişiklik özeti
echo "--- Changed files (git status) ---"
git status --short
echo ""

# 2. Yasak değişiklikler
PROTECTED=(index.html wrangler.toml)
for f in "${PROTECTED[@]}"; do
  if git diff --name-only HEAD 2>/dev/null | grep -q "^$f$"; then
    fail "$f was modified — review required"
  else
    ok "$f not modified"
  fi
done

# 3. PRODUCT_DB kontrolü
if git diff --name-only HEAD 2>/dev/null | grep -qi "product.db\|PRODUCT_DB"; then
  fail "PRODUCT_DB was modified — NOT ALLOWED without approval"
else
  ok "PRODUCT_DB not modified"
fi

# 4. Netlify kontrolü
if git diff --name-only HEAD 2>/dev/null | grep -qi "netlify"; then
  fail "Netlify file modified — NOT ALLOWED"
else
  ok "No Netlify files modified"
fi

# 5. Worklog güncellendi mi?
WORKLOG_MODIFIED=$(git diff --name-only HEAD 2>/dev/null | grep "TOOLADVISOR_WORKLOG.md")
if [ -n "$WORKLOG_MODIFIED" ]; then
  ok "TOOLADVISOR_WORKLOG.md updated"
else
  warn "TOOLADVISOR_WORKLOG.md NOT updated — Codex should append a worklog entry"
fi

# 6. Deploy tetiklendi mi? (wrangler)
if git diff --name-only HEAD 2>/dev/null | grep -q "wrangler.toml"; then
  fail "wrangler.toml changed — verify no unintended deploy"
fi

# 7. Sonuç
echo ""
echo "══════════════════════════════════════════"
if [ $WARN -eq 0 ]; then
  echo "  RESULT: ✅ Clean — safe to commit/push"
else
  echo "  RESULT: ⚠️  $WARN warning(s) — review before committing"
fi
echo "══════════════════════════════════════════"
echo ""
