import { Agent, AgentPool, Provider } from "@deskcreate/agentcraft";

// Provider routing is useful when your product has different runtime priorities:
// - quality for hard tasks
// - cheap/fast models for routine work
// - fallback when a provider is down, over budget, or unavailable
const qualityAgent = Agent.create({
  // name is optional but useful for AgentPool.get(name), traces, and logs.
  name: "quality",
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const budgetAgent = Agent.create({
  name: "budget",
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const pool = AgentPool.create([qualityAgent, budgetAgent], {
  // strategy is required. Values:
  // - 'cost': lowest effective cost
  // - 'speed': fastest model score
  // - 'quality': highest model quality score
  // - 'round-robin': rotate agents
  // - 'random': random agent
  // - 'best-fit': workload-aware resolver behavior
  strategy: "quality",
  // If the selected model breaches budget or fails, try cheaper candidates.
  downgradeOnBudgetPressure: true,
  // fallbackMode is optional. Values:
  // - 'none': never fallback
  // - 'first-error': fallback after first error
  // - 'retryable': fallback only retryable errors
  // - 'non-retryable': fallback only non-retryable AgentCraft errors
  // - 'all': keep trying viable agents
  fallbackMode: "all",
});

const response = await pool.run({
  prompt: "Draft a careful risk memo for adopting a new AI provider.",
  budget: {
    maxCost: 0.02,
    maxTokens: 4_000,
  },
});

console.log(response.model, response.content);
