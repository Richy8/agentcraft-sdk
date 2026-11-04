# Choose Your Path

Start here when you know what you want to build but do not yet know which AgentCraft surface to use.

| Goal                                                            | Start here                                                | Primary example                                                          | Key config surfaces                                               |
| --------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| Run private/local agents without cloud keys                     | [Local And Private Agents](./paths/local-private.md)      | [local-ollama-private.ts](../examples.md#local-ollama-private)           | `model`, `baseUrl`, local provider connection, budgets            |
| Add MCP tool servers                                            | [MCP Tools](./paths/mcp-tools.md)                         | [custom-mcp-connection.ts](../examples.md#custom-mcp-connection)         | `MCPAdapter.connect()`, built-in wrappers, tool allowlists, roots |
| Persist cross-run semantic memory for agents                    | [Semantic Memory](../persistence/semantic-memory.md)      | [built-in-mcp-skill-memory.ts](../examples.md#built-in-mcp-skill-memory) | `AgentMemory`, Qdrant, Pinecone, Supabase backends                |
| Reduce repeated read-tool calls and token burn                  | [Caching](../persistence/agent-cache.md)                  | `examples/cost-cache-compression.ts`                                     | `AgentCache.file`, TTLs, per-run bypass, response cache metadata  |
| Expose application capabilities as tools                        | [Custom Adapters](./paths/custom-adapters.md)             | [custom-adapter.ts](../examples.md#custom-adapter)                       | `createAdapter()`, `tool()`, metadata, guardrails                 |
| Route across models, control cost, or choose provider fallbacks | [Routing And Budgets](./paths/routing-budgets.md)         | [agent-pool-routing.ts](../examples.md#agent-pool-routing)               | `AgentPool`, `budget`, `estimateCost()`, model catalog            |
| Move toward production safety, approval, and operational review | [Production Guardrails](./paths/production-guardrails.md) | [guardrails-and-approvals.ts](../examples.md#guardrails-and-approvals)   | `toolPolicy`, guardrails, tracing, MCP security, replay fixtures  |

Each path links to a runnable example, the relevant config reference, and the API reference entry points. For a broad feature-to-example map, use [Feature Coverage](./feature-coverage.md).

## Common Path Ladder

Use this ladder when you want a practical progression from first useful agent to production-ready workflows. Each path starts with the smallest useful example, then adds the next capability only when the use case calls for it.

## Simple Paths

These paths are for first success, prototypes, demos, and narrow internal helpers.

| Scenario                   | Start with                                                     | Add next                                                      | Outcome                                                                      |
| -------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Basic assistant            | [basic-chat.ts](../examples.md#basic-chat)                     | [Run Parameters](./config/run-parameters.md)                  | A provider-backed agent that answers prompts with tuned generation settings. |
| Private local assistant    | [local-ollama-private.ts](../examples.md#local-ollama-private) | [Local And Private Agents](./paths/local-private.md)          | A local or private model path without cloud provider keys.                   |
| Structured JSON responder  | [structured-output.ts](../examples.md#structured-output)       | [Structured Output Config](./config/structured-output.md)     | Responses validated into machine-readable JSON for app logic.                |
| Streaming chat             | [streaming-with-tools.ts](../examples.md#streaming-with-tools) | [Tool Lifecycle](./tool-lifecycle.md)                         | Incremental UI output with final events and optional tool events.            |
| Prompt template runner     | [prompt-assembly.ts](../examples.md#prompt-assembly)           | [Prompt Assembly Config](./config/prompt-assembly.md)         | Reusable prompt files with includes, variables, and config injection.        |
| Deterministic demo or test | [replay-mode.ts](../examples.md#replay-mode)                   | [Observability Tracing](../examples.md#observability-tracing) | A demo/test flow that avoids live provider calls.                            |

Recommended simple progression:

1. Build [Basic Chat](../examples.md#basic-chat).
2. Add [Structured Output](../examples.md#structured-output) if the app needs JSON.
3. Add [Prompt Assembly](../examples.md#prompt-assembly) when prompts become reusable.
4. Add [Replay Mode](../examples.md#replay-mode) before writing demos or CI tests.

## Mid-Level Paths

These paths are for real application workflows where agents inspect files, call APIs, or route across models.

| Scenario                    | Start with                                                 | Add next                                                  | Outcome                                                                      |
| --------------------------- | ---------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Database analysis assistant | [database-readonly.ts](../examples.md#database-readonly)   | [Production Guardrails](./paths/production-guardrails.md) | Read-only database questions with row limits and host-owned query execution. |
| Research assistant          | [research-agent.ts](../examples.md#research-agent)         | [MCP Tools](./paths/mcp-tools.md)                         | Search/fetch-backed research with retrieval policy and source handling.      |
| Custom app capability       | [custom-adapter.ts](../examples.md#custom-adapter)         | [Custom Adapters](./paths/custom-adapters.md)             | Your application APIs exposed as typed, policy-aware tools.                  |
| Cost-aware model routing    | [agent-pool-routing.ts](../examples.md#agent-pool-routing) | [Routing And Budgets](./paths/routing-budgets.md)         | Provider fallback, cost/speed/quality routing, and budget enforcement.       |
| Multimodal review           | [multimodal-inputs.ts](../examples.md#multimodal-inputs)   | [Run Parameters](./config/run-parameters.md)              | Image, file, or audio inputs paired with capability-aware models.            |

Recommended mid-level progression:

1. Add tools through a built-in adapter.
2. Put `toolPolicy` around those tools.
3. Add cost budgets or provider routing once the workflow has real traffic.

## Advanced Paths

These paths are for production operations, multi-agent systems, external tool servers, and serious reviewability.

| Scenario                    | Start with                                                               | Add next                                                  | Outcome                                                                           |
| --------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Production tool execution   | [guardrails-and-approvals.ts](../examples.md#guardrails-and-approvals)   | [Production Guardrails](./paths/production-guardrails.md) | Approval-gated, audited, redacted tool execution.                                 |
| MCP-backed internal tools   | [custom-mcp-connection.ts](../examples.md#custom-mcp-connection)         | [MCP Security Checklist](./mcp-security-checklist.md)     | Internal or third-party MCP servers connected with allowlists and trust metadata. |
| Built-in MCP with memory    | [built-in-mcp-skill-memory.ts](../examples.md#built-in-mcp-skill-memory) | [MCP Tools](./paths/mcp-tools.md)                         | Stateful memory plus retrieval behavior across runs.                              |
| Multi-agent orchestration   | [agent-team.ts](../examples.md#agent-team)                               | [AgentTeam Config](./config/agentteam.md)                 | Fixed specialist roles with supervisor review and bounded rounds.                 |
| Dynamic team spawning       | [agent-team-spawn.ts](../examples.md#agent-team-spawn)                   | [AgentTeam Orchestration](./agentteam-orchestration.md)   | Runtime team formation from role hints, budgets, and supervisor policy.           |
| Observed production runs    | [observability-tracing.ts](../examples.md#observability-tracing)         | [Security Model](./security-model.md)                     | Redacted traces, replay fixtures, and OpenTelemetry-style export.                 |
| Release readiness hardening | [Feature Coverage](./feature-coverage.md)                                | [API Stability](../api-stability.md)                      | Coverage review before publishing or broad production rollout.                    |

Recommended advanced progression:

1. Add tracing before adding more side effects.
2. Add approval and guardrail policy before writes or external sends.
3. Add MCP allowlists and package/transport review before production MCP use.
4. Add deterministic tests and replay fixtures before live integration tests.
5. Add AgentTeam only when the task genuinely needs multiple roles.

## Scenario Recipes

Use these recipes when your product goal spans multiple paths.

### Internal Knowledge Assistant

1. Start with [basic-chat.ts](../examples.md#basic-chat).
2. Add [prompt-assembly.ts](../examples.md#prompt-assembly) for reusable system and task prompts.
3. Add [custom-mcp-connection.ts](../examples.md#custom-mcp-connection) for internal docs.
4. Add [observability-tracing.ts](../examples.md#observability-tracing) so retrieved context and tool calls are reviewable.

Best when: teams need private docs search, policy-aware answers, and traceable tool usage.

### Support Triage And Customer Reply

1. Start with [custom-mcp-connection.ts](../examples.md#custom-mcp-connection) to connect your helpdesk, Slack or email MCP server.
2. Add [guardrails-and-approvals.ts](../examples.md#guardrails-and-approvals) before any email or Slack writes.
3. Add [structured-output.ts](../examples.md#structured-output) if routing metadata should feed a queue.

Best when: support teams need summaries, priority routing, and customer-facing drafts with approval boundaries.

### Engineering Review Agent

1. Start with [mcp-github-agent.ts](../examples.md#mcp-github-agent) for scoped repo and PR context.
2. Add [structured-output.ts](../examples.md#structured-output) for structured review output.
3. Add [agent-team.ts](../examples.md#agent-team) only when separate reviewer roles are useful.

Best when: engineering teams need repeatable review behavior with read-only defaults and clear severity ordering.

### Research And Report Generator

1. Start with [research-agent.ts](../examples.md#research-agent).
2. Add [structured-output.ts](../examples.md#structured-output) for findings, citations, and confidence fields.
3. Add [built-in-mcp-skill-memory.ts](../examples.md#built-in-mcp-skill-memory) for persistent preferences or saved context.
4. Add [cost-budgeting.ts](../examples.md#cost-budgeting) before broad usage.

Best when: research work needs retrieval, synthesis, repeatable output structure, and cost visibility.

### Creator Operating System

1. Add [Creator Memory And Analytics](../creator/analytics.md) so brand voice, prior work, performance reports, and experiments persist across runs.
2. Add [Caching](../persistence/agent-cache.md) before broad usage so repeated read tools do not burn unnecessary tokens or API calls.
3. Use [Built-In Adapters](../reference/built-in-adapters.md) and [Built-In MCP Wrappers](../reference/built-in-mcps.md) when you need to configure the full surface directly.

Best when: creators or content teams need research, planning, writing, performance feedback, and configurable power-user controls.

### Production Agent Platform

1. Start with [provider-routing.ts](../examples.md#provider-routing) or [agent-pool-routing.ts](../examples.md#agent-pool-routing).
2. Add [guardrails-and-approvals.ts](../examples.md#guardrails-and-approvals).
3. Add [observability-tracing.ts](../examples.md#observability-tracing).
4. Add [custom-adapter.ts](../examples.md#custom-adapter) for product-owned capability.
5. Add [MCP Security Checklist](./mcp-security-checklist.md) before connecting external MCP servers.

Best when: the package is embedded in a product with real users, budgets, tools, traces, and release gates.
