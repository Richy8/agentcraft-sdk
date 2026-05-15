# Custom Skills

Custom skills package reusable agent behavior: role, goal, output expectations, directives, tools, and lifecycle hooks. Define them with `defineSkill()` and attach them to any agent with `.use()`.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { defineSkill } from "agentcraft/skills";

const LaunchReviewSkill = defineSkill({
  name: "launch-review",
  description: "Reviews product launch readiness and surfaces blockers.",
  directive: "launch-review", // activated by /launch-review in the prompt

  prompt: {
    role: "You are a launch readiness reviewer for software products.",
    goal: "Find launch blockers and missing owner decisions before release.",
    constraints: [
      "Focus on actionable findings only.",
      "Do not repeat information already in the prompt.",
    ],
    toolUsePolicy: ["Use tools only when attached and explicitly needed."],
    outputFormat: ["Return findings as a list with: blocker, severity, and owner."],
    qualityChecklist: ["Every blocker must have a clear next step."],
    failureBehavior: ["If the input is ambiguous, ask one clarifying question."],
    safetyNotes: ["Do not include PII in findings."],
  },

  metadata: {
    sideEffectRisk: "none",
    promptVersion: "2026-05-12",
    stateful: false,
    requiredCapabilities: [],
    requiredAdapters: [],
    optionalAdapters: [],
  },
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(LaunchReviewSkill);

const response = await agent.run({
  prompt: "/launch-review Review our Q3 launch readiness doc.",
});
console.log(response.content);
```

## `defineSkill()` Config

| Field                     | Required    | Default     | Purpose                                                              |
| ------------------------- | ----------- | ----------- | -------------------------------------------------------------------- |
| `name`                    | Yes         | None        | Stable skill identifier. Used in traces and activation matching.     |
| `description`             | Yes         | None        | Human-readable description. Used in auto-activation keyword matching.|
| `directive`               | Recommended | None        | Slash command trigger (e.g. `"launch-review"` → `/launch-review`).  |
| `prompt`                  | Usually     | None        | Structured `SkillPromptTemplate`. Compiled into a system prompt.     |
| `systemPromptExtension`   | Alternative | None        | Raw string injected into the system prompt. Use instead of `prompt`. |
| `tools`                   | No          | `[]`        | Tool definitions exclusive to this skill.                            |
| `requires`                | No          | `["tools"]` | Model capabilities this skill needs (e.g. `["vision"]`).            |
| `dependsOn`               | No          | None        | Other adapters/skills that must be attached before this skill.       |
| `metadata`                | Recommended | None        | Side effect risk, prompt version, adapter dependencies.              |
| `init`                    | No          | None        | Called once before the first run.                                    |
| `cleanup`                 | No          | None        | Called when `agent.dispose()` runs.                                  |
| `onBeforeRun`             | No          | None        | Transform `AgentRunParams` before the LLM call.                      |
| `onAfterRun`              | No          | None        | Transform `AgentResponse` after the LLM call.                        |
| `onAfterStream`           | No          | None        | Post-process stream chunks and assembled response.                   |

## Prompt Template Fields

All `prompt` fields are required. Empty values or empty arrays will throw.

| Field              | Type       | Purpose                                              |
| ------------------ | ---------- | ---------------------------------------------------- |
| `role`             | `string`   | Who the model should be in this skill context.       |
| `goal`             | `string`   | What the skill is trying to accomplish.              |
| `constraints`      | `string[]` | Rules the model must follow.                         |
| `toolUsePolicy`    | `string[]` | When and how to use tools.                           |
| `outputFormat`     | `string[]` | Expected shape of the response.                      |
| `qualityChecklist` | `string[]` | Self-check criteria before responding.               |
| `failureBehavior`  | `string[]` | What to do when inputs are missing or ambiguous.     |
| `safetyNotes`      | `string[]` | Safety constraints (PII, content limits, etc.).      |

## Patterns

### Skill With Raw System Prompt

Use `systemPromptExtension` when you want direct control over the injected system text, without using the structured `prompt` template.

```ts
import { defineSkill } from "agentcraft/skills";

const SupportSkill = defineSkill({
  name: "customer-support",
  description: "Handles customer support tickets and escalations.",
  directive: "support",

  // Raw string injected into the system prompt on every run
  systemPromptExtension: [
    "You are a customer support specialist for AgentCraft.",
    "Keep responses concise, professional, and always offer a next step.",
    "Never share internal system information or pricing details.",
    "Escalate unresolved issues to the engineering team.",
  ].join("\n"),
});
```

### Skill With Local Tools

A skill can own its own tools — they are only exposed when the skill is active.

```ts
import { defineSkill } from "agentcraft/skills";
import { tool } from "agentcraft/adapters";

const lookupFaq = tool({
  name: "lookup_faq",
  description: "Search the FAQ knowledge base for an answer.",
  security: { sideEffect: "read" },
  params: {
    query: { type: "string", description: "Question to search for." },
  },
  run: async ({ query }) => faqDb.search(query),
});

const SupportSkill = defineSkill({
  name: "customer-support",
  description: "Handles customer support with FAQ lookup.",
  directive: "support",

  tools: [lookupFaq], // only exposed when this skill is active

  systemPromptExtension:
    "You are a customer support specialist. Use lookup_faq to find answers before responding.",

  metadata: {
    sideEffectRisk: "read",
    promptVersion: "2026-05-01",
    stateful: false,
    requiredCapabilities: ["tools"],
    requiredAdapters: [],
    optionalAdapters: [],
  },
});
```

### Skill With `dependsOn` (Requiring Another Adapter)

```ts
import { defineSkill } from "agentcraft/skills";
import { TavilySearchAdapter } from "agentcraft/adapters";

// This skill requires TavilySearchAdapter to be attached first
const ResearchSkill = defineSkill({
  name: "research",
  description: "Researches topics using web search.",
  directive: "research",

  dependsOn: [TavilySearchAdapter], // throws if Tavily is not attached

  prompt: {
    role: "You are a senior research analyst.",
    goal: "Find authoritative sources and synthesize findings.",
    constraints: ["Only cite sources from the search results.", "Do not hallucinate data."],
    toolUsePolicy: ["Always call web_search before drafting findings."],
    outputFormat: ["Return a structured summary with citations."],
    qualityChecklist: ["Every claim has a source."],
    failureBehavior: ["If no results found, say so and suggest refining the query."],
    safetyNotes: ["Do not include unverified medical or legal claims."],
  },

  metadata: {
    sideEffectRisk: "read",
    promptVersion: "2026-05-01",
    stateful: false,
    requiredCapabilities: ["tools"],
    requiredAdapters: ["tavily-search"],
    optionalAdapters: [],
  },
});
```

### Skill With Lifecycle Hooks

```ts
import { defineSkill } from "agentcraft/skills";
import type { AgentRunParams, AgentResponse } from "agentcraft";

let sessionId: string;

const SessionSkill = defineSkill({
  name: "session-tracking",
  description: "Tracks conversation sessions and injects context.",
  directive: "session",

  // Called once before the first run — set up shared state
  init: async () => {
    sessionId = crypto.randomUUID();
    console.log(`Session started: ${sessionId}`);
  },

  // Called when the agent is disposed
  cleanup: async () => {
    console.log(`Session ended: ${sessionId}`);
  },

  // Inject session context into every run
  onBeforeRun: async (params: AgentRunParams): Promise<AgentRunParams> => ({
    ...params,
    system: [params.system, `Session ID: ${sessionId}`].filter(Boolean).join("\n"),
  }),

  // Log cost after every run
  onAfterRun: async (response: AgentResponse): Promise<AgentResponse> => {
    console.log(`[session:${sessionId}] cost: $${response.cost.toFixed(4)}`);
    return response;
  },
});
```

### Skill Activation Modes

The `skillActivation` setting on the agent controls when attached skills are active:

```ts
import { Agent, Provider } from "agentcraft";
import { defineSkill } from "agentcraft/skills";

const MySkill = defineSkill({
  name: "my-skill",
  description: "Does something useful.",
  directive: "my-skill",
  systemPromptExtension: "You are a helpful assistant for my-skill tasks.",
});

// "always": skill is always active (default)
const alwaysAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "always",
}).use(MySkill);

