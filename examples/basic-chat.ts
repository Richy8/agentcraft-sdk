import { Agent, Provider } from "@deskcreate/agentcraft";

// Basic chat is the smallest useful AgentCraft surface:
// - choose a provider/model from the typed Provider catalog
// - pass provider auth only where the provider needs it
// - call run() with a prompt
const agent = Agent.create({
  // gpt-4o-mini is a good default for product UX: low cost, fast, and tool-capable.
  // model is mandatory. Alternatives:
  // - Provider.openai['gpt-4o'] for higher quality
  // - Provider.anthropic['claude-sonnet-4-6'] for Anthropic
  // - Provider.ollama['llama3.2'] for local no-key usage
  model: Provider.openai["gpt-4o-mini"],
  // apiKey is mandatory for this OpenAI model. It is omitted for local providers.
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  // A plain prompt returns plain text. Add responseSchema when you need typed output.
  prompt: "Explain agent tool safety in three concise bullets.",
});

// AgentResponse also includes cost, token usage, finish reason, model, and provider.
console.log(response.content);
