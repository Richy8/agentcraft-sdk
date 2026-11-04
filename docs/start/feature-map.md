# Feature Map

Full inventory of every AgentCraft feature. Use this as a navigation index — each row links to the feature's reference page, configuration, and cookbook examples.

## Core Runtime

| Feature | What it does | Reference | Config | Examples |
| --- | --- | --- | --- | --- |
| **Agent** | Create, configure, and run an LLM agent | [Agents](../core/agents.md) | [Agent Config](../configuration/agent-config.md) | [Beginner](../examples-cookbook/beginner.md) |
| **Models & Providers** | 15+ providers, typed model catalog, BestFitResolver | [Models & Providers](../core/models-and-providers.md) | [Provider Config](../configuration/provider-config.md) | [Providers](../examples-cookbook/provider.md) |
| **Running Agents** | `agent.run()`, multimodal inputs, full response shape | [Running Agents](../core/running-agents.md) | [Run Config](../configuration/run-config.md) | [Beginner](../examples-cookbook/beginner.md) |
| **Streaming** | Token-by-token streaming with `agent.stream()` | [Streaming](../core/streaming.md) | [Run Config](../configuration/run-config.md) | [Streaming](../examples-cookbook/streaming.md) |
| **Structured Output** | Zod-validated typed JSON from agent responses | [Structured Output](../core/structured-output.md) | [Structured Output Config](../configuration/structured-output-config.md) | [Structured Output](../examples-cookbook/structured-output.md) |
| **Prompt Assembly** | File-based, composable, templated prompts | [Prompt Assembly](../core/prompt-assembly.md) | [Prompt Assembly Config](../configuration/prompt-assembly-config.md) | [Prompt Assembly](../examples-cookbook/prompt-assembly.md) |
| **Budgets & Cost** | Token limits, cost caps, preflight estimation | [Budgets & Cost](../core/budgets-cost.md) | [Budget Config](../configuration/budget-config.md) | [Budgets & Cost](../examples-cookbook/budgets.md) |
| **Observability & Tracing** | Run traces, span capture, OpenTelemetry sink, replay | [Observability & Tracing](../core/observability-replay.md) | [Observability Config](../configuration/observability-config.md) | [Production](../examples-cookbook/production.md) |
| **Agent Events** | Typed event bus for cache, cost, tool, approval, and workflow events | [Agent Events](../core/agent-events.md) | [Workspace Config](../configuration/workspace-config.md) | [Orchestration](../examples-cookbook/orchestration.md) |
| **Error Handling** | Typed error hierarchy, retry classification, error utilities | [Error Handling](../core/error-handling.md) | [Retry Config](../configuration/retry-config.md) | [Error Handling & Retries](../examples-cookbook/error-handling.md) |

## Tools

| Feature | What it does | Reference | Config | Examples |
| --- | --- | --- | --- | --- |
| **Tools** | Model-callable typed functions with JSON Schema parameters | [Tools](../tools/tools.md) | [Tool Policy Config](../configuration/tool-policy-config.md) | [Tools & Adapters](../examples-cookbook/tools-adapters.md) |
| **Tool Policy** | Side-effect gating: allow, queue, or block by risk level | [Tool Policy](../tools/tool-policy.md) | [Tool Policy Config](../configuration/tool-policy-config.md) | [Tools & Adapters](../examples-cookbook/tools-adapters.md) |
| **Guardrails** | Input sanitization, secret detection, prompt injection protection | [Guardrails](../tools/guardrails.md) | [Tool Policy Config](../configuration/tool-policy-config.md) | [Tools & Adapters](../examples-cookbook/tools-adapters.md) |
| **Approvals** | Human or programmatic sign-off before tool execution | [Approvals](../tools/approvals.md) | [Tool Policy Config](../configuration/tool-policy-config.md) | [Production](../examples-cookbook/production.md) |
| **Tool Caching** | Cache tool call results using `security.cache` metadata | [Tool Caching](../tools/tool-caching.md) | [Cache Config](../configuration/cache-config.md) | [Persistence & Caching](../examples-cookbook/persistence.md) |
| **Authoring a Tool** | Build a production-quality tool from scratch | [Authoring a Tool](../tools/tool-authoring.md) | — | [Tools & Adapters](../examples-cookbook/tools-adapters.md) |

## Adapters

