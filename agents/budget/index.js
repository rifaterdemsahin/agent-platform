const budgets = new Map();
const usageLogs = new Map();

export const agent = {
  name: "budget",
  version: "1.0.0",
};

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "estimate-cost":
      return estimateCost(params, context);
    case "track-usage":
      return trackUsage(params, context);
    case "set-budget":
      return setBudget(params, context);
    case "optimize-costs":
      return optimizeCosts(params, context);
    case "forecast":
      return forecast(params, context);
    default:
      return { success: false, error: `Unknown skill: ${skill}` };
  }
}

function estimateCost({ model, inputTokens, outputTokens, provider }) {
  const pricing = {
    anthropic: {
      "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
      "claude-opus-4-20250514": { input: 15.0, output: 75.0 },
      "claude-haiku": { input: 0.80, output: 4.0 },
    },
    openai: {
      "gpt-4o": { input: 2.50, output: 10.0 },
      "gpt-4o-mini": { input: 0.15, output: 0.60 },
    },
    google: {
      "gemini-2.5-pro": { input: 1.25, output: 10.0 },
      "gemini-2.5-flash": { input: 0.15, output: 0.60 },
    },
  };

  const rates = pricing[provider]?.[model];
  if (!rates) {
    return { success: false, error: `Unknown model/provider: ${provider}/${model}` };
  }

  const cost = ((inputTokens / 1_000_000) * rates.input) + ((outputTokens / 1_000_000) * rates.output);
  return {
    success: true,
    estimate: {
      model,
      provider,
      inputTokens,
      outputTokens,
      costUSD: Math.round(cost * 10000) / 10000,
      pricing: rates,
    },
  };
}

function trackUsage({ projectId, period }, context) {
  const logs = usageLogs.get(projectId) || [];
  const now = Date.now();

  logs.push({
    timestamp: now,
    callId: `call_${logs.length + 1}`,
    ...context.lastUsage,
  });

  usageLogs.set(projectId, logs);

  const filtered = filterByPeriod(logs, period, now);
  const totalCost = filtered.reduce((sum, l) => sum + (l.cost || 0), 0);
  const totalTokens = filtered.reduce((sum, l) => sum + (l.inputTokens || 0) + (l.outputTokens || 0), 0);

  const budget = budgets.get(projectId);
  let alerts = [];
  if (budget && budget.period === period) {
    const pct = (totalCost / budget.limit) * 100;
    if (pct >= budget.alertThreshold) {
      alerts.push({
        level: pct >= 100 ? "critical" : "warning",
        message: `${period} spend $${totalCost.toFixed(4)} is ${pct.toFixed(1)}% of $${budget.limit} limit`,
      });
    }
  }

  return {
    success: true,
    projectId,
    period,
    totalCostUSD: Math.round(totalCost * 10000) / 10000,
    totalTokens,
    callCount: filtered.length,
    alerts,
  };
}

function setBudget({ projectId, limit, period, alertThreshold = 80 }) {
  budgets.set(projectId, { limit, period, alertThreshold });
  return {
    success: true,
    budget: { projectId, limit, period, alertThreshold },
  };
}

async function optimizeCosts({ projectId }, context) {
  const logs = usageLogs.get(projectId) || [];
  if (logs.length === 0) {
    return { success: true, suggestions: ["No usage data yet. Start tracking to get optimization suggestions."] };
  }

  const { llm } = context;
  const usageSummary = logs.slice(-100).map(l => ({
    time: new Date(l.timestamp).toISOString(),
    cost: l.cost,
    inputTokens: l.inputTokens,
    outputTokens: l.outputTokens,
    model: l.model,
  }));

  const prompt = `Analyze this LLM usage and suggest 3-5 cost optimizations:
${JSON.stringify(usageSummary, null, 2)}

Return JSON { suggestions: [{ action: string, estimatedSavingPercent: number, reasoning: string }] }`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(extractJson(result.content[0].text));
    return { success: true, ...parsed };
  } catch {
    return { success: true, suggestions: [{ action: result.content[0].text, estimatedSavingPercent: 0, reasoning: "" }] };
  }
}

async function forecast({ projectId, daysAhead }, context) {
  const logs = usageLogs.get(projectId) || [];
  if (logs.length < 2) {
    return { success: false, error: "Need at least 2 data points for forecasting" };
  }

  const { llm } = context;
  const dailyCosts = aggregateDaily(logs);

  const prompt = `Given daily LLM costs: ${JSON.stringify(dailyCosts)}, forecast costs for the next ${daysAhead} days. Consider trend direction and volatility. Return JSON { dailyForecast: [{ date: string, estimatedCost: number }], totalForecastCost: number, confidence: 'low'|'medium'|'high' }`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(extractJson(result.content[0].text));
    return { success: true, ...parsed };
  } catch {
    return { success: true, message: result.content[0].text };
  }
}

function filterByPeriod(logs, period, now) {
  const ms = { daily: 86400000, weekly: 604800000, monthly: 2592000000, total: Infinity };
  const cutoff = now - (ms[period] || ms.total);
  return logs.filter(l => l.timestamp >= cutoff);
}

function aggregateDaily(logs) {
  const days = {};
  for (const l of logs) {
    const d = new Date(l.timestamp).toISOString().split("T")[0];
    days[d] = (days[d] || 0) + (l.cost || 0);
  }
  return Object.entries(days).map(([date, cost]) => ({ date, cost: Math.round(cost * 10000) / 10000 }));
}

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
