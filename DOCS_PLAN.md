# AgentCraft Docs — Implementation Plan

Each section is a phase. Each checklist item is one page. Sub-items (indented) are child pages nested under their parent in the sidebar. The **Covers** block for each item defines the full scope and content that page must address.

---

## Phase 1: Getting Started

- [ ] **Overview** — `docs/index.md`
  - **Purpose:** Landing page. Answers "what is AgentCraft and why should I use it" in under a minute.
  - **Covers:**
    - What AgentCraft is: production-grade TypeScript agent runtime
    - Core value proposition: provider-portable, composable, production-safe
    - Six entry points and what each unlocks (`/index`, `/adapters`, `/skills`, `/packs`, `/mcp`, `/team`)
    - High-level capability summary: providers, tools, adapters, MCP, skills, orchestration, persistence, observability
    - Where to go next: Quickstart → Feature Map → Choose a surface

- [ ] **Quickstart** — `docs/start/quickstart.md`
  - **Purpose:** Zero-to-running-agent in the shortest possible path.
  - **Covers:**
    - Install: `npm install @deskcreate/agentcraft`
    - Minimum viable agent: `Agent.create()` + `agent.run()` + print response
    - Adding a first tool: inline `ToolDefinition` with `execute()`
    - Reading the response: `content`, `tokensUsed`, `cost`
    - Environment variable setup: `OPENAI_API_KEY`
    - Next steps matrix: "I want to add tools → Tools section", "I want skills → Skills section", etc.

- [ ] **Feature Map** — `docs/start/feature-map.md`
  - **Purpose:** Full inventory of every package feature with a one-line purpose and links to its page, config, and examples.
  - **Covers:**
    - Table: Feature | Purpose | Start page | Config page | Cookbook example
    - All features grouped by surface: Core Runtime, Tools, Adapters, MCP, Skills, Domain Packs, Orchestration, Persistence, Production
    - Entry point map: which import path exposes which features
    - Stability tier per feature: stable / beta / experimental

- [ ] **Architecture** — `docs/architecture.md`
  - **Purpose:** Mental model of how all AgentCraft surfaces compose at runtime.
  - **Covers:**
    - The core run loop: preflight → prompt assembly → LLM call → tool loop → structured output → post-run enforcement → trace
    - Layer diagram: Agent → Provider → Adapters/Skills/MCP → Cache/Budget/Observability
    - How workspace wires everything: shared cache, adapters, budget, trace sink, events, store
    - How orchestration layers on top: Pool → Team → Workflow → Workspace
    - Data flow for a tool call: ToolDefinition → riskPolicy → execute → cache check → approval
    - Skill activation flow: prompt → directive parse → SkillRegistry → buildSkillPrompt

---

## Phase 2: Core Runtime

- [ ] **Agents** — `docs/core/agents.md`
  - **Purpose:** Full reference for creating and configuring an agent.
  - **Covers:**
    - `Agent.create(config)`: full `AgentCreateConfig` field breakdown
    - Model string format: `provider:model-id`
    - `agent.use(adapter | skill | pack)`: attaching capabilities
    - `AGENT_DEFAULTS`: what defaults apply when fields are omitted
    - Agent lifecycle: created → idle → running → idle (no persistent state between runs)
    - Cloning and reuse patterns: sharing an agent across runs vs creating per-request

- [ ] **Models & Providers** — `docs/core/models-and-providers.md`
  - **Purpose:** Every supported provider, how to configure each, and how to select models.
  - **Covers:**
    - All six providers: OpenAI, Anthropic, Google Gemini, AWS Bedrock, Cohere, OpenAI-compatible
    - Model string examples per provider
    - Provider-specific config: API keys, base URLs, regions, custom headers
    - `Provider` catalog: listing available models, filtering by capability
    - `BestFitResolver`: capability-based model selection (context window, vision, tool use)
    - OpenAI-compatible endpoints: custom `baseURL`, Azure, Groq, Together, etc.
    - Switching providers at runtime

- [ ] **Running Agents** — `docs/core/running-agents.md`
  - **Purpose:** Everything that can go into `agent.run()` and everything that comes out.
  - **Covers:**
    - `AgentRunParams`: `prompt`, `systemPrompt`, `temperature`, `maxTokens`, `budget`, `toolPolicy`, `responseSchema`, `trace`, `attachments`
    - Multimodal inputs: `AgentImage`, `AgentAudio`, `AgentFile`, `AgentVideo` — format requirements per provider
    - `AgentResponse` shape: `content`, `structuredResponse`, `tokensUsed`, `cost`, `cache`, `runId`, `provider`, `model`, `selection`, `toolCalls`
    - Retry config on run: `retry` field, how it interacts with `RetryConfig`
    - Concurrent runs: agents are stateless, safe to run in parallel
    - `promptFile` shorthand for file-based prompts

- [ ] **Streaming** — `docs/core/streaming.md`
  - **Purpose:** How to consume agent responses as a stream instead of waiting for completion.
  - **Covers:**
    - `agent.stream(params)`: same params as `run()`, returns async iterable
    - Chunk shape: `content`, `delta`, `done`, `finishReason`
    - `onChunk` and `onDone` callbacks
    - Streaming with tool calls: how tool execution interleaves with streaming tokens
    - Error handling in streams: partial response recovery
    - Provider support matrix: which providers support streaming natively
    - Streaming + structured output: limitations and workarounds

- [ ] **Structured Output** — `docs/core/structured-output.md`
  - **Purpose:** How to constrain agent responses to a typed schema.
  - **Covers:**
    - `responseSchema`: passing a Zod schema to `agent.run()`
    - `AgentResponse.structuredResponse`: typed return value
    - `parseAndValidateStructuredOutput()`: manual parsing utility
    - `structuredOutputInstruction()`: instruction fragment injected into system prompt
    - Provider support matrix: native JSON mode vs prompt-based coercion
    - Combining structured output with streaming: what's possible
    - Validation errors: what happens when the model returns invalid JSON

- [ ] **Prompt Assembly** — `docs/core/prompt-assembly.md`
  - **Purpose:** How to compose prompts from files, templates, and multiple sources.
  - **Covers:**
    - `PromptAssembler`: loading and composing prompt files
    - `promptFile()`: shorthand for loading a single prompt file into `run()`
    - Assembly modes: `AssemblyMode`, `AssemblyOptions`, `AssemblyResult`, `AssemblyStats`
    - Template variable injection
    - Combining prompt assembly with skill prompt fragments
    - File structure conventions for prompt directories
    - When to use prompt assembly vs inline strings

- [ ] **Budgets & Cost** — `docs/core/budgets-cost.md`
  - **Purpose:** How to set, enforce, and report on token and cost budgets.
  - **Covers:**
    - `RunBudget`: `maxCostUsd`, `maxTotalTokens`, `maxPromptTokens`, `maxCompletionTokens`
    - `BudgetMode`: soft (warn) vs hard (throw `QuotaExceededError`)
    - Preflight estimation: how cost is estimated before a run
    - Post-run enforcement: checked against actual `tokensUsed` and `cost`
    - `CostReport`: staleness warnings, per-model breakdown
    - Budget at workspace level: shared across all agents in a team or workflow
    - `MODEL_CATALOG` pricing metadata: how cost is calculated per provider

- [ ] **Observability & Tracing** — `docs/core/observability-replay.md`
  - **Purpose:** How to capture, inspect, and replay agent runs.
  - **Covers:**
    - `RunTracer`: what a tracer is, how it captures spans
    - `AgentReports.traceCollector()`: creating a collector and passing it to `run({ trace })`
    - Span shape: `spanId`, `name`, `kind`, `startedAt`, `status`, `durationMs`
    - Span kinds: what each represents in the run lifecycle
    - `createOpenTelemetryTraceSink()`: wiring to OpenTelemetry-compatible backends
    - **Trace Replay** *(on-page section)*
      - `collector.replayFixture()`: capturing a deterministic replay snapshot
      - `WorkflowRunArtifact`: persisting run artifacts for replay
      - Using replay for debugging and regression testing

