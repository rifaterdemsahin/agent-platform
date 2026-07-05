export async function estimateCost({ model, inputTokens, outputTokens, provider }) {
  const pricing = {
    anthropic: {
      "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
      "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
    },
  };
  const rates = pricing[provider]?.[model];
  if (!rates) return { error: "Unknown model/provider" };
  const cost = ((inputTokens / 1_000_000) * rates.input) + ((outputTokens / 1_000_000) * rates.output);
  return { costUSD: Math.round(cost * 10000) / 10000, model, provider };
}

export async function setBudget({ projectId, limit, period, alertThreshold = 80 }) {
  return { projectId, limit, period, alertThreshold };
}

export async function trackUsage({ projectId, period }) {
  return { projectId, period, message: "Usage tracking initialized" };
}
