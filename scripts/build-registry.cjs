const fs = require("fs");
const path = require("path");

const AGENTS_DIR = path.join(__dirname, "..", "agents");
const PUBLIC_DIR = path.join(__dirname, "..", "public");

function loadAgent(agentPath) {
  const dir = path.join(AGENTS_DIR, agentPath);
  const manifestPath = path.join(dir, "agent.json");
  if (!fs.existsSync(manifestPath)) return null;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return { name: agentPath, ...manifest };
}

function scanAgentDir(dir, parentPath = "") {
  const entries = [];
  if (!fs.existsSync(dir)) return entries;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    if (!item.isDirectory()) continue;
    const childPath = parentPath ? parentPath + "/" + item.name : item.name;
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

const agentPaths = scanAgentDir(AGENTS_DIR);
const agents = agentPaths.map(p => loadAgent(p)).filter(Boolean);

const topLevel = agents.filter(a => !a.name.includes("/") && !a.parent && !a.inheritsFrom);
const hierarchy = topLevel.map(tl => {
  const subAgents = (tl.subAgents || []).map(sa => {
    const sub = agents.find(a => 
      a.name === tl.name + "/" + sa.path || 
      (a.name === sa.name && (a.parent === tl.name || a.inheritsFrom === tl.name))
    );
    return {
      name: sa.name,
      path: tl.name + "/" + sa.path,
      description: sa.description,
      skills: sub?.skills || [],
      triggers: sub?.triggers || [],
      parent: tl.name,
    };
  });
  return {
    name: tl.name,
    version: tl.version,
    description: tl.description,
    runtime: tl.runtime,
    skills: tl.skills,
    triggers: tl.triggers,
    subAgents,
    api: tl.api,
  };
});

const registry = { agents, hierarchy };
fs.writeFileSync(path.join(PUBLIC_DIR, "agents-registry.json"), JSON.stringify(registry));

const htmlPath = path.join(PUBLIC_DIR, "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
const placeholder = "{{REGISTRY}}";
const idx = html.indexOf(placeholder);
if (idx !== -1) {
  html = html.replace(placeholder, JSON.stringify(registry));
  fs.writeFileSync(htmlPath, html);
}

const agentNames = agents.map(a => a.name);
console.log(`Registry built: ${agentNames.length} agents (${agentNames.join(", ")})`);
console.log(`  Hierarchy: ${hierarchy.length} top-level`);
console.log(`  Registry: ${path.join(PUBLIC_DIR, "agents-registry.json")}`);
console.log(`  Embedded in: ${htmlPath}`);