- [ ] **Agent Events** — `docs/core/agent-events.md`
  - **Purpose:** How to subscribe to runtime events emitted during agent, team, and workflow runs.
  - **Covers:**
    - `AgentEventMap`: full catalogue of all event types and their payloads
    - `cache.hit`, `cache.miss`, `cache.write`: cache lifecycle events
    - `cost.updated`: emitted after each LLM call with token and cost data
    - `tool.called`: emitted before tool execution with sideEffect level
    - `approval.requested`, `approval.granted`, `approval.denied`, `approval.queued`, `approval.expired`
    - `workflow.step.started`, `workflow.step.completed`, `workflow.step.failed`
    - `AgentEventEmitter`: `on()`, `off()`, `emit()` — accessing via `workspace.events`
    - Event isolation: handler errors do not break runs
    - Use cases: logging, metrics, audit trails, live dashboards

- [ ] **Error Handling** — `docs/core/error-handling.md`
  - **Purpose:** Every error class the SDK can throw, when each is raised, and how to handle them.
  - **Covers:**
    - `AgentCraftError`: base class — `code`, `retryable`, `context`
    - Full error hierarchy:
      - `ProviderError` — unexpected provider failure
      - `ConfigurationError` — bad agent or adapter config
      - `RateLimitError` — `retryAfterSeconds` field, always retryable
      - `AuthenticationError` — invalid API key
      - `ModelNotFoundError` — model string doesn't exist on provider
      - `ContentPolicyError` — provider rejected prompt or response
      - `TimeoutError` — request exceeded timeout
      - `ServiceUnavailableError` — provider temporarily down
      - `ContextWindowError` — prompt exceeds model's context window
      - `QuotaExceededError` — account quota or budget exhausted
      - `NetworkError` — transport failure, may or may not be retryable
      - `InternalServerError` — provider 5xx
      - `RetryExhaustedError` — all retry attempts failed; wraps last error
      - `ToolExecutionError` — tool `execute()` threw
      - `AdapterRequirementError` — skill's `dependsOn` adapter not attached
      - `AdapterToolConflictError` — two adapters registered the same tool name
      - `UnsupportedInputError` — model doesn't support given input type
      - `SkillNotAttachedError` — skill referenced by directive is not attached
      - `InvalidRequestError` — malformed request parameters
      - `UnsupportedOperationError` — provider doesn't support the requested operation
    - `isRetryableError()`: utility for wrapping retry logic
    - `wrapUnknown()`: normalizing third-party errors into `AgentCraftError`
    - `RetryConfig` interaction: which errors trigger automatic retries

---

## Phase 3: Tools

- [ ] **Overview** — `docs/tools/tools.md`
  - **Purpose:** What tools are, how the agent calls them, and the full anatomy of a tool definition.
  - **Covers:**
    - What a tool is: a typed function the LLM can choose to call
    - `ToolDefinition` shape: `name`, `description`, `parameters` (JSON Schema), `execute()`, `security`
    - `tool()` factory helper: `params` + `run` shorthand
    - How the agent decides to call a tool: LLM function calling protocol
    - Tool results: `ToolResult` type, how results flow back into the LLM context
    - Multiple tool calls in one run: parallel vs sequential
    - Attaching tools to an agent: `agent.use()` vs passing in `run()`

- [ ] **Tool Policy** — `docs/tools/tool-policy.md`
  - **Purpose:** How to control which tools can run, when, and under what conditions.
  - **Covers:**
    - `ToolPolicy`: `riskPolicy` and `approve` callback
    - `sideEffect` levels: `none`, `read`, `write`, `external`, `destructive`
    - `riskAction()`: how the runtime maps sideEffect to `allow`, `queue`, or `block`
    - `riskPolicy` fields: `read`, `write`, `external`, `destructive` — each maps to `allow | queue | block`
    - Default policy: what happens with no `toolPolicy` set
    - Per-run policy override: passing `toolPolicy` in `agent.run()`
    - Workspace-level policy: applying one policy across all agents in a team

- [ ] **Guardrails** — `docs/tools/guardrails.md`
  - **Purpose:** Input sanitization and secret detection applied automatically to tool inputs and outputs.
  - **Covers:**
    - What guardrails check: secret patterns, PII indicators, prompt injection markers
    - How sanitization fires: automatically on tool inputs before `execute()` runs
    - Secret pattern list: API keys, tokens, SSNs, passwords
    - Configuring sensitivity: `redactSensitive` option
    - Custom guardrail rules: extending the detection patterns
    - What happens on detection: error thrown vs redaction
    - Guardrails in adapter context: `assertMemorySafe`, write-level redaction

- [ ] **Approvals** — `docs/tools/approvals.md`
  - **Purpose:** How to require human or programmatic sign-off before a tool executes.
  - **Covers:**
    - `ApprovalQueue`: creating a queue, wiring to workspace
    - `approve` callback in `ToolPolicy`: synchronous gating
    - Queue records: `requestId`, `toolName`, `reviewer`, `expiresAt`, `decision`
    - `approval.*` events: `requested`, `granted`, `denied`, `queued`, `expired`
    - Reviewer assignment: routing approvals to specific reviewers
    - Expiry: what happens when an approval request times out
    - Decision history: audit trail of all approval decisions
    - Use cases: write tools, external API calls, financial transactions

- [ ] **Tool Caching** — `docs/tools/tool-caching.md`
  - **Purpose:** How to cache tool call results so identical calls are served from cache instead of re-executing.
  - **Covers:**
    - `security.cache` on `ToolDefinition`: `safe`, `deterministic`, `ttlMs`
    - What `safe: true` means: no side effects, safe to replay
    - What `deterministic: true` means: same args always produce same result
    - Cache key generation: how args are hashed into a cache key
    - TTL: how long cached results are considered valid
    - `AgentResponse.cache`: `hits`, `misses`, `writes`, `toolCallsAvoided`, `estimatedSavedTokens`
    - Bypassing cache: `bypassed`, `skippedUnsafe`, `stale`, `corrupt`, `oversized` counters
    - Which tools should not be cached: write tools, time-sensitive reads

- [ ] **Authoring a Tool** — `docs/tools/tool-authoring.md`
  - **Purpose:** Step-by-step guide for writing a production-quality tool from scratch.
  - **Covers:**
    - Defining the `ToolDefinition` object: name, description, JSON Schema parameters
    - Writing the `execute()` function: async, typed args, return value
    - Setting `sideEffect` accurately: consequences of getting it wrong
    - Adding `security.cache`: when to enable, choosing TTL
    - Error handling inside `execute()`: throw vs return error string
    - Testing a tool in isolation: calling `execute()` directly in unit tests
    - Registering with an agent: `agent.use()` pattern
    - Common mistakes: over-broad descriptions, missing required parameters, mutable state in closure

---

## Phase 4: Adapters

- [ ] **Overview** — `docs/adapters/overview.md`
  - **Purpose:** What adapters are, how they differ from raw tools, and why they exist.
  - **Covers:**
    - Adapter vs tool: adapters are tool wrappers with lifecycle, dependency declarations, and config
    - `dependsOn`: how adapter requirements are declared and validated
    - `AdapterRequirementError`: what fires when a required adapter isn't attached
    - Lifecycle hooks: setup and teardown per run or per agent
    - How adapters attach to an agent: `agent.use(SomeAdapter.create(config))`
    - `runToolWithPolicy`: how all adapter tools flow through approval gating, dry-run, redaction, audit
    - Combining multiple adapters: tool name conflict detection (`AdapterToolConflictError`)

