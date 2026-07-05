import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { listAgents, loadAgent, loadSkill } from "./runtime/agent-loader.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const agentRuntimes = new Map();

async function getLLM() {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function getRuntime(agentName) {
  if (agentRuntimes.has(agentName)) return agentRuntimes.get(agentName);
  const agent = loadAgent(agentName);
  if (!agent) return null;
  const mod = await import(agent.codePath);
  agentRuntimes.set(agentName, mod);
  return mod;
}

app.get("/api/agents", (_req, res) => {
  const agents = listAgents();
  res.json({ agents });
});

app.get("/api/agents/:name", (req, res) => {
  const agent = loadAgent(req.params.name);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ name: req.params.name, ...agent.manifest, codePath: agent.codePath });
});

app.get("/api/agents/:name/skills", (req, res) => {
  const agent = loadAgent(req.params.name);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ agent: req.params.name, skills: agent.manifest.skills || [] });
});

app.get("/api/agents/:name/skills/:skill", (req, res) => {
  const skillPath = loadSkill(req.params.name, req.params.skill);
  if (!skillPath) return res.status(404).json({ error: "Skill not found" });
  res.json({ agent: req.params.name, skill: req.params.skill, codePath: skillPath });
});

app.post("/api/agents/:name/invoke", async (req, res) => {
  try {
    const runtime = await getRuntime(req.params.name);
    if (!runtime) return res.status(404).json({ error: "Agent not found" });

    const llm = await getLLM();
    const context = { llm, env: process.env, lastUsage: {} };
    const result = await runtime.run(req.body, context);

    res.json({ agent: req.params.name, result });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

app.get("/api/agents/:name/code", (req, res) => {
  const agent = loadAgent(req.params.name);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ agent: req.params.name, codePath: agent.codePath, manifest: agent.manifest });
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
});
