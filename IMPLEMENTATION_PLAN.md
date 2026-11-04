# AgentCraft — Implementation Plan

> **Goal:** A production-grade agent SDK where switching provider, model, or integration
> tool requires changing one line — not rewriting surrounding code. Every subsystem is
> accurate, ergonomic, and extendable without surfacing internal complexity to users.

---

## Current State Summary

**Version:** 0.3.0 · **288 files** · **3,362 nodes** · **6 entry points**

| Subsystem | Current State | Problem |
|---|---|---|
| Provider abstraction | 15+ providers, 4 protocols | `perplexity` / `cerebras` in catalog but missing from registry |
| Model catalog | 50+ models, correct pricing | gpt-5.5 / gpt-5.4 context sizes wrong; duplicate placeholder entries |
| ModelCapabilities type | 9 capability flags | Missing `supportsReasoning`, `reasoningEffortLevels`, `supportsStructuredOutput`, `supportsParallelToolCalls` |
| Native adapters | 26 exported adapters | Too many; overlaps with MCP; no easy custom adapter path |
| MCP wrappers | 33 named wrappers | Too many thin wrappers; no generic `MCP.connect()` escape hatch |
| Reasoning API | Not exposed | o1, o3, o4-mini, gpt-5.4, gpt-5.5 have reasoning effort — not surfaced |
| Built-in provider tools | Not implemented | No `BuiltInTools.webSearch()` mapped to provider-native format |
| Skills | Removed in v0.3.0 | Need re-introduction with progressive disclosure design |
| Creator domain artifacts | 19 schemas in core registry | Creator domain was dropped; schemas still registered in core |
| Capabilities registry | 10 of 30+ adapters mapped | Most adapters don't declare capabilities |
| ArtifactStore | 3 backends + 19 creator schemas | Creator schemas must go; store earns its stay as workflow plumbing |
| AgentWorkflow / AgentTeam | Both exist, boundary unclear | Boundary between the two is undocumented and confusing |

---

## Architecture Principles (Locked)

1. **One line to switch providers.** Any feature available on one provider maps cleanly to another. Where a provider doesn't support a feature, the error is immediate and descriptive — never silent.
2. **Two-minute path for custom tooling.** A user who wants a custom tool or adapter should never need to read source code or understand internal types.
3. **MCP is the integration layer.** Native adapters exist only where MCP has no equivalent or where the native SDK integration is materially better. Everything else goes through `MCP.connect()`.
4. **Skills are token-efficient.** Skills inject only metadata into the system prompt by default. Full content loads only when triggered. Files load only when accessed.
5. **Fail fast, fail clearly.** Unsupported capabilities throw typed errors with the model name, what was attempted, and what models do support it.

---

## Phase 1 — Foundation Fixes

> **Scope:** Correctness and cleanup. No new API surface. No behaviour changes.
> All existing user code should continue to work after this phase.

### 1.1 — Fix model catalog factual errors

**Files:** `src/model-registry/catalog.ts`, `src/agent/provider-catalog.ts`

**Checklist:**
- [x] Correct `openai:gpt-5.5` — `maxContextLength: 1_050_000`, `maxOutputTokens: 128_000`
- [x] Correct `openai:gpt-5.4` — `maxContextLength: 1_050_000`, `maxOutputTokens: 128_000`
- [x] Correct `openai:gpt-5.4-mini` — `maxContextLength: 1_050_000`, `maxOutputTokens: 32_000`
- [x] Add `pricingTiers` to `gpt-5.4` and `gpt-5.5` for the `>272k token` escalation (2× input / 1.5× output)
- [x] Remove `openai:gpt-5` (non-dotted placeholder — not a real model)
- [x] Remove `openai:gpt-5-mini` (non-dotted placeholder)
- [x] Remove `openai:gpt-5-nano` (non-dotted placeholder)
- [x] Remove `openai:gpt-5.4-nano` from catalog and `Provider` const
- [x] Remove `openai:gpt-5.3-codex` from `Provider` const
- [x] Update `PRICING_UPDATED_AT` to `2026-05-29`
- [x] Verify all remaining OpenAI model entries against published pricing

### 1.2 — Drop perplexity and cerebras completely

**Files:** `src/agent/provider-catalog.ts`, `src/model-registry/catalog.ts`, `src/provider-registry/registry.ts`

**Checklist:**
- [x] Remove `perplexity` from `Provider` const in `provider-catalog.ts`
- [x] Remove `cerebras` from `Provider` const in `provider-catalog.ts`
- [x] Remove all `perplexity:*` entries from `MODEL_CATALOG` (there were none — confirmed)
- [x] Remove all `cerebras:*` entries from `MODEL_CATALOG` (there were none — confirmed)
- [x] Confirm neither appears in `PROVIDER_REGISTRY` (they were already absent — verified)
- [x] Search codebase for any remaining references to either provider and remove

### 1.3 — Extend `ModelCapabilities` with missing capability flags

**Files:** `src/types/provider.types.ts`, `src/model-registry/catalog.ts`

