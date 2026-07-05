import { loadAgent } from "./agent-loader.js";

const skillCache = new Map();

function getSkills(agentName) {
  if (skillCache.has(agentName)) return skillCache.get(agentName);

  const agent = loadAgent(agentName);
  if (!agent) return [];

  const skills = (agent.manifest.skills || []).map(s => ({
    name: s.name,
    description: s.description,
    parameters: s.parameters || {},
    agent: agentName,
  }));

  skillCache.set(agentName, skills);
  return skills;
}

export function listAllSkills() {
  const { listAgents } = require("./agent-loader.js");
  const agents = listAgents();
  return agents.flatMap(a => getSkills(a.name));
}

export function getAgentSkills(agentName) {
  return getSkills(agentName);
}

export function invalidateCache(agentName) {
  skillCache.delete(agentName);
}
