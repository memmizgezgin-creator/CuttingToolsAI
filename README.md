# ToolAdvisor AI

AI-powered cutting tool advisor and cross-reference platform.

## Stack
- Static HTML/CSS/JS frontend
- Netlify Functions (serverless) as Claude API proxy
- Claude claude-sonnet-4-20250514 for tool identification and recommendations

## Deploy to Netlify

### Option A — GitHub (recommended)
1. Push this repo to GitHub
2. Go to app.netlify.com → "Add new site" → "Import from Git"
3. Select your repo, click Deploy
4. Go to Site settings → Environment variables → Add:
   - `ANTHROPIC_API_KEY` = your key from console.anthropic.com

### Option B — Netlify Drop (quick demo)
1. Zip this entire folder
2. Drag to app.netlify.com/drop
3. Add env variable in Site settings after deployment

## Project Structure
```
tooladvisor-deploy/
├── index.html              ← Main app (Visual Search + AI Advisor + Revenue Model)
├── netlify.toml            ← Netlify config + routing
├── netlify/
│   └── functions/
│       └── claude.js       ← Serverless proxy (keeps API key secure)
└── README.md
```

## Revenue Streams (built-in)
- CPC / Affiliate: €0.20–2 per click-out
- Featured Supplier Listing: €50–500/month
- Freemium Pro: €9–29/month
- Enterprise SaaS: €199–999/month/company