- [ ] **Built-In Adapters** — `docs/adapters/built-in.md`
  - **Purpose:** Reference for every general-purpose built-in adapter: setup, tools exposed, config.
  - **Covers:**
    - `FetchAdapter`: HTTP GET/POST, allowed domains, timeout config
    - `FileSystemAdapter`: read, write, list, delete — root path, allowed extensions
    - `GitHubAdapter`: repo read, file fetch, PR creation — token config
    - `DatabaseAdapter`: query execution — connection string, read-only mode
    - `PlaywrightAdapter`: browser automation — headless config, navigation tools
    - `SupabaseAdapter`: table query, insert, update — URL + key config
    - `PineconeAdapter`: vector upsert, query — API key + index config
    - `RedisAdapter`: get, set, delete — connection URL
    - `ApifyAdapter`: actor run — API token config
    - `SEOAdapter`: meta analysis, keyword tools
    - `SlackAdapter`: message send, channel list — bot token
    - `NotionAdapter`: page read, database query — integration token
    - `StorageAdapter`: blob read/write
    - For each: constructor config, tools exposed, sideEffect levels, example

- [ ] **Specialized Adapters** — `docs/adapters/specialized-adapters.md`
  - **Purpose:** Media, communication, and content-workflow adapters that serve specific integration needs.
  - **Covers:**
    - `EmailAdapter`: draft, send, read — SMTP/IMAP config
    - `GoogleCalendarAdapter`: event read, create, update — OAuth config
    - `GoogleSheetsAdapter`: cell read, write, append — OAuth config
    - `ImageGenerationAdapter`: DALL-E / Stable Diffusion — API key, model
    - `ElevenLabsAdapter`: text-to-speech — API key, voice ID
    - `PublishingAdapter`: CMS post creation and update
    - `AnalyticsAdapter`: metric read and report — API config
    - `LinkCheckerAdapter`: URL validation, broken link detection
    - `CitationManagerAdapter`: citation store read/write
    - `CreatorResourcesAdapter`: content asset retrieval
    - `AttachmentManagerAdapter`: file attachment lifecycle
    - For each: use case, constructor config, tools exposed, example

- [ ] **Custom Adapters** — `docs/adapters/custom.md`
  - **Purpose:** How to build your own adapter from scratch.
  - **Covers:**
    - Adapter interface: what methods and properties a custom adapter must implement
    - Declaring `dependsOn`: requiring other adapters as prerequisites
    - Exposing tools: returning `ToolDefinition[]` from the adapter
    - Setting `sideEffect` correctly on each tool
    - Adding lifecycle hooks: `onSetup()`, `onTeardown()`
    - Wiring `runToolWithPolicy` for approval, dry-run, redaction
    - Testing a custom adapter: unit-testing tools in isolation
    - Publishing a custom adapter as a package

- [ ] **Adapter Safety** — `docs/adapters/safety.md`
  - **Purpose:** How adapters enforce safety boundaries and what can go wrong.
  - **Covers:**
    - `dependsOn` validation: when and how it fires, error shape
    - `AdapterRequirementError`: fields, how to diagnose
    - `AdapterToolConflictError`: how tool name collisions are detected
    - Tool-level `sideEffect` declarations: what each level permits
    - Redaction in write tools: preventing secret leakage in tool inputs/outputs
    - Dry-run mode: running tools without executing side effects
    - Audit trail: how adapter tool calls are logged

---

## Phase 5: MCP

- [ ] **Overview** — `docs/mcp/overview.md`
  - **Purpose:** What MCP is in AgentCraft's context, how it differs from adapters, and how to wire it.
  - **Covers:**
    - Model Context Protocol: what it is, why it exists
    - `MCPAdapter`: the bridge between MCP servers and the AgentCraft tool system
    - How MCP tools surface in agent runs: same as adapter tools from the agent's perspective
    - MCP vs Adapter: when to use each
    - Attaching an MCP wrapper: `agent.use(SomeMcp.create(config))`
    - MCP lifecycle: connection, tool listing, tool call, disconnection

- [ ] **Built-In MCP Wrappers** — `docs/mcp/built-in.md`
  - **Purpose:** Reference for all 30+ pre-built MCP server wrappers.
  - **Covers:**
    - Airtable, Apify, Brave Search, Browserbase, Cloudflare, Context7
    - ElevenLabs, Fetch, Figma, Filesystem, Firecrawl, GitHub
    - Gmail, Jira, Linear, Memory, Neon, Notion
    - Playwright, Postgres, Qdrant, Railway, Render, Resend
    - Sentry, Slack, Stripe, Supabase, Vercel
    - For each: purpose, constructor config (API keys, URLs), tools exposed, example

- [ ] **Custom MCP** — `docs/mcp/custom.md`
  - **Purpose:** How to wrap any MCP-compatible server into an AgentCraft adapter.
  - **Covers:**
    - `MCPAdapter` constructor: server URL, auth, tool filter
    - Dynamic tool discovery: how tool listing works at connection time
    - Custom auth headers: bearer tokens, API keys
    - Filtering exposed tools: allow/deny lists
    - Error handling: what happens when the MCP server is unavailable
    - Testing custom MCP wrappers

- [ ] **MCP Security** — `docs/mcp/security.md`
  - **Purpose:** Security considerations and checklist for using MCP servers.
  - **Covers:**
    - MCP servers as untrusted: why MCP responses are treated like external input
    - Prompt injection via MCP tool results: detection and mitigation
    - Trust boundaries: which MCP servers get which sideEffect levels
    - Least-privilege principle: only expose the tools each agent needs
    - Allowlisting tools: filtering the MCP server's tool list
    - Credential management: never hardcode tokens, use environment variables
    - Network security: TLS requirements, private vs public MCP endpoints

---

## Phase 6: Skills

- [ ] **Overview** — `docs/skills/overview.md`
  - **Purpose:** What skills are, how they differ from tools and adapters, and when to use them.
  - **Covers:**
    - Skills as structured prompt fragments with metadata — not callable functions
    - How a skill modifies agent behavior: injected system instructions, persona, domain context
    - `agent.use(SomeSkill.create())`: attaching a skill
    - Skill composition: multiple skills on one agent
    - Skills vs tools: skills shape how the model thinks, tools give it things to do
    - `SkillPromptAssemblyMode`, `SkillPromptAssemblyRecord`, `SkillPromptAssemblyReport`
    - `dependsOn` in skills: requiring an adapter before the skill can be used

- [ ] **Primitive Skills** — `docs/skills/built-in.md`
  - **Purpose:** Full reference for every built-in primitive skill — purpose, adapter requirements, example.
  - **Covers:**
    - **Research group:** `ResearchSkill` (requires Tavily or Firecrawl), `DeepResearchSkill`
    - **Writing group:** `WritingSkill`, `HumanizerSkill`, `SummarizeSkill`, `TranslationSkill`, `EmailDraftSkill` (requires email adapter)
    - **Analysis group:** `DataAnalysisSkill` (requires filesystem or database), `DocumentAnalysisSkill`, `TranscriptionSkill`, `VisionSkill`
    - **Review group:** `CodeReviewSkill` (requires filesystem or GitHub), `CopyrightSkill`
    - **Operations group:** `ConversationSkill`, `MeetingSkill`, `MemorySkill`, `SchedulerSkill`
    - For each: what it does, adapter requirements (`dependsOn`), directive name, example

- [ ] **Skill Activation** — `docs/skills/activation.md`
  - **Purpose:** How and when skills activate during a run.
  - **Covers:**
    - `skillActivation` modes: `'auto'` (default) vs `'directive-only'`
    - Setting mode at agent creation: `Agent.create({ skillActivation: 'directive-only' })`
    - Why `directive-only` must be set on the agent, not the pack option
    - `SkillActivationReason` and `SkillActivationReasonCode`: what triggered activation
    - `AgentResponse.selection.activeSkills`: inspecting which skills fired
    - `SkillPromptAssemblyReport`: full assembly trace for debugging
    - Multi-skill conflicts: what happens when two skills both want to activate

