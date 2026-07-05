export const agent = { name: "remotion", version: "1.0.0", parent: "animation" };

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "render-video": return renderVideo(params, context);
    case "create-composition": return createComposition(params, context);
    case "sequence-clips": return sequenceClips(params, context);
    case "audio-sync": return audioSync(params, context);
    case "transitions": return transitions(params, context);
    case "overlays": return overlays(params, context);
    case "deploy-video": return deployVideo(params, context);
    case "hello": return runHello(params);
    case "verify": return runVerify(params);
    default: return { success: false, error: `Unknown skill: ${skill}` };
  }
}

function runHello({ name = "world" }) {
  return { success: true, message: `Hello, ${name}! Remotion agent is running.`, timestamp: new Date().toISOString() };
}

function runVerify({ expression }) {
  if (!expression) return { success: true, passed: true, result: true, message: "remotion agent rules check passed" };
  try {
    const passed = !!eval?.(expression);
    return { success: true, passed, result: passed, expression, message: passed ? "rules check passed" : "rules check failed" };
  } catch (e) {
    return { success: true, passed: false, error: e.message, expression, message: "rules check failed" };
  }
}

async function renderVideo({ compositionId, outputFormat = "mp4", fps = 30, durationInFrames, outputPath }, context) {
  const { llm } = context;
  const prompt = `Generate the Remotion render command and React composition for "${compositionId}". Format: ${outputFormat}, FPS: ${fps}, Duration: ${durationInFrames} frames, Output: ${outputPath}.

Return JSON: { cliCommand, compositionCode, props }`;
  const result = await llm.chat({ model: "claude-sonnet-4-20250514", max_tokens: 2048, messages: [{ role: "user", content: prompt }] });
  try { return { success: true, ...JSON.parse(extractJson(result.text)) }; }
  catch { return { success: true, render: { cliCommand: `npx remotion render ${compositionId} ${outputPath}`, code: result.text } }; }
}

async function createComposition({ description, width = 1920, height = 1080, durationInFrames, fps = 30 }, context) {
  const { llm } = context;
  const prompt = `Generate a Remotion React composition. ${width}x${height}, ${durationInFrames}f, ${fps}fps. "${description}". Use useCurrentFrame, interpolate, spring, AbsoluteFill, Sequence from remotion. Return ONLY the React component code.`;
  const result = await llm.chat({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages: [{ role: "user", content: prompt }] });
  return { success: true, code: result.text, config: { width, height, durationInFrames, fps } };
}

async function sequenceClips({ clips, transitions: trans }, context) {
  const { llm } = context;
  const prompt = `Generate a Remotion component that sequences clips using <Sequence>. Clips: ${JSON.stringify(clips)}. Transition: ${trans}. Return ONLY React code.`;
  const result = await llm.chat({ model: "claude-sonnet-4-20250514", max_tokens: 4096, messages: [{ role: "user", content: prompt }] });
  return { success: true, code: result.text, clipCount: clips.length };
}

async function audioSync({ audioSrc, startFrom = 0, volume = 1.0 }, context) {
  const { llm } = context;
  const prompt = `Generate Remotion React code to sync audio. Source: "${audioSrc}", Start: ${startFrom}, Volume: ${volume}. Use <Audio>, useCurrentFrame. Return ONLY code.`;
  const result = await llm.chat({ model: "claude-sonnet-4-20250514", max_tokens: 2048, messages: [{ role: "user", content: prompt }] });
  return { success: true, code: result.text, audioSrc, startFrom };
}

async function transitions({ type, durationInFrames, direction = "both" }, context) {
  const { llm } = context;
  const map = { fade: "opacity", slide: "translateX/translateY", wipe: "clip-path", scale: "scale transform", flip: "3D rotateY + perspective", spring: "spring({ frame, fps })" };
  const prompt = `Generate a reusable Remotion transition function. ${type} (${map[type] || ""}). ${durationInFrames}f, ${direction}. Export as transition(frame, duration). Return ONLY code.`;
  const result = await llm.chat({ model: "claude-sonnet-4-20250514", max_tokens: 2048, messages: [{ role: "user", content: prompt }] });
  return { success: true, code: result.text, type, durationInFrames };
}

async function overlays({ overlayType, content, position }, context) {
  const { llm } = context;
  const prompt = `Generate a Remotion overlay component. Type: ${overlayType}, "${content}", Position: ${position}. Use <AbsoluteFill>, spring/interpolate, CSS. Return ONLY code.`;
  const result = await llm.chat({ model: "claude-sonnet-4-20250514", max_tokens: 2048, messages: [{ role: "user", content: prompt }] });
  return { success: true, code: result.text, overlayType, position };
}

async function deployVideo({ siteName, region = "us-east-1", memoryMb = 2048, timeout = 120 }, context) {
  const { llm } = context;
  const prompt = `Generate Remotion Lambda deploy config for "${siteName}" in ${region}. ${memoryMb}MB, ${timeout}s. Return JSON { commands: string[], lambdaConfig: object, envVars: string[] }`;
  const result = await llm.chat({ model: "claude-sonnet-4-20250514", max_tokens: 2048, messages: [{ role: "user", content: prompt }] });
  try { return { success: true, ...JSON.parse(extractJson(result.text)) }; }
  catch { return { success: true, code: result.text }; }
}

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
