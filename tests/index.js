import { runTests } from "./runner.js";

const provider = process.env.TEST_LLM || "deepseek";
const apiKey = process.env.DEEPSEEK_API_KEY || process.env.ANTHROPIC_API_KEY;

console.log("🧪 Agent Platform Test Suite");
console.log(`🔌 LLM Provider: ${provider}`);
console.log("=".repeat(60));

try {
  await runTests({ provider, apiKey, verbose: true });
  console.log("✅ All test suites complete");
} catch (err) {
  console.error("❌ Test suite failed:", err.message);
  process.exit(1);
}
