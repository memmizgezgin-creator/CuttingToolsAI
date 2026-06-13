TASK: GSC/GA4 title audit — find where the pre-rebrand "ToolAdvisor" page title still lives. READ-ONLY diagnosis: zero repo file writes. Approved by Murat (autopilot queue, 2026-06-12).

CONTEXT:
- GA4 shows 87% of traffic (707 views/28d) landing on a page titled "ToolAdvisor | Carbide Insert Selection" — a pre-rebrand title. We need to know whether this is a stale deploy (repo already fixed, prod not), stale source (repo still carries it), or a non-obvious route.
- Production domain: https://cuttingtoolsai.eu (https://tooladvisor.eu may also still resolve — check both for the homepage).
- Repo root: /Users/muratonder/Desktop/ToolAdvisor. Top-level HTML pages include: index.html, ToolAdvisor.html, catalog.html, compare.html, cross-reference.html, contact.html, account.html, 404.html, plus generated sections /ref/, /grade/, /material/ (each has an index.html under its directory).
- logs/autopilot/ is gitignored — writing the report there does NOT dirty the repo.

STEPS:
1. Enumerate routes: every top-level *.html in the repo root (route = filename, index.html = /), plus /ref/, /grade/, /material/ section indexes.
2. For each route, curl the deployed page on https://cuttingtoolsai.eu (follow redirects, max-time 20) and extract the <title> content. Also fetch https://tooladvisor.eu/ homepage title.
3. Grep the repo HTML sources (root *.html and ref/, grade/, material/ trees) for "ToolAdvisor" appearing in <title>, meta name="description"/"title", or og:/twitter: meta tags. Record file + line for each hit.
4. For each route, compare deployed title vs repo source title and assign a verdict: CLEAN (both rebranded) / STALE-DEPLOY (repo fixed, prod old) / STALE-SOURCE (repo still old) / MISMATCH-OTHER.
5. Write the report to logs/autopilot/title-audit-$(date +%F).md as a markdown table: URL | deployed title | repo title | verdict — homepage row first — followed by the raw grep hits and a short conclusion naming the most likely URL behind the GA4 "ToolAdvisor | Carbide Insert Selection" page. Do NOT write or modify any other file. Do NOT commit anything.

VERIFY (scripted — run these checks, then your final response MUST contain each line below exactly, ending in PASS or FAIL):
1. Report exists and homepage row populated: test -s logs/autopilot/title-audit-$(date +%F).md AND grep of the report finds a table row for cuttingtoolsai.eu homepage with a non-empty deployed title.
   -> VERIFY: title audit report written with homepage row - PASS|FAIL
2. Zero repo writes: git status --porcelain (ignoring .claude/settings.local.json and logs/) prints nothing.
   -> VERIFY: zero repo writes - PASS|FAIL

---
COMPLETED MANUALLY (Cowork session, 2026-06-13 00:xx UTC). Report: logs/autopilot/title-audit-2026-06-13.md. VERIFY 2/2 PASS.