- [ ] **Directives** — `docs/skills/directives.md`
  - **Purpose:** What directives are and how they trigger skills explicitly in a prompt.
  - **Covers:**
    - Directive syntax: `/directive-name` at the start of a word boundary in a prompt
    - Directive regex: `([a-z][a-z0-9-_]+)\b` — what matches, what doesn't
    - Naming convention: imperative verb phrase, not noun (`'draft'` not `'email-drafting'`)
    - Warning when `directive === name` at skill definition time
    - Common pitfalls: slashes inside URLs (`//api`), slash-separated words (`pass/fail`, `50k/day`)
    - How directives interact with `'directive-only'` mode
    - Listing a skill's directive: `skill.directive`

- [ ] **Skill Registry** — `docs/skills/activation.md`
  - **Purpose:** Programmatic skill management — registering, inspecting, and instantiating skills by name.
  - **Covers:**
    - `SkillRegistry`: the central registry, default vs custom registries
    - `registerSkillSpecs(...specs)`: adding skills to the registry
    - `createSkillByName(name)`: instantiating a skill at runtime by name string
    - `inspectSkillByName(name)`: reading a skill's metadata without instantiating
    - `listSkillInspections()`: listing all registered skills with metadata
    - `validateSkillSpec(spec)`: validating a skill spec before registration
    - `createSkillPackByName(name)`: instantiating a full skill pack by name
    - `listSkillPackSpecs()`: listing all registered packs
    - `DOMAIN_SKILL_ARCHITECTURE_CATALOG`: the domain skill catalog structure
    - Use case: dynamic skill loading, multi-tenant agents with per-tenant skill sets

- [ ] **Custom Skills** — `docs/skills/custom.md`
  - **Purpose:** How to define and register your own skill.
  - **Covers:**
    - `defineSkill(spec)`: the base factory
    - Domain-specific factories: `defineEngineeringSkillSpec`, `defineBrandSkillSpec`, etc. — why to use these over the base
    - Required fields: `name`, `directive`, `description`, `prompt`, `domain`
    - `directive` naming rules: imperative verb, unique, no slash conflicts
    - `dependsOn`: declaring required adapters as `[[AdapterA, AdapterB]]` (OR groups)
    - `buildSkillPrompt()`: how the prompt fragment is assembled
    - `validateSkillPromptTemplate()`: validating the prompt template at definition time
    - Registering with `registerSkillSpecs()` and re-exporting from domain `index.ts`
    - Testing a custom skill: verifying directive activation, prompt injection

- [ ] **External Skills** — `docs/skills/external-skills.md`
  - **Purpose:** How to load skills defined in external repositories.
  - **Covers:**
    - `GitHubSkillLoader`: loading skill specs from a GitHub repo
    - Config: repo URL, path, branch, auth token
    - Validation on load: ensuring external skills meet the spec contract
    - Security considerations: trusting external skill prompt content
    - Caching external skill definitions
    - Combining external skills with local skills in the same registry

---

## Phase 7: Industry Domain Skills

- [ ] **Overview** — `docs/skills/domains/overview.md`
  - **Purpose:** What domain skill packs are, how they differ from primitive skills, and how to use them.
  - **Covers:**
    - Domain packs as pre-assembled collections of domain-specific skills
    - `createSkillPackByName(name)`: instantiating a pack
    - `listSkillPackSpecs()`: discovering available packs
    - `inspectSkillPackByName(name)`: reading pack metadata
    - How domain skills compose with primitive skills on the same agent
    - Adapter requirements per domain: some domains need external tools
    - `DOMAIN_SKILL_ARCHITECTURE_CATALOG`: the full domain catalog
    - `LIVE_PROVIDER_CERTIFICATION_PLAN`: quality certification per domain

- [ ] **Brand & Voice** — `docs/skills/domains/brand.md`
  - **Purpose:** Skills for brand consistency, voice development, and positioning.
  - **Covers:** Pack overview, all skills in the brand domain with directives and descriptions, adapter requirements, example agent using the pack, sample prompts

- [ ] **Business Operations** — `docs/skills/domains/business.md`
  - **Purpose:** Skills for business process analysis, operations, and reporting.
  - **Covers:** Pack overview, all skills, adapter requirements, example, sample prompts

- [ ] **Content & Creator** — `docs/skills/domains/creator.md`
  - **Purpose:** Skills for content creation, editorial workflows, and publishing.
  - **Covers:** Pack overview, all skills, adapter requirements, example, sample prompts

- [ ] **Data & Analytics** — `docs/skills/domains/data-analytics.md`
  - **Purpose:** Skills for data interpretation, visualization planning, and insight generation.
  - **Covers:** Pack overview, all skills, adapter requirements (filesystem, database, or supabase), example, sample prompts

- [ ] **Engineering** — `docs/skills/domains/engineering.md`
  - **Purpose:** Skills for code review, architecture, debugging, and technical documentation.
  - **Covers:** Pack overview, all skills, adapter requirements (filesystem, GitHub), example, sample prompts

- [ ] **Finance** — `docs/skills/domains/finance.md`
  - **Purpose:** Skills for financial analysis, reporting, and planning.
  - **Covers:** Pack overview, all skills, adapter requirements, example, sample prompts

- [ ] **Healthcare** — `docs/skills/domains/healthcare.md`
  - **Purpose:** Skills for clinical documentation, patient communication, and medical research assistance.
  - **Covers:** Pack overview, all skills, adapter requirements, compliance notes, example, sample prompts

- [ ] **Legal** — `docs/skills/domains/legal.md`
  - **Purpose:** Skills for contract review, legal research, and document drafting.
  - **Covers:** Pack overview, all skills, adapter requirements, disclaimer, example, sample prompts

- [ ] **Marketing** — `docs/skills/domains/marketing.md`
  - **Purpose:** Skills for campaign planning, copy generation, and audience targeting.
  - **Covers:** Pack overview, all skills, adapter requirements, example, sample prompts

- [ ] **Personal Productivity** — `docs/skills/domains/personal-productivity.md`
  - **Purpose:** Skills for task management, scheduling, summarization, and personal workflows.
  - **Covers:** Pack overview, all skills, adapter requirements (calendar, email), example, sample prompts

- [ ] **Product** — `docs/skills/domains/product.md`
  - **Purpose:** Skills for product discovery, PRD writing, roadmap planning, and user research synthesis.
  - **Covers:** Pack overview, all skills, adapter requirements, example, sample prompts

- [ ] **Sales** — `docs/skills/domains/sales.md`
  - **Purpose:** Skills for outreach, objection handling, pipeline analysis, and proposal generation.
  - **Covers:** Pack overview, all skills, adapter requirements, example, sample prompts

- [ ] **Support** — `docs/skills/domains/support.md`
  - **Purpose:** Skills for ticket triage, response drafting, escalation handling, and knowledge base search.
  - **Covers:** Pack overview, all skills, adapter requirements, example, sample prompts

---

## Phase 8: Orchestration

- [ ] **Agent Workflow** — `docs/orchestration/agent-workflow.md`
  - **Purpose:** How to define and run a multi-step agent workflow.
  - **Covers:**
    - `AgentWorkflow.create(config)`: `steps`, `workspace`, `onStepComplete`
    - `workflow.run({ input })`: starting a run, `WorkflowResult` shape
    - `WorkflowContext`: `input`, `steps` (completed results), `workspace`, `store`, `runId`
    - `ctx.steps[stepId].output`: how to read prior step outputs — output is the step's return value
    - `WorkflowResult`: `status`, `steps`, `totalCost`, `durationMs`, `metrics`
    - Step statuses: `pending`, `running`, `completed`, `failed`, `skipped`, `awaiting_approval`
    - `workspace: AgentWorkspace.memory()` requirement
    - Failed run handling: `status: 'partial'` or `'failed'`

  - [ ] **Workflow Steps** — `docs/orchestration/workflow-steps.md`
    - **Purpose:** Full reference for all seven workflow step types and workflow resume.
    - **Covers:**
      - `AgentStep`: `id`, `agent`, `prompt` (string or function), `toolPolicy`, `responseSchema`, `retry` — returns `response.structuredResponse ?? response.content`
      - `ApprovalStep`: `id`, `description`, `approve()`, `onApproved()`, `timeoutMs`
      - `ConditionStep`: `id`, `condition(ctx)`, `onTrue` steps, `onFalse` steps
      - `CustomStep`: `id`, `run(ctx)` — note: `run` not `execute`
      - `ParallelStep`: `id`, `steps[]` — runs branches concurrently, collects outputs
      - `TeamStep`: `id`, `team`, `prompt`
      - `ToolStep`: `id`, `tool`, `args` (static or function)
      - `RetryStepConfig`: per-step retry independent of agent retry
      - **Workflow Resume**: `WorkflowResumeState`, resuming from first incomplete step, requires `workspace.store`
      - Accessing step outputs from subsequent steps: output shape per step type

