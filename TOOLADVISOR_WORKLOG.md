# ToolAdvisor Worklog

This file records operational updates for ToolAdvisor.

CLOUDFLARE_MIGRATION.md is the single source of truth for architecture, deployment, data strategy, security rules, working protocol and active project decisions.

All assistants and coding agents must read CLOUDFLARE_MIGRATION.md before doing ToolAdvisor work.

---

## 2026-05-27 — Baseline Standardization

### Decision

The active project root is standardized as:
/Users/muratonder/Desktop/ToolAdvisor/

All other ToolAdvisor-related folders are considered legacy/archive unless explicitly reactivated, including:
- /Users/muratonder/Desktop/tooladvisor-v5-final/
- /Users/muratonder/Desktop/tooladvisor-v5-final/tooladvisor-deploy/
- /Users/muratonder/Desktop/tooladvisor-deploy-v2/
- any tv5 or old ToolAdvisor variants

These legacy folders must not be used for new work unless explicitly approved.

### Single Source of Truth

CLOUDFLARE_MIGRATION.md is the master decision file.
It controls:
- active project root
- deployment rules
- Cloudflare migration status
- architecture decisions
- data strategy
- PRODUCT_DB rules
- research workflow
- security rules
- implementation boundaries
- Codex / Claude Code / ChatGPT working protocol

If a decision is ambiguous or not covered by CLOUDFLARE_MIGRATION.md, work must stop and approval must be requested.
No assumptions are allowed.

### Deployment Rules

Cloudflare Pages / Wrangler is the active deployment path.
Netlify must not be used.
No deployment may be performed unless explicitly approved.

### Data Rules

PRODUCT_DB is locked.
PRODUCT_DB must not be modified in any form without explicit approval, regardless of data source.
This applies to:
- PDF extracted data
- web extracted data
- AI generated data
- manually entered data
- sample/demo data
- small corrections
- schema changes
- cleanup or normalization attempts

No extracted data may be auto-merged into PRODUCT_DB.
All new product data must first go through staging/research/review.

### Research Rules

Research outputs must remain under:
/Users/muratonder/Desktop/ToolAdvisor/research/

Expected research files may include:
- current-data-model-audit.md
- missing-fields-list.json
- category-specific-fields.json
- refactor-plan-no-code.md
- cutting-tool-site-research.md
- tooladvisor-product-schema-proposal.json
- filter-model-proposal.json
- product-card-detail-recommendations.md
- implementation-roadmap.md

If any research file is missing, report it only.
Do not create, regenerate or invent missing research files unless explicitly instructed.

### Production File Rules

Production files are not approved for modification yet.
Do not modify:
- index.html
- JS files
- CSS files
- data files
- PRODUCT_DB
- CROSSREF_DB
- Cloudflare config files
- deployment files

Do not rename, refactor, move, overwrite or clean up existing files during standardization.

### Current State

Research outputs were generated for:
- cutting-tool site structure research
- current data model audit
- filter model proposal
- product schema proposal
- product card/detail recommendations
- no-code refactor plan
- implementation roadmap

No production code change is approved yet.
No PRODUCT_DB change is approved yet.
No deployment is approved yet.

### Next Step

1. Confirm active root contents.
2. Confirm CLOUDFLARE_MIGRATION.md exists in the active root.
3. Confirm this TOOLADVISOR_WORKLOG.md exists in the active root.
4. Confirm /research/ contents.
5. Review research outputs manually.
6. Decide implementation order before any code change.

### Worklog Entry

Status:
- Active project root standardized.
- Legacy folder policy defined.
- Cloudflare-only deployment rule confirmed.
- PRODUCT_DB lock confirmed.
- Research file handling rule confirmed.
- Production modification freeze confirmed.

Files changed:
- TOOLADVISOR_WORKLOG.md created.

Files not changed:
- index.html
- PRODUCT_DB
- JS/CSS/data files
- deployment files

Deployment:
- Not performed.

Risk:
- Active deploy source must still be verified before deleting or archiving legacy folders.
- No legacy folder should be deleted until the active Cloudflare deployment source is confirmed.

---

## 2026-05-27 — Task 001: Research Review

### Task
001-review-research-outputs.md

### Yapılan
Tüm research/ dosyaları okundu ve incelendi:
- current-data-model-audit.md
- cutting-tool-site-research.md
- implementation-roadmap.md
- product-card-detail-recommendations.md
- refactor-plan-no-code.md
- missing-fields-list.json
- tooladvisor-product-schema-proposal.json
- filter-model-proposal.json
- category-specific-fields.json

### Çıktı
research/001-research-review-decision.md oluşturuldu.

### Özet Karar
- Hemen: canonical schema migration, trust metadata, filter registry
- Bekle: detail modal, compare matrix, cross-reference, Supabase
- Yasak: synthetic economics gösterimi, bulk scraping, PRODUCT_DB değişikliği
- İlk implementation sırası: schema → trust → filters → cards → detail → compare → cross-ref

### Dosya Değişiklikleri
- research/001-research-review-decision.md oluşturuldu
- tasks/todo/001-review-research-outputs.md → tasks/done/ taşındı
- TOOLADVISOR_WORKLOG.md güncellendi

### Deploy
Yapılmadı.
