# Hosting

ToolAdvisor is hosted on **GitHub Pages** (free tier).

- DNS is managed via **TransIP**
- Custom domain `tooladvisor.eu` is wired via the `CNAME` file in the repository root
- Pushing to `main` triggers an automatic GitHub Pages build and deploy

There are no Netlify functions, Cloudflare Workers, or serverless backends in the static hosting path. API calls are made directly from the client where applicable.