- [ ] **Agent Team** — `docs/orchestration/agent-team.md`
  - **Purpose:** How to coordinate multiple agents with defined roles around a shared task.
  - **Covers:**
    - `AgentTeam.create(config)`: `orchestrator`, `members: [{ role, agent }]`, `mode`
    - `mode: 'orchestrator'`: orchestrator plans and delegates, members execute
    - `team.run(params)`: same params as `agent.run()`
    - `TeamResponse`: extends `AgentResponse` with `TeamTrace`
    - `TeamTrace`: per-member call history
    - Role naming: how the orchestrator references members by role
    - Shared workspace across team members
    - Token and cost aggregation across the team

  - [ ] **Dynamic Team Spawning** — `docs/orchestration/dynamic-team-spawning.md`
    - **Purpose:** How to let the orchestrator spawn specialist agents at runtime.
    - **Covers:**
      - `AgentTeam.spawn(config)`: declaring a spawnable team
      - `AgentTeamSpawnConfig`: root agent, available roles, constraints
      - The `spawn_agent` internal tool: how the root agent triggers spawning
      - Role prompt injection: how each spawned agent gets its instructions
      - Spawning limits: preventing unbounded spawning
      - Use cases: unknown-upfront task decomposition, dynamic sub-agent creation

- [ ] **Agent Pool** — `docs/orchestration/agent-pool.md`
  - **Purpose:** How to distribute requests across multiple agents using a selection strategy.
  - **Covers:**
    - `AgentPool.create([agents], options)`: `strategy` option
    - `strategy: 'round-robin'`: distributes requests sequentially across agents
    - `pool.run(params)`: returns `AgentResponse` from whichever agent handled the request
    - Concurrent pool runs: agents are stateless, safe to run in parallel
    - Use cases: provider failover, cost optimization, quality-aware routing
    - Pool vs Team: pool routes identical tasks, team coordinates different roles

- [ ] **Agent Workspace** — `docs/orchestration/agent-workspace.md`
  - **Purpose:** The shared runtime context that wires all orchestration surfaces together.
  - **Covers:**
    - `AgentWorkspace.memory()`: in-memory workspace factory
    - What workspace provides: `cache`, `adapters`, `MCPs`, `toolPolicy`, `budget`, `traceSink`, `logger`, `events`, `store`
    - Passing workspace to a workflow: `AgentWorkflow.create({ workspace })`
    - Passing workspace to a team: shared context across all members
    - `AgentWorkspaceInstance`: the interface agents and steps receive
    - `AgentWorkspaceMetricsSnapshot`: `cost`, `tokensUsed`, `cache`, `toolCalls`, `artifacts`, `memory`
    - Event bus access: `workspace.events.on('cache.hit', handler)`
    - Why `trace` must be passed to `agent.run()` separately, not via workspace

---

## Phase 9: Persistence & Memory

- [ ] **AgentCache** — `docs/persistence/agent-cache.md`
  - **Purpose:** How to enable tool-call result caching to reduce LLM costs and latency.
  - **Covers:**
    - What AgentCache caches: tool call results, not full agent responses
    - `AgentCache` backends: `memory`, `file`, `SQLite`, `Postgres`, `Redis`
    - Creating a cache: per-backend constructor and config
    - Attaching to an agent or workspace: `agent.use()` vs `workspace.cache`
    - `AgentResponse.cache`: `hits`, `misses`, `writes`, `bypassed`, `skippedUnsafe`, `stale`, `corrupt`, `oversized`, `toolCallsAvoided`, `estimatedSavedTokens`
    - `CacheEfficiencySummary`: `hitRate`, `savedCost`, human-readable summary
    - Cache key generation: deterministic hash of tool name + args
    - TTL and staleness: when cached results expire

  - [ ] **Cache Warming** — `docs/persistence/cache-warming.md`
    - **Purpose:** How to pre-populate the cache before agent runs to guarantee zero cold-start misses.
    - **Covers:**
      - `cache.warm(entries)`: pre-loading known tool results
      - `cache.hitRate()`: reading current hit rate statistics
      - Distributed locking: preventing cache stampedes when multiple agents start simultaneously
      - Warm-on-deploy pattern: warming cache as part of the startup sequence
      - Stale-while-revalidate: serving stale results while revalidating in background
      - Monitoring warm state: confirming entries are present before starting runs

- [ ] **Distributed Cache** — `docs/persistence/distributed-cache.md`
  - **Purpose:** Redis and Postgres backends in depth for multi-instance deployments.
  - **Covers:**
    - When to use distributed cache: multiple agent instances, horizontal scaling
    - `RedisAgentCache`: connection URL, key prefix, TTL, cluster support
    - `PostgresAgentCache`: connection string, table name, schema setup
    - Serialization: how results are serialized for storage
    - Distributed locking implementation: preventing concurrent writes to same key
    - Eviction policies: TTL-based vs LRU
    - Cache invalidation: manual invalidation, tag-based invalidation
    - Observability: monitoring hit rates across distributed instances

- [ ] **Semantic Memory** — `docs/persistence/semantic-memory.md`
  - **Purpose:** How to give agents long-term associative memory using vector search.
  - **Covers:**
    - `AgentMemory`: what it is, how it differs from `AgentCache`
    - Backends: `local` (in-memory), `Qdrant`, `Pinecone`, `Supabase`
    - Storing a memory: `memory.add(text, metadata)`
    - Searching memories: `memory.search(query, { limit, threshold })`
    - Injecting memory context into a run: passing retrieved memories into the prompt
    - Memory namespace isolation: per-user, per-session, per-domain namespaces
    - Embedding models: which providers handle embedding, configuration
    - Use cases: RAG, conversational context, cross-session agent continuity

- [ ] **Artifact Store** — `docs/persistence/artifact-store.md`
  - **Purpose:** How to persist typed agent outputs as durable, queryable artifacts.
  - **Covers:**
    - `ArtifactStore` interface: `put()`, `get()`, `list()`, `delete()`
    - `MemoryArtifactStore()`: in-memory, no setup, ephemeral
    - `FileArtifactStore(options)`: file-system backed, `FileArtifactStoreOptions`
    - `SQLiteArtifactStore(options)`: SQLite backed, `SQLiteArtifactStoreOptions`
    - `ArtifactRef`: the returned reference after a `put()`
    - `ArtifactFilter`: filtering by type, tags, date range in `list()`
    - `ArtifactHistory`: version history for a given artifact
    - `ArtifactLink`: linking artifacts to runs, steps, or other artifacts
    - `TypedArtifactStoreHelper`: type-safe per-schema store operations
    - `createArtifactTypeHelper()` and `createRegisteredArtifactHelper()`: factory utilities

- [ ] **Artifact Registry** — `docs/persistence/artifact-registry.md`
  - **Purpose:** How to define, register, and validate artifact types.
  - **Covers:**
    - `ArtifactRegistry`: central registry for artifact schemas
    - 19 built-in artifact schemas: listing each with its fields
    - `createArtifactTypeHelper()`: creating a typed helper for a custom schema
    - `createRegisteredArtifactHelper()`: registering and getting a helper in one step
    - Validation: how artifact data is validated against its schema on `put()`
    - Custom artifact types: defining a Zod schema and registering it
    - Use cases: structured agent output persistence, audit trail, reproducibility

