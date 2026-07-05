import { loadAgent } from "../runtime/agent-loader.js";
import { getLLMContext } from "../runtime/llm-provider.js";

export async function testAnimationAgent(provider = "deepseek", apiKey) {
  const context = await getLLMContext(provider, apiKey);
  const parents = ["animation"];
  const subs = ["animation/remotion", "animation/lottie"];
  const allAgents = [...parents, ...subs];

  console.log(`🎬 Testing animation family (${allAgents.length} agents)`);

  const results = [];

  for (const name of allAgents) {
    const agent = loadAgent(name);
    if (!agent) { results.push({ agent: name, passed: false, result: "Not found" }); continue; }
    const mod = await import(agent.codePath);

    for (const skill of agent.manifest.skills) {
      try {
        const params = getAnimationParams(name, skill.name);
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

function getAnimationParams(agentName, skillName) {
  if (agentName.includes("remotion")) {
    const map = {
      "render-video": { compositionId: "test", outputFormat: "mp4", fps: 30, durationInFrames: 60, outputPath: "out.mp4" },
      "create-composition": { description: "Fade in title", width: 1920, height: 1080, durationInFrames: 90, fps: 30 },
      "sequence-clips": { clips: [{ name: "a", from: 0, durationInFrames: 30 }], transitions: "fade" },
      "audio-sync": { audioSrc: "test.mp3", startFrom: 0, volume: 0.8 },
      "transitions": { type: "fade", durationInFrames: 15, direction: "both" },
      "overlays": { overlayType: "lower-third", content: "Test", position: "bottom" },
      "deploy-video": { siteName: "test", region: "us-east-1", memoryMb: 2048, timeout: 120 },
    };
    return map[skillName] || { description: "test" };
  }
  if (agentName.includes("lottie")) {
    const map = {
      "generate-lottie": { description: "Bouncing ball", size: "medium", loop: true },
      "optimize-lottie": { jsonSize: "medium", targetSizeKB: 50 },
      "lottie-react-guide": { animationName: "test", platform: "react" },
    };
    return map[skillName] || { description: "test" };
  }
  return { description: "A test animation", style: "minimal", targetPlatform: "web", complexity: "moderate", performanceBudget: "medium" };
}
