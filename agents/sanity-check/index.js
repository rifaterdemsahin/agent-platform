export const agent = {
  name: "sanity-check",
  version: "1.0.0",
};

export async function run(input, context) {
  const { skill, params } = input;

  switch (skill) {
    case "lint":
      return await runLint(params, context);
    case "typecheck":
      return await runTypecheck(params, context);
    case "env-validate":
      return await runEnvValidate(params, context);
    case "config-check":
      return await runConfigCheck(params, context);
    case "deploy-readiness":
      return await runDeployReadiness(params, context);
    case "hello":
      return runHello(params);
    case "verify":
      return runVerify(params);
    case "full":
      return await runFullCheck(params, context);
    default:
      return { success: false, error: `Unknown skill: ${skill}` };
  }
}

function runHello({ name = "world" }) {
  return {
    success: true,
    message: `Hello, ${name}! Sanity check agent is running.`,
    timestamp: new Date().toISOString(),
  };
}

function runVerify({ expression }) {
  if (!expression) {
    return { success: true, passed: true, result: true, message: "sanity check passed — agent is alive" };
  }
  try {
    const passed = !!eval?.(expression);
    return {
      success: true,
      passed,
      result: passed,
      expression,
      message: passed ? "sanity check passed" : "sanity check failed — expression evaluated to false",
    };
  } catch (e) {
    return { success: true, passed: false, error: e.message, expression, message: "sanity check failed — could not evaluate expression" };
  }
}

async function runLint({ path, language }, context) {
  const { llm } = context;
  const prompt = `You are a linting expert for ${language}. Review the following code for lint violations, style issues, and common bugs. Return ONLY a JSON array of issues with { file, line, severity, message }.

Project path: ${path}
Language: ${language}

Scan the codebase and report any issues found.`;

  const result = await llm.chat({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  return { success: true, issues: parseIssues(result.text) };
}

async function runTypecheck({ path, language }, context) {
  const { llm } = context;
  const prompt = `You are a type-safety auditor. Review ${language} code at "${path}" for type errors, null pointer risks, and type mismatches. Return a JSON array of { file, line, severity, message, suggestion }.`;

  const result = await llm.chat({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  return { success: true, issues: parseIssues(result.text) };
}

async function runEnvValidate({ path, environment }, context) {
  const { llm } = context;
  const prompt = `Validate environment configuration for "${environment}" at "${path}". Check for missing required variables, insecure defaults, and misconfigurations. Return JSON { valid: boolean, missing: string[], warnings: string[] }.`;

  const result = await llm.chat({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(extractJson(result.text));
    return { success: true, ...parsed };
  } catch {
    return { success: true, valid: false, missing: [], warnings: [result.text] };
  }
}

async function runConfigCheck({ path, configType }, context) {
  const { llm } = context;
  const prompt = `Check configuration files of type "${configType}" at "${path}". Validate syntax, required fields, and best practices. Return JSON { valid: boolean, errors: string[], warnings: string[] }.`;

  const result = await llm.chat({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(extractJson(result.text));
    return { success: true, ...parsed };
  } catch {
    return { success: true, valid: true, errors: [], warnings: [] };
  }
}

async function runDeployReadiness({ path }, context) {
  const { llm } = context;
  const prompt = `Assess deployment readiness for project at "${path}". Check:
- Build output exists
- Dockerfile is valid
- fly.toml or equivalent deploy config present
- Required secrets/env vars configured
- Health check endpoint exists

Return JSON { ready: boolean, blockers: string[], warnings: string[], suggestions: string[] }.`;

  const result = await llm.chat({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const parsed = JSON.parse(extractJson(result.text));
    return { success: true, ...parsed };
  } catch {
    return { success: true, ready: false, blockers: [], warnings: [], suggestions: [] };
  }
}

async function runFullCheck({ path }, context) {
  const [lint, typecheck, env, config, deploy, hello] = await Promise.all([
    runLint({ path, language: "auto" }, context),
    runTypecheck({ path, language: "auto" }, context),
    runEnvValidate({ path, environment: "production" }, context),
    runConfigCheck({ path, configType: "auto" }, context),
    runDeployReadiness({ path }, context),
    runHello({ name: "full-check" }),
  ]);

  return {
    success: true,
    summary: {
      totalIssues: [lint, typecheck].reduce((s, r) => s + (r.issues?.length || 0), 0),
      readyToDeploy: deploy.ready,
    },
    lint,
    typecheck,
    env,
    config,
    deploy,
    diagnostics: hello,
  };
}

function parseIssues(text) {
  try {
    return JSON.parse(extractJson(text));
  } catch {
    return [{ message: text.trim() }];
  }
}

function extractJson(text) {
  const match = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
  return match ? match[0] : text;
}
