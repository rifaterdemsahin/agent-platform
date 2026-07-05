/**
 * Lint skill — analyzes code for style violations, bugs, and anti-patterns.
 */
export async function lint({ path, language, llm }) {
  const prompt = `Lint the ${language} codebase at "${path}". Return issues as JSON array.`;
  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  return { name: "lint", result: result.content[0].text };
}

/**
 * Typecheck skill — verifies type safety across the codebase.
 */
export async function typecheck({ path, language, llm }) {
  const prompt = `Type-check the ${language} codebase at "${path}". Return type errors as JSON.`;
  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  return { name: "typecheck", result: result.content[0].text };
}

/**
 * Env validate skill — ensures environment configuration is complete.
 */
export async function envValidate({ path, environment, llm }) {
  const prompt = `Validate env config at "${path}" for "${environment}" environment.`;
  const result = await llm.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });
  return { name: "env-validate", result: result.content[0].text };
}
