# Architecture Overview

AgentCraft is organized around a small set of runtime boundaries:

- `Agent` is the public facade for creation, attachment, workspace wiring, inspection, and per-run delegation.
- `agent/runtime` owns run and stream orchestration, structured output flow, prompt measurement, cost reporting, and trace assembly.
- `agent/skills` owns skill activation, adaptive prompt assembly, registries, certification, primitive skills, domain skills, and pack generation.
- `agent/tools` owns tool collection, policy wrapping, execution budgets, cache-aware execution, and tool selection.
- `agent/cache` owns the stable `AgentCache` facade plus memory, file, Redis, Postgres, and SQLite backends.
- `agent/memory` owns the stable `AgentMemory` facade plus local, custom, and vector memory stores.
- `AgentPool` chooses among agents for cost, speed, quality, best-fit, fallback, downgrade, and upgrade flows.
- `AgentTeam` coordinates multiple agents through member tools, parallel collection, supervisor review, rubrics, and role budgets.
- Providers are normalized through `ProviderProtocol` implementations and executed by `UnifiedProvider`.
- Adapters expose tools and lifecycle hooks while tool policy enforces approvals, guardrails, redaction, retries, limits, and audits.
- MCP adapters expose remote MCP tools/resources/prompts through stdio, HTTP JSON-RPC, or SSE transports.
- Skills contribute system prompt extensions plus capability and dependency metadata.

The runtime keeps provider differences visible at the protocol boundary, while presenting a stable public API for applications.

## Runtime Service Layout

The `Agent` class intentionally stays as a thin application-facing object. Internally, it delegates to focused services:

| Module                                    | Responsibility                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------ |
| `agent/runtime/agent-runtime.ts`          | Run/stream choreography, trace spans, cost reports, cache summary assembly.    |
| `agent/runtime/structured-output-flow.ts` | JSON-mode vs tool-fallback decisions for structured output.                    |
| `agent/adapters/attachment-manager.ts`    | `.use(...)` attachment validation, dependency checks, and tool-name conflicts. |
| `agent/adapters/lifecycle-manager.ts`     | Attached adapter init/cleanup and run-only adapter cleanup order.              |
| `agent/adapters/run-scope.ts`             | Run-level `use` attachments and scoped dependency validation.                  |
| `agent/skills/activation-engine.ts`       | Skill activation decisions for `always`, `auto`, and `directive-only`.         |
| `agent/skills/prompt-assembler.ts`        | Adaptive skill prompt section selection and sanitized prompt inspection.       |
| `agent/tools/tool-manager.ts`             | Tool exposure, policy wrapping, trace policy, MCP wrapping, and cache wiring.  |
| `agent/tools/tool-cache-manager.ts`       | Cache lookup/write behavior around tool execution.                             |
| `agent/memory/context-injector.ts`        | Per-run semantic memory retrieval and bounded context injection.               |

This split keeps public behavior stable while making each subsystem testable without constructing a full application runtime.

## Documentation Map

Use the guides in this order when you are evaluating or wiring a feature:

1. [Configuration Reference](./guides/config-reference.md) explains every major config surface, whether fields are required, accepted values, and why each option exists.
2. [Provider Abstraction](./guides/provider-abstraction.md) explains how model/provider settings map to protocol drivers and provider-specific credentials.
3. [Tool Lifecycle](./guides/tool-lifecycle.md), [Guardrails](./guides/guardrails.md), and [Security Model](./guides/security-model.md) explain how untrusted inputs, side effects, approvals, and redaction are handled.
4. [MCP Lifecycle](./guides/mcp-lifecycle.md), [Adapter Authoring](./guides/adapter-authoring.md), and [Skill Authoring](./guides/skill-authoring.md) explain how external capabilities enter the runtime.
5. [Structured Output](./guides/structured-output.md), [Pricing Model](./guides/pricing-model.md), and [AgentTeam Orchestration](./guides/agentteam-orchestration.md) cover higher-level production workflows.

The `examples/` folder shows these settings in runnable context. The docs explain the contract behind those choices so users can decide what to keep, omit, or replace in their own application.

## Primary Configuration Boundaries

| Boundary          | Configure it with                               | Responsibility                                                                                                                                  |
| ----------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent defaults    | `Agent.create()`                                | Provider selection, credentials, default model parameters, global tools, global tool policy, retry, and logging.                                |
| Per-run behavior  | `agent.run()`                                   | Prompt input, run-level model overrides, multimodal inputs, structured output, tracing, replay, budget, tools, and tool policy.                 |
| Provider protocol | Provider-specific config                        | SDK/client construction, request formatting, streaming chunks, tool-call extraction, follow-up turns, usage, finish reasons, and error mapping. |
| Tool execution    | `ToolDefinition` and `ToolPolicy`               | Tool schemas, side-effect labels, approvals, read-only/dry-run behavior, guardrails, retries, result limits, and audit events.                  |
| Adapters          | `createAdapter()` and built-in adapter configs  | External capability packaging, lifecycle hooks, metadata, dependencies, and tool exposure.                                                      |
| MCP               | `MCPAdapter.connect()` or built-in MCP wrappers | Transport setup, server discovery, allowlists, root restrictions, package trust metadata, and cleanup.                                          |
| Skills            | `defineSkill()` or built-in skills              | Prompt behavior, dependency metadata, required capabilities, optional tools, quality checklists, and safety notes.                              |
| Teams             | `AgentTeam.create()` or `AgentTeam.spawn()`     | Multi-agent orchestration, member roles, supervisor review, shared capabilities, loop limits, and role budgets.                                 |