- [ ] **Citation Store** — `docs/persistence/citation-store.md`
  - **Purpose:** How to track sources and citations produced during agent runs.
  - **Covers:**
    - `CitationManagerAdapter`: the adapter that exposes citation tools
    - Adding a citation: `cite()` tool call from within an agent run
    - Citation schema: `id`, `source`, `excerpt`, `url`, `retrievedAt`
    - Reading citations after a run: listing all citations for a run ID
    - Linking citations to artifact outputs
    - Use cases: research agents, legal agents, any output requiring source attribution

- [ ] **Creator Memory Store** — `docs/persistence/creator-memory-store.md`
  - **Purpose:** Persistent brand voice and content corpus memory for content workflows.
  - **Covers:**
    - Scope: content and brand domain — not a general-purpose store
    - `FileSystemCreatorMemoryStore`: constructor options (`root`, `staleAfterMs`, `requireWriteApproval`, `approveWrite`, `redactSensitive`)
    - `upsertBrandVoice(profile)`: storing tone, preferred phrases, banned phrases, examples
    - `readBrandVoice(id)`: retrieving a brand voice profile with freshness metadata
    - `addCorpusDocument(doc)`: storing tagged reference documents with vectorization
    - `searchCorpus(query, options)`: cosine-similarity search over stored documents
    - `summarizeContext(options)`: assembling brand + corpus context for injection into a prompt
    - `MemoryFreshness`: `stale`, `ageMs`, `staleAfterMs`, `checkedAt`
    - Write approval gate: `requireWriteApproval` + `approveWrite` callback
    - Secret redaction: `redactSensitive` prevents credentials from being stored

- [ ] **Analytics History Store** — `docs/persistence/analytics-history-store.md`
  - **Purpose:** Persistent store for content performance reports and A/B experiment tracking.
  - **Covers:**
    - Scope: content performance analytics — not general-purpose metrics storage
    - `FileSystemAnalyticsHistoryStore`: constructor `root` option
    - `savePerformanceReport(report)`: persisting a `CreatorArtifact` performance report
    - `saveExperimentPlan(plan)`: storing an A/B experiment plan
    - `saveExperimentResult(result)`: recording baseline/variant metrics with a `decision` field (`ship` | `iterate` | `stop` | `inconclusive`)
    - `snapshot()`: full `AnalyticsHistorySnapshot` of all stored records
    - `summarizeInsights()`: extracting recommendations and experiment decisions as a string array
    - Use cases: content performance tracking, editorial experimentation, iterative publishing

- [ ] **Authoring a Domain Store** — `docs/persistence/authoring-domain-store.md`
  - **Purpose:** Pattern guide for building a specialized persistence store for a custom domain.
  - **Covers:**
    - When to build a domain store: domain-specific data shapes that don't fit `ArtifactStore` generics
    - Step 1 — Define your data shape: TypeScript interfaces, Zod schemas for validation
    - Step 2 — Choose a backend: file system (`fs/promises`) vs SQLite vs Postgres
    - Step 3 — Implement read/write/search: `put`, `get`, `list`, `search` methods
    - Step 4 — Add write approvals: gating destructive writes behind an `approveWrite` callback
    - Step 5 — Add staleness: `updatedAt` + `staleAfterMs` freshness tracking
    - Step 6 — Add secret redaction: `assertStoreSafe()` pattern
    - Step 7 — Integrate with a domain pack: exposing the store to domain skills via workspace
    - Reference implementations: `FileSystemCreatorMemoryStore`, `FileSystemAnalyticsHistoryStore`

---

## Phase 10: Production

- [ ] **Security Model** — `docs/production/security-model.md`
  - **Purpose:** How AgentCraft's security layers work end to end.
  - **Covers:**
    - Threat model: prompts, files, browser pages, MCP servers, adapter responses, tool inputs treated as untrusted
    - Layer 1 — Input sanitization: guardrails on tool inputs
    - Layer 2 — Secret detection: pattern matching before storage or logging
    - Layer 3 — Tool policy: `sideEffect` gating before `execute()`
    - Layer 4 — Scoped adapters: each adapter operates within a declared boundary
    - Layer 5 — Approval gates: human or programmatic sign-off for write tools
    - Layer 6 — Governance queue: durable approval queue with expiry and audit
    - What AgentCraft does NOT protect against: model hallucination, LLM jailbreaks
    - Security defaults: what's safe out of the box vs what must be explicitly enabled

- [ ] **Governance Queue** — `docs/production/governance-queue.md`
  - **Purpose:** Durable, reviewable approval queue for write-capable tools.
  - **Covers:**
    - `ApprovalQueue`: creating a queue, wiring to `toolPolicy`
    - Queue records: `requestId`, `toolName`, `sideEffect`, `reviewer`, `expiresAt`, `decision`, `decidedAt`
    - Reviewer assignment: routing requests to named reviewers
    - Expiry: auto-deny on timeout, configuring `expiresAt`
    - Decision callbacks: `onGranted`, `onDenied`, `onExpired`
    - Decision history: queryable audit trail of all approval decisions
    - `approval.*` events: integrating with the event bus for live notifications
    - Use cases: publish-before-send, external API calls, financial transactions, data mutation

- [ ] **AgentEval** — `docs/production/agent-eval.md`
  - **Purpose:** How to write and run automated quality, cost, and behavior assertion suites.
  - **Covers:**
    - `AgentEval.suite(config)`: `name`, `defaults` (maxCostUsd, maxTotalTokens)
    - `.case(config)`: `name`, `prompt`, `assertions[]`
    - Assertion types: `contains`, `notContains`, `matches`, `jsonPath`, `toolCalled`, `skillActivated`, `cacheHitRateAtLeast`
    - `AgentEval.run({ agent, suite })`: running the suite
    - `EvalReport`: `status` (`passed` | `failed`), `results[]`, per-case assertion results
    - Per-case result: `name`, `status`, `content`, `assertions`, `tokensUsed`, `cost`
    - Markdown and JSON report output
    - CI integration: exit code on failure, environment variable gating
    - Judge mode: using a second LLM to evaluate subjective quality

- [ ] **AgentReports** — `docs/production/agent-reports.md`
  - **Purpose:** How to generate structured markdown and JSON reports from agent runs.
  - **Covers:**
    - `AgentReports.traceCollector()`: creating a collector instance
    - Passing to `agent.run({ trace: collector })`: collecting spans during a run
    - `collector.spans()`: accessing all captured spans
    - `collector.replayFixture()`: producing a deterministic replay snapshot
    - Markdown report generation: formatting run results as a readable artifact
    - `WorkflowRunArtifact`: the shape of a persisted workflow run report
    - Saving reports to disk: integration with `ArtifactStore`
    - Use cases: run auditing, stakeholder reporting, debugging, regression baselines

- [ ] **Production Observability** — `docs/production/observability-reports.md`
  - **Purpose:** Wiring AgentCraft's tracing output to production monitoring infrastructure.
  - **Covers:**
    - `createOpenTelemetryTraceSink()`: creating an OTel-compatible sink
    - Connecting to OTel collectors: Jaeger, Honeycomb, Datadog, Grafana Tempo
    - Span attributes: what metadata is attached to each span automatically
    - Custom span attributes: adding domain-specific metadata
    - Log integration: correlating agent logs with trace IDs
    - Alerting: which span attributes to alert on (error rate, latency, cost)
    - Dashboard design: recommended panels for an agent monitoring dashboard
    - Cost monitoring: tracking per-run and aggregate cost over time via `cost.updated` events

