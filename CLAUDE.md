# ToolAdvisor — Claude Code Rules

## NEVER touch these files
- directory-data.js (product database)
- directory-app.jsx (React catalog app)
- ToolAdvisor.html (Advisor page)
- index.html (redirect only, must stay as redirect to ToolAdvisor.html)
- CNAME (domain config)

## Nav link format — always use these exact paths
- Advisor → ToolAdvisor.html
- Catalog → tools-directory.html
- Cross-Reference → cross-reference.html
- Compare → compare.html
- Knowledge → knowledge.html

## Rules
- One task at a time. Do not refactor unrelated files.
- Do not rename, move, or delete any HTML files.
- Do not change the nav structure.
- Do not touch index.html unless explicitly told to.
- After any change: verify nav links still work.
- Never switch hosting platform (GitHub Pages only).
