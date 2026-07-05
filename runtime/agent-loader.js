import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.resolve(__dirname, "..", "agents");

function resolveAgentDir(agentPath) {
  return path.join(AGENTS_DIR, ...agentPath.split("/"));
}

export function loadAgent(agentPath) {
  const agentDir = resolveAgentDir(agentPath);
  if (!fs.existsSync(agentDir)) return null;

  const manifestPath = path.join(agentDir, "agent.json");
  const codePath = path.join(agentDir, "index.js");

  if (!fs.existsSync(manifestPath) || !fs.existsSync(codePath)) return null;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  return { manifest, codePath, dir: agentDir, path: agentPath };
}

export function loadSkill(agentPath, skillName) {
  const agentDir = resolveAgentDir(agentPath);
  const skillPath = path.join(agentDir, "skills", `${skillName}.js`);
  if (!fs.existsSync(skillPath)) return null;
  return skillPath;
}

function scanAgentDir(dir, parentPath = "") {
  const entries = [];
  if (!fs.existsSync(dir)) return entries;

  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (!item.isDirectory()) continue;
    const childPath = parentPath ? `${parentPath}/${item.name}` : item.name;
    const manifestPath = path.join(dir, item.name, "agent.json");
    const codePath = path.join(dir, item.name, "index.js");

    if (fs.existsSync(manifestPath) && fs.existsSync(codePath)) {
      entries.push(childPath);
    }

    const subDir = path.join(dir, item.name);
    entries.push(...scanAgentDir(subDir, childPath));
  }
  return entries;
}

export function listAgents() {
  const agentPaths = scanAgentDir(AGENTS_DIR);
  return agentPaths
    .map(p => {
      const agent = loadAgent(p);
      if (!agent) return null;
      return {
        name: p,
        ...agent.manifest,
      };
    })
    .filter(Boolean);
}

export function listTopLevelAgents() {
  if (!fs.existsSync(AGENTS_DIR)) return [];
  return fs.readdirSync(AGENTS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => {
      const agent = loadAgent(e.name);
      if (!agent) return null;
      return {
        name: e.name,
        ...agent.manifest,
      };
    })
    .filter(Boolean);
}
