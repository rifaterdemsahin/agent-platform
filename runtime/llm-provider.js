import OpenAI from "openai";

export function createLLM(provider = "deepseek", apiKey) {
  switch (provider) {
    case "deepseek":
      return createDeepSeek(apiKey);
    case "anthropic":
    default:
      return createAnthropic(apiKey);
  }
}

async function createAnthropic(apiKey) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return {
    provider: "anthropic",
    client: new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY }),
    async chat({ model = "claude-sonnet-4-20250514", messages, max_tokens = 4096 }) {
      const res = await this.client.messages.create({ model, max_tokens, messages });
      return { text: res.content[0].text, usage: res.usage };
    },
  };
}

function createDeepSeek(apiKey) {
  const key = apiKey || process.env.DEEPSEEK_API_KEY;
  const openai = new OpenAI({
    baseURL: "https://api.deepseek.com",
    apiKey: key,
  });
  return {
    provider: "deepseek",
    client: openai,
    async chat({ model = "deepseek-v4-flash", messages, max_tokens = 4096 }) {
      const compatible = messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: typeof m.content === "string" ? m.content : m.content.map(c => c.text || "").join(""),
      }));
      const res = await this.client.chat.completions.create({
        model, messages: compatible, max_tokens,
      });
      return {
        text: res.choices[0].message.content,
        usage: {
          input_tokens: res.usage?.prompt_tokens || 0,
          output_tokens: res.usage?.completion_tokens || 0,
        },
      };
    },
  };
}

export async function getLLMContext(provider, apiKey) {
  const llm = await createLLM(provider, apiKey);
  return {
    llm,
    provider,
    lastUsage: {},
  };
}