**Checklist:**
- [x] Add `supportsReasoning?: boolean` to `ModelCapabilities` interface
- [x] Add `reasoningEffortLevels?: readonly ('none' | 'low' | 'medium' | 'high' | 'xhigh')[]` to `ModelCapabilities`
- [x] Add `supportsStructuredOutput?: boolean` (strict JSON schema / `additionalProperties: false` mode)
- [x] Add `supportsParallelToolCalls?: boolean`
- [x] Populate `supportsReasoning: true` for: `o1`, `o3`, `o4-mini`, `o3-deep-research`, `o4-mini-deep-research`, `gpt-5.4`, `gpt-5.5`, `deepseek-r1`, all Anthropic Claude 4.x Opus/Sonnet models
- [x] Populate `reasoningEffortLevels` for all reasoning models — OpenAI models get `['none','low','medium','high','xhigh']`
- [x] Populate `supportsStructuredOutput: true` for: `gpt-4o`, `gpt-4o-mini`, `gpt-5.4`, `gpt-5.4-mini`, `gpt-5.4-nano`, `gpt-5.5`, all Anthropic Claude 4.x models
- [x] Populate `supportsParallelToolCalls: true` for gpt-4o, gpt-4o-mini, gpt-5.x series
- [x] `caps()` helper function updated to accept all four new fields with optional defaults
- [x] Update `ModelInfo` type in `src/agent/types.ts` to surface the new fields via `Agent.inspect()`

### 1.4 — Strip creator artifact schemas from core ArtifactRegistry

**Files:** `src/artifact-registry/registry.ts`, `src/agent/creator/`

**Checklist:**
- [x] Remove all 19 pre-registered schemas from `ArtifactRegistry` (`AudienceProfile`, `ContentBrief`, `Draft`, `SeoPlan`, etc.)
- [x] Remove the `BUILT_IN_SCHEMAS` block in `artifact-registry/registry.ts` entirely
- [x] `ArtifactRegistry` remains — starts empty by default (users register their own schemas)
- [x] Zod schema definitions remain in `src/agent/creator/types.ts` — no longer auto-registered
- [x] `ArtifactRegistry.register()`, `lookup()`, `list()`, `deregister()` all work correctly after cleanup
- [x] Remove creator schema constant exports (`BrandVoiceProfileSchema`, `ContentPillarsSchema`, `FileSystemCreatorMemoryStore`, `FileSystemAnalyticsHistoryStore`, etc.) from `src/index.ts`

### 1.5 — Fix provider registry completeness

**Files:** `src/provider-registry/registry.ts`

**Checklist:**
- [x] Verify all providers in `Provider` const also exist in `PROVIDER_REGISTRY` — audit the full list
- [x] `together`, `fireworks`, `anyscale`, `novita`, `openrouter` — confirm they route through `openaiCompat` with correct `defaultBaseUrl` values
- [x] `azure` — confirm it routes correctly with `useAzureClient: true`
- [x] `lmstudio`, `vllm`, `localai` — confirm `noAuth: true` and correct local base URLs

> **Note:** 1.1–1.4 complete. 1.5 deferred — provider registry audit is low-risk (all missing providers were already absent from the registry without issues in v0.3.0). Will complete before Phase 2 gate.

### Phase 1 — Acceptance Criteria

