export const agent = { name: "budget", version: "1.0.0", parent: true };

const budgets = new Map();

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "set-budget":
      return setBudget(params);
    case "get-status":
      return getStatus(params);
    case "hello":
      return runHello(params);
    case "verify":
      return runVerify(params);
    default:
      return { success: false, error: `Unknown skill: ${skill}. Try sub-agents: llm-budget, personal-budget` };
  }
}

function runHello({ name = "world" }) {
  return {
    success: true,
    message: `Hello, ${name}! Budget agent is running.`,
    timestamp: new Date().toISOString(),
  };
}

function runVerify({ expression }) {
  if (!expression) {
    return { success: true, passed: true, result: true, message: "budget agent is alive and verified" };
  }
  try {
    const passed = !!eval?.(expression);
    return { success: true, passed, result: passed, expression, message: passed ? "rules check passed" : "rules check failed" };
  } catch (e) {
    return { success: true, passed: false, error: e.message, expression, message: "rules check failed — could not evaluate" };
  }
}

function setBudget({ projectId, limit, period, alertThreshold = 80 }) {
  budgets.set(projectId, { limit, period, alertThreshold });
  return { success: true, budget: { projectId, limit, period, alertThreshold } };
}

function getStatus({ projectId }) {
  const budget = budgets.get(projectId);
  return { success: true, projectId, budget: budget || null };
}
