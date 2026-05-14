# Feature Map

Use this as the package inventory. Each feature has a purpose page, config page, and examples.

| Feature           | Purpose                                                  | Start                                                   | Examples                                                    |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------- |
| Agents            | Provider-backed runtime object.                          | [Agents](../core/agents.md)                             | [Beginner](../examples-cookbook/beginner.md)                |
| Providers         | Portable model catalog and provider config.              | [Models And Providers](../core/models-and-providers.md) | [Provider examples](../examples-cookbook/provider.md)       |
| Runs              | Prompt execution, media input, structured output.        | [Running Agents](../core/running-agents.md)             | [Beginner](../examples-cookbook/beginner.md)                |
| Streaming         | Incremental events and tool-call streams.                | [Streaming](../core/streaming.md)                       | [Streaming example](../examples.md#streaming-with-tools)    |
| Structured output | Validated JSON outputs.                                  | [Structured Output](../core/structured-output.md)       | [Structured output](../examples.md#structured-output)       |
| Prompt assembly   | File-based reusable prompts.                             | [Prompt Assembly](../core/prompt-assembly.md)           | [Prompt assembly](../examples.md#prompt-assembly)           |
| Budgets/cost      | Token, cost, and tool call limits.                       | [Budgets And Cost](../core/budgets-cost.md)             | [Cost examples](../examples.md#cost-budgeting)              |
| Observability     | Traces, replay, OpenTelemetry-like export.               | [Observability](../core/observability-replay.md)        | [Production](../examples-cookbook/production.md)            |
| Tools             | Model-callable typed functions.                          | [Tools](../tools/tools.md)                              | [Tool examples](../examples-cookbook/tools-adapters.md)     |
| Tool policy       | Approvals, read-only mode, redaction, guardrails.        | [Tool Policy](../tools/tool-policy.md)                  | [Approvals](../tools/approvals.md)                          |
| Adapters          | Built-in and custom tool bundles.                        | [Adapters](../adapters/overview.md)                     | [Adapter examples](../examples-cookbook/tools-adapters.md)  |
| MCP               | External tool servers.                                   | [MCP](../mcp/overview.md)                               | [MCP examples](../examples-cookbook/mcp.md)                 |
| Skills            | Prompt behavior and directives.                          | [Skills](../skills/overview.md)                         | [Skill examples](../examples-cookbook/skills.md)            |
| Creator system    | Packs, creator skills, memory, analytics.                | [Creator Overview](../creator/overview.md)              | [Creator examples](../examples-cookbook/creator.md)         |
| AgentPool         | Model routing and fallback.                              | [AgentPool](../orchestration/agent-pool.md)             | [Routing](../examples.md#agent-pool-routing)                |
| AgentTeam         | Multi-agent role workflows.                              | [AgentTeam](../orchestration/agent-team.md)             | [Team](../examples.md#agent-team)                           |
| AgentWorkspace    | Shared cache, adapters, policy, and events.              | [AgentWorkspace](../orchestration/agent-workspace.md)   | [Orchestration](../examples-cookbook/orchestration.md)      |
| AgentWorkflow     | Repeatable multi-step pipelines with approval and retry. | [AgentWorkflow](../orchestration/agent-workflow.md)     | [Orchestration](../examples-cookbook/orchestration.md)      |
| ArtifactStore     | Durable typed persistence for workflow outputs.          | [ArtifactStore](../persistence/artifact-store.md)       | [Production](../examples-cookbook/production.md)            |
| ArtifactRegistry  | Named schema registry for artifact validation.           | [ArtifactRegistry](../persistence/artifact-registry.md) | [Production](../examples-cookbook/production.md)            |
| Persistence/cache | Cache, artifacts, citations, memory, analytics history.  | [AgentCache](../persistence/agent-cache.md)             | [Memory analytics](../examples.md#creator-memory-analytics) |
