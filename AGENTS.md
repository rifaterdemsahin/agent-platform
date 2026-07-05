# Agent Platform Development Rules

## Always commit, push, and deploy

After every meaningful change:
1. `git add -A`
2. `git commit -m "<message>"`
3. `git push origin main`

GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys to Fly.io on every push to `main`.
GitHub Actions (`.github/workflows/pages.yml`) auto-deploys to GitHub Pages on changes to `public/`.

## Project structure

```
agents/
├── agents/              # All agents live here
│   ├── <name>/          # Top-level agent
│   │   ├── agent.json   # Spec
│   │   ├── index.js     # Code
│   │   └── skills/      # Skill modules
│   │   └── <sub-agent>/ # Nested sub-agent (inherits from parent)
│   │       ├── agent.json
│   │       ├── index.js
│   │       └── skills/
├── runtime/             # Agent loader & skill registry
├── public/              # Static dashboard (GitHub Pages)
├── index.js             # Express API server
├── Dockerfile           # Container build
├── fly.toml             # Fly.io deploy config
└── .github/workflows/   # CI/CD
```

## Agent spec format

Every agent has an `agent.json` manifest:
```json
{
  "name": "agent-name",
  "version": "1.0.0",
  "description": "...",
  "parent": "optional-parent",
  "runtime": { "type": "node", "llm": "claude-sonnet-4-20250514", "background": true },
  "skills": [{ "name": "...", "description": "...", "parameters": {} }],
  "subAgents": [{ "name": "...", "path": "...", "description": "..." }],
  "triggers": ["on-demand"],
  "entrypoint": "index.js"
}
```

## Deployment

- **Fly.io**: `flyctl deploy` (auto via GitHub Actions on push to main)
- **GitHub Pages**: auto-deployed from `public/` via GitHub Actions
- **Live URL**: https://agent-platform-9a3f.fly.dev
- **Pages URL**: https://rifaterdemsahin.github.io/agent-platform
