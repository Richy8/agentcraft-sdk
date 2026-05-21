# AgentEval

`AgentEval` is the production gate for agent quality, cost, cache behavior, skill activation, and tool-call discipline. It extends the benchmark foundation with suites, cases, assertions, optional judging, markdown reports, JSON reports, and CI-friendly pass/fail status.

Use it when you want to answer: did this agent produce the right kind of answer, stay inside budget, activate the right skills, avoid bloating tools, and benefit from cache replay?

## Quick Start

```ts
import { Agent, AgentCache, AgentEval, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.memory({ namespace: "eval-demo" }),
  skillActivation: "auto",
  toolSelection: "auto",
}).use(CreatorPacks.blog({ cache: "auto", readOnlyByDefault: true }));

const suite = AgentEval.suite({
  name: "Blog workflow gate",
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

const report = await AgentEval.run({ agent, suite });

await AgentEval.writeMarkdown(report, "reports/evals/blog-workflow.md");
await AgentEval.writeJson(report, "reports/evals/blog-workflow.json");
```

## What AgentEval Measures

AgentEval focuses on practical production signals:

- **Quality**: deterministic assertions by default, optional judge function when you need deeper scoring.
- **Cost**: max run cost, total token gates, prompt token gates, and completion token gates.
- **Skills**: required active skills, forbidden active skills, and activation-required gates.
- **Tools**: exposed tool expectations and max executed tool call budgets.
- **Cache**: hit-rate gates, miss gates, and replay hit-rate gates.
- **Artifacts**: records artifact expectations as a warning until a future artifact-inspection bridge is attached.

## Assertions

Assertions are deterministic and cheap, so they should be your first line of defense.

```ts
const assertions = [
  AgentEval.assert.contains("claim map"),
  AgentEval.assert.notContains("as an AI language model"),
  AgentEval.assert.matches(/source|evidence|verify/i),
  AgentEval.assert.skillActivated("fact-check"),
  AgentEval.assert.cacheHitRateAtLeast(0.5),
];
```

For structured output:

```ts
AgentEval.assert.jsonPath("status", "ready");
AgentEval.assert.jsonPath("score", (value) => Number(value) >= 0.8);
```

## Cache Replay Gate

Use replay gates when you want to prove that a second run benefits from cache behavior.

```ts
const suite = AgentEval.suite({
  name: "Cache replay gate",
  defaults: { requireCacheReplay: true },
}).case({
  name: "cached research plan",
  prompt: "Research cache warming patterns and summarize the tradeoffs.",
  expect: {
    cache: {
      minHitRateOnReplay: 0.5,
      maxMisses: 2,
    },
  },
});
```

## Common Production Suites

### Flat Prompt vs Skill-Enhanced

Use this when you are proving that a skill or creator pack earns its prompt overhead.

```ts
import { Agent, AgentEval, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const flatAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
});

const skillAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  promptCompression: "balanced",
}).use(CreatorPacks.blog({ readOnlyByDefault: true }));

const suite = AgentEval.suite({
  name: "skill-value-check",
  defaults: { maxTotalTokens: 6_000, maxCostUsd: 0.05 },
}).case({
  name: "medium-plan",
  prompt: "Create a Medium article plan about reducing agent token waste.",
  assertions: [
    AgentEval.assert.matches(/cache|token|cost/i),
    AgentEval.assert.notContains("game changer"),
  ],
});

const baseline = await AgentEval.run({ agent: flatAgent, suite });
const candidate = await AgentEval.run({ agent: skillAgent, suite });
const comparison = AgentEval.compare({
  name: "flat-vs-blog-pack",
  baseline,
  candidate,
});

console.log(comparison.deltas.totalTokens);
console.log(comparison.deltas.averageQualityScore);
```

### CI Gate

Use a failing status to block a pull request when quality, cost, or tool discipline regresses.

```ts
const report = await AgentEval.run({ agent, suite });
await AgentEval.writeMarkdown(report, "reports/evals/pr-gate.md");

if (report.status === "failed") {
  throw new Error("AgentEval gate failed. See reports/evals/pr-gate.md");
}
```

### Tool Discipline

This pattern catches accidental tool-surface expansion or expensive tool loops.

```ts
const suite = AgentEval.suite({
  name: "tool-discipline",
  defaults: { maxToolCalls: 3 },
}).case({
  name: "research-with-bounded-tools",
  prompt: "Research this topic and return a source-backed brief.",
  expect: {
    exposedTools: ["web_search"],
    maxToolCalls: 2,
  },
  assertions: [AgentEval.assert.toolCalled("web_search")],
});
```

## Optional Judge

AgentEval does not force extra model calls. If you want model-graded scoring, supply a judge and put a cost budget around it in your app.

```ts
const report = await AgentEval.run({
  agent,
  suite,
  judge: async ({ case: evalCase, response }) => {
    // Replace this with your own evaluator agent or scoring service.
    const score = response.content.includes("tradeoff") ? 0.9 : 0.4;
    return {
      score,
      notes: `Scored ${evalCase.name} with a local evaluator.`,
    };
  },
});
```

## Compare Baseline and Candidate

Use comparisons when tuning prompts, skills, adapters, cache strategy, or model choice.

```ts
const baseline = await AgentEval.run({ agent: flatAgent, suite });
const candidate = await AgentEval.run({ agent: skillAgent, suite });

const comparison = AgentEval.compare({
  name: "flat vs skill-enhanced",
  baseline,
  candidate,
});

console.log(comparison.deltas.totalTokens);
console.log(comparison.deltas.averageQualityScore);
```

## Related Pages

- [Observability Reports](./observability-reports.md)
- [AgentCache](../persistence/agent-cache.md)
- [Skill Activation](../skills/activation.md)
- [Production examples](../examples-cookbook/production.md)