- `npm run typecheck` passes with zero errors
- `npm test` passes with zero failures
- `Agent.inspect('openai:gpt-5.5').capabilities.contextWindow === 1_050_000`
- `Agent.inspect('openai:gpt-5.5').capabilities.maxOutput === 128_000`
- `Agent.catalog({ provider: 'openai' })` returns no entries for `gpt-5`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5.4-nano`
- `Provider.openai` has no `perplexity` or `cerebras` keys (TypeScript confirms)
- `Agent.inspect(Provider.openai['gpt-5.4']).capabilities` includes `supportsReasoning`, `reasoningEffortLevels`, `supportsStructuredOutput`, `supportsParallelToolCalls`
- `new ArtifactRegistry()` starts empty — no pre-registered schemas
- No TypeScript errors referencing removed schemas in the main barrel

---

## Phase 2 — Reasoning API

> **Scope:** Surface reasoning effort as a first-class run parameter. Wire it through
> OpenAI and Anthropic protocols. Fail fast and clearly on unsupported models.

### 2.1 — Add `reasoning` to run params and agent config

**Files:** `src/agent/types.ts`, `src/agent/config.ts`

**Checklist:**
- [x] Add `reasoning?: ReasoningEffort` to `AgentRunParams` (type alias defined in `src/agent/types.ts`)
- [x] Add `reasoning?: ReasoningEffort` to `AgentCreateConfig` (default that individual runs can override)
- [x] Add `reasoning` to the Zod `AgentConfigSchema` validation in `config.ts`
- [x] Thread `reasoning` through `toLLMCallParams()` in `runtime/llm-params.ts` (run override takes priority over config default)
- [x] Add `reasoning` to `LLMCallParams` in `src/types/provider.types.ts`; `ValidatedAgentConfig` picks it up via Zod inference

### 2.2 — Fail fast if model does not support reasoning

**Files:** `src/agent/runtime/run-preparation.ts`

**Checklist:**
- [x] In preflight checks, if `reasoning` is set and not `'none'`, look up model capabilities
- [x] If `caps.supportsReasoning === false`, throw `UnsupportedReasoningError` (new error class in `src/errors/index.ts`) with model name and suggested alternatives
- [x] If `reasoning` effort level is not in `caps.reasoningEffortLevels`, throw with specific message listing valid levels for that model

### 2.3 — Wire reasoning through OpenAI protocol

**Files:** `src/protocols/openai-compat.protocol.ts`

**Checklist:**
- [x] In `formatChatRequest()`, if `params.reasoning` is set, append `reasoning_effort: params.reasoning` to the request body (o-series models)
- [x] In `formatResponsesRequest()`, if `params.reasoning` is set, append `reasoning: { effort: params.reasoning }` (gpt-5.x Responses API format)
- [x] Pass-through: `'none'` is sent explicitly — suppresses default reasoning on models where it's on by default

### 2.4 — Wire reasoning through Anthropic protocol

**Files:** `src/protocols/anthropic.protocol.ts`

**Checklist:**
- [x] `reasoningEffortToThinkingBudget()` maps effort levels to `thinking.budget_tokens`: `low`→1024, `medium`→8192, `high`→32768, `xhigh`→64000
- [x] Add `thinking: { type: 'enabled', budget_tokens: N }` to the Anthropic request when reasoning is set
- [x] When `reasoning` is not set or is `'none'`, the `thinking` block is omitted

### 2.5 — Surface reasoning token usage in `AgentResponse`

**Files:** `src/types/provider.types.ts`, `src/agent/types.ts`, relevant protocol files

**Checklist:**
- [x] Add `reasoning?: number` to the `TokenUsage` interface in `src/agent/types.ts`
- [x] In OpenAI Chat Completions parsing, extract `usage.completion_tokens_details.reasoning_tokens` if present
- [x] In OpenAI Responses API parsing, extract `usage.output_tokens_details.reasoning_tokens` if present
- [x] In Anthropic response parsing, sum thinking block token counts from content blocks
- [x] `AgentResponse.tokensUsed.reasoning` is populated when reasoning tokens are consumed
- [x] `AgentResponse.cost` calculation includes reasoning tokens at the correct rate — reasoning tokens are a subset of `completion` across all providers (OpenAI and Anthropic both include them in completion/output counts), so `outputCost` already bills them at the standard output rate; `TokensUsed` now carries `reasoning?: number` for interface alignment with `TokenUsage`

### 2.6 — Type-safe `Agent.supports()` and `Agent.inspect()`

**Files:** `src/agent/agent.ts`, `src/agent/model-catalog-service.ts`

**Checklist:**
- [x] `Agent.supports()` first argument type is `ProviderModel | (string & {})` — known models autocomplete, unknown strings cause TS error
- [x] `Agent.supports()` second argument type is `keyof ModelInfo['capabilities']` — fully autocompleted, includes `reasoning`, `structuredOutput`, `parallelToolCalls`
- [x] `Agent.inspect()` first argument type is `ProviderModel | (string & {})` — not raw `string`
- [x] `Agent.inspect()` returns the new capability fields (`reasoning`, `reasoningEffortLevels`, `structuredOutput`, `parallelToolCalls`)

### Phase 2 — Acceptance Criteria

- `agent.run({ prompt: '...', reasoning: 'high' })` on an `openai:o3` agent sends `reasoning_effort: 'high'` in the API request (confirmed via request inspection)
- `agent.run({ prompt: '...', reasoning: 'high' })` on `openai:gpt-4o-mini` throws `UnsupportedCapabilityError` before any API call is made
- `agent.run({ prompt: '...', reasoning: 'high' })` on `anthropic:claude-sonnet-4-6` sends `thinking: { type: 'enabled', budget_tokens: 32768 }` in the API request
- `AgentResponse.tokensUsed.reasoning` is a number (not undefined) when reasoning tokens were consumed
- TypeScript error if `Agent.supports()` is called with an unknown model string

---

## Phase 3 — Adapter & Tool Overhaul

> **Scope:** Reduce the native adapter surface to only what earns its place.
> Introduce `defineAdapter()` and clean up `tool()` as the two-minute custom tooling path.
> `createAdapter` becomes internal. `MCPAdapter` moves out of public exports.

### 3.1 — Introduce `defineAdapter()` helper

**Files:** `src/agent/adapters/types.ts`, `src/agent/adapters/index.ts`

**Checklist:**
- [x] Define `DefinedAdapterToolSpec<P>` interface — the user-facing tool config:
  ```ts
  interface DefinedAdapterToolSpec<P extends Record<string, ToolParam>> {
    description: string;
    params: P;
    sideEffect?: 'none' | 'read' | 'write' | 'external';
    requiresConfirmation?: boolean;
    run: (args: InferParamType<P>) => Promise<unknown>;
  }
  ```
- [x] Define `defineAdapter(name: string, tools: Record<string, DefinedAdapterToolSpec<any>>, options?: DefineAdapterOptions): AgentAdapter`
- [x] `DefineAdapterOptions` covers: `auth?: 'none' | 'custom'`, `trustLevel?`, `scopes?: string[]`
- [x] Implementation calls `createAdapter()` and `tool()` internally
- [x] Export `defineAdapter` from `src/agent/adapters/index.ts`
- [x] Export `defineAdapter` from `src/adapters.ts` barrel

### 3.2 — Simplify `tool()` as the single-tool primitive

**Files:** `src/agent/adapters/types.ts`, `src/agent/adapters/index.ts`

**Checklist:**
- [x] `tool()` signature becomes: `tool(name: string, spec: ToolSpec): ToolDefinition`
  ```ts
  interface ToolSpec<P extends Record<string, ToolParam>> {
    description: string;
    params: P;
    sideEffect?: 'none' | 'read' | 'write' | 'external';
    requiresConfirmation?: boolean;
    run: (args: InferParamType<P>) => Promise<unknown>;
  }
  ```
- [x] `tool()` is exported from adapters barrel — it is the public single-tool primitive
- [x] `createAdapter()` is removed from public exports — it becomes an internal implementation detail only
- [x] Verify all internal usages of `createAdapter()` still compile (they call it directly, not via re-export)
- [x] A single `ToolDefinition` returned by `tool()` can be passed directly to `agent.run({ tools: [myTool] })` — confirm this already works and document it

### 3.3 — Drop creator-domain native adapters

**Files:** `src/agent/adapters/index.ts`, `src/adapters.ts`, and the adapter files themselves

**Checklist:**
- [x] Remove `SeoAdapter` from public exports and delete `src/agent/adapters/seo.adapter.ts`
- [x] Remove `CitationManagerAdapter` from public exports and delete `src/agent/adapters/citation-manager.adapter.ts`
- [x] Remove `CreatorResourcesAdapter` from public exports and delete `src/agent/adapters/creator-resources.adapter.ts`
- [x] Remove `PublishingAdapter` from public exports and delete `src/agent/adapters/publishing.adapter.ts`
- [x] Remove `AnalyticsAdapter` from public exports and delete `src/agent/adapters/analytics.adapter.ts`
- [x] Remove `LinkCheckerAdapter` from public exports and delete `src/agent/adapters/link-checker.adapter.ts`
- [x] Search for any remaining references to these adapters in tests, examples, or other source files and remove

### 3.4 — Drop adapters superseded by MCP equivalents

**Files:** `src/agent/adapters/index.ts`, adapter files

**Checklist:**
- [x] Remove `FileSystemAdapter` — superseded by `FilesystemMCP` (delete `filesystem.adapter.ts`)
- [x] Remove `GitHubAdapter` — superseded by `GitHubMCP` (delete `github.adapter.ts`)
- [x] Remove `PlaywrightAdapter` — superseded by `PlaywrightMCP` (delete `playwright.adapter.ts`)
- [x] Remove `FirecrawlAdapter` — superseded by `FirecrawlMCP` (delete `firecrawl.adapter.ts`)
- [x] Remove `ElevenLabsAdapter` — superseded by `ElevenLabsMCP` (delete `elevenlabs.adapter.ts`)
- [x] Remove `SlackAdapter` — superseded by `SlackMCP` (delete `slack.adapter.ts`)
- [x] Remove `NotionAdapter` — superseded by `NotionMCP` (delete `notion.adapter.ts`)
- [x] Remove `GoogleSheetsAdapter` — superseded by MCP pattern (delete `google-sheets.adapter.ts`)
- [x] Remove `GoogleCalendarAdapter` — superseded by MCP pattern (delete `google-calendar.adapter.ts`)
- [x] Remove `EmailAdapter` — superseded by MCP pattern (delete `email.adapter.ts`)
- [x] Remove `SupabaseAdapter` — superseded by `SupabaseMCP` (delete `supabase.adapter.ts`)
- [x] Remove `PineconeAdapter` — superseded by `QdrantMCP` / vector memory (delete `pinecone.adapter.ts`)
- [x] Remove `RedisAdapter` — too infrastructure-level for an agent SDK adapter (delete `redis.adapter.ts`)
- [x] Remove `StorageAdapter` — too generic, use `FileSystemAdapter`→MCP or ArtifactStore (delete `storage.adapter.ts`)
- [x] Remove `ApifyAdapter` — superseded by `ApifyMCP` (delete `apify.adapter.ts`)
- [x] Clean all removed adapters from `src/agent/adapters/index.ts` and `src/adapters.ts`
- [x] Remove associated type exports from `src/index.ts`

### 3.5 — Confirm final native adapter list

After 3.3 and 3.4, the public native adapter surface is:

| Adapter | Why it stays |
|---|---|
| `FetchAdapter` | Lightweight, no subprocess, universal URL fetching |
| `DatabaseAdapter` | No good generic MCP for arbitrary SQL |
| `TavilySearchAdapter` | No Tavily MCP wrapper yet; stays until `TavilyMCP` is added |
| `ImageGenerationAdapter` | No MCP equivalent for OpenAI image generation |

**Checklist:**
- [x] Confirm only the 4 adapters above remain in the public `adapters/index.ts` barrel
- [x] Confirm `MCPAdapter` is NOT in the public barrel (moved to internal in step 3.6)
- [x] `defineAdapter` and `tool` are exported from the adapters barrel
- [x] `AdapterAuditEvent`, `AdapterRuntimeOptions`, `AgentAdapter`, `ToolDefinition`, `ToolPolicy`, `ToolGuardrail` type exports remain

### 3.6 — Remove `MCPAdapter` from public exports

**Files:** `src/agent/adapters/index.ts`, `src/adapters.ts`, `src/index.ts`, `src/mcp.ts`

**Checklist:**
- [x] Remove `MCPAdapter` from `src/agent/adapters/index.ts` public barrel
- [x] Remove `MCPAdapter` from `src/index.ts` direct export
- [x] `MCPAdapter` class stays in `src/agent/adapters/mcp.adapter.ts` — it's the internal transport used by `MCP.connect()` and the kept MCP wrappers
- [x] `MCP.connect()` (Phase 4) uses `MCPAdapter` internally — users never touch it

### 3.7 — Update capabilities registry for remaining adapters

**Files:** `src/agent/capabilities/registry.ts`

**Checklist:**
- [x] Ensure `FetchAdapter` → `['web.fetch']` is registered
- [x] Ensure `DatabaseAdapter` → `['db.query', 'db.write']` is registered
- [x] Ensure `TavilySearchAdapter` → `['web.search']` is registered
- [x] Ensure `ImageGenerationAdapter` → `['image.generate']` is registered
- [x] Remove registry entries for all deleted adapters
- [x] `capabilitiesForAdapters()` now returns complete, accurate capability sets

### Phase 3 — Acceptance Criteria

- `import { defineAdapter, tool, FetchAdapter, DatabaseAdapter } from '@deskcreate/agentcraft/adapters'` works and types are correct
- `import { PlaywrightAdapter }` from `@deskcreate/agentcraft/adapters` is a TypeScript error (removed)
- `import { MCPAdapter }` from `@deskcreate/agentcraft/adapters` is a TypeScript error (removed from public)
- A user can define a working custom adapter in under 10 lines using `defineAdapter()`
- A user can define a single tool using `tool()` and pass it to `agent.run({ tools: [myTool] })`
- `npm run typecheck` and `npm test` pass

---

## Phase 4 — MCP Generic Interface

> **Scope:** Replace the 33-wrapper MCP surface with a generic `MCP.connect()` entry
> point + 8 kept named wrappers. `MCP_WRAPPER_REGISTRY` is removed from public API.

### 4.1 — Implement `MCP.connect()` single entry point

**Files:** `src/agent/mcp-servers/connect.ts` (new), `src/mcp.ts`

**Checklist:**
- [x] Define `MCPConnectConfig` as a discriminated union on transport:
  ```ts
  type MCPConnectConfig =
    | { url: string;     /* remote HTTP */    name?: string; auth?: MCPAuth; allowedTools?: string[]; requireApproval?: 'never' | 'always' | string[]; timeoutMs?: number; headers?: Record<string,string>; }
    | { command: string; /* local process */  name?: string; args?: string[]; env?: Record<string,string>; allowedTools?: string[]; requireApproval?: 'never' | 'always' | string[]; }
    | { package: string; /* npx package */   name?: string; env?: Record<string,string>; allowedTools?: string[]; requireApproval?: 'never' | 'always' | string[]; };
  
  type MCPAuth =
    | { type: 'bearer'; token: string }
    | { type: 'api-key'; header: string; key: string }
    | { type: 'basic'; username: string; password: string };
  ```
- [x] Implement `MCP.connect(config: MCPConnectConfig): AgentAdapter`:
  - `url` → calls `MCPAdapter.connect({ transport: 'http', ... })` with auth headers mapped from `MCPAuth`
  - `command` → calls `MCPAdapter.connect({ transport: 'stdio', command, args, env })`
  - `package` → calls `stdioMcp(name, package, env)` (same as current named wrappers)
- [x] `allowedTools` filters which tools from the server are exposed (already supported by `MCPAdapter`)
- [x] Export `MCP` object from `src/mcp.ts`
- [x] Export `MCP` from the main barrel (`src/index.ts`) or confirm it's only on the `/mcp` subpath

### 4.2 — Drop 25 MCP server wrappers

**Files:** `src/agent/mcp-servers/` (individual files), `src/agent/mcp-servers/index.ts`

**Wrappers to delete:**
- [x] `linear.mcp.ts` → deleted
- [x] `jira.mcp.ts` → deleted
- [x] `sentry.mcp.ts` → deleted
- [x] `playwright.mcp.ts` → deleted
- [x] `browserbase.mcp.ts` → deleted
- [x] `apify.mcp.ts` → deleted
- [x] `neon.mcp.ts` → deleted
- [x] `qdrant.mcp.ts` → deleted
- [x] `airtable.mcp.ts` → deleted
- [x] `memory.mcp.ts` → deleted
- [x] `gmail.mcp.ts` → deleted
- [x] `resend.mcp.ts` → deleted
- [x] `notion.mcp.ts` → deleted
- [x] `figma.mcp.ts` → deleted
- [x] `cloudflare.mcp.ts` → deleted
- [x] `railway.mcp.ts` → deleted
- [x] `render.mcp.ts` → deleted
- [x] `vercel.mcp.ts` → deleted
- [x] `elevenlabs.mcp.ts` → deleted
- [x] `context7.mcp.ts` → deleted
- [x] `stripe.mcp.ts` → deleted
- [x] Remove all deleted wrappers from `src/agent/mcp-servers/index.ts`

### 4.3 — Keep 8 named MCP wrappers (the curated set)

The 8 kept wrappers stay because they provide non-obvious config (multi-env-var auth, security defaults, specific package pinning):

| Wrapper | Reason kept |
|---|---|
| `GitHubMCP` | `GITHUB_TOKEN` wiring, `allowedTools` safety defaults |
| `SlackMCP` | Multi-token setup (bot token + signing) |
| `PostgresMCP` | Connection string + SSL config |
| `SupabaseMCP` | URL + service key pair |
| `FilesystemMCP` | Path allowlist security — must be configured correctly |
| `BraveSearchMCP` | API key, common search default |
| `FirecrawlMCP` | API key, common scraping default |
| `FetchMCP` | Proxy config, widely used |

**Checklist:**
- [x] Verify all 8 wrappers compile and work after the generic interface is introduced
- [x] Confirm all 8 are still exported from `src/agent/mcp-servers/index.ts` and `src/mcp.ts`

### 4.4 — Remove `MCP_WRAPPER_REGISTRY` from public exports

**Files:** `src/agent/mcp-servers/registry.ts`, `src/agent/mcp-servers/index.ts`

**Checklist:**
- [x] Remove `MCP_WRAPPER_REGISTRY` export from `src/agent/mcp-servers/index.ts`
- [x] Remove `McpWrapperDefinition` type export
- [x] The registry file itself stays as an internal lookup for the 8 kept wrappers

### Phase 4 — Acceptance Criteria

- `import { MCP } from '@deskcreate/agentcraft/mcp'` works and `MCP.connect()` is callable
- `MCP.connect({ url: 'https://my-mcp.com', auth: { type: 'bearer', token: '...' } })` returns a working `AgentAdapter`
- `MCP.connect({ package: '@modelcontextprotocol/server-github@2025.4.8', env: { GITHUB_TOKEN: '...' } })` works identically to the old `GitHubMCP.connect()`
- `import { LinearMCP }` from `@deskcreate/agentcraft/mcp` is a TypeScript error (removed)
- `import { MCP_WRAPPER_REGISTRY }` from `@deskcreate/agentcraft/mcp` is a TypeScript error (removed)
- All 8 kept named wrappers still work correctly
- `requireApproval: ['dangerous_tool']` on `MCP.connect()` results in that tool requiring confirmation and others not

---

## Phase 5 — Provider-Native Built-in Tools

> **Scope:** Introduce `BuiltInTools` as a new namespace for tools where the *provider*
> executes the logic. Wire through protocols with clear fail-fast errors for unsupported providers.

### 5.1 — Extend `ModelCapabilities` for native tool support

**Files:** `src/types/provider.types.ts`, `src/model-registry/catalog.ts`

**Checklist:**
- [x] Add `supportsNativeWebSearch?: boolean` to `ModelCapabilities`
- [x] Add `supportsNativeFileSearch?: boolean` to `ModelCapabilities`
- [x] Populate `supportsNativeWebSearch: true` for: OpenAI Responses API models (gpt-4o, gpt-4o-mini, gpt-5.4, gpt-5.4-mini, gpt-5.5, o3, o4-mini), Anthropic Claude 4.x models (opus-4-7, opus-4-6, sonnet-4-6, sonnet-4-5)
- [x] Populate `supportsNativeFileSearch: true` for: OpenAI Responses API models
- [x] Absent from all other models (undefined = not supported)

### 5.2 — Define `BuiltInTools` namespace

**Files:** `src/agent/built-in-tools.ts` (new), `src/index.ts`

**Checklist:**
- [x] Define `BuiltInTools.webSearch(config?)` — returns `AgentAdapter` with `kind: 'native-provider'` metadata and a tagged `ToolDefinition` via `getTools()`
- [x] Define `BuiltInTools.fileSearch(config)` — same pattern for `file_search`
- [x] Both return `AgentAdapter` objects with `metadata.kind === 'native-provider'`
- [x] Export `BuiltInTools` from main barrel `src/index.ts`

### 5.3 — Fail fast when provider doesn't support native tools

**Files:** `src/agent/runtime/run-preparation.ts`

**Checklist:**
- [x] During run preflight, detect `kind: 'native-provider'` adapters across all attached and run-only adapters
- [x] Check `caps.supportsNativeWebSearch` / `caps.supportsNativeFileSearch` for the current model
- [x] If not supported, throw `UnsupportedCapabilityError` with capability name, provider, and model
- [x] Error fires at run preflight — never silently

### 5.4 — Protocol serialization for OpenAI native tools

**Files:** `src/protocols/openai-compat.protocol.ts`

**Checklist:**
- [x] `formatTools()` detects `nativeSpec` on `ToolDefinition` and passes through the native spec object as-is (for Responses API)
- [x] `formatRequestWithTools()` filters out non-function tools from Chat Completions path
- [x] `webSearch` adapter emits `{ type: 'web_search', search_context_size, ... }` in Responses API format
- [x] `fileSearch` adapter emits `{ type: 'file_search', vector_store_ids, max_num_results, filters }`

### 5.5 — Protocol serialization for Anthropic native tools

**Files:** `src/protocols/anthropic.protocol.ts`

**Checklist:**
- [x] `formatTools()` throws `UnsupportedCapabilityError` when any tool has `nativeSpec` — standard Anthropic Messages API does not support provider-native tools
- [x] The preflight check in `run-preparation.ts` catches this earlier for Anthropic models lacking `supportsNativeWebSearch`

### Phase 5 — Acceptance Criteria

- `agent.use(BuiltInTools.webSearch())` on `openai:gpt-5.4` makes real web search requests (confirmed via API request inspection)
- `agent.use(BuiltInTools.webSearch())` on `groq:llama-4-scout-17b` throws `UnsupportedCapabilityError` before any API call
- Error message from unsupported provider explicitly names which providers do support it
- `Agent.inspect(Provider.openai['gpt-5.4']).capabilities.supportsNativeWebSearch === true`
- `agent.use(BuiltInTools.fileSearch({ vectorStoreId: 'vs_123' }))` on OpenAI sends correct `file_search` tool in request body

---

## Phase 6 — Skill Progressive Disclosure

> **Scope:** Re-introduce skills with a 3-level progressive loading design. Skills are
> token-efficient by default — metadata only until triggered. Full content loads on demand.

### 6.1 — Define SKILL.md format and frontmatter schema

**Files:** `src/agent/skills/types.ts` (new), documentation

**Checklist:**
- [x] Define `SkillFrontmatter` interface (name, description, version)
- [x] Define `SkillLevel` enum: `Metadata = 1`, `Instructions = 2`, `Files = 3`
- [x] Define `SkillDefinition` interface (name, description, instructions?, files?, version)
- [x] Validate `name`: must match `/^[a-z0-9-]+$/`, max 64 chars
- [x] Validate `description`: non-empty, max 1024 chars, no XML tags

### 6.2 — Implement `Skill` factory

**Files:** `src/agent/skills/skill.ts` (new), `src/skills.ts` (new entry point)

**Checklist:**
- [x] `Skill.from(dirPath: string): AgentAdapter` — loads a skill directory with `SKILL.md`
- [x] `Skill.fromDir(dirPath: string): AgentAdapter[]` — loads all skill directories in a folder
- [x] `Skill.define(spec): AgentAdapter` — inline skill, no files needed
- [x] All three return `AgentAdapter` with `metadata.kind === 'skill'`
- [x] `Skill.from()` parses frontmatter from `SKILL.md` using a lightweight inline YAML parser (no heavy deps)
- [x] `Skill.from()` indexes all other files in the skill directory as Level 3 resources
- [x] `Skill` exported from `src/skills.ts` (entry point added to `package.json` exports)

### 6.3 — Level 1 system prompt injection (always-on)

**Files:** `src/agent/runtime/run-preparation.ts`, `src/agent/runtime/context-builder.ts`

**Checklist:**
- [x] Level 1 injection via `onBeforeRun` hook — appends `[Skill available: name: description]` to `params.system`
- [x] No instructions or files included at Level 1 — name + description only
- [x] Idempotent: re-running `onBeforeRun` does not inject the same skill twice
- [x] 10 skills with realistic descriptions < 800 tokens (verified in test)

### 6.4 — Level 2 lazy loading (instructions on trigger)

**Files:** `src/agent/tools/tool-manager.ts` or new `src/agent/skills/skill-loader.ts`

**Checklist:**
- [x] `load_skill_instructions(skill_name)` tool exposed by the adapter when instructions exist
- [x] Model explicitly calls the tool to load Level 2 instructions (no implicit trigger detection needed)
- [x] Result returned as a tool result — standard tool loop handles injection
- [x] Instructions warn at >5,000 estimated tokens via `console.warn`

### 6.5 — Level 3 lazy loading (files on demand)

**Files:** `src/agent/skills/skill-loader.ts`

**Checklist:**
- [x] `load_skill_file(skill_name, filename)` tool exposed when the skill has files
- [x] Returns file content as a tool result — standard tool loop handles it
- [x] Files not referenced incur zero token cost — only loaded on explicit tool call

### 6.6 — Add `skills` entry point to package

**Files:** `package.json`, `src/skills.ts`

**Checklist:**

- [x] Added `"./skills"` to `exports` in `package.json`
- [x] `src/skills.ts` exports `Skill`, `SkillDefinition`, `SkillFrontmatter`, `SkillLevel`

### Phase 6 — Acceptance Criteria

- `agent.use(Skill.fromDir('./skills'))` with 10 skills attached uses fewer than 800 tokens in the system prompt (Level 1 only)
- When the prompt explicitly references a skill by name, Level 2 instructions are injected in the next LLM call
- When the model calls `load_skill_file()`, the file content is returned correctly
- Files never referenced cost 0 tokens
- `Skill.define({ name, description, instructions })` works without any filesystem involvement
- `import { Skill } from '@deskcreate/agentcraft/skills'` works correctly with types

---

## Cross-Cutting Items (Each Phase)

These items apply across phases and should be addressed as each phase lands.

### AgentWorkflow vs AgentTeam — Documented boundary

**Applies to:** Phase 1 (as part of documentation)

**Decision (locked):**
- **AgentWorkflow** = you define the steps and control flow. Sequential, parallel, conditional — you draw the graph. The model executes within each step but never decides what step comes next.
- **AgentTeam** = the LLM orchestrator decides how to use the team. You define who's on the team and their roles. The orchestrator decides routing, delegation, and sequencing dynamically at runtime.
- **Test:** "Do I know the steps upfront?" → Workflow. "Do I know the agents, and want the model to figure out the steps?" → Team.
- `TeamStep` inside a `Workflow` is valid: it's a known step in your sequence that delegates dynamically within itself.

### ArtifactStore — Confirmed scope

**Decision (locked):**
- `ArtifactStore` is plumbing for `AgentWorkflow` and `AgentTeam` cross-step data handoff. It is not a standalone user-facing pattern.
- It is not the same as `AgentCache` (response caching) or `AgentMemory` (semantic retrieval).
- Without creator schemas, the store is a typed, persistent, cross-step bucket. That is enough to keep it.
- Users who find themselves thinking "I need ArtifactStore" are probably thinking "I need AgentWorkflow".

### Runtime execution model — Documented for all Phase features

The `agent.run()` execution order when multiple `.use()` calls are combined:

```
agent.run({ prompt, reasoning, budget })
  │
  ├─ 1. PREFLIGHT
  │     ├─ Budget: estimate cost → fail if over maxCost
  │     ├─ Reasoning: model supports it? → UnsupportedCapabilityError if not
  │     ├─ Native tools: provider supports them? → UnsupportedCapabilityError if not
  │     └─ Cache: hit? → return immediately
  │
  ├─ 2. PREPARE TOOLS
  │     ├─ Custom adapters (defineAdapter) → resolve tool list
  │     ├─ MCP adapters (MCP.connect) → connect, discover tools
  │     ├─ Native tools (BuiltInTools) → format in provider-native shape
  │     └─ Tool selection ('auto'/'all') → filter to relevant tools if auto
  │
  ├─ 3. PREPARE PROMPT
  │     ├─ Skills (Level 1) → inject metadata block into system prompt
  │     ├─ Memory → retrieve relevant context, inject into prompt
  │     └─ Prompt compression → minify if configured
  │
  ├─ 4. BUILD LLM PARAMS
  │     ├─ Tools: all resolved tool definitions in provider wire format
  │     ├─ Native tools: web_search / file_search in provider-specific format
  │     ├─ Reasoning: reasoning_effort (OpenAI) or thinking.budget_tokens (Anthropic)
  │     └─ System + prompt with memory context + skill metadata
  │
  ├─ 5. LLM CALL + TOOL LOOP (with retry)
  │     ├─ Custom tool called → policy check → run → result
  │     ├─ MCP tool called → policy check → run via transport → result
  │     ├─ Native tool triggered → provider runs it server-side → result injected
  │     └─ Skill referenced → Level 2 instructions injected → continue
  │
  ├─ 6. POST-RUN
  │     ├─ Cache write (if cacheable)
  │     ├─ Budget enforcement (actual cost vs limit)
  │     ├─ Trace emission
  │     └─ Artifact write (if workflow step)
  │
  └─ AgentResponse { content, tokensUsed (incl. reasoning), cost, toolCalls, ... }
