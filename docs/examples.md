# Examples

The runnable examples live in `examples/`. They are intentionally commented so users can understand which config values are mandatory, optional, provider-specific, interchangeable, or safety-sensitive.

Click any example in the table to jump to the full source below. The source blocks are imported from the actual example files, so the documentation stays aligned with the runnable code.

## Example Index

| Example                                                    | What it demonstrates                                                                  | Config focus                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [basic-chat.ts](#basic-chat)                               | Minimal provider-backed agent setup.                                                  | [`model`](./guides/config/agent-creation.md#fields "Selects provider, model capabilities, request format, and pricing metadata"), [`apiKey`](./guides/config/agent-creation.md#provider-connection-variants "Authenticates cloud providers; omit for local providers unless required"), [`prompt`](./guides/config/run-parameters.md#fields "Inline task text passed to the run").                                                                                        |
| [agent-pool-routing.ts](#agent-pool-routing)               | Explicit AgentPool routing, fallback, downgrade, and lookup behavior.                 | [`AgentPool`](./guides/config/budgets-and-routing.md#agentpool-routing "Routes across named agents by cost, speed, quality, round-robin, random, or best-fit"), `fallback`, `fallbackMode`, `downgradeOnBudgetPressure`, `upgradeOnQualityFailure`.                                                                                                                                                                                                                       |
| [provider-routing.ts](#provider-routing)                   | Cost, speed, quality, fallback, and best-fit provider routing.                        | [`AgentPool`](./guides/config/budgets-and-routing.md#agentpool-routing "Routes across agents by cost, speed, quality, random, round-robin, or best-fit"), fallback modes, model selection.                                                                                                                                                                                                                                                                                |
| [model-catalog-and-cost.ts](#model-catalog-and-cost)       | Model inspection, catalog filtering, and preflight cost estimates.                    | [`Agent.inspect`](./guides/config/budgets-and-routing.md "Reads provider/model capability and pricing metadata"), [`Agent.catalog`](./guides/config/budgets-and-routing.md "Filters available models by capability and metadata"), [`Agent.estimateCost`](./guides/pricing-model.md "Estimates tokens and cost before a run").                                                                                                                                            |
| [structured-output.ts](#structured-output)                 | JSON schema validation, retry repair, and structured response handling.               | [`responseSchema`](./guides/config/structured-output.md "Validates JSON into structuredResponse"), [`responseFormat`](./guides/config/structured-output.md "Requests provider-native JSON where supported"), [`structuredOutput`](./guides/config/structured-output.md "Controls retries and tool fallback").                                                                                                                                                             |
| [streaming-with-tools.ts](#streaming-with-tools)           | Streaming model output with tool-call and tool-result events.                         | `streamWithTools`, stream events, [`toolPolicy`](./guides/config/tools-and-guardrails.md#tool-policy "Controls approvals, guardrails, redaction, timeouts, and audits").                                                                                                                                                                                                                                                                                                  |
| [multimodal-inputs.ts](#multimodal-inputs)                 | Image, file, and audio run inputs with capability-aware skills.                       | [`images`](./guides/config/run-parameters.md#fields "Adds image inputs for vision-capable models"), [`files`](./guides/config/run-parameters.md#fields "Adds file inputs for file-capable models"), [`audio`](./guides/config/run-parameters.md#fields "Adds audio inputs for audio-capable models"), multimodal skills.                                                                                                                                                  |
| [filesystem-safe-agent.ts](#filesystem-safe-agent)         | Read-only and approval-gated file tooling.                                            | `FileSystemAdapter`, [`readOnly`](./guides/config/tools-and-guardrails.md#tool-policy "Blocks writes and confirmation-gated tools"), `allowedExtensions`, approval policy.                                                                                                                                                                                                                                                                                                |
| [database-readonly.ts](#database-readonly)                 | Read-only database access with scoped query execution.                                | `DatabaseAdapter`, [`readOnly`](./guides/config/tools-and-guardrails.md#tool-policy "Use for analysis and review flows"), `rowLimit`, injected query executor.                                                                                                                                                                                                                                                                                                            |
| [browser-automation.ts](#browser-automation)               | Browser adapter setup with side-effect-aware controls.                                | Browser launch config, domain policy, confirmation-gated actions.                                                                                                                                                                                                                                                                                                                                                                                                         |
| [skill-composition.ts](#skill-composition)                 | Combining skills, adapters, prompt behavior, and dependency metadata.                 | Built-in skills, adapter dependencies, capability checks.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [custom-skills.ts](#custom-skills)                         | Two custom skill patterns: tool-bearing triage and hook-based launch review.          | [`defineSkill`](./guides/skill-authoring.md "Creates a reusable skill with prompt behavior, metadata, optional tools, and lifecycle hooks"), skill metadata, directives, skill-local tools.                                                                                                                                                                                                                                                                               |
| [mcp-github-agent.ts](#mcp-github-agent)                   | MCP-backed tool connection with allowlists and metadata.                              | MCP transport, tool allowlists, package trust metadata.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| [custom-mcp-connection.ts](#custom-mcp-connection)         | Direct custom MCP connection for internal or third-party servers.                     | [`MCPAdapter.connect`](./guides/mcp-lifecycle.md "Connects stdio, HTTP, or SSE MCP servers with allowlists and trust metadata"), `allowedTools`, `allowedResources`, `roots`, package pinning, trace events.                                                                                                                                                                                                                                                              |
| [built-in-mcp-skill-memory.ts](#built-in-mcp-skill-memory) | Built-in Memory MCP plus Memory and Research skills.                                  | Built-in MCP wrappers, stateful memory, native fetch adapter, tool policy for persistent memory.                                                                                                                                                                                                                                                                                                                                                                          |
| [adapter-skill-workflow.ts](#adapter-skill-workflow)       | Native adapters with a built-in skill for code review.                                | FileSystem and GitHub adapter config, read-only policy, CodeReviewSkill dependencies, approval callbacks.                                                                                                                                                                                                                                                                                                                                                                 |
| [customer-ops-workflow.ts](#customer-ops-workflow)         | Customer-support workflow using Slack MCP, native Slack, email, and skills.           | Built-in MCP plus native adapters, `EmailDraftSkill`, `SummarizeSkill`, write approval boundaries, provider-specific secrets.                                                                                                                                                                                                                                                                                                                                             |
| [observability-tracing.ts](#observability-tracing)         | Traces, redaction, replay fixtures, and OpenTelemetry-style export.                   | `trace`, trace sinks, replay fixture output.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [local-ollama-private.ts](#local-ollama-private)           | Local/private model setup without cloud provider keys.                                | Local OpenAI-compatible provider, `baseUrl`, privacy posture.                                                                                                                                                                                                                                                                                                                                                                                                             |
| [agent-team.ts](#agent-team)                               | Multi-agent orchestration with specialist roles.                                      | `AgentTeam`, members, supervisor, role budgets.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| [agent-team-spawn.ts](#agent-team-spawn)                   | Dynamic AgentTeam formation from a root agent and role hints.                         | [`AgentTeam.spawn`](./guides/config/agentteam.md "Creates specialist members dynamically"), `roleHints`, `maxAgents`, supervisor, role budgets.                                                                                                                                                                                                                                                                                                                           |
| [cost-budgeting.ts](#cost-budgeting)                       | Preflight cost estimates and run budgets.                                             | `budget`, `maxCost`, token limits, cost options.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [custom-adapter.ts](#custom-adapter)                       | Authoring a custom adapter and tool.                                                  | `createAdapter`, `tool`, metadata, security labels.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [github-review-agent.ts](#github-review-agent)             | GitHub review workflow with scoped repo tooling.                                      | GitHub adapter config, repo scope, write approvals.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [guardrails-and-approvals.ts](#guardrails-and-approvals)   | Guardrail and approval behavior around tools.                                         | `guardrailMode`, `onApprovalRequired`, audit events.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| [skill-directives.ts](#skill-directives)                   | Scoped skill behavior with slash directives inside a prompt.                          | Skill `directive`, `.use()`, `/humanizer`, `/write`, directive validation.                                                                                                                                                                                                                                                                                                                                                                                                |
| [prompt-assembly.ts](#prompt-assembly)                     | Prompt files, includes, variables, config injection, strict assembly, and provenance. | [`promptFile`](./guides/config/prompt-assembly.md#prompt-sources "Loads an explicit prompt entry file"), [`vars`](./guides/config/prompt-assembly.md#injection-channels "Replaces double-curly variable placeholders"), [`assembly.config`](./guides/config/prompt-assembly.md#injection-channels "Replaces config placeholders from assembly config values"), [`include`](./guides/config/prompt-assembly.md#injection-channels "Composes files from the entry prompt"). |
| [replay-mode.ts](#replay-mode)                             | Deterministic replay for demos and tests.                                             | `replay`, trace fixtures, no-provider execution.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [research-agent.ts](#research-agent)                       | Research workflow using search/retrieval style capabilities.                          | Research skills, fetch/search adapters, output shaping.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| [creator-pack-workflow.ts](#creator-pack-workflow)         | Creator pack workflow for blog and SEO content.                                       | `CreatorPacks.blog`, `CreatorPacks.seo`, creator skills, `skillActivation`, `toolSelection`, SEO fixtures, creator resources.                                                                                                                                                                                                                                                                                                                                             |
| [creator-memory-analytics.ts](#creator-memory-analytics)   | Durable local creator memory and analytics history setup.                             | `FileSystemCreatorMemoryStore`, `FileSystemAnalyticsHistoryStore`, `CreatorResourcesAdapter`, `AnalyticsAdapter`.                                                                                                                                                                                                                                                                                                                                                         |

For an audit-style view of feature coverage, see [Feature Coverage](./guides/feature-coverage.md).

## Running Examples

Most examples are designed to be read first and then adapted into an application. Provider-backed examples require the relevant environment variables from `.env.example`.

```sh
cp .env.example .env
```

Then run examples with your preferred TypeScript runner or by compiling the package first. Keep API keys local, cost-bounded, and scoped to the provider or tool being demonstrated.

## Full Example Source

### Basic Chat

Use this as the smallest possible AgentCraft starting point. It shows how to create an agent with a provider model, pass the required API key, and run a single prompt.

Config ideas to tweak: swap `Provider.openai['gpt-4o-mini']` for a higher quality or local model, add a `system` prompt for product voice, tune `temperature` for determinism, and set `maxTokens` to control response length and cost.

::: details Source: `basic-chat.ts`

<<< ../examples/basic-chat.ts

:::

### Provider Routing

Use this when your app needs to choose between models instead of hard-coding one model forever. It demonstrates cost, speed, quality, fallback, and best-fit routing patterns.

Config ideas to tweak: change the pool `strategy`, set stricter fallback behavior, add provider-specific agents, and combine routing with run budgets when the product needs predictable cost ceilings.

::: details Source: `provider-routing.ts`

<<< ../examples/provider-routing.ts

:::

### AgentPool Routing

Use this when you want the AgentPool API to be visible and explicit. It shows named candidates, `AgentPool.get(name)`, fallback agents, fallback modes, downgrade on budget pressure, and quality upgrade behavior.

Config ideas to tweak: switch `strategy` between `cost`, `speed`, `quality`, `round-robin`, `random`, and `best-fit`; add a provider-specific fallback; and combine pool routing with run budgets so the app can make model selection predictable.

::: details Source: `agent-pool-routing.ts`

<<< ../examples/agent-pool-routing.ts

:::

### Model Catalog And Cost

Use this when your app needs model metadata before running an agent. It demonstrates model inspection, catalog filtering, and cost estimation without making a provider call.

Config ideas to tweak: filter models by provider, tool support, streaming support, quality score, or multimodal capability; show pricing metadata in an admin UI; and block stale pricing when estimates are used for billing-sensitive flows.

::: details Source: `model-catalog-and-cost.ts`

<<< ../examples/model-catalog-and-cost.ts

:::

### Structured Output

Use this when your application needs machine-readable JSON, not free-form prose. The example shows how to ask for structured output and validate the result before trusting it.

Config ideas to tweak: adjust `responseSchema` fields, add `enum` values for controlled categories, use `structuredOutput.retries` for repair attempts, and enable or disable `toolFallback` depending on provider reliability.

::: details Source: `structured-output.ts`

<<< ../examples/structured-output.ts

:::

### Streaming With Tools

Use this when users should see incremental model output while the agent can still call tools during the same run. It is the right shape for interactive assistants, dashboards, and long-running workflows.

Config ideas to tweak: handle `model_delta`, `tool_call`, `tool_result`, and `final` events differently in your UI, narrow `tools` per task, and apply `toolPolicy` so streaming does not bypass approval or guardrail controls.

::: details Source: `streaming-with-tools.ts`

<<< ../examples/streaming-with-tools.ts

:::

### Multimodal Inputs

Use this when a run needs image, file, or audio inputs. It demonstrates the payload shape for each media type and pairs the inputs with relevant built-in skills.

Config ideas to tweak: use `type: 'base64'` for private media loaded by your app, `type: 'url'` for provider-accessible media, set accurate `mediaType` values, and always choose models whose catalog capabilities support the media type.

::: details Source: `multimodal-inputs.ts`

<<< ../examples/multimodal-inputs.ts

:::

### Filesystem Safe Agent

Use this for local file reading, review, and controlled write workflows. It demonstrates how file access should be rooted, extension-limited, and optionally read-only.

Config ideas to tweak: set `rootPath` to a project or tenant directory, use `readOnly: true` for inspection tasks, narrow `allowedExtensions`, and require approval before write-capable tools run.

::: details Source: `filesystem-safe-agent.ts`

<<< ../examples/filesystem-safe-agent.ts

:::

### Database Readonly

Use this when an agent needs to answer questions from a database without being allowed to mutate data. The example keeps execution behind an injected query function so the host app owns real database connectivity.

Config ideas to tweak: set `dialect`, keep `readOnly: true` for analysis, lower `rowLimit` for large datasets, and add tenant-aware query validation in the injected executor.

::: details Source: `database-readonly.ts`

<<< ../examples/database-readonly.ts

:::

### Browser Automation

Use this when an agent needs to inspect pages, collect visible text, or perform controlled browser actions. It is useful for QA, research, and internal workflow automation.

Config ideas to tweak: run headless or visible browser sessions, restrict domains at the app layer, treat click/type actions as side-effecting, and require confirmation before interactions that can submit forms or change remote state.

::: details Source: `browser-automation.ts`

<<< ../examples/browser-automation.ts

:::

### Skill Composition

Use this when a task benefits from packaged behavior such as writing, research, analysis, translation, or review. Skills add prompt behavior and dependency metadata without hiding app-level policy.

Config ideas to tweak: attach only the skills needed for the current task, satisfy required adapters explicitly, inspect `sideEffectRisk`, and version skill prompts when changing output expectations.

::: details Source: `skill-composition.ts`

<<< ../examples/skill-composition.ts

:::

### Custom Skills

Use this when you want app-owned behavior to be reusable across agents. The example shows two different custom skill shapes: a support triage skill that contributes a tool and a launch-readiness skill that contributes prompt behavior plus a lifecycle hook.

Config ideas to tweak: add `directive` when users should target the skill by slash command, keep `metadata.sideEffectRisk` honest, use `requires` only for capabilities the skill truly needs, and version `promptVersion` whenever output expectations change.

::: details Source: `custom-skills.ts`

<<< ../examples/custom-skills.ts

:::

### MCP GitHub Agent

Use this when you want to connect an external MCP server and expose only selected server tools to an agent. The GitHub example highlights command/package trust, secrets, and tool allowlists.

Config ideas to tweak: use hosted or pinned MCP transports where possible, restrict `allowedTools`, keep tokens scoped to one repo or org task, and treat MCP outputs as untrusted tool results. Review the [MCP security checklist](./guides/mcp-security-checklist.md) before production use.

::: details Source: `mcp-github-agent.ts`

<<< ../examples/mcp-github-agent.ts

:::

### Custom MCP Connection

Use this when your company has an internal MCP server or AgentCraft does not yet ship a wrapper for the tool server you need. It demonstrates stdio setup, package pinning, command allowlists, tool/resource allowlists, roots, metadata, and tracing.

Config ideas to tweak: use `transport: 'http'` or `transport: 'sse'` for hosted servers, keep stdio package specs pinned, expose the smallest possible `allowedTools` set, and route `onSecurityWarning` plus `onTrace` into deployment telemetry. Review the [MCP security checklist](./guides/mcp-security-checklist.md) before production use.

::: details Source: `custom-mcp-connection.ts`

<<< ../examples/custom-mcp-connection.ts

:::

### Built-In MCP Skill Memory

Use this when an agent needs durable memory plus retrieval-style work. It combines the built-in Memory MCP wrapper with `MemorySkill`, then adds a native fetch adapter and `ResearchSkill` so memory and research behavior can cooperate.

Config ideas to tweak: set `filePath` for predictable local memory, replace Memory MCP with Redis/Pinecone/Supabase for production persistence, keep `readOnly` true unless memory writes are intentional, and cap `budget.maxToolCalls` so stateful runs stay bounded.

::: details Source: `built-in-mcp-skill-memory.ts`

<<< ../examples/built-in-mcp-skill-memory.ts

:::

### Adapter Skill Workflow

Use this when a built-in skill needs concrete app capabilities. The code-review workflow attaches local filesystem context and GitHub context before adding `CodeReviewSkill`.

Config ideas to tweak: scope `rootPath`, set `allowedExtensions`, configure `allowedRepos`, keep review flows read-only by default, and use approval callbacks for any tool that could create or update remote state.

::: details Source: `adapter-skill-workflow.ts`

<<< ../examples/adapter-skill-workflow.ts

:::

### Customer Ops Workflow

Use this for support or customer operations agents that need collaboration context and customer-facing drafts. It demonstrates a mixed MCP/native setup with Slack MCP, native Slack tools, EmailAdapter, `SummarizeSkill`, and `EmailDraftSkill`.

Config ideas to tweak: use MCP when a hosted tool server gives the best integration path, use native adapters when you want direct SDK-style control, keep email sends approval-gated, and scope Slack tokens to the smallest channel/action set possible.

::: details Source: `customer-ops-workflow.ts`

<<< ../examples/customer-ops-workflow.ts

:::

### Observability Tracing

Use this when you need to understand what an agent did after a run. It shows run/model/tool spans, redaction, replay fixture output, and OpenTelemetry-style export.

Config ideas to tweak: pass `trace: true` for local debugging, provide a trace sink for production telemetry, keep redaction enabled, and store replay fixtures only when retention policy allows it.

::: details Source: `observability-tracing.ts`

<<< ../examples/observability-tracing.ts

:::

### Local Ollama Private

Use this when you want a private local model path without cloud provider keys. It is useful for development, sensitive drafts, offline workflows, or cost-controlled experiments.

Config ideas to tweak: set the local `baseUrl`, choose a local model id that exists in your runtime, keep `apiKey` omitted unless your local gateway requires it, and use smaller `maxTokens` for slower machines.

::: details Source: `local-ollama-private.ts`

<<< ../examples/local-ollama-private.ts

:::

### Agent Team

Use this when one agent is not enough and the task naturally splits across roles. It demonstrates orchestrator/member patterns, optional supervision, and bounded rounds.

Config ideas to tweak: define specialist `members`, set `executionHint` to `parallel`, `sequential`, `pipeline`, or `auto`, add `roleBudgets`, and cap `maxRounds` and `maxRevisions` to avoid loops.

::: details Source: `agent-team.ts`

<<< ../examples/agent-team.ts

:::

### AgentTeam Spawn

Use this when you want the framework to form a team dynamically from a root agent. It demonstrates `AgentTeam.spawn()`, role hints, maximum spawned agents, supervisor review, member-error behavior, and per-role budgets.

Config ideas to tweak: keep `maxAgents` low for cost control, use `roleHints` to guide team shape, set `onMemberError` based on product tolerance, and use `supervisorRubric` when final quality gates matter.

::: details Source: `agent-team-spawn.ts`

<<< ../examples/agent-team-spawn.ts

:::

### Cost Budgeting

Use this when cost and token ceilings are product requirements, not afterthoughts. It shows preflight estimates and runtime budget enforcement.

Config ideas to tweak: set `maxCost`, `maxTokens`, `maxToolCalls`, and provider-specific `costOptions`; use lower-cost models for drafts; and update model pricing metadata before using estimates for billing-grade decisions.

::: details Source: `cost-budgeting.ts`

<<< ../examples/cost-budgeting.ts

:::

### Custom Adapter

Use this when AgentCraft does not ship the exact capability your app needs. The example shows how to package app-owned functionality behind adapter metadata and typed tools.

Config ideas to tweak: set `metadata.kind`, `auth`, `trustLevel`, `sideEffects`, and `scopes`; validate every argument; return small structured results; and mark writes with `requiresConfirmation`.

::: details Source: `custom-adapter.ts`

<<< ../examples/custom-adapter.ts

:::

### GitHub Review Agent

Use this for repository review and pull-request style workflows. It demonstrates how an agent can inspect GitHub data while keeping write actions explicit.

Config ideas to tweak: scope the token to the narrowest repo permissions, configure default owner/repo values, keep review/comment tools approval-gated, and combine with guardrails for secret or PII exposure.

::: details Source: `github-review-agent.ts`

<<< ../examples/github-review-agent.ts

:::

### Guardrails And Approvals

Use this when tool execution needs runtime policy instead of unconditional access. The example shows how guardrails and approval callbacks shape whether a tool can run.

Config ideas to tweak: use `guardrailMode: 'enforce'` for production safety boundaries, `warn` for observation or rollout, add input/output guardrails, and log `onAuditEvent` for reviewability.

::: details Source: `guardrails-and-approvals.ts`

<<< ../examples/guardrails-and-approvals.ts

:::

### Skill Directives

Use this when the user should be able to target a skill to one section of a prompt. It demonstrates slash directives such as `/humanizer` and `/write`, which are validated against attached skills before the model call.

Config ideas to tweak: attach only the directive-capable skills your product exposes, document supported directives in the UI, and treat unknown directives as user feedback because AgentCraft will fail fast instead of silently ignoring them.

::: details Source: `skill-directives.ts`

<<< ../examples/skill-directives.ts

:::

### Prompt Assembly

Use this when prompts are too large or reusable to keep inline. It demonstrates a single `promptFile`, an entry prompt that composes a bundle with includes, nested partials, variables, config injection, strict assembly, and provenance.

Config ideas to tweak: choose inline `prompt` for short one-off tasks, choose `promptFile` for reusable templates, use `&#123;&#123;include path&#125;&#125;` inside the entry prompt to compose bundles, pass `vars` for user or task-specific values, use `assembly.config` for app or tenant prompt settings, set `assembly.strict`, and keep `allowOutsideRoot` disabled unless your app owns the path boundary.

::: details Source: `prompt-assembly.ts`

<<< ../examples/prompt-assembly.ts

:::

### Replay Mode

Use this for deterministic demos, tests, and docs where a live provider call would be slow, flaky, or expensive. Replay lets you exercise app flows with known responses.

Config ideas to tweak: store replay fixtures with redacted content, use `index` when replaying a sequence, and keep replay mode separate from production provider execution.

::: details Source: `replay-mode.ts`

<<< ../examples/replay-mode.ts

:::

### Research Agent

Use this for research-style workflows that gather, compare, and synthesize information. It pairs best with search, fetch, MCP, and structured output controls.

Config ideas to tweak: attach only trusted retrieval adapters, cap result sizes, use structured output for citations or findings, and add output guardrails before exposing retrieved content to users.

::: details Source: `research-agent.ts`

<<< ../examples/research-agent.ts

:::

### Creator Pack Workflow

Use this when you want a zero-config creator workflow that can grow into power-user configuration. It attaches blog and SEO packs, enables auto skill/tool selection, and adds creator resources plus SEO fixtures.

Config ideas to tweak: switch `skillActivation` between `always`, `auto`, and `directive-only`; add durable memory through `FileSystemCreatorMemoryStore`; replace fixture SEO data with a provider-backed adapter; and set `AgentCache.file(...)` once repeated read tools are used.

::: details Source: `creator-pack-workflow.ts`

<<< ../examples/creator-pack-workflow.ts

:::

### Creator Memory Analytics

Use this when creator workflows need brand voice, prior-work corpus retrieval, performance history, or experiment results to persist across runs. The example is local-only and deterministic.

Config ideas to tweak: change store roots from temp directories to project paths, connect `CreatorResourcesAdapter` to creator packs, feed `AnalyticsAdapter` into analytics packs, and keep private client memory out of public repositories.

::: details Source: `creator-memory-analytics.ts`

<<< ../examples/creator-memory-analytics.ts

:::
