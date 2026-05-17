import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { tool } from "@deskcreate/agentcraft/adapters";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

// A deterministic read tool can be cached safely. On replay, AgentCraft should
// return the cached result and report an avoided live tool execution.
const readBenchmarkFact = tool({
  name: "read_benchmark_fact",
  description: "Return a stable benchmark fact for a topic.",
  security: {
    sideEffect: "read",
    cache: {
      safe: true,
      deterministic: true,
      ttlMs: 60_000,
    },
  },
  params: {
    topic: { type: "string", description: "Topic to summarize." },
  },
  run: async ({ topic }) => ({
    topic,
    fact: "Cached read tools should avoid repeated live executions.",
  }),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file("./.agentcraft/cache", {
    strategy: "auto",
    namespace: "cost-cache-example",
  }),
  skillActivation: "auto",
  toolSelection: "auto",
  promptCompression: "balanced",
}).use(CreatorPacks.blog({ cache: "auto", readOnlyByDefault: true }));

const response = await agent.run({
  prompt: "Create a compact Medium article plan about reducing wasted tokens.",
  tools: [readBenchmarkFact],
  budget: {
    mode: "prefer-cache",
    maxCost: 0.03,
    maxToolCalls: 2,
  },
});

console.log(response.content);
console.log("Active skills:", response.selection?.activeSkills);
console.log("Activation reasons:", response.selection?.activationReasons);
console.log("Prompt estimate:", response.measurement?.estimatedPromptTokens);
console.log("Cache summary:", response.cache?.summary);
console.log("Cost report:", response.costReport);