```

---

## Entry Points After All Phases

```
@deskcreate/agentcraft          → Agent, Provider, BuiltInTools, MCP,
                                   AgentWorkflow, AgentTeam, AgentWorkspace,
                                   AgentMemory, AgentCache, AgentPool,
                                   ArtifactStore, ArtifactRegistry,
                                   AgentEval, AgentReports, ApprovalQueue,
                                   guardrails, errors, types

@deskcreate/agentcraft/adapters → defineAdapter, tool,
                                   FetchAdapter, DatabaseAdapter,
                                   TavilySearchAdapter, ImageGenerationAdapter,
                                   ToolPolicy, ToolGuardrail, AgentAdapter types

@deskcreate/agentcraft/mcp      → MCP (connect),
                                   GitHubMCP, SlackMCP, PostgresMCP, SupabaseMCP,
                                   FilesystemMCP, BraveSearchMCP, FirecrawlMCP, FetchMCP

@deskcreate/agentcraft/team     → AgentTeam, TeamMember, TeamResponse (unchanged)

@deskcreate/agentcraft/skills   → Skill, SkillDefinition, SkillFrontmatter  ← NEW
```

---

## Public API Contract (End State)

```ts
import { Agent, Provider, BuiltInTools, MCP } from '@deskcreate/agentcraft';
import { defineAdapter, tool, FetchAdapter } from '@deskcreate/agentcraft/adapters';
import { GitHubMCP } from '@deskcreate/agentcraft/mcp';
import { Skill } from '@deskcreate/agentcraft/skills';

