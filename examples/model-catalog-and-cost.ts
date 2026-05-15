import { Agent, Provider } from "@deskcreate/agentcraft";

const model = Provider.openai["gpt-4o-mini"];

const info = Agent.inspect(model);
console.log({
  provider: info.provider,
  model: info.model,
  contextWindow: info.capabilities.contextWindow,
  supportsTools: info.capabilities.tools,
  supportsVision: info.capabilities.vision,
  pricing: info.pricing,
});

const toolCapableModels = Agent.catalog({
  // Filters are optional. Use them to build model pickers, routing rules, or
  // product eligibility checks before users choose a model.
  tools: true,
  streaming: true,
  minQuality: 0.7,
});

console.log(
  "Tool-capable streaming models:",
  toolCapableModels.map((entry) => `${entry.provider}:${entry.model}`),
);

const estimate = Agent.estimateCost(model, {
  prompt: "Draft a short product update.",
  maxTokens: 500,
  budget: {
    // costOptions is optional. Use it when estimating cached-input discounts,
    // provider-specific adjustments, or billing previews.
    costOptions: { batch: false, priority: false, toolCalls: 0 },
  },
});

console.log({
  estimatedTokens: estimate.tokens.total,
  estimatedCost: estimate.estimatedCost,
  stalePricing: estimate.stalePricing,
});
