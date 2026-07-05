export const agent = { name: "motion", version: "1.0.0", parent: "animation" };

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "generate-framer":
      return generateFramer(params, context);
    case "generate-gsap":
      return generateGSAP(params, context);
    case "generate-keyframes":
      return generateKeyframes(params, context);
    case "explain-easing":
      return explainEasing(params);
    default:
      return { success: false, error: `Unknown skill: ${skill}` };
  }
}

async function generateFramer({ description, componentType }, context) {
  const { llm } = context;
  const prompt = `Generate a Framer Motion React component for a "${componentType}" animation. Description: "${description}". Return ONLY the JSX/TS code with imports. Use motion.div, AnimatePresence, variants.`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  return { success: true, code: result.content[0].text, type: "framer-motion", componentType };
}

async function generateGSAP({ description, targetSelector, timeline }, context) {
  const { llm } = context;
  const prompt = `Generate GSAP animation code. Target: "${targetSelector}". Description: "${description}". ${timeline ? "Use a GSAP timeline." : "Use gsap.to/from."} Return ONLY the JavaScript code with gsap import.`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  return { success: true, code: result.content[0].text, type: "gsap", targetSelector };
}

async function generateKeyframes({ name, description, duration, easing }, context) {
  const { llm } = context;
  const prompt = `Generate CSS @keyframes animation named "${name}". Description: "${description}". Duration: ${duration}. Easing: ${easing}. Return ONLY valid CSS code.`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  return { success: true, code: result.content[0].text, type: "css-keyframes", name };
}

function explainEasing({ feel }) {
  const easings = {
    bouncy: "cubic-bezier(0.68, -0.55, 0.27, 1.55) — overshoots and settles. Best for playful UI elements.",
    smooth: "cubic-bezier(0.4, 0, 0.2, 1) — Material Design standard. Natural deceleration.",
    sharp: "cubic-bezier(0.4, 0, 1, 1) — fast start, no deceleration. Good for exits/dismissals.",
    spring: "Framer Motion spring: { type: 'spring', stiffness: 100, damping: 10 }. Physical spring feel.",
    elastic: "cubic-bezier(0.68, -0.6, 0.32, 1.6) or GSAP elastic. Strong overshoot oscillation.",
  };
  return { success: true, feel, easing: easings[feel] || easings.smooth };
}
