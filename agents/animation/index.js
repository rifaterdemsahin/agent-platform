export const agent = { name: "animation", version: "1.0.0", parent: true };

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "generate-storyboard":
      return generateStoryboard(params, context);
    case "select-library":
      return selectLibrary(params);
    case "hello":
      return runHello(params);
    case "verify":
      return runVerify(params);
    default:
      return {
        success: false,
        error: `Unknown skill: ${skill}. Try sub-agents: remotion (React video rendering), lottie (Lottie/Bodymovin)`,
      };
  }
}

function runHello({ name = "world" }) {
  return {
    success: true,
    message: `Hello, ${name}! Animation agent is running.`,
    timestamp: new Date().toISOString(),
  };
}

function runVerify({ expression }) {
  if (!expression) {
    return { success: true, passed: true, result: true, message: "animation agent is alive and verified" };
  }
  try {
    const passed = !!eval?.(expression);
    return { success: true, passed, result: passed, expression, message: passed ? "rules check passed" : "rules check failed" };
  } catch (e) {
    return { success: true, passed: false, error: e.message, expression, message: "rules check failed — could not evaluate" };
  }
}

async function generateStoryboard({ description, style = "minimal" }, context) {
  const { llm } = context;
  const prompt = `Create a 4-panel animation storyboard for: "${description}". Style: ${style}. Return JSON { panels: [{ number: number, description: string, duration: string, elements: string[], transition: string }] }`;

  const result = await llm.chat({
    model: "claude-sonnet-4-20250514", max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(extractJson(result.text));
    return { success: true, storyboard: parsed };
  } catch {
    return { success: true, storyboard: { raw: result.text } };
  }
}

function selectLibrary({ targetPlatform, complexity, performanceBudget }) {
  const recommendations = {
    web: { simple: "CSS transitions/animations", moderate: "Framer Motion", complex: "Remotion (React video)" },
    react: { simple: "Framer Motion", moderate: "Remotion + compositions", complex: "Remotion + Lambda rendering" },
    "react-native": { simple: "Animated API", moderate: "Reanimated 2", complex: "Reanimated 2 + Lottie" },
    ios: { simple: "UIView.animate", moderate: "UIKit Dynamics", complex: "Lottie" },
    android: { simple: "ViewPropertyAnimator", moderate: "MotionLayout", complex: "Lottie" },
  };

  const recommendation = recommendations[targetPlatform]?.[complexity] || "Framer Motion";
  return {
    success: true,
    recommendation,
    targetPlatform,
    complexity,
    performanceBudget,
  };
}

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