| Feature | What it does | Reference | Config | Examples |
| --- | --- | --- | --- | --- |
| **Adapters** | Tool bundles with lifecycle, dependency declarations, and policy | [Overview](../adapters/overview.md) | [Adapter Config](../configuration/adapter-config.md) | [Tools & Adapters](../examples-cookbook/tools-adapters.md) |
| **Built-In Adapters** | Fetch, Filesystem, GitHub, Database, Playwright, Supabase, Slack, Notion, and more | [Built-In Adapters](../adapters/built-in.md) | [Adapter Config](../configuration/adapter-config.md) | [Tools & Adapters](../examples-cookbook/tools-adapters.md) |
| **Specialized Adapters** | Email, Calendar, Sheets, Image Generation, ElevenLabs, Publishing, and more | [Specialized Adapters](../adapters/specialized-adapters.md) | [Adapter Config](../configuration/adapter-config.md) | [Tools & Adapters](../examples-cookbook/tools-adapters.md) |
| **Custom Adapters** | Build your own adapter with tools + lifecycle hooks | [Custom Adapters](../adapters/custom.md) | — | [Tools & Adapters](../examples-cookbook/tools-adapters.md) |
| **Adapter Safety** | Dependency validation, conflict detection, sideEffect boundaries | [Adapter Safety](../adapters/safety.md) | — | — |

## MCP

| Feature | What it does | Reference | Config | Examples |
| --- | --- | --- | --- | --- |
| **MCP** | Attach any Model Context Protocol server as an agent capability | [Overview](../mcp/overview.md) | [MCP Config](../configuration/mcp-config.md) | [MCP](../examples-cookbook/mcp.md) |
| **Built-In MCP Wrappers** | 30+ pre-built wrappers: GitHub, Slack, Notion, Stripe, Supabase, and more | [Built-In MCP Wrappers](../mcp/built-in.md) | [MCP Config](../configuration/mcp-config.md) | [MCP](../examples-cookbook/mcp.md) |
| **Custom MCP** | Wrap any MCP-compatible server | [Custom MCP](../mcp/custom.md) | [MCP Config](../configuration/mcp-config.md) | [MCP](../examples-cookbook/mcp.md) |
| **MCP Security** | Prompt injection defense, trust boundaries, allowlisting | [MCP Security](../mcp/security.md) | — | — |

## Orchestration

| Feature | What it does | Reference | Config | Examples |
| --- | --- | --- | --- | --- |
| **Agent Workflow** | Multi-step pipelines with typed context and step-to-step data flow | [Agent Workflow](../orchestration/agent-workflow.md) | [Workflow Config](../configuration/workflow-config.md) | [Orchestration](../examples-cookbook/orchestration.md) |
| **Workflow Steps** | 7 step types: Agent, Approval, Condition, Custom, Parallel, Team, Tool | [Workflow Steps](../orchestration/workflow-steps.md) | [Workflow Config](../configuration/workflow-config.md) | [Orchestration](../examples-cookbook/orchestration.md) |
| **Agent Team** | Multi-agent role coordination with orchestrator + members | [Agent Team](../orchestration/agent-team.md) | [Team & Pool Config](../configuration/team-config.md) | [Orchestration](../examples-cookbook/orchestration.md) |
| **Dynamic Team Spawning** | Runtime role spawning with `AgentTeam.spawn()` | [Dynamic Team Spawning](../orchestration/dynamic-team-spawning.md) | [Team & Pool Config](../configuration/team-config.md) | [Orchestration](../examples-cookbook/orchestration.md) |
| **Agent Pool** | Distribute requests across multiple agents with strategies | [Agent Pool](../orchestration/agent-pool.md) | [Team & Pool Config](../configuration/team-config.md) | [Orchestration](../examples-cookbook/orchestration.md) |
| **Agent Workspace** | Shared cache, adapters, budget, events, and store for agent ecosystems | [Agent Workspace](../orchestration/agent-workspace.md) | [Workspace Config](../configuration/workspace-config.md) | [Orchestration](../examples-cookbook/orchestration.md) |

## Persistence & Memory

