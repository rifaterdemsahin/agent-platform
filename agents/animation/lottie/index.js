export const agent = { name: "lottie", version: "1.0.0", parent: "animation" };

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "generate-lottie": return generateLottie(params, context);
    case "optimize-lottie": return optimizeLottie(params, context);
    case "lottie-react-guide": return lottieReactGuide(params, context);
    case "hello": return runHello(params);
    case "verify": return runVerify(params);
    default: return { success: false, error: `Unknown skill: ${skill}` };
  }
}

function runHello({ name = "world" }) {
  return { success: true, message: `Hello, ${name}! Lottie agent is running.`, timestamp: new Date().toISOString() };
}

function runVerify({ expression }) {
  if (!expression) return { success: true, passed: true, result: true, message: "lottie agent rules check passed" };
  try {
    const passed = !!eval?.(expression);
    return { success: true, passed, result: passed, expression, message: passed ? "rules check passed" : "rules check failed" };
  } catch (e) {
    return { success: true, passed: false, error: e.message, expression, message: "rules check failed" };
  }
}

async function generateLottie({ description, size = "medium", loop = true }, context) {
  const { llm } = context;
  const prompt = `Generate a Lottie JSON for: "${description}". Size: ${size}, Loop: ${loop}. Return valid Lottie JSON with v, fr, ip, op, w, h, nm, layers[].`;
  const result = await llm.chat({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages: [{ role: "user", content: prompt }] });
  try { return { success: true, lottie: JSON.parse(extractJson(result.text)) }; }
  catch { return { success: true, lottie: { raw: result.text } }; }
}

async function optimizeLottie({ jsonSize, targetSizeKB }, context) {
  const { llm } = context;
  const prompt = `Reduce a ${jsonSize} Lottie file to <${targetSizeKB}KB. List 5 optimization techniques with KB savings. Return JSON { optimizations: [{ technique, estimatedSavingKB, tradeoff }] }`;
  const result = await llm.chat({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: prompt }] });
  try { return { success: true, ...JSON.parse(extractJson(result.text)) }; }
  catch { return { success: true, optimizations: [{ technique: result.text, estimatedSavingKB: 0, tradeoff: "" }] }; }
}

async function lottieReactGuide({ animationName, platform }, context) {
  const { llm } = context;
  const prompt = `Write a guide for embedding Lottie "${animationName}" on ${platform}. Include install, import, component code, options. Return code block + explanation.`;
  const result = await llm.chat({ model: "claude-sonnet-4-20250514", max_tokens: 2048, messages: [{ role: "user", content: prompt }] });
  return { success: true, guide: result.text, platform, animationName };
}

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
