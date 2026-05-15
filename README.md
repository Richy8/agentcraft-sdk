# AgentCraft

[![npm version](https://img.shields.io/npm/v/agentcraft)](https://www.npmjs.com/package/agentcraft)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/agentcraft-ai/agentcraft/actions/workflows/ci.yml/badge.svg)](https://github.com/agentcraft-ai/agentcraft/actions/workflows/ci.yml)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Production-grade TypeScript agent runtime with provider routing, tools, MCP, skills, workflows, structured output, streaming, budgets, and observability.

## Install

```sh
npm install @deskcreate/agentcraft
```

## 60-Second Quickstart

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const result = await agent.run({
  prompt: "Summarize why typed tool calls matter.",
  responseSchema: {
    type: "object",
    required: ["summary", "risks"],
    properties: {
      summary: { type: "string" },
      risks: { type: "array", items: { type: "string" } },
    },
  },
  structuredOutput: { retries: 1 },
  trace: true,
});

console.log(result.structuredResponse);
console.log(result.trace);
```

## Core Ideas

- Provider-portable calls across OpenAI-compatible, Anthropic, Google, Bedrock, and Cohere protocols.
- Secure tool lifecycle with approvals, dry-run/read-only modes, guardrails, redaction, timeouts, and audits.
- MCP runtime for stdio, HTTP JSON-RPC, and SSE transports.
- Built-in adapters for filesystem, fetch, GitHub, database, browser, SaaS, storage, vector, voice, and image workflows.
- Built-in skills with structured prompt metadata and dependency validation.
- Structured output with JSON Schema, Zod-like schemas, native JSON mode, retry repair, and tool fallback.
- Streaming events for model deltas, tool calls, tool results, and finals.
- Run budgets, cost estimates, fallback routing, and AgentTeam orchestration.
- `AgentWorkflow` for repeatable step graphs with retries, approvals, branches, parallel fan-out, Zod-validated input, and resumable failed runs.
- `AgentWorkspace` for shared runtime context wiring cache, adapters, tool policy, budget, events, and artifact stores once for teams and workflows.
- `ArtifactStore` for typed durable persistence with `MemoryArtifactStore`, `FileArtifactStore`, and `SQLiteArtifactStore` backends.
- `ArtifactRegistry` for 19 built-in creator artifact schemas with custom extension support.

## Guides

- [Architecture](https://agentcraft-sdk.vercel.app/architecture)
- [Quickstart](https://agentcraft-sdk.vercel.app/start/quickstart)
- [Feature Map](https://agentcraft-sdk.vercel.app/start/feature-map)
- [Run Configuration](https://agentcraft-sdk.vercel.app/configuration/run-config)
- [Provider Configuration](https://agentcraft-sdk.vercel.app/configuration/provider-config)
- [Tool Lifecycle](https://agentcraft-sdk.vercel.app/tools/tools)
- [MCP Overview](https://agentcraft-sdk.vercel.app/mcp/overview)
- [Security Model](https://agentcraft-sdk.vercel.app/core/security-model)
- [Pricing and Budgets](https://agentcraft-sdk.vercel.app/core/budgets-cost)
- [AgentTeam Orchestration](https://agentcraft-sdk.vercel.app/orchestration/agent-team)
- [AgentWorkflow](https://agentcraft-sdk.vercel.app/orchestration/agent-workflow)
- [AgentWorkspace](https://agentcraft-sdk.vercel.app/orchestration/agent-workspace)
- [ArtifactStore](https://agentcraft-sdk.vercel.app/persistence/artifact-store)
- [ArtifactRegistry](https://agentcraft-sdk.vercel.app/persistence/artifact-registry)
- [Adapter Authoring](https://agentcraft-sdk.vercel.app/adapters/custom)
- [Skill Authoring](https://agentcraft-sdk.vercel.app/skills/custom)
- [Structured Output](https://agentcraft-sdk.vercel.app/core/structured-output)
- [Guardrails](https://agentcraft-sdk.vercel.app/tools/guardrails)

For the local documentation site:

```sh
npm run docs:dev
```

## Examples

See the [examples guide](https://agentcraft-sdk.vercel.app/examples) for basic chat, structured output, streaming with tools, safe filesystem usage, GitHub review, MCP GitHub, research, AgentTeam, AgentWorkflow, ArtifactStore, cost budgeting, and custom adapter patterns.

## Safety Defaults

AgentCraft treats prompt, file, browser, MCP, retrieval, and tool inputs as untrusted by default. Side-effecting tools require approval metadata and should be run with policy controls in production.

Pricing metadata is source-stamped and estimator-grade. Update the model catalog against official provider pricing before using estimates for billing or hard financial commitments.

## Testing

Unit tests are mocked and do not require live API keys:

```sh
npm test
```

Live integration tests are opt-in and should be run with cost-bounded provider keys only:

```sh
INTEGRATION_TESTS=true npm run test:int:light
```

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [GitHub Discussions](https://github.com/agentcraft-ai/agentcraft/discussions)
