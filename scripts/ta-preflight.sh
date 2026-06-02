#!/bin/bash
# ToolAdvisor — Pre-flight check
# Codex'e iş vermeden önce çalıştır: ./scripts/ta-preflight.sh

ROOT="/Users/muratonder/Desktop/ToolAdvisor"
PASS=0
FAIL=0

ok()   { echo "  ✅  $1"; ((PASS++)); }
fail() { echo "  ❌  $1"; ((FAIL++)); }
warn() { echo "  ⚠️   $1"; }

echo ""
echo "══════════════════════════════════════════"
echo "  ToolAdvisor Pre-flight Check"
echo "══════════════════════════════════════════"
echo ""

# 1. Live domain + proxy health
DOMAIN_STATUS=$(curl -L -s -o /dev/null -w "%{http_code}" --max-time 20 "https://tooladvisor.eu" || true)
if [ "$DOMAIN_STATUS" = "200" ]; then ok "https://tooladvisor.eu returns HTTP 200"
else fail "https://tooladvisor.eu expected HTTP 200, got ${DOMAIN_STATUS:-curl-error}"; fi

PROXY_STATUS=$(curl -L -s -o /dev/null -w "%{http_code}" --max-time 20 \
  -X POST "https://tooladvisor.eu/api/chat" \
  -H "Content-Type: application/json" \
  --data '{"messages":[{"role":"user","content":"ping"}]}' || true)
if [ "$PROXY_STATUS" = "404" ] || [ -z "$PROXY_STATUS" ]; then fail "POST https://tooladvisor.eu/api/chat expected non-404, got ${PROXY_STATUS:-curl-error}"
else ok "POST https://tooladvisor.eu/api/chat returned HTTP $PROXY_STATUS (non-404)"; fi

# 2. Root kontrolü
if [ -d "$ROOT" ]; then ok "Active root exists: $ROOT"
else fail "Active root NOT found: $ROOT"; fi

# 3. Kritik dosyalar
for f in CLOUDFLARE_MIGRATION.md TOOLADVISOR_WORKLOG.md index.html ToolAdvisor.html wrangler.toml advisor-ai-widget.js; do
  if [ -f "$ROOT/$f" ]; then ok "$f exists"
  else fail "$f MISSING"; fi
done

# 4. functions/proxy.js (aktif API endpoint)
if [ -f "$ROOT/functions/proxy.js" ]; then ok "functions/proxy.js exists (active API endpoint)"
else fail "functions/proxy.js MISSING — AI chat will not work"; fi

# 5. Netlify kalıntısı kontrolü
if [ -f "$ROOT/netlify.toml" ]; then fail "netlify.toml found — must not be used"
else ok "No netlify.toml found"; fi

if [ -d "$ROOT/netlify" ]; then warn "netlify/ folder exists (legacy, do not use)"
else ok "No netlify/ folder"; fi

# 6. Research klasörü
if [ -d "$ROOT/research" ]; then
  ok "research/ exists"
  RESEARCH_FILES=(current-data-model-audit.md missing-fields-list.json category-specific-fields.json refactor-plan-no-code.md cutting-tool-site-research.md tooladvisor-product-schema-proposal.json filter-model-proposal.json product-card-detail-recommendations.md implementation-roadmap.md)
  for f in "${RESEARCH_FILES[@]}"; do
    if [ -f "$ROOT/research/$f" ]; then ok "  research/$f"
    else warn "  research/$f missing (report only)"; fi
  done
else fail "research/ folder MISSING"; fi

# 7. Worklog son güncelleme
if [ -f "$ROOT/TOOLADVISOR_WORKLOG.md" ]; then
  LAST=$(tail -20 "$ROOT/TOOLADVISOR_WORKLOG.md" | grep "^## 20" | tail -1)
  warn "Last worklog entry: ${LAST:-unknown}"
fi

# 8. Sonuç
echo ""
echo "══════════════════════════════════════════"
if [ $FAIL -eq 0 ]; then
  echo "  RESULT: ✅ All checks passed ($PASS ok)"
  echo "  Safe to proceed with Codex."
else
  echo "  RESULT: ❌ $FAIL issue(s) found — fix before proceeding"
fi
echo "══════════════════════════════════════════"
echo ""
