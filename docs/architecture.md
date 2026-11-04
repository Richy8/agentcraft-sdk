# Architecture

AgentCraft is organized around a small set of layered runtime boundaries. Understanding this model makes every config decision predictable.

## The Core Loop

Every `agent.run()` call follows this sequence:

```txt
1. Preflight
   └─ Budget check (preflight cost estimation)
   └─ Prompt assembly (user prompt + system)

2. Tool exposure
   └─ Adapters expose their ToolDefinitions
   └─ Tool policy wraps each tool (approval gate, guardrails, cache eligibility)
   └─ MCP tools loaded from attached MCP servers

3. LLM call
   └─ Provider protocol sends prompt + tools to the model
   └─ Model returns content and/or tool call requests

4. Tool execution loop
   └─ For each tool call: policy check → cache lookup → execute() → cache write
   └─ Results appended to conversation history
   └─ LLM call repeated until model returns final content

5. Post-run
   └─ Structured output parsing (if responseSchema set)
   └─ Budget enforcement (post-run cost vs limit)
   └─ Trace assembly (spans, run summary)
   └─ AgentResponse assembled and returned
```

## Layer Diagram

```txt
┌─────────────────────────────────────────────────────────────────┐
│                        Your Application                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ agent.run() / agent.stream()
┌──────────────────────────▼──────────────────────────────────────┐
│                         Agent (Facade)                          │
│  create · use · run · stream · estimateCost · inspect · catalog │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
  ┌────▼────┐   ┌─────▼──────┐ ┌────▼────────┐
  │ Runtime │   │   Tools    │ │   Memory    │
  │         │   │  Manager   │ │  Injector   │
  │ run/    │   │            │ │             │
  │ stream  │   │ policy     │ │ semantic    │
  │ trace   │   │ cache      │ │ retrieval   │
  │ cost    │   │ execute    │ │ injection   │
  └────┬────┘   └─────┬──────┘ └────────────┘
       │              │
  ┌────▼──────────────▼──────────────▼──────────────────────────┐
  │                    Provider Protocol                         │
  │  OpenAI · Anthropic · Gemini · Bedrock · Groq · Mistral     │
  │  DeepSeek · xAI · Cohere · Perplexity · Ollama · 10+ more  │
  └──────────────────────────────────────────────────────────────┘

  Supporting infrastructure (shared across all layers):
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │  AgentCache  │  │  ArtifactStore│  │  Workspace   │  │  Governance  │
  │  (5 backends)│  │ (Memory/File │  │  (shared     │  │  (Approval   │
  │              │  │  /SQLite)    │  │  context)    │  │  Queue)      │
  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

## Runtime Modules

The `Agent` class is an intentionally thin facade. Internal behavior is split across focused modules:

| Module                                 | Responsibility                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `agent/runtime/agent-runtime`          | Run/stream choreography, trace spans, cost reports, cache summary assembly      |
| `agent/runtime/structured-output-flow` | JSON-mode vs tool-fallback decisions for structured output                      |
| `agent/adapters/attachment-manager`    | `.use()` attachment validation, dependency checks, tool-name conflict detection |
| `agent/adapters/lifecycle-manager`     | Adapter init/cleanup, run-only adapter cleanup order                            |
| `agent/adapters/run-scope`             | Run-level `use` attachments and scoped dependency validation                    |
| `agent/tools/tool-manager`             | Tool exposure, policy wrapping, trace policy, MCP wrapping, cache wiring        |
| `agent/tools/tool-cache-manager`       | Cache lookup/write behavior around tool execution                               |
| `agent/memory/context-injector`        | Per-run semantic memory retrieval and bounded context injection                 |

## Tool Call Data Flow

A single tool call goes through five gates before `execute()` runs:

```txt
Model requests tool call
        │
        ▼
1. Policy check (riskPolicy)
   sideEffect level → allow / queue / block
        │ allowed
        ▼
2. Guardrails
   Input sanitization, secret pattern scan
        │ clean
        ▼
3. Cache lookup
   Hash(toolName + args) → cache hit? → return cached result
        │ miss
        ▼
4. Dry-run check
   toolPolicy.dryRun? → return preview without executing
        │ not dry-run
        ▼
5. execute(args)
   Tool runs, result returned
        │
        ▼
6. Cache write (if security.cache.safe && security.cache.deterministic)
7. Result appended to conversation → next LLM turn
```

## Orchestration Layer

Multi-agent surfaces compose on top of the single-agent core:

```txt
AgentWorkspace (shared context)
├── AgentCache      ← shared cache across all agents
├── ArtifactStore   ← shared output persistence
├── EventEmitter    ← cache.hit, cost.updated, tool.called, ...
├── Budget          ← shared cost limit across all agents
└── TraceSink       ← trace collection for the workspace

AgentWorkflow (multi-step pipeline)
├── AgentStep       ← runs one agent, output stored in ctx.steps
├── ApprovalStep    ← waits for human or programmatic sign-off
├── ConditionStep   ← branches on a predicate
├── CustomStep      ← arbitrary logic with access to ctx
├── ParallelStep    ← runs multiple steps concurrently
├── TeamStep        ← runs an AgentTeam as a step
└── ToolStep        ← calls a tool directly without an agent

AgentTeam (role-based coordination)
├── Orchestrator    ← plans, delegates, merges
└── Members[]       ← each agent has a role and system prompt

AgentPool (request distribution)
└── Strategies: round-robin, cost, quality, fallback
```

## Configuration Boundaries

| Boundary          | Configured with                                   | Scope                                     |
| ----------------- | ------------------------------------------------- | ----------------------------------------- |
| Agent defaults    | `Agent.create()`                                  | All runs on this agent                    |
| Per-run behavior  | `agent.run()`                                     | Single run only                           |
| Provider protocol | Provider-specific fields on `Agent.create()`      | SDK client construction                   |
| Tool execution    | `ToolDefinition` + `ToolPolicy`                   | All tool calls through this agent         |
| Adapter lifecycle | Adapter constructor config + `.use()`             | Adapter's tools on this agent             |
| MCP server        | `MCPAdapter.connect()` or built-in wrapper config | All tool calls from that MCP server       |
| Workspace         | `AgentWorkspace.memory()`                         | Shared across all agents in the workspace |
| Workflow          | `AgentWorkflow.create({ steps, workspace })`      | All steps in the workflow run             |

## Entry Points and What They Export

```ts
// Main — Agent, AgentPool, AgentCache, ArtifactStore, AgentWorkflow, Provider, ...
import { Agent, AgentCache, PromptAssembler } from "@deskcreate/agentcraft";

// Adapters — built-in native adapters
import {
  FetchAdapter,
  TavilySearchAdapter,
  DatabaseAdapter,
  ImageGenerationAdapter,
} from "@deskcreate/agentcraft/adapters";

// Team and workflow orchestration
import { AgentTeam } from "@deskcreate/agentcraft/team";
import { AgentWorkflow, AgentWorkspace } from "@deskcreate/agentcraft";

// MCP — built-in MCP wrappers and generic MCP.connect()
import {
  GitHubMCP,
  SlackMCP,
  FilesystemMCP,
  MCP,
  MCPAdapter,
} from "@deskcreate/agentcraft/mcp";
```

## Related

- [Feature Map](./start/feature-map.md)
- [Agent Config](./configuration/agent-config.md)
- [Run Config](./configuration/run-config.md)
- [Workspace Config](./configuration/workspace-config.md)
