# Changelog

## 0.3.0 - 2026-05-27

**Breaking changes** — removed the skills, packs, and traits systems.

### Removed

- `@deskcreate/agentcraft/skills` and `@deskcreate/agentcraft/packs` package entry points are gone. Any import from these paths will fail to resolve.
- `Agent.create({ skillActivation, toolSelection, promptCompression })` config fields removed.
- `agent.useNativeSkill()` method removed.
- `CreatorPacks`, `MarketingPacks`, and all domain pack factories removed.
- `AgentSkill`, `SkillRegistry`, `registerSkill`, `BuiltInSkillSpec`, `NativeSkillSource` types removed.
- `WritingTrait`, `HumanizerTrait`, and all trait classes removed. `TraitNotAttachedError` removed.
- `response.selection.activationReasons` removed (skill activation no longer exists).
- `promptCompression` benchmark variants and live skill certification scripts removed.
- All skill, pack, and trait documentation pages removed.

### Runtime and dependency requirements

- Node.js 22.12 or later is now required (Node.js 20 reached end of life in April 2026).
- `zod` is upgraded from 3.x to 4.x. If you pass Zod schemas to AgentCraft (for example as `responseSchema`), build them with Zod 4.
- `openai` is upgraded from 4.x to 6.x.

### Why

Benchmark comparison showed native LLM skills (Anthropic and OpenAI) are 25× more token-heavy, 3× slower, and score lower on quality than equivalent system prompts you control directly. The internal prompt-injection system (traits/skills/packs) added complexity without measurable output benefit. The infrastructure — adapters, tools, ToolPolicy, AgentWorkflow, AgentTeam, AgentMemory, AgentCache, ArtifactStore — delivers the same capability with less overhead and full user control over prompt quality.

### Added / Retained

- `createAdapter()` and `tool()` from `@deskcreate/agentcraft/adapters` — compose any capability as a typed adapter. `tool(name, spec)` takes a flat spec with `sideEffect`, `scopes`, and `requiresConfirmation` at the top level.
- Native adapters retained: `FetchAdapter`, `TavilySearchAdapter`, `DatabaseAdapter`, `ImageGenerationAdapter`.
- MCP wrappers retained: `GitHubMCP`, `SlackMCP`, `FilesystemMCP`, `PostgresMCP`, `SupabaseMCP`, `BraveSearchMCP`, `FirecrawlMCP`, `FetchMCP`, `MCP` (generic factory).
- `response.costReport` for run-level cost reporting.
- `RunBudget.mode` with `fail-closed`, `prefer-cache`, `downgrade-model`, and `request-approval`.
- `createPricingStalenessReport()` for model-pricing metadata checks.
- All previously-unreleased additions from the prior `Unreleased` block that are not skill/pack-specific: artifact-store schema validation, `ArtifactStore.updateByType()` / `listLinks()` / `capabilities()`, `AgentEval`, `AgentReports`, distributed cache drivers, `ApprovalQueue`, `AgentMemory`, and runtime hardening.

### Also Removed (in addition to skills/packs/traits)

- Adapter-layer classes that duplicated MCP server capabilities: `FileSystemAdapter`, `GitHubAdapter`, `SlackAdapter`, `EmailAdapter`, `GoogleCalendarAdapter`, `GoogleSheetsAdapter`, `ElevenLabsAdapter`, `PlaywrightAdapter`, `FirecrawlAdapter`, `SeoAdapter`, `NotionAdapter`, `ApifyAdapter`, `RedisAdapter`, `StorageAdapter`, `PineconeAdapter`, `SupabaseAdapter`.
- Creator-workflow adapters: `CitationManagerAdapter`, `LinkCheckerAdapter`, `AnalyticsAdapter`, `PublishingAdapter`, `CreatorResourcesAdapter`.
- Creator persistence stores: `FileSystemCreatorMemoryStore`, `FileSystemAnalyticsHistoryStore`.
- Use MCP wrappers (`FilesystemMCP`, `GitHubMCP`, `SlackMCP`, etc.) or general-purpose adapters (`FetchAdapter`, `DatabaseAdapter`) as replacements. See [Adapters Overview](docs/adapters/overview.md).

### Migration

Replace `CreatorPacks.blog()` or skill directives with explicit `systemMessage` prompts and `createAdapter()` tool bundles. Write the system prompt you previously relied on skill injection to provide — you have full control and no token overhead from unused skill fragments.

```ts
// Before (0.2.x)
import { CreatorPacks } from "@deskcreate/agentcraft/packs";
const agent = Agent.create({ model, apiKey, skillActivation: "auto" }).use(
  CreatorPacks.blog(),
);

// After (0.3.0)
import { createAdapter, tool } from "@deskcreate/agentcraft/adapters";
const agent = Agent.create({
  model,
  apiKey,
  systemMessage:
    "You are a professional blog writer. Write in a clear, direct tone.",
}).use(myContentAdapter); // your own tools as needed
```

---

## 0.2.0 - 2026-05-14

- Added `AgentWorkflow.create()` for repeatable step graphs with Zod-validated input, retry, approval gates, conditional branches, parallel fan-out, custom steps, `workflow.resume()`, and `WorkflowRun` artifact persistence.
- Added seven workflow step factories: `AgentStep`, `TeamStep`, `ToolStep`, `ApprovalStep`, `ConditionStep`, `ParallelStep`, and `CustomStep`.
- Added `AgentWorkspace.create()`, `AgentWorkspace.memory()`, and `AgentWorkspace.local()` for shared cache, adapters, MCPs, tool policy, budget, trace sink, store, logger, and events across teams and workflows.
- Added `AgentEventEmitter` with typed runtime events: `cache.hit`, `cache.miss`, `cost.updated`, `tool.called`, `approval.requested`, `approval.granted`, `approval.denied`, `workflow.step.started`, `workflow.step.completed`, `artifact.read`, and `artifact.write`.
- Added `ArtifactStore` with `MemoryArtifactStore`, `FileArtifactStore`, and `SQLiteArtifactStore`. `SQLiteArtifactStore` uses optional peer dependency `better-sqlite3`.
- Added artifact utilities: `ArtifactFilter`, `ArtifactHistory`, and directed artifact `link()` support.
- Added `ArtifactRegistry` with 19 pre-registered creator artifact schemas and `register`, `lookup`, `list`, and `deregister` APIs for extension.
- Added `AgentCache.memory()` as an in-process cache driver with TTL, max-entry-bytes, independent instances, and explicit JSON-serializability checks.
- Added `RunBudget.cachePolicy.requireCachedFor` runtime enforcement so selected tools fail closed when cache misses would trigger expensive live calls.
- Added `AgentTeam` `workspace` and `rolePolicies` fields. `sharedAdapters` and `memory` remain supported but are deprecated when `workspace` is provided.
- Added creator artifact schemas: `BrandVoiceProfile`, `ContentPillars`, `PersonaProfile`, `MediaBrief`, and `PublishingStatus`.
- Added living-systems docs and examples for workspaces, workflows, artifact stores, artifact registry, cache policy, and role policies.
- Added a live integration smoke test for workspace + workflow + cache + artifact-store behavior.

## 0.1.0

- Initial AgentCraft package foundation.
- Provider protocols, model registry, cost calculator, config mapper, prompt assembler, public API layer.
- Production adapters, MCP wrappers, AgentTeam, structured output, streaming, observability, budgets, and security regression coverage.
