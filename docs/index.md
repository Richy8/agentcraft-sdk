# AgentCraft

AgentCraft is a production-grade TypeScript agent runtime. It gives you a single, portable API for building agents that work across every major LLM provider, with built-in tools, adapters, MCP servers, multi-agent orchestration, caching, structured output, streaming, budgets, observability, and eval — all wired together in a type-safe, composable package.

```sh
npm install @deskcreate/agentcraft
```

## First Agent

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize the benefits of caching in agent systems.",
});

console.log(response.content);
// → "Caching in agent systems reduces latency and token spend by..."
console.log(`Cost: $${response.cost.toFixed(6)}`);
console.log(`Tokens: ${response.tokensUsed.total}`);
```

## What You Can Build

| Goal                                                   | Surface                                                 | Start                                                |
| ------------------------------------------------------ | ------------------------------------------------------- | ---------------------------------------------------- |
| Run a prompt against any LLM                           | `Agent.create()` + `agent.run()`                        | [Quickstart](./start/quickstart.md)                  |
| Switch between OpenAI, Anthropic, Gemini, and 15+ more | `Provider` catalog                                      | [Models & Providers](./core/models-and-providers.md) |
| Give the agent external tools to call                  | `ToolDefinition`, `FetchAdapter`, `TavilySearchAdapter` | [Tools](./tools/tools.md)                            |
| Connect to MCP servers                                 | Built-in MCP wrappers                                   | [MCP](./mcp/overview.md)                             |
| Stream tokens as they arrive                           | `agent.stream()`                                        | [Streaming](./core/streaming.md)                     |
| Return typed structured data                           | `responseSchema` with Zod                               | [Structured Output](./core/structured-output.md)     |
| Coordinate multiple agents                             | `AgentTeam`, `AgentPool`, `AgentWorkflow`               | [Orchestration](./orchestration/agent-workflow.md)   |
| Cache tool results to reduce spend                     | `AgentCache`                                            | [Persistence & Memory](./persistence/agent-cache.md) |
| Enforce token and cost budgets                         | `RunBudget`, `BudgetMode`                               | [Budgets & Cost](./core/budgets-cost.md)             |
| Capture traces and replay runs                         | `TraceSink`, `AgentReports.traceCollector()`            | [Observability](./core/observability-replay.md)      |
| Assert quality in CI                                   | `AgentEval`                                             | [AgentEval](./production/agent-eval.md)              |

## Entry Points

AgentCraft ships focused import paths. Use only what you need.

```ts
import { Agent, AgentPool, AgentCache } from "@deskcreate/agentcraft";
import {
  FetchAdapter,
  TavilySearchAdapter,
} from "@deskcreate/agentcraft/adapters";
import { AgentTeam } from "@deskcreate/agentcraft/team";
import { AgentWorkflow, AgentWorkspace } from "@deskcreate/agentcraft";
import { BraveSearchMCP, GitHubMCP } from "@deskcreate/agentcraft/mcp";
```

## A More Complete Example

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import {
  FetchAdapter,
  TavilySearchAdapter,
} from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  // Deterministic behavior for writes
  temperature: 0.2,
  // Retry transient failures automatically
  retry: {
    maxAttempts: 3,
    backoff: "exponential",
    initialDelay: 500,
    maxDelay: 15_000,
  },
  // Cache safe read-tool results to disk
  cache: AgentCache.file(".agentcraft/cache", { strategy: "auto" }),
  // Shape agent behavior with a default system prompt
  system:
    "You are a concise technical writer. Lead with the most important finding.",
})
  // Give the agent web fetch capability
  .use(FetchAdapter.connect({ allowedDomains: ["api.github.com"] }))
  // Give it web search capability
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt:
    "Search for the latest TypeScript release notes and write a 3-bullet summary.",
  budget: { maxCost: 0.05 },
});

console.log(response.content);
console.log(`Cache hits: ${response.cache?.hits ?? 0}`);
console.log(`Cost: $${response.cost.toFixed(6)}`);
```

## Reading Path

| If you are...                        | Start here                                                     |
| ------------------------------------ | -------------------------------------------------------------- |
| New to AgentCraft                    | [Quickstart](./start/quickstart.md)                            |
| Looking for all features at a glance | [Feature Map](./start/feature-map.md)                          |
| Trying to understand how it all fits | [Architecture](./architecture.md)                              |
| Ready to add tools and adapters      | [Tools](./tools/tools.md) · [Adapters](./adapters/overview.md) |
| Orchestrating multiple agents        | [Orchestration](./orchestration/agent-workflow.md)             |
| Going to production                  | [Production](./production/security-model.md)                   |
| Looking for runnable examples        | [Examples & Cookbook](./examples-cookbook/overview.md)         |
| Looking up config options            | [Configuration Reference](./configuration/overview.md)         |

## Production Checklist

- [ ] Read [Security Model](./production/security-model.md) before exposing tools or MCP to users.
- [ ] Set `budget` limits to prevent runaway costs — see [Budgets & Cost](./core/budgets-cost.md).
- [ ] Enable [AgentCache](./persistence/agent-cache.md) to avoid paying twice for identical tool calls.
- [ ] Write an [AgentEval](./production/agent-eval.md) suite before your first deployment.
- [ ] Review [API Stability](./production/api-stability.md) for safe import paths.

## Local Development

```sh
# Run the docs site locally
npm run docs:dev

# Build static docs
npm run docs:build

# Regenerate TypeDoc API reference
npm run docs:api

# Run all unit tests (no API keys needed)
npm test

# Run live integration tests (requires API keys)
INTEGRATION_TESTS=true npm run test:int:light
```
