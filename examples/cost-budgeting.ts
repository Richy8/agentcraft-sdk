import { Agent, Provider } from "agentcraft";

// Estimate before spending. This is useful for UI previews, admission control,
// and choosing between model tiers.
const estimate = Agent.estimateCost(Provider.openai["gpt-4o-mini"], {
  // prompt is required for token estimation unless you are estimating a promptFile flow elsewhere.
  prompt: "Draft a short product update.",
  // maxTokens is optional. It caps expected completion tokens for the estimate/run.
  // If omitted, AgentCraft uses model/config defaults.
  maxTokens: 500,
});

console.log("Estimated cost:", estimate.estimatedCost);

const agent = Agent.create({
  // You can compare this with Provider.openai['gpt-4o'] to see the cost/quality tradeoff.
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Draft a short product update.",
  maxTokens: 500,
  // Budgets are enforced before and after the run where possible.
  // maxCost uses estimator-grade pricing metadata from the model catalog.
  // Budget fields are optional and can be combined: maxCost, maxTokens,
  // maxInputTokens, maxOutputTokens, maxToolCalls.
  budget: { maxCost: 0.01, maxTokens: 2_000 },
});

console.log(response.content);