- [ ] **Testing & Mocking** — `docs/production/testing.md`
  - **Purpose:** How to write unit and integration tests for agents without making live API calls.
  - **Covers:**
    - `DeterministicFakeProvider`: a provider that returns scripted responses
    - Configuring the fake: response queue, token counts, cost simulation
    - Using with `Agent.create({ provider: fakeProvider })`: full agent wiring without API keys
    - Testing tool calls: scripting which tools the fake provider "decides" to call
    - Testing skill activation: asserting `activeSkills` in the response
    - Testing structured output: returning valid JSON from the fake
    - Testing error paths: scripting `ProviderError`, `RateLimitError`, etc.
    - Integration with Vitest and Jest
    - `INTEGRATION_TESTS` env var gate: pattern for separating unit vs live tests

- [ ] **Runtime Hardening** — `docs/production/runtime-hardening.md`
  - **Purpose:** What has been hardened in the runtime, what the current state is, and the design principles.
  - **Covers:**
    - Goal: keep the public API stable while moving risk into smaller, testable modules
    - What has been hardened: skill routing, prompt assembly, cache replay, memory injection, adapter lifecycle
    - Module boundaries: which modules are internal vs public
    - Invariants: guaranteed behaviors the runtime upholds regardless of config
    - Regression testing: how the certification test suite validates hardening
    - What is still in progress
    - How to report a hardening regression

---

## Phase 11: Examples & Cookbook

- [ ] **Overview** — `docs/examples-cookbook/overview.md`
  - **Purpose:** How the cookbook is organized and how to run the examples locally.
  - **Covers:** Section map, how to clone and run, env var requirements, example naming conventions

- [ ] **Beginner** — `docs/examples-cookbook/beginner.md`
  - **Purpose:** First contact with the SDK — one concept at a time, no prior knowledge assumed.
  - **Covers:** `Agent.create()` → `agent.run()` → print response; adding a first tool; reading `tokensUsed` and `cost`; switching models; handling a `ProviderError`

- [ ] **Providers** — `docs/examples-cookbook/provider.md`
  - **Purpose:** Switching providers, multi-provider setups, and OpenAI-compatible endpoints.
  - **Covers:** OpenAI, Anthropic, Gemini, Bedrock, Cohere examples; `BestFitResolver` for capability-based selection; custom base URL for Azure / Groq / Together

- [ ] **Streaming** — `docs/examples-cookbook/streaming.md`
  - **Purpose:** Consuming streaming responses in real applications.
  - **Covers:** `agent.stream()` with `onChunk`; streaming to a web response (`Response` + `ReadableStream`); streaming with tool calls; streaming + structured output constraints

- [ ] **Structured Output** — `docs/examples-cookbook/structured-output.md`
  - **Purpose:** Extracting typed data from agent responses.
  - **Covers:** Zod schema definition; `responseSchema` in `agent.run()`; accessing `structuredResponse`; handling parse failures; combining with streaming

- [ ] **Tools & Adapters** — `docs/examples-cookbook/tools-adapters.md`
  - **Purpose:** Defining tools, setting policy, and using built-in adapters.
  - **Covers:** Inline `ToolDefinition`; `tool()` factory; `riskPolicy` enforcement; `FetchAdapter`; `FileSystemAdapter`; `PlaywrightAdapter`; custom adapter authoring walkthrough

- [ ] **Persistence & Caching** — `docs/examples-cookbook/persistence.md`
  - **Purpose:** Caching tool results and persisting agent outputs.
  - **Covers:** `AgentCache` with memory backend; enabling `security.cache` on a tool; reading `AgentResponse.cache.hits`; `cache.warm()` before a batch run; `ArtifactStore.put()` and `get()`

- [ ] **Semantic Memory** — `docs/examples-cookbook/semantic-memory.md`
  - **Purpose:** Giving agents persistent associative memory across runs.
  - **Covers:** `AgentMemory` with local backend; `memory.add()` and `memory.search()`; injecting retrieved memories into a prompt; Qdrant backend setup; multi-session continuity pattern

- [ ] **MCP** — `docs/examples-cookbook/mcp.md`
  - **Purpose:** Attaching MCP servers and using their tools in agent runs.
  - **Covers:** Attaching a built-in MCP wrapper (`GitHubMcp`, `SlackMcp`); `MCPAdapter` with a custom server URL; tool filtering; handling MCP server unavailability

- [ ] **Skills** — `docs/examples-cookbook/skills.md`
  - **Purpose:** Using primitive skills, directive activation, and the skill registry.
  - **Covers:** `WritingSkill.create()` on an agent; directive activation in a prompt; `directive-only` mode; `SkillRegistry` to load a skill by name; custom skill definition and registration

- [ ] **Orchestration** — `docs/examples-cookbook/orchestration.md`
  - **Purpose:** Multi-agent workflows, teams, and pools.
  - **Covers:** `AgentWorkflow` with `AgentStep` + `CustomStep` + `ConditionStep`; `AgentTeam` with orchestrator + writer member; `AgentPool` round-robin with concurrent runs; `AgentWorkspace` shared across a workflow

- [ ] **Budgets & Cost** — `docs/examples-cookbook/budgets.md`
  - **Purpose:** Controlling and reporting on spend.
  - **Covers:** `RunBudget` with `maxCostUsd`; catching `QuotaExceededError`; soft vs hard budget mode; `CostReport` after a run; workspace-level budget shared across a team; cost tracking with the `cost.updated` event

- [ ] **Prompt Assembly** — `docs/examples-cookbook/prompt-assembly.md`
  - **Purpose:** Composing prompts from files and templates.
  - **Covers:** `promptFile()` shorthand in `agent.run()`; `PromptAssembler` for multi-file composition; template variable injection; combining assembled prompts with skill prompt fragments

- [ ] **Industry Domains** — `docs/examples-cookbook/creator.md`
  - **Purpose:** Using domain skill packs for real-world domain workflows.
  - **Covers:** Engineering pack: code review agent; Legal pack: contract analysis agent; Marketing pack: campaign copy agent; Data & Analytics pack: insight report agent; composing two domain packs on one agent

- [ ] **Error Handling & Retries** — `docs/examples-cookbook/error-handling.md`
  - **Purpose:** Handling every class of error the SDK can throw.
  - **Covers:** Catching `ProviderError`, `RateLimitError`, `RetryExhaustedError`; `RetryConfig` with exponential backoff; `isRetryableError()` in a custom retry loop; `QuotaExceededError` for budget exhaustion; fallback provider pattern on `ServiceUnavailableError`

- [ ] **Testing & Mocking** — `docs/examples-cookbook/testing.md`
  - **Purpose:** Writing tests for agents without live API calls.
  - **Covers:** `DeterministicFakeProvider` setup in Vitest; scripting response queues; asserting tool calls; asserting skill activation; testing structured output; testing error paths with scripted `ProviderError`

- [ ] **Production** — `docs/examples-cookbook/production.md`
  - **Purpose:** Production patterns: eval, governance, observability, and reporting.
  - **Covers:** `AgentEval` suite with assertions; `AgentReports.traceCollector()` wiring; `ApprovalQueue` for a write tool; `createOpenTelemetryTraceSink()` with Honeycomb; `workspace.events.on('cost.updated')` for cost alerting

- [ ] **Runnable Examples Index** — `docs/examples.md`
  - **Purpose:** Index of every runnable `.ts` file in the `/examples` directory.
  - **Covers:** Table of all examples with description, entry point path, and required env vars

---

## Phase 12: Reference

- [ ] **API Reference** — `docs/api.md`
  - **Purpose:** Auto-generated TypeDoc output for all public exports.
  - **Covers:** All classes, interfaces, functions, and types from all six entry points — generated, not hand-authored

- [ ] **API Stability** — `docs/production/api-stability.md`
  - **Purpose:** Stability guarantees, versioning policy, and what is safe to import.
  - **Covers:** Stable entry points vs internal paths; semver policy; what changes constitute a breaking change; how to import only stable surfaces; deprecation process

