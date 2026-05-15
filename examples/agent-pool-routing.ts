import { Agent, AgentPool, Provider } from "@deskcreate/agentcraft";

const fastAgent = Agent.create({
  // name is optional, but recommended. AgentPool.get(name), traces, and logs
  // become much easier to understand when each candidate has a stable name.
  name: "fast",
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const qualityAgent = Agent.create({
  name: "quality",
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const fallbackAgent = Agent.create({
  // fallback must not be one of the primary agents. It is only used after
  // configured failure conditions are met.
  name: "fallback",
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const pool = AgentPool.create([fastAgent, qualityAgent], {
  // strategy is required. Values:
  // - 'cost': prefer lowest effective model cost
  // - 'speed': prefer highest speed score
  // - 'quality': prefer highest quality score
  // - 'round-robin': rotate requests across candidates
  // - 'random': choose a random candidate
  // - 'best-fit': currently resolves by quality metadata and is useful when
  //   your app wraps selection with its own task classifier.
  strategy: "cost",
  fallback: fallbackAgent,
  // fallbackMode is optional. Values:
  // - 'none': never fallback
  // - 'first-error': fallback after the first candidate error
  // - 'retryable': fallback only retryable AgentCraft errors
  // - 'non-retryable': fallback only non-retryable AgentCraft errors
  // - 'all': try every viable candidate before failing
  fallbackMode: "all",
  // downgradeOnBudgetPressure makes budget-constrained runs prefer cheaper
  // candidates before more expensive ones.
  downgradeOnBudgetPressure: true,
  // upgradeOnQualityFailure is useful when a low-cost candidate fails and the
  // product is allowed to retry with a stronger model.
  upgradeOnQualityFailure: true,
});

const selected = pool.get("fast");
console.log("Selected by name:", selected?.model);

const response = await pool.run({
  prompt: "Summarize the launch risk of adding multi-provider routing.",
  budget: {
    // maxCost is optional. Use it when a user, tenant, or workflow has a hard
    // cost ceiling. Combine with downgradeOnBudgetPressure for graceful routing.
    maxCost: 0.02,
    maxTokens: 4_000,
  },
});

console.log(response.provider, response.model, response.content);
