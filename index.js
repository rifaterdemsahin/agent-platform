import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { listAgents, listTopLevelAgents, loadAgent, loadSkill } from "./runtime/agent-loader.js";
import { createLLM } from "./runtime/llm-provider.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const agentRuntimes = new Map();

async function getLLM() {
  const provider = process.env.LLM_PROVIDER || "anthropic";
  return createLLM(provider);
}

async function getRuntime(agentPath) {
  if (agentRuntimes.has(agentPath)) return agentRuntimes.get(agentPath);
  const agent = loadAgent(agentPath);
  if (!agent) return null;
  const mod = await import(agent.codePath);
  agentRuntimes.set(agentPath, mod);
  return mod;
}

app.get("/api/agents", (_req, res) => {
  const agents = listAgents();
  res.json({ agents });
});

app.get("/api/agents/top-level", (_req, res) => {
  const agents = listTopLevelAgents();
  res.json({ agents });
});

app.get("/api/agents/hierarchy", (_req, res) => {
  const topLevel = listTopLevelAgents();
  const hierarchy = topLevel.map(tl => ({
    name: tl.name,
    version: tl.version,
    description: tl.description,
    runtime: tl.runtime,
    skills: tl.skills,
    triggers: tl.triggers,
    subAgents: (tl.subAgents || []).map(sa => {
      const sub = loadAgent(`${tl.name}/${sa.path}`);
      return {
        name: sa.name,
        path: `${tl.name}/${sa.path}`,
        description: sa.description,
        skills: sub?.manifest?.skills || [],
        triggers: sub?.manifest?.triggers || [],
        parent: tl.name,
      };
    }),
    api: tl.api,
  }));
  res.json({ hierarchy });
});

app.get("/api/agents/tree/*", (req, res) => {
  const agentPath = req.params[0];
  const agent = loadAgent(agentPath);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ name: agentPath, ...agent.manifest, codePath: agent.codePath });
});

app.get("/api/agents/tree/*/skills", (req, res) => {
  const agentPath = req.params[0];
  const agent = loadAgent(agentPath);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ agent: agentPath, skills: agent.manifest.skills || [] });
});

app.get("/api/agents/tree/*/skills/:skill", (req, res) => {
  const agentPath = req.params[0];
  const skillPath = loadSkill(agentPath, req.params.skill);
  if (!skillPath) return res.status(404).json({ error: "Skill not found" });
  res.json({ agent: agentPath, skill: req.params.skill, codePath: skillPath });
});

app.post("/api/agents/tree/*/invoke", async (req, res) => {
  try {
    const agentPath = req.params[0];
    const runtime = await getRuntime(agentPath);
    if (!runtime) return res.status(404).json({ error: "Agent not found" });

    const llm = await getLLM();
    const context = { llm, env: process.env, lastUsage: {} };
    const result = await runtime.run(req.body, context);

    res.json({ agent: agentPath, result });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get("/api/agents/tree/*/code", (req, res) => {
  const agentPath = req.params[0];
  const agent = loadAgent(agentPath);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ agent: agentPath, codePath: agent.codePath, manifest: agent.manifest });
});

app.get("/api/skills", (_req, res) => {
  const agents = listAgents();
  const allSkills = agents.flatMap(a =>
    (a.skills || []).map(s => ({ ...s, agent: a.name }))
  );
  res.json({ skills: allSkills });
});

app.listen(PORT, () => {
  console.log(`Agent Platform running on http://localhost:${PORT}`);
  console.log(`Agents loaded: ${listAgents().map(a => a.name).join(", ")}`);
  console.log(`Top-level: ${listTopLevelAgents().map(a => a.name).join(", ")}`);
});
