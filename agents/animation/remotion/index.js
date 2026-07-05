export const agent = { name: "remotion", version: "1.0.0", parent: "animation" };

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "render-video":
      return renderVideo(params, context);
    case "create-composition":
      return createComposition(params, context);
    case "sequence-clips":
      return sequenceClips(params, context);
    case "audio-sync":
      return audioSync(params, context);
    case "transitions":
      return transitions(params, context);
    case "overlays":
      return overlays(params, context);
    case "deploy-video":
      return deployVideo(params, context);
    default:
      return { success: false, error: `Unknown skill: ${skill}` };
  }
}

async function renderVideo({ compositionId, outputFormat = "mp4", fps = 30, durationInFrames, outputPath }, context) {
  const { llm } = context;
  const prompt = `Generate the Remotion render command and React composition for "${compositionId}". Format: ${outputFormat}, FPS: ${fps}, Duration: ${durationInFrames} frames, Output: ${outputPath}.

Return JSON with:
- cliCommand: the npx remotion render command
- compositionCode: the React component code with registerRoot()
- props: any props the composition needs`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(extractJson(result.content[0].text));
    return { success: true, ...parsed };
  } catch {
    return { success: true, render: { cliCommand: `npx remotion render ${compositionId} ${outputPath}`, code: result.content[0].text } };
  }
}

async function createComposition({ description, width = 1920, height = 1080, durationInFrames, fps = 30 }, context) {
  const { llm } = context;
  const prompt = `Generate a Remotion React composition component. Width: ${width}, Height: ${height}, Duration: ${durationInFrames} frames, FPS: ${fps}.

Description: "${description}"

Include imports from remotion:
import { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill, Sequence } from 'remotion';

Return ONLY the complete React component code with the Composition wrapper. Use interpolate for smooth animations, spring for bouncy effects.`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  return {
    success: true,
    code: result.content[0].text,
    config: { width, height, durationInFrames, fps },
  };
}

async function sequenceClips({ clips, transitions: trans }, context) {
  const { llm } = context;
  const clipboard = JSON.stringify(clips);
  const prompt = `Generate a Remotion React component that sequences these clips using <Sequence>:

Clips: ${clipboard}
Transition style: ${trans}

Each clip should use <Sequence from={frameOffset} durationInFrames={clip.durationInFrames}>. Add transition effects (${trans}) between sequences using opacity/animation.
Return ONLY the React code with imports.`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  return { success: true, code: result.content[0].text, clipCount: clips.length };
}

async function audioSync({ audioSrc, startFrom = 0, volume = 1.0 }, context) {
  const { llm } = context;
  const prompt = `Generate Remotion React code to sync audio. Audio source: "${audioSrc}", Start from frame: ${startFrom}, Volume: ${volume}.

Use <Audio> from @remotion/player or remotion. Include:
- Audio import and component
- Volume control with interpolate
- Sync logic with useCurrentFrame
Return ONLY the React code.`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  return { success: true, code: result.content[0].text, audioSrc, startFrom };
}

async function transitions({ type, durationInFrames, direction = "both" }, context) {
  const { llm } = context;
  const transitionMap = {
    fade: "Opacity transition: interpolate(frame, [0, duration], [0, 1], { extrapolateRight: 'clamp' })",
    slide: "Slide transition: interpolate translateX/translateY over frames",
    wipe: "Wipe transition: clip-path animation revealing content",
    scale: "Scale transition: interpolate transform scale(0) → scale(1)",
    flip: "Flip transition: 3D rotateY using perspective + spring",
    spring: "Spring-based transition: spring({ frame, fps, config: { damping: 200 } })",
  };

  const prompt = `Generate a reusable Remotion transition component. Type: ${type} (${transitionMap[type] || ""}), Duration: ${durationInFrames} frames, Direction: ${direction}.

Export a function: transition(frame, durationInFrames) that returns a style object or component.

Return ONLY the React/TypeScript code with remotion imports.`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  return { success: true, code: result.content[0].text, type, durationInFrames };
}

async function overlays({ overlayType, content, position }, context) {
  const { llm } = context;
  const prompt = `Generate a Remotion overlay component. Type: ${overlayType}, Content: "${content}", Position: ${position}.

Include:
- <AbsoluteFill> for full-screen overlay
- Positioning with CSS (flexbox or absolute)
- Animation entrance/exit (spring or interpolate)
- Styling for ${overlayType} (captions have semi-transparent bg, watermarks are faint, lower-thirds are bars at bottom)

Return ONLY the React component code with remotion imports.`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  return { success: true, code: result.content[0].text, overlayType, position };
}

async function deployVideo({ siteName, region = "us-east-1", memoryMb = 2048, timeout = 120 }, context) {
  const { llm } = context;
  const prompt = `Generate a Remotion Lambda deployment config for site "${siteName}" in ${region}. Memory: ${memoryMb}MB, Timeout: ${timeout}s.

Include:
1. CLI commands to deploy (npx remotion lambda sites create, npx remotion lambda render)
2. renderMediaOnLambda() config object
3. .env variables needed (REMOTION_AWS_ACCESS_KEY_ID, REMOTION_AWS_SECRET_ACCESS_KEY)

Return JSON with { commands: string[], lambdaConfig: object, envVars: string[] }`;

  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514", max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(extractJson(result.content[0].text));
    return { success: true, ...parsed };
  } catch {
    return { success: true, code: result.content[0].text };
  }
}

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
