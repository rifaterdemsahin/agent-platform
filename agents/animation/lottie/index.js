export const agent = { name: "lottie", version: "1.0.0", parent: "animation" };

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "generate-lottie":
      return generateLottie(params, context);
    case "optimize-lottie":
      return optimizeLottie(params, context);
    case "lottie-react-guide":
      return lottieReactGuide(params, context);
    default:
      return { success: false, error: `Unknown skill: ${skill}` };
  }
}

async function generateLottie({ description, size = "medium", loop = true }, context) {
  const { llm } = context;
  const prompt = `Generate a Lottie animation JSON specification for: "${description}". Size: ${size} (width/height). Loop: ${loop}. Return a valid Lottie JSON structure with: v (version), fr (framerate), ip (in-point), op (out-point), w (width), h (height), nm (name), layers array with shapes. Keep it simple but valid.`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const json = JSON.parse(extractJson(result.content[0].text));
    return { success: true, lottie: json };
  } catch {
    return { success: true, lottie: { raw: result.content[0].text, error: "Could not parse as JSON" } };
  }
}

async function optimizeLottie({ jsonSize, targetSizeKB }, context) {
  const { llm } = context;
  const prompt = `A Lottie animation file is ${jsonSize} and needs to be reduced to under ${targetSizeKB}KB. List 5 specific optimization techniques with estimated KB savings each. Return JSON { optimizations: [{ technique: string, estimatedSavingKB: number, tradeoff: string }] }`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(extractJson(result.content[0].text));
    return { success: true, ...parsed };
  } catch {
    return { success: true, optimizations: [{ technique: result.content[0].text, estimatedSavingKB: 0, tradeoff: "" }] };
  }
}

async function lottieReactGuide({ animationName, platform }, context) {
  const { llm } = context;
  const prompt = `Write a guide for embedding a Lottie animation named "${animationName}" on ${platform}. Include: install command, import, component code, and options (loop, autoplay, speed). Return ONLY the code block and a short explanation.`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  return { success: true, guide: result.content[0].text, platform, animationName };
}

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