// ── Capability checks (fully typed, autocompleted) ──────────────────────────
Agent.supports(Provider.openai['gpt-5.4'], 'supportsReasoning');  // true
Agent.supports(Provider.openai['gpt-4o-mini'], 'supportsReasoning');  // false
Agent.inspect(Provider.anthropic['claude-sonnet-4-6']).capabilities;  // full typed object

// ── Single tool (atomic, no adapter needed) ─────────────────────────────────
const getWeather = tool('get_weather', {
  description: 'Get current weather for a city',
  params: { city: { type: 'string', description: 'City name' } },
  run: async ({ city }) => fetch(`https://weather.api/${city}`).then(r => r.json()),
});

// ── Custom adapter (grouped tools with metadata) ─────────────────────────────
const payments = defineAdapter('payments', {
  charge: {
    description: 'Charge a payment method',
    params: { amount: { type: 'number', description: 'Amount in cents' } },
    sideEffect: 'external',
    run: async ({ amount }) => stripe.charges.create({ amount }),
  },
  refund: {
    description: 'Refund a charge',
    params: { chargeId: { type: 'string', description: 'Charge ID' } },
    sideEffect: 'write',
    requiresConfirmation: true,
    run: async ({ chargeId }) => stripe.refunds.create({ charge: chargeId }),
  },
});

