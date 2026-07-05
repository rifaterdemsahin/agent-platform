import { loadAgent } from "../../runtime/agent-loader.js";

const budgets = new Map();

export const agent = { name: "budget", version: "1.0.0", parent: true };

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "set-budget":
      return setBudget(params);
    case "get-status":
      return getStatus(params, context);
    default:
      return { success: false, error: `Unknown skill: ${skill}. Try sub-agents: llm-budget, personal-budget` };
  }
}

function setBudget({ projectId, limit, period, alertThreshold = 80 }) {
  budgets.set(projectId, { limit, period, alertThreshold });
  return { success: true, budget: { projectId, limit, period, alertThreshold } };
}

async function getStatus({ projectId }, context) {
  const budget = budgets.get(projectId);
  const llmAgent = loadAgent("budget/llm-budget");
  const personalAgent = loadAgent("budget/personal-budget");

  return {
    success: true,
    projectId,
    budget: budget || null,
    subAgents: {
      "llm-budget": llmAgent ? { loaded: true, skills: llmAgent.manifest.skills?.length || 0 } : { loaded: false },
      "personal-budget": personalAgent ? { loaded: true, skills: personalAgent.manifest.skills?.length || 0 } : { loaded: false },
    },
  };
}