| Feature | What it does | Reference | Config | Examples |
| --- | --- | --- | --- | --- |
| **AgentCache** | Tool-call result caching with 5 backends (memory, file, SQLite, Redis, Postgres) | [AgentCache](../persistence/agent-cache.md) | [Cache Config](../configuration/cache-config.md) | [Persistence & Caching](../examples-cookbook/persistence.md) |
| **Cache Warming** | Pre-populate cache at startup; hit-rate reporting; distributed locking | [Cache Warming](../persistence/cache-warming.md) | [Cache Config](../configuration/cache-config.md) | [Persistence & Caching](../examples-cookbook/persistence.md) |
| **Distributed Cache** | Redis and Postgres backends for multi-instance deployments | [Distributed Cache](../persistence/distributed-cache.md) | [Cache Config](../configuration/cache-config.md) | [Persistence & Caching](../examples-cookbook/persistence.md) |
| **Semantic Memory** | Long-term vector memory with Qdrant, Pinecone, Supabase backends | [Semantic Memory](../persistence/semantic-memory.md) | [Memory & Store Config](../configuration/memory-store-config.md) | [Semantic Memory](../examples-cookbook/semantic-memory.md) |
| **Artifact Store** | Durable typed persistence for agent outputs (Memory, File, SQLite) | [Artifact Store](../persistence/artifact-store.md) | [Memory & Store Config](../configuration/memory-store-config.md) | [Persistence & Caching](../examples-cookbook/persistence.md) |
| **Artifact Registry** | Runtime schema registry for project-owned artifact types | [Artifact Registry](../persistence/artifact-registry.md) | — | — |
| **Citation Store** | Source and citation tracking during research runs | [Citation Store](../persistence/citation-store.md) | — | — |
| **Creator Memory Store** | Brand voice profiles and content corpus with similarity search | [Creator Memory Store](../persistence/creator-memory-store.md) | [Memory & Store Config](../configuration/memory-store-config.md) | — |
| **Analytics History Store** | Content performance reports and A/B experiment tracking | [Analytics History Store](../persistence/analytics-history-store.md) | — | — |
| **Authoring a Domain Store** | Build a specialized persistence store for any custom domain | [Authoring a Domain Store](../persistence/authoring-domain-store.md) | — | — |

## Production

| Feature | What it does | Reference | Examples |
| --- | --- | --- | --- |
| **Security Model** | Full threat model, security layers, defaults, and what's not covered | [Security Model](../production/security-model.md) | [Production](../examples-cookbook/production.md) |
| **Governance Queue** | Durable approval queue with reviewer assignment, expiry, and audit trail | [Governance Queue](../production/governance-queue.md) | [Production](../examples-cookbook/production.md) |
| **AgentEval** | Quality assertion suites with CI pass/fail and markdown reports | [AgentEval](../production/agent-eval.md) | [Production](../examples-cookbook/production.md) |
| **AgentReports** | Structured run reports and trace artifacts as markdown | [AgentReports](../production/agent-reports.md) | [Production](../examples-cookbook/production.md) |
| **Production Observability** | OpenTelemetry sinks, dashboards, alerting, cost monitoring | [Production Observability](../production/observability-reports.md) | [Production](../examples-cookbook/production.md) |
| **Testing & Mocking** | `DeterministicFakeProvider` for unit testing agents without API calls | [Testing & Mocking](../production/testing.md) | [Testing & Mocking](../examples-cookbook/testing.md) |
| **Runtime Hardening** | Hardening status, invariants, and regression test coverage | [Runtime Hardening](../production/runtime-hardening.md) | — |

## Stability Tiers

| Tier | Meaning |
| --- | --- |
| **Stable** | Public API — will not break without a major version bump |
| **Beta** | API is complete but may have minor changes before stable |
| **Experimental** | API may change significantly; not recommended for production |

| Feature | Tier |
| --- | --- |
| Agent, run, stream, structured output, streaming | Stable |
| Providers (all 15+), Provider catalog | Stable |
| Tools, Tool Policy, Guardrails, Approvals | Stable |
| Built-In Adapters, Custom Adapters | Stable |
| Built-In MCP Wrappers, Custom MCP | Stable |
| AgentCache (memory, file, SQLite) | Stable |
| Artifact Store (Memory, File, SQLite) | Stable |
| AgentWorkflow, AgentTeam, AgentPool, AgentWorkspace | Stable |
| AgentEval, AgentReports | Stable |
| Semantic Memory | Beta |
| AgentCache (Redis, Postgres) | Beta |
| Distributed Cache with locking | Beta |
| Dynamic Team Spawning | Beta |
| Creator Memory Store, Analytics History Store | Beta |
