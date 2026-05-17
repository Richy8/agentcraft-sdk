import {
  Agent,
  AgentCache,
  AgentEval,
  AgentReports,
  Provider,
} from "agentcraft";
import { CreatorPacks } from "agentcraft/packs";

// AgentEval gives you a repeatable gate for quality, cost, cache behavior,
// skill activation, and tool-call budgets before you ship a workflow.
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.memory({ namespace: "eval-report-example" }),
  skillActivation: "auto",
  toolSelection: "auto",
}).use(CreatorPacks.blog({ cache: "auto", readOnlyByDefault: true }));

const suite = AgentEval.suite({
  name: "Creator workflow certification",
  defaults: {
    maxCostUsd: 0.05,
    maxTotalTokens: 8_000,
    minQualityScore: 0.5,
    requireSkillActivation: true,
  },
}).case({
  name: "Medium article plan",
  prompt:
    "Create a Medium article plan about reducing AI agent costs with cache warming.",
  expect: {
    activeSkills: ["blog-writer"],
    maxToolCalls: 2,
  },
  assertions: [
    AgentEval.assert.notContains("game changer"),
    AgentEval.assert.matches(/cache|cost|token/i),
  ],
  rubric: [
    "Names a specific cost-saving mechanism.",
    "Includes a reader-facing thesis.",
    "Avoids generic AI-writing filler.",
  ],
});

const evalReport = await AgentEval.run({ agent, suite });
await AgentEval.writeMarkdown(evalReport, "reports/examples/creator-eval.md");
await AgentEval.writeJson(evalReport, "reports/examples/creator-eval.json");

// AgentReports turns one run into a support/debug artifact you can attach to CI,
// issue reports, customer support, or internal review notes.
const traceCollector = AgentReports.traceCollector();
const response = await agent.run({
  prompt: "Summarize the readiness of the cache warming article plan.",
  trace: traceCollector,
});

await AgentReports.writeMarkdown(response, "reports/examples/agent-run.md", {
  title: "Creator Cache Run",
});
await AgentReports.writeJson(
  traceCollector.spans(),
  "reports/examples/trace.json",
  {
    title: "Creator Cache Trace",
  },
);

console.log("Eval status:", evalReport.status);
console.log("Run cost:", response.costReport?.costs.totalEstimate);
