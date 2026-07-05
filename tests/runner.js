import { loadAgent, listAgents, listTopLevelAgents } from "../runtime/agent-loader.js";
import { getLLMContext } from "../runtime/llm-provider.js";

const RESULTS = { passed: [], failed: [], skipped: [] };

export async function runTests(config = {}) {
  const { provider = "deepseek", apiKey, verbose = true } = config;
  const context = await getLLMContext(provider, apiKey);

  if (verbose) {
    console.log(`\n🧪 Test Runner — LLM: ${context.provider}`);
    console.log("=".repeat(60));
  }

  const agents = listAgents();
  if (verbose) console.log(`📋 Found ${agents.length} agents to test\n`);

  for (const agent of agents) {
    await testAgent(agent, context, verbose);
  }

  printSummary();
  return RESULTS;
}

async function testAgent(agentMeta, context, verbose) {
  const { name, skills = [] } = agentMeta;
  const runtime = await import(agentMeta.path
    ? `../agents/${agentMeta.name}/index.js`
    : agentMeta.codePath);
  // Actually load via the agent-loader
  const agent = loadAgent(name);
  if (!agent) {
    RESULTS.skipped.push({ agent: name, reason: "Could not load agent" });
    return;
  }
  const mod = await import(agent.codePath);
  const isSub = name.includes("/");

  if (verbose) {
    const emoji = isSub ? "  ↳" : "📍";
    console.log(`${emoji} ${name} (${skills.length} skills)`);
  }

  for (const skill of skills) {
    await testSkill(name, skill.name, mod, context, verbose);
  }
}

async function testSkill(agentName, skillName, mod, context, verbose) {
  const testParams = getTestParams(agentName, skillName);

  try {
    const result = await mod.run({
      skill: skillName,
      params: testParams,
    }, {
      llm: context.llm,
      env: process.env,
      lastUsage: {},
    });

    if (result.success !== false && !result.error) {
      RESULTS.passed.push({ agent: agentName, skill: skillName, result: summarize(result) });
      if (verbose) console.log(`  ✅ ${skillName}`);
    } else {
      RESULTS.failed.push({ agent: agentName, skill: skillName, error: result.error || "Unknown error" });
      if (verbose) console.log(`  ⚠️  ${skillName}: ${result.error || "Unknown"}`);
    }
  } catch (err) {
    RESULTS.failed.push({ agent: agentName, skill: skillName, error: err.message });
    if (verbose) console.log(`  ❌ ${skillName}: ${err.message}`);
  }
}

function getTestParams(agentName, skillName) {
  const params = {
    "estimate-cost": { model: "claude-sonnet-4-20250514", inputTokens: 1000, outputTokens: 500, provider: "anthropic" },
    "track-usage": { projectId: "test-project", period: "daily" },
    "set-budget": { projectId: "test-project", limit: 100, period: "daily" },
    "optimize-costs": { projectId: "test-project" },
    "forecast": { projectId: "test-project", daysAhead: 7 },
    "get-status": { projectId: "test-project" },

    "track-expense": { category: "food", amount: 25.50, description: "Lunch" },
    "set-savings-goal": { goalName: "Vacation", targetAmount: 2000, deadline: "2026-12-31", monthlyContribution: 200 },
    "monthly-report": { month: 7, year: 2026 },
    "categorize-spending": { expenseDescription: "Netflix monthly subscription" },

    "lint": { path: ".", language: "javascript" },
    "typecheck": { path: ".", language: "javascript" },
    "env-validate": { path: ".", environment: "production" },
    "config-check": { path: ".", configType: "auto" },
    "deploy-readiness": { path: "." },

    "generate-storyboard": { description: "A loading spinner that morphs into a checkmark", style: "minimal" },
    "select-library": { targetPlatform: "web", complexity: "moderate", performanceBudget: "medium" },

    "render-video": { compositionId: "test-intro", outputFormat: "mp4", fps: 30, durationInFrames: 60, outputPath: "out.mp4" },
    "create-composition": { description: "Fade in title with scale animation", width: 1920, height: 1080, durationInFrames: 90, fps: 30 },
    "sequence-clips": { clips: [{ name: "intro", from: 0, durationInFrames: 30 }, { name: "main", from: 30, durationInFrames: 60 }], transitions: "fade" },
    "audio-sync": { audioSrc: "music.mp3", startFrom: 0, volume: 0.8 },
    "transitions": { type: "fade", durationInFrames: 15, direction: "both" },
    "overlays": { overlayType: "lower-third", content: "Speaker Name", position: "bottom" },
    "deploy-video": { siteName: "test-site", region: "us-east-1", memoryMb: 2048, timeout: 120 },

    "generate-lottie": { description: "A bouncing ball animation", size: "medium", loop: true },
    "optimize-lottie": { jsonSize: "medium", targetSizeKB: 50 },
    "lottie-react-guide": { animationName: "bouncing-ball", platform: "react" },
  };

  const key = skillName;
  return params[key] || { path: ".", language: "javascript" };
}

function summarize(result) {
  if (result.estimate) return `cost: $${result.estimate.costUSD}`;
  if (result.storyboard) return "storyboard generated";
  if (result.code) return `${result.type || "code"} generated (${result.code.length} chars)`;
  if (result.totalCostUSD !== undefined) return `total: $${result.totalCostUSD}`;
  if (result.budget) return `budget set: $${result.budget.limit}/${result.budget.period}`;
  if (result.lottie) return "lottie generated";
  if (result.optimizations) return `${result.optimizations.length} optimizations`;
  if (result.suggestions) return `${result.suggestions.length} suggestions`;
  return "ok";
}

function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log(`📊 Results: ${RESULTS.passed.length} passed | ${RESULTS.failed.length} failed | ${RESULTS.skipped.length} skipped`);
  if (RESULTS.failed.length) {
    console.log("\n❌ Failures:");
    RESULTS.failed.forEach(f => console.log(`  ${f.agent}/${f.skill}: ${f.error}`));
  }
  console.log("");
}
