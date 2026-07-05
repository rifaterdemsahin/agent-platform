import { loadAgent } from "../runtime/agent-loader.js";
import { getLLMContext } from "../runtime/llm-provider.js";

const agentName = "sanity-check";

export async function testSanityCheck(provider = "deepseek", apiKey) {
  const context = await getLLMContext(provider, apiKey);
  const agent = loadAgent(agentName);
  if (!agent) throw new Error(`Agent ${agentName} not found`);

  const mod = await import(agent.codePath);
  console.log(`🛡 Testing ${agentName} (${agent.manifest.skills.length} skills)`);

  const results = [];

  for (const skill of agent.manifest.skills) {
    try {
      const result = await mod.run({
        skill: skill.name,
        params: { path: ".", language: "javascript", environment: "production", configType: "auto" },
      }, context);
      const passed = result.success !== false && !result.error;
      results.push({ skill: skill.name, passed, result: passed ? "✓" : result.error });
      console.log(`  ${passed ? "✅" : "❌"} ${skill.name}`);
    } catch (err) {
      results.push({ skill: skill.name, passed: false, result: err.message });
      console.log(`  ❌ ${skill.name}: ${err.message}`);
    }
  }

  return results;
}