// Active on every run regardless of prompt content
const r1 = await alwaysAgent.run({ prompt: "Hello." });

// "directive-only": skill is only active when prompt contains /my-skill
const directiveAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
}).use(MySkill);

// Skill activates only when the prompt contains /my-skill
const r2 = await directiveAgent.run({ prompt: "/my-skill Do the thing." });
const r3 = await directiveAgent.run({ prompt: "Hello." }); // skill NOT active

// "auto": skill activates when prompt keywords match the skill name/description
const autoAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto", // pair with auto so only relevant tools are exposed
}).use(MySkill);

const r4 = await autoAgent.run({ prompt: "Help with my-skill tasks." }); // activates
const r5 = await autoAgent.run({ prompt: "Tell me a joke." }); // likely not activated
```

### Multiple Skills on One Agent

```ts
import { Agent, Provider } from "agentcraft";
import { defineSkill } from "agentcraft/skills";
import { TavilySearchAdapter } from "agentcraft/adapters";

const WritingSkill = defineSkill({
  name: "writing",
  description: "Writes clear, structured content.",
  directive: "write",
  systemPromptExtension: "You are a professional content writer. Be clear and concise.",
});

const ResearchSkill = defineSkill({
  name: "research",
  description: "Researches topics with web search.",
  directive: "research",
  dependsOn: [TavilySearchAdapter],
  systemPromptExtension: "You are a research analyst. Always cite your sources.",
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only", // skills only activate on explicit directive
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(ResearchSkill)
  .use(WritingSkill);

// Each prompt activates the matching skill only
const research = await agent.run({ prompt: "/research Find the latest TypeScript news." });
const writing = await agent.run({ prompt: "/write Draft a summary of today's findings." });

console.log(research.selection?.activeSkills); // → ["research"]
console.log(writing.selection?.activeSkills);  // → ["writing"]
```

## Related

- [Skills Overview](./overview.md)
- [Skill Activation](./activation.md)
- [Skill Directives](./directives.md)
- [Built-In Skills](./built-in.md)
- [Agents](../core/agents.md)
