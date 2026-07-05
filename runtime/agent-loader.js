import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = path.resolve(__dirname, "..", "agents");

export function loadAgent(agentName) {
  const agentDir = path.join(AGENTS_DIR, agentName);
  if (!fs.existsSync(agentDir)) return null;

  const manifestPath = path.join(agentDir, "agent.json");
  const codePath = path.join(agentDir, "index.js");

  if (!fs.existsSync(manifestPath) || !fs.existsSync(codePath)) return null;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  return { manifest, codePath, dir: agentDir };
}

export function loadSkill(agentName, skillName) {
  const agentDir = path.join(AGENTS_DIR, agentName);
  const skillPath = path.join(agentDir, "skills", `${skillName}.js`);
  if (!fs.existsSync(skillPath)) return null;
  return skillPath;
}

export function listAgents() {
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
