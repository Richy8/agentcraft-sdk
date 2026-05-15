import { Agent, Provider } from "@deskcreate/agentcraft";

// Local models are valuable when prompts or files should stay on your machine.
// This assumes Ollama is running an OpenAI-compatible endpoint locally.
const agent = Agent.create({
  // Provider.ollama['llama3.2'] expands to an ollama-prefixed model string.
  // You can use other installed Ollama models via raw strings such as
  // 'ollama:llama3.1' if they are not in the typed catalog.
  model: Provider.ollama["llama3.2"],
  // No API key is needed for the built-in Ollama provider.
  // Optional baseUrl can point at a non-default Ollama endpoint.
  // baseUrl: process.env.OLLAMA_BASE_URL,
});

const response = await agent.run({
  prompt: "Explain what data never leaves the machine in this setup.",
  // Local models are not billed by AgentCraft, so cost should be zero.
  // maxCost is optional; here it documents/enforces the no-metered-cost expectation.
  budget: { maxCost: 0 },
});

console.log(response.content);
