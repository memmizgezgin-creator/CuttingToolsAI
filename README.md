# ToolAdvisor AI

AI-powered cutting tool advisor and cross-reference platform.

## Stack
- Static HTML/CSS/JS frontend
- GitHub Pages (free tier) for hosting
- Claude claude-sonnet-4-20250514 for tool identification and recommendations

## Deploy

This site is hosted on **GitHub Pages**.

1. Push changes to the `main` branch on GitHub
2. GitHub Pages automatically builds and deploys the site
3. Custom domain (`tooladvisor.eu`) is configured via the `CNAME` file in the repo root

No build step or CI configuration is required for static HTML/CSS/JS.

## Project Structure
```
tooladvisor-deploy/
├── index.html              ← Main app (Visual Search + AI Advisor + Revenue Model)
├── catalog.html            ← Tool catalog
├── advisor.html            ← AI advisor
├── profile.html            ← User profile & saved tools
├── CNAME                   ← Custom domain mapping (tooladvisor.eu)
└── README.md
```

## Revenue Streams (built-in)
- CPC / Affiliate: €0.20–2 per click-out
- Featured Supplier Listing: €50–500/month
- Freemium Pro: €9–29/month
- Enterprise SaaS: €199–999/month/company
