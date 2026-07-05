# Agent Platform

**LLM-powered background agents with discoverable skills, code, and specs — deployed on Fly.io.**

| **GitHub** | [github.com/rifaterdemsahin/agent-platform](https://github.com/rifaterdemsahin/agent-platform) |
| **Fly.io** | [agent-platform-9a3f.fly.dev](https://agent-platform-9a3f.fly.dev) |
| **GitHub Pages** | [rifaterdemsahin.github.io/agent-platform](https://rifaterdemsahin.github.io/agent-platform) |

---

## What is this?

A multi-agent platform where each agent runs in the background, exposes **skills** via a REST API, ships its own **code**, and declares its **spec** (`agent.json`). Agents are LLM-powered (Claude via Anthropic SDK) and can be invoked from any project over HTTP.

### Current agents

| Agent | Purpose | Skills | Triggers |
|-------|---------|--------|----------|
| **sanity-check** | Code validation, lint, typecheck, env config, deploy readiness | 5 | `pre-commit`, `pre-deploy`, `scheduled`, `on-demand` |
| **budget** | Cost estimation, usage tracking, budget alerts, optimization, forecasting | 5 | `scheduled`, `on-demand`, `threshold-alert` |

---

## Where everything lives

```
agents/
├── agents/                          # ← Agent specs & code live here
│   ├── sanity-check/
│   │   ├── agent.json               # ← SPEC: manifest, skills, runtime, triggers
│   │   ├── index.js                 # ← CODE: agent logic entrypoint
│   │   └── skills/                  # ← SKILLS: reusable skill modules
│   │       └── lint.js
│   └── budget/
│       ├── agent.json               # ← SPEC
│       ├── index.js                 # ← CODE
│       └── skills/
│           └── cost.js
├── runtime/                         # Agent loader & skill registry
│   ├── agent-loader.js              # Loads agents from filesystem at startup
│   └── skill-registry.js            # Caches and discovers skills across agents
├── public/
│   └── index.html                   # Dashboard (served as homepage)
├── index.js                         # Express API server (entrypoint)
├── Dockerfile                       # Container build
├── fly.toml                         # Fly.io deploy config
└── .github/workflows/               # CI/CD
    └── deploy.yml                   # Auto-deploy to Fly.io on push
```

### Key paths

| What | Where |
|------|-------|
| **Agent specs** | `agents/<name>/agent.json` |
| **Agent code** | `agents/<name>/index.js` |
| **Skill modules** | `agents/<name>/skills/<skill>.js` |
| **Runtime** | `runtime/agent-loader.js` |
| **Dashboard** | `public/index.html` |

---

## How to add or update an agent

### 1. Create the agent directory

```bash
mkdir -p agents/my-agent/skills
```

### 2. Write the spec — `agents/my-agent/agent.json`

```json
{
  "name": "my-agent",
  "version": "1.0.0",
  "description": "What this agent does.",
  "runtime": {
    "type": "node",
    "llm": "claude-sonnet-4-20250514",
    "background": true,
    "pollingIntervalMs": 30000
  },
  "skills": [
    {
      "name": "do-something",
      "description": "Description of the skill.",
      "parameters": {
        "input": "string — what it takes"
      }
    }
  ],
  "entrypoint": "index.js",
  "triggers": ["on-demand"],
  "api": {
    "invokeUrl": "/api/agents/my-agent/invoke",
    "skillsUrl": "/api/agents/my-agent/skills",
    "statusUrl": "/api/agents/my-agent/status"
  }
}
```

### 3. Write the code — `agents/my-agent/index.js`

```js
export const agent = { name: "my-agent", version: "1.0.0" };

export async function run(input, context) {
  const { skill, params } = input;
  const { llm } = context;

  switch (skill) {
    case "do-something":
      const result = await llm.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: `Do something with: ${params.input}` }],
      });
      return { success: true, output: result.content[0].text };
    default:
      return { success: false, error: `Unknown skill: ${skill}` };
  }
}
```

### 4. Add skill modules — `agents/my-agent/skills/do-something.js`

```js
export async function doSomething({ input, llm }) {
  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: input }],
  });
  return { result: result.content[0].text };
}
```

### 5. Push to GitHub — auto-deploy

```bash
git add agents/my-agent/
git commit -m "Add my-agent"
git push origin main
```

GitHub Actions will auto-deploy to Fly.io on every push to `main`.

---

## API reference

All agents, skills, and code are discoverable over HTTP:

### List all agents
```bash
curl https://agent-platform-9a3f.fly.dev/api/agents
```

### Get agent spec
```bash
curl https://agent-platform-9a3f.fly.dev/api/agents/sanity-check
```

### List agent skills
```bash
curl https://agent-platform-9a3f.fly.dev/api/agents/sanity-check/skills
```

### Get a skill's code path
```bash
curl https://agent-platform-9a3f.fly.dev/api/agents/sanity-check/skills/lint
```

### Get agent code
```bash
curl https://agent-platform-9a3f.fly.dev/api/agents/sanity-check/code
```

### List all skills across all agents
```bash
curl https://agent-platform-9a3f.fly.dev/api/skills
```

### Invoke an agent (POST — requires Anthropic API key configured)
```bash
curl -X POST https://agent-platform-9a3f.fly.dev/api/agents/sanity-check/invoke \
  -H "Content-Type: application/json" \
  -d '{"skill": "lint", "params": {"path": ".", "language": "javascript"}}'
```

---

## Calling agents from other projects

Any project can call the agent API:

```js
// From any project — call the sanity-check agent
const res = await fetch("https://agent-platform-9a3f.fly.dev/api/agents/sanity-check/invoke", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    skill: "deploy-readiness",
    params: { path: "/path/to/my-project" }
  })
});
const { result } = await res.json();
console.log(result);
```

```python
# From Python
import requests
r = requests.post(
    "https://agent-platform-9a3f.fly.dev/api/agents/budget/invoke",
    json={"skill": "estimate-cost", "params": {"model": "claude-sonnet-4-20250514", "inputTokens": 5000, "outputTokens": 2000, "provider": "anthropic"}}
)
print(r.json())
```

---

## Background operation

Both agents are configured with `"background": true` and polling intervals in their specs. On the Fly.io server:

- **`min_machines_running = 1`** ensures the instance is always running (never sleeps)
- Each agent declares a `pollingIntervalMs` — a client or scheduler can periodically invoke the agent's skills
- The runtime loads agents once on startup and keeps them cached in memory (`agentRuntimes` Map)
- The dashboard at `/` polls the `/api/agents` endpoint to show live agent status

To trigger scheduled background checks from any project, set up a cron:

```bash
# Run sanity-check every 30 minutes from any machine
*/30 * * * * curl -X POST https://agent-platform-9a3f.fly.dev/api/agents/sanity-check/invoke \
  -H "Content-Type: application/json" \
  -d '{"skill": "full", "params": {"path": "/home/user/my-project"}}'
```

---

## Secrets

Set the Anthropic API key on Fly.io:

```bash
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-...
```

For local development, copy `.env.example` to `.env` and fill in the keys:

```bash
cp .env.example .env
npm install
npm run dev
```

---

## Deployment architecture

```
┌─────────────┐     push to main     ┌──────────────────┐
│  Your repo  │ ────────────────────▶ │  GitHub Actions  │
│  on GitHub  │                       │  flyctl deploy   │
└─────────────┘                       └────────┬─────────┘
                                               │
                                               ▼
┌──────────────────────────────────────────────────────────┐
│                    Fly.io (AMS region)                     │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Node.js Express server (port 8080, HTTPS)         │  │
│  │                                                    │  │
│  │  runtime/agent-loader.js  ← loads agents/ dir      │  │
│  │         │                                          │  │
│  │    ┌────┴────┐                                      │  │
│  │    ▼         ▼                                      │  │
│  │  sanity-   budget                                   │  │
│  │  check     agent                                    │  │
│  │                                                    │  │
│  │  Anthropic SDK ↔ Claude API                         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Dashboard: /          API: /api/agents/*                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                    GitHub Pages                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Static dashboard (public/index.html)              │  │
│  │  rifaterdemsahin.github.io/agent-platform          │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## Quick reference

```bash
# Local dev
npm install && npm run dev           # http://localhost:8080

# Deploy manually
flyctl deploy

# Set secret
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-...

# View logs
flyctl logs

# Open dashboard
open https://agent-platform-9a3f.fly.dev
```