- [ ] **Primitive Skills Index** — `docs/reference/built-in-skills.md`
  - **Purpose:** Quick-reference table of every primitive skill.
  - **Covers:** Table: Skill name | Group | Directive | Adapter requirements | Description — all 17 primitive skills

- [ ] **Built-In Adapters Index** — `docs/reference/built-in-adapters.md`
  - **Purpose:** Quick-reference table of every built-in adapter.
  - **Covers:** Table: Adapter | Tools exposed | Side effects | Peer deps | Description — all adapters

- [ ] **Built-In MCP Wrappers Index** — `docs/reference/built-in-mcps.md`
  - **Purpose:** Quick-reference table of every built-in MCP wrapper.
  - **Covers:** Table: MCP | Tools exposed | Auth required | Description — all 30+ wrappers

### Configuration Reference

- [ ] **Overview** — `docs/configuration/overview.md`
  - **Purpose:** How the configuration pages are organized and how config surfaces relate to each other.
  - **Covers:** Config hierarchy (agent → run → workspace → step); which config is per-agent vs per-run vs per-workspace; environment variable precedence

- [ ] **Agent Config** — `docs/configuration/agent-config.md`
  - **Purpose:** Full `AgentCreateConfig` type reference.
  - **Covers:** `model`, `apiKey`, `temperature`, `maxTokens`, `systemPrompt`, `skillActivation`, `retry`, `timeout`, `logger` — every field with type, default, and example

- [ ] **Run Config** — `docs/configuration/run-config.md`
  - **Purpose:** Full `AgentRunParams` type reference.
  - **Covers:** `prompt`, `systemPrompt`, `temperature`, `maxTokens`, `budget`, `toolPolicy`, `responseSchema`, `trace`, `attachments`, `promptFile` shorthand — every field

- [ ] **Provider Config** — `docs/configuration/provider-config.md`
  - **Purpose:** Per-provider configuration reference.
  - **Covers:** OpenAI: `apiKey`, `baseURL`, `organization`; Anthropic: `apiKey`, `version`; Gemini: `apiKey`, `projectId`; Bedrock: `region`, `credentials`; Cohere: `apiKey`; OpenAI-compatible: `baseURL`, custom headers; model string format per provider

- [ ] **Retry Config** — `docs/configuration/retry-config.md`
  - **Purpose:** `RetryConfig` type reference.
  - **Covers:** `maxAttempts`, `backoff` (`fixed` | `exponential` | `linear`), `initialDelay`, `maxDelay`; which errors trigger retries; retry at agent level vs run level vs step level

- [ ] **Budget Config** — `docs/configuration/budget-config.md`
  - **Purpose:** `RunBudget` and `BudgetMode` type reference.
  - **Covers:** `maxCostUsd`, `maxTotalTokens`, `maxPromptTokens`, `maxCompletionTokens`; `BudgetMode` (`soft` | `hard`); preflight estimation config; `CostReport` shape

- [ ] **Tool Policy Config** — `docs/configuration/tool-policy-config.md`
  - **Purpose:** `ToolPolicy` type reference.
  - **Covers:** `riskPolicy` fields; `sideEffect` level enum; `approve` callback signature; combining policy with `ApprovalQueue`

- [ ] **Adapter Config** — `docs/configuration/adapter-config.md`
  - **Purpose:** Common adapter configuration patterns.
  - **Covers:** Per-adapter constructor option types; `dependsOn` declaration; dry-run flag; redaction config; lifecycle hook signatures

- [ ] **MCP Config** — `docs/configuration/mcp-config.md`
  - **Purpose:** `MCPAdapter` and built-in MCP wrapper configuration.
  - **Covers:** `MCPAdapter` constructor options; per-wrapper auth fields; tool filter config; timeout config; connection retry

- [ ] **Skill Config** — `docs/configuration/skill-config.md`
  - **Purpose:** Skill spec definition config and registry config.
  - **Covers:** `defineSkill` spec fields; `directive`, `name`, `domain`, `description`, `prompt`, `dependsOn`; `DEFAULT_SKILL_SPEC_PROMPT_VERSION`; registry instantiation options

- [ ] **Industry Pack Config** — `docs/configuration/creator-pack-config.md`
  - **Purpose:** Domain skill pack configuration.
  - **Covers:** `createSkillPackByName(name, options)` options; per-pack adapter requirements; how to pass pack-level config; `inspectSkillPackByName` return shape

- [ ] **Cache Config** — `docs/configuration/cache-config.md`
  - **Purpose:** `AgentCache` and per-backend configuration.
  - **Covers:** Memory backend options; file backend: `root`, `maxEntries`; SQLite backend: `path`; Redis backend: connection URL, key prefix, TTL; Postgres backend: connection string, table name; `security.cache` on `ToolDefinition`

- [ ] **Workspace Config** — `docs/configuration/workspace-config.md`
  - **Purpose:** `AgentWorkspace` and `AgentWorkspaceInstance` configuration.
  - **Covers:** `AgentWorkspace.memory()` options; wiring `cache`, `adapters`, `toolPolicy`, `budget`, `traceSink`, `logger`, `events`, `store`; `AgentWorkspaceMetricsSnapshot` shape

- [ ] **Workflow Config** — `docs/configuration/workflow-config.md`
  - **Purpose:** `AgentWorkflowConfig` and all step config types.
  - **Covers:** `AgentWorkflowConfig`: `steps`, `workspace`, `onStepComplete`; `WorkflowRunOptions`; `WorkflowResumeState`; per-step config types for all seven step types

- [ ] **Team & Pool Config** — `docs/configuration/team-config.md`
  - **Purpose:** `AgentTeamConfig`, `AgentTeamSpawnConfig`, and `AgentPoolOptions`.
  - **Covers:** `AgentTeamConfig`: `orchestrator`, `members`, `mode`; `TeamMember`: `role`, `agent`; `AgentTeamSpawnConfig`; `AgentPoolOptions`: `strategy`

- [ ] **Structured Output Config** — `docs/configuration/structured-output-config.md`
  - **Purpose:** How to configure structured output parsing.
  - **Covers:** `responseSchema` field; Zod schema requirements; `parseAndValidateStructuredOutput` options; provider-specific native JSON mode config; fallback behavior

- [ ] **Prompt Assembly Config** — `docs/configuration/prompt-assembly-config.md`
  - **Purpose:** `PromptAssembler`, `AssemblyOptions`, and `AssemblyMode` reference.
  - **Covers:** `AssemblyMode` values; `AssemblyOptions` fields; `AssemblyResult` and `AssemblyStats` shapes; `promptFile()` shorthand options

- [ ] **Memory & Store Config** — `docs/configuration/memory-store-config.md`
  - **Purpose:** Configuration for all persistence backends.
  - **Covers:** `AgentMemory` backend options (local, Qdrant, Pinecone, Supabase); `MemoryArtifactStore` options; `FileArtifactStore` options; `SQLiteArtifactStore` options; `FileSystemCreatorMemoryStore` options; `FileSystemAnalyticsHistoryStore` options

- [ ] **Observability Config** — `docs/configuration/observability-config.md`
  - **Purpose:** Tracing and sink configuration.
  - **Covers:** `createOpenTelemetryTraceSink()` options; OTel exporter config; `AgentReports.traceCollector()` options; `RunTracer` interface; span attribute customization

- [ ] **Eval Config** — `docs/configuration/eval-config.md`
  - **Purpose:** `AgentEval.suite()` and `.case()` configuration.
  - **Covers:** Suite `defaults`; case config fields; assertion type signatures; judge config; report output options; CI environment variable gate

- [ ] **Environment Variables** — `docs/configuration/environment-variables.md`
  - **Purpose:** All environment variables the SDK reads, their effect, and defaults.
  - **Covers:** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `AWS_*`, `COHERE_API_KEY`; `INTEGRATION_TESTS`; `AGENTCRAFT_LIVE_*` test flags; custom base URL env vars per provider