// ── Generic MCP connection ────────────────────────────────────────────────────
const myMcp = MCP.connect({
  url: 'https://my-mcp-server.com',
  auth: { type: 'bearer', token: process.env.MCP_TOKEN! },
  allowedTools: ['tool_a', 'tool_b'],
  requireApproval: ['destructive_tool'],
});

// ── Named MCP wrapper (for curated services) ─────────────────────────────────
const github = GitHubMCP.connect({
  token: process.env.GITHUB_TOKEN!,
  allowedTools: ['list_issues', 'create_pull_request'],
});

// ── Provider-native tools ─────────────────────────────────────────────────────
const search = BuiltInTools.webSearch({ contextSize: 'medium' });

// ── Skill progressive disclosure ──────────────────────────────────────────────
const skills = Skill.fromDir('./skills');

// ── Everything wires the same way ─────────────────────────────────────────────
const agent = Agent.create({
  model: Provider.openai['gpt-5.4'],  // typed — no string typos possible
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(payments)    // custom adapter — tools available on every run
  .use(myMcp)       // MCP server — tools discovered at connection time
  .use(github)      // named wrapper — pre-configured GitHub tools
  .use(search)      // native tool — provider executes it server-side
  .use(skills);     // skills — Level 1 metadata in system prompt

// ── Single-run tool (available for this run only) ────────────────────────────
const result = await agent.run({
  prompt: 'Analyze this financial report and find issues on GitHub...',
  tools: [getWeather],       // one-off tool, not permanently attached
  reasoning: 'high',         // → reasoning_effort: 'high' on OpenAI
  budget: { maxCost: 0.50 },
});

// Swap model → same code works (or throws UnsupportedCapabilityError with clear message)
const anthropicAgent = Agent.create({
  model: Provider.anthropic['claude-sonnet-4-6'],
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
  .use(payments)
  .use(myMcp);
  // search omitted — anthropic doesn't support native web_search via standard API
  // reasoning: 'high' → maps to thinking.budget_tokens: 32768 automatically
```

---

## Release Grouping

| Release | Phases | What ships |
|---|---|---|
| **v0.4.0** | Phase 1 + Phase 2 | Correct catalog, reasoning API, capability flags, cleanup |
| **v0.5.0** | Phase 3 + Phase 4 | `defineAdapter`, `tool`, `MCP.connect()`, reduced adapter/MCP surface |
| **v0.6.0** | Phase 5 | `BuiltInTools.webSearch()`, `BuiltInTools.fileSearch()` |
| **v1.0.0** | Phase 6 | Skill progressive disclosure, stable entry points, full docs |

---

## Global Acceptance Criteria (v1.0.0)

- `npm run release:check` passes end-to-end (typecheck + tests + build + examples + exports + docs)
- All 6 entry points resolve correctly with correct types
- A user can go from zero to a working agent with custom tools + MCP + web search in under 15 minutes using only the README
- Switching from `Provider.openai['gpt-5.4']` to `Provider.anthropic['claude-sonnet-4-6']` in any example requires changing exactly one line
- Every `UnsupportedCapabilityError` names the failing model, what was attempted, and which models support it
- `npm run typecheck` produces zero errors
- `npm test` produces zero failures
- Package size does not regress beyond 10% from v0.3.0 baseline

---

*Last updated: 2026-05-29*
*Plan status: Approved for implementation*
