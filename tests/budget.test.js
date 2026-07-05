import { loadAgent } from "../runtime/agent-loader.js";
import { getLLMContext } from "../runtime/llm-provider.js";

export async function testBudgetAgent(provider = "deepseek", apiKey) {
  const context = await getLLMContext(provider, apiKey);
  const parents = ["budget"];
  const subs = ["budget/llm-budget", "budget/personal-budget"];
  const allAgents = [...parents, ...subs];

  console.log(`💰 Testing budget family (${allAgents.length} agents)`);

  const results = [];

  for (const name of allAgents) {
    const agent = loadAgent(name);
    if (!agent) { results.push({ agent: name, passed: false, result: "Not found" }); continue; }
    const mod = await import(agent.codePath);

    for (const skill of agent.manifest.skills) {
      try {
        const params = skill.name === "categorize-spending"
          ? { expenseDescription: "Netflix subscription" }
          : skill.name === "forecast"
            ? { projectId: "test", daysAhead: 7 }
            : skill.name === "track-usage"
              ? { projectId: "test", period: "daily" }
              : skill.name === "monthly-report"
                ? { month: 7, year: 2026 }
                : { projectId: "test", period: "daily", limit: 100, alertThreshold: 80, model: "claude-sonnet-4-20250514", inputTokens: 1000, outputTokens: 500, provider: "anthropic", category: "food", amount: 25, description: "Test", goalName: "TestGoal", targetAmount: 1000, deadline: "2026-12-31", monthlyContribution: 100 };

        const result = await mod.run({ skill: skill.name, params }, context);
        const passed = result.success !== false && !result.error;
        results.push({ agent: name, skill: skill.name, passed, result: passed ? "✓" : result.error });
        console.log(`  ${passed ? "✅" : "❌"} ${name}/${skill.name}`);
      } catch (err) {
        results.push({ agent: name, skill: skill.name, passed: false, result: err.message });
        console.log(`  ❌ ${name}/${skill.name}: ${err.message}`);
      }
    }
  }

  return results;
}
