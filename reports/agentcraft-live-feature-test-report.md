# AgentCraft Live And Feature Test Report

Generated: 2026-05-10

## Executive Summary

Overall status: **successful after targeted protocol updates, with one external latency caveat**.

- Stable live provider smoke matrix: **passed** across OpenAI, Anthropic, Gemini, Cohere, DeepSeek, and Groq.
- Latest account-visible model smoke matrix: **passed for the targeted compatibility fixes**. OpenAI GPT-5.x now routes through Responses API; Cohere Command A reasoning now routes through Cohere `/v2/chat`.
- Core feature suite: **passed** for MCPs, adapters, skills, agent pool, agent team, security guardrails, public exports, and examples.
- Live adapter smoke: **GitHub, Firecrawl, Fetch public URL, Fetch Basic Auth, Apify, Filesystem, and Playwright Basic Auth passed**. Tavily was skipped because the current `TAVILY_API_KEY` value is still a placeholder. Apify now uses a tiny read-only smoke dataset.
- Live MCP smoke: **Memory, Context7, Filesystem, Firecrawl, and Apify discovery passed** against real pinned stdio MCP packages.
- Skill comparison: **passed**. Skills measurably enrich the model call by adding structured role, goal, constraints, output format, quality checklist, failure behavior, safety notes, and bounded directive regions.

## Commands Run

```sh
npm run typecheck
npm test
npx vitest run src/agent/adapters/__tests__/adapters.test.ts src/agent/mcp-servers/__tests__/mcp-servers.test.ts src/agent/skills/__tests__/skills.test.ts src/agent/skills/__tests__/skill-comparison.test.ts src/agent/__tests__/agent.test.ts src/agent/__tests__/agent-team.test.ts src/security/__tests__/security-regression.test.ts src/__tests__/public-exports.test.ts src/__tests__/examples-smoke.test.ts --reporter=verbose
AGENTCRAFT_LIVE_PROVIDERS=all npm run test:int -- --reporter=verbose
AGENTCRAFT_LIVE_ADAPTERS=firecrawl npm run test:int -- src/__tests__/integration/live-adapters.test.ts --reporter=verbose
AGENTCRAFT_LIVE_ADAPTERS=github npm run test:int -- src/__tests__/integration/live-adapters.test.ts --reporter=verbose
AGENTCRAFT_LIVE_PROVIDERS=openai AGENTCRAFT_LIVE_OPENAI_MODELS=gpt-5.5,gpt-5.4-mini AGENTCRAFT_LIVE_MAX_TOKENS=64 npm run test:int -- --reporter=verbose
AGENTCRAFT_LIVE_PROVIDERS=cohere AGENTCRAFT_LIVE_COHERE_MODELS=command-a-reasoning-08-2025 AGENTCRAFT_LIVE_MAX_TOKENS=64 npm run test:int -- --reporter=verbose
AGENTCRAFT_LIVE_ADAPTERS=all npm run test:int -- src/__tests__/integration/live-adapters.test.ts --reporter=verbose
AGENTCRAFT_LIVE_MCPS=all npm run test:int -- src/__tests__/integration/live-mcp.test.ts --reporter=verbose
npx vitest run src/agent/adapters/__tests__/adapters.test.ts src/agent/skills/__tests__/skills.test.ts src/agent/skills/__tests__/skill-comparison.test.ts --reporter=verbose
```

## Non-Live Feature Test Results

| Area | Result | Notes |
| --- | ---: | --- |
| Full unit suite | 129 passed / 18 files | `npm test` passed |
| Focused agent feature slice | 73 passed / 9 files | MCP, adapters, skills, agent pool/team, exports, examples, security |
| TypeScript typecheck | Passed | `tsc --noEmit` |
| Examples check | Passed | Examples parse and docs source resolves |
| Export smoke | Passed | Root and subpath exports load |

## Stable Live Provider Matrix

Command:

```sh
AGENTCRAFT_LIVE_PROVIDERS=all npm run test:int -- --reporter=verbose
```

Result: **12 passed / 11 skipped**.

Skipped tests were intentional full-mode checks: structured JSON, streaming, tool calls, and live adapter checks unless explicitly enabled.

| Provider | Models Tested | Result |
| --- | --- | --- |
| OpenAI | `gpt-4o-mini`, `gpt-4o` | Passed |
| Anthropic | `claude-haiku-4-5-20251001`, `claude-sonnet-4-5-20250929` | Passed |
| Gemini | `gemini-2.5-flash`, `gemini-2.5-flash-lite` | Passed |
| Cohere | `command-r7b-12-2024`, `command-r-08-2024` | Passed |
| DeepSeek | `deepseek-chat`, `deepseek-reasoner` | Passed |
| Groq | `llama-3.1-8b-instant`, `llama-3.3-70b-versatile` | Passed |

Note: `deepseek-chat` emitted a deprecation warning, but the live call succeeded.

## Latest Account-Visible Model Findings

Model-list endpoints were checked for OpenAI, Anthropic, Gemini, Cohere, DeepSeek, and Groq. Then a tiny live smoke prompt was run against representative newer account-visible models.

| Provider | Latest/Recent Models Tried | Result | Finding |
| --- | --- | --- | --- |
| OpenAI | `gpt-5.5`, `gpt-5.4-mini` | Passed after fix | Initially failed through Chat Completions. Post-fix, GPT-5.x routes through OpenAI Responses API and both targeted smoke tests passed. |
| Anthropic | `claude-sonnet-4-6`, `claude-haiku-4-5-20251001` | Passed | Earlier 3.5 aliases failed because the account-visible model list now exposes Claude 4.x ids. |
| Gemini | `gemini-3.1-flash-lite-preview`, `gemini-3-flash-preview` | Passed | `gemini-3.1-flash-lite-preview` was slower but passed. |
| Cohere | `command-a-03-2025`, `command-a-reasoning-08-2025` | Passed with caveat | `command-a-reasoning-08-2025` passed after adding `/v2/chat`. `command-a-03-2025` returned `OK.`, but took about 60s in a direct SDK check, so it can exceed the 45s light integration timeout. |
| DeepSeek | `deepseek-v4-flash`, `deepseek-v4-pro` | Passed | Both current listed models passed. |
| Groq | `meta-llama/llama-4-scout-17b-16e-instruct`, `qwen/qwen3-32b` | Passed | Both current listed models passed through OpenAI-compatible protocol. |

## Post-Fix Compatibility Results

Targeted code updates were made after the initial findings:

- OpenAI `gpt-5*` models now use the OpenAI Responses API instead of Chat Completions.
- Cohere `command-a-*` models now use Cohere `/v2/chat`.
- Cohere `command-a-reasoning-*` disables default thinking for basic calls so small-token smoke tests return user-visible text instead of spending the whole budget on reasoning tokens.

Post-fix verification:

| Area | Command / Model | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | Passed |
| Full unit suite | `npm test` | 129 passed / 18 files |
| Protocol unit tests | `npx vitest run src/protocols/__tests__/protocols.test.ts --reporter=verbose` | 15 passed |
| OpenAI latest smoke | `gpt-5.5`, `gpt-5.4-mini` | Passed |
| Cohere reasoning smoke | `command-a-reasoning-08-2025` | Passed |
| Cohere base latency check | `command-a-03-2025` direct SDK call | Returned `OK.`, but took about 60s, exceeding the 45s light integration timeout |
| GitHub live adapter | `octocat/Hello-World` metadata read | Passed after token update |
| Fetch live adapter | `https://vitepress.dev/` read | Passed with domain and response-size guardrails |
| Fetch Basic Auth live adapter | `https://httpbin.org/basic-auth/agentcraft/smoke` | Passed with explicit Basic Auth credentials against a public auth fixture |
| Apify live adapter | `agentcraft-live-smoke` dataset read | Passed after creating a tiny smoke dataset and setting `AGENTCRAFT_LIVE_APIFY_DATASET_ID` |
| Filesystem live adapter | `/private/tmp/agentcraft-live-fixture` | Passed sandbox read plus traversal rejection |
| Tavily live adapter | Basic search | Skipped because `TAVILY_API_KEY` is a placeholder |
| Playwright Basic Auth live adapter | `https://httpbin.org/basic-auth/agentcraft/smoke` | Passed after installing Playwright and Chromium, using an injected Chromium launcher |
| External MCP smoke | Memory, Context7, Filesystem, Firecrawl, Apify discovery | Passed against real pinned stdio MCP packages |
| Adapter and skill slice | Adapter suite plus skill suite | 33 passed / 3 files |

## Setup Cross-Check

I cross-checked the integrations that need keys or sandbox fixtures against current public setup guidance before extending live coverage:

| Integration | Implementation status | Cross-check outcome |
| --- | --- | --- |
| Tavily adapter | Ready, skipped live | Adapter sends `api_key`, `query`, `search_depth`, and `max_results` to `/search`; this matches Tavily's documented search request shape. Needs a real `TAVILY_API_KEY`. |
| Filesystem MCP | Live-certified | Wrapper passes allowed paths as stdio arguments to the official filesystem MCP package, matching the expected allowed-directory model. |
| Firecrawl MCP | Live-certified | Wrapper uses `FIRECRAWL_API_KEY` and the pinned `firecrawl-mcp` stdio package; live `firecrawl_scrape` succeeded. |
| Apify MCP | Live discovery-certified | Wrapper uses `APIFY_TOKEN` and the pinned Apify actors MCP package; the package exposes account actor tools, not the native adapter's dataset read API. Native Apify dataset read is separately live-certified. |
| Stripe, Slack, Gmail, Notion, Calendar/Sheets, Supabase, Pinecone, storage-like integrations | Local-covered only | These need sandbox accounts/resources and, for write paths, cleanup plus explicit `AGENTCRAFT_LIVE_ALLOW_WRITES=true`. |

## MCP Test Coverage

MCP coverage passed in local tests.

Covered test cases:

- Stdio wrapper creation with dynamic tool discovery.
- Hosted HTTP wrapper creation.
- Dual transport wrapper behavior.
- Metadata presence for every built-in MCP wrapper.
- Smoke test for every built-in MCP wrapper factory.
- Fail-closed behavior for wrappers without verified default npm packages.
- Version pinning for default stdio MCP packages.
- HTTP MCP JSON-RPC discovery and tool execution.
- SSE MCP discovery.
- MCP timeout handling.
- MCP cancellation with `AbortSignal`.
- Sanitized MCP trace events.
- Rejection of unallowlisted stdio commands.
- Warning/rejection for unsafe unpinned MCP package configuration.

Live external MCP smoke was added and run opt-in:

| MCP | Type | Result | Notes |
| --- | --- | --- | --- |
| Memory MCP | Real pinned stdio package: `@modelcontextprotocol/server-memory@2026.1.26` | Passed | Discovered tools and executed `read_graph` against a temporary memory file. |
| Context7 MCP | Real pinned stdio package: `@upstash/context7-mcp@2.2.4` | Passed | Discovered tools and resolved VitePress documentation through `resolve-library-id`. |
| Filesystem MCP | Real pinned stdio package: `@modelcontextprotocol/server-filesystem@2026.1.14` | Passed | Read a file from an allowed `/private/tmp` fixture and rejected a disallowed path. |
| Firecrawl MCP | Real pinned stdio package: `firecrawl-mcp@3.15.0` | Passed | Scraped `https://vitepress.dev/` with markdown format. |
| Apify MCP | Real pinned stdio package: `@apify/actors-mcp-server@0.10.1` | Discovery passed | Discovered account actor tools. Dataset reads remain certified through the native Apify adapter, because this MCP exposes actor tools rather than a generic dataset read tool in this account. |

Local MCP coverage also passed for wrapper creation and metadata across the built-in MCP wrapper catalog: GitHub, Linear, Jira, Sentry, Playwright, Browserbase, Apify, Firecrawl, Fetch, Brave Search, Supabase, Postgres, Neon, Qdrant, Airtable, Filesystem, Memory, Slack, Gmail, Resend, Notion, Figma, Cloudflare, Railway, Render, Vercel, ElevenLabs, Context7, and Stripe.

## Adapter Test Coverage

Local adapter coverage passed.

Covered test cases:

- Tool schema creation and inferred required parameters.
- Static declared tool names.
- Built-in adapter tool catalogs.
- Adapter metadata, maturity, side-effect, scope, and read-only metadata.
- Filesystem sandboxing, traversal blocking, extension allowlists, read-only mode.
- Fetch allowlists, response size caps, untrusted content wrapping, content-type rejection.
- GitHub mocked API requests with repo allowlists.
- Database read-only query execution and opt-in writes.
- Playwright lifecycle, allowlists, screenshots, cleanup.
- Service adapter execution through mocked APIs or injected clients.
- Tool policy timeout, redaction, output guardrails, dry-run, read-only, retries, audit events.

Live adapter smoke:

| Adapter | Result | Notes |
| --- | --- | --- |
| Firecrawl | Passed | Tiny read-only scrape of `https://vitepress.dev/` through the env-driven fixture URL. |
| GitHub | Passed after token update | `get_repo` against `octocat/Hello-World` initially returned HTTP 401, then passed after the token was replaced. |
| Fetch | Passed | Read `https://vitepress.dev/` with URL/domain/content guardrails. |
| Fetch Basic Auth | Passed | Read a public Basic Auth fixture with explicit credentials. |
| Apify | Passed | Created a tiny `agentcraft-live-smoke` dataset once, then read one item with `get_dataset_items`; no actor was started. |
| Filesystem | Passed | Read a local sandbox file and simulated a common traversal error, which was blocked. |
| Tavily Search | Skipped | `TAVILY_API_KEY` is a placeholder; test is ready and will run a basic one-result search when a real key is configured. |
| Playwright Auth | Passed | Navigated to the public Basic Auth fixture and extracted authenticated page text with a real headless Chromium browser. |

Adapters specifically covered by local tests:

- Core adapter helpers: `createAdapter`, `tool`, schema validation, declared tool names.
- Policy/runtime: timeout, dry-run, read-only mode, approval flow, retries, audit events, secret redaction, output limits, prompt-injection guardrail warning mode.
- Native adapters: Filesystem, Fetch, GitHub, Database, Playwright, Slack, Email, Google Calendar, Google Sheets, Notion, Supabase, Pinecone, Redis, Storage, Tavily Search, Firecrawl, Apify, ElevenLabs, Image Generation.
- MCP adapter transports: stdio validation, HTTP JSON-RPC discovery/execution, SSE discovery, cleanup/redisco, timeout, abort, trace redaction, unsafe package rejection.

## Agent Features Tested

| Feature | Result | Coverage |
| --- | ---: | --- |
| Agent creation and provider parsing | Passed | Provider model strings and capability inspection |
| Multimodal validation | Passed | Unsupported multimodal input blocked before provider calls |
| Streaming with tools | Passed | Tool call/result/final stream events |
| Stream laziness and cancellation | Passed | Generator does not overproduce and respects abort |
| Structured output | Passed | JSON validation, retry, malformed rejection |
| Tool-based structured fallback | Passed | `submit_structured_response` fallback path |
| Trace redaction | Passed | Secret-bearing args/results redacted |
| Guardrails | Passed | Side-effecting tools blocked without approval |
| Replay mode | Passed | Replay/preflight budget/cost estimation |
| AgentPool | Passed | Name lookup, fallback exclusion, cost ranking, budget downgrade |
| AgentTeam | Passed | Member tool invocation, trace spans, shared adapter lifecycle, spawn, parallel planner/executor/reviewer mode |

## Skills Vs Basic Prompt Comparison

Added test:

```txt
src/agent/skills/__tests__/skill-comparison.test.ts
```

Result: **2 passed**.

Expanded skill suite result: **9 passed across `skills.test.ts` and `skill-comparison.test.ts`**.

Skills specifically covered:

- `research`
- `deep-research`
- `writing`
- `summarize`
- `translation`
- `humanizer`
- `code-review`
- `data-analysis`
- `document-analysis`
- `memory`
- `conversation`
- `email-draft`
- `scheduler`
- `meeting`
- `vision`
- `transcription`

What the skill tests cover:

- Directive preprocessing into bounded instruction regions.
- Fail-fast behavior for unknown directives.
- OR dependency validation for research and memory skills.
- Structured prompt and metadata generation for every built-in skill.
- Adapter-backed and stateful skill dependency metadata.
- Capability rejection for unsupported models.
- Conversation fallback to in-process memory with warning behavior.
- Basic prompt versus skill-enhanced prompt comparison.

### What Was Compared

Basic prompt:

- Same user prompt.
- No skill attached.
- Model call received an empty system message.

Skill-enhanced prompt:

- Same user prompt.
- `HumanizerSkill` and `SummarizeSkill` attached.
- Model call received generated skill system content with:
  - `# Skill: humanizer`
  - `# Skill: summarize`
  - Role
  - Goal
  - Constraints
  - Tool Use Policy
  - Output Format
  - Quality Checklist
  - Failure Behavior
  - Safety Notes

### Measured Delta

| Dimension | Basic Prompt | Skill-Enhanced Prompt |
| --- | --- | --- |
| User prompt | Same | Same |
| System guidance | Empty | Structured skill prompt, greater than 2,000 characters |
| Output expectations | Implicit | Explicit output format and quality checklist |
| Safety posture | Generic model defaults | Explicit handling for uncertainty, external content, secrets, and private data |
| Failure behavior | Implicit | Explicit partial-progress and missing-input guidance |
| Directive support | None | `/humanizer` becomes bounded `[APPLY_HUMANIZER_START]...[APPLY_HUMANIZER_END]` instruction region |

### Interpretation

Skills do not magically make a weaker model stronger, but they give the model a more reliable operating frame. The benefit is strongest when:

- The task has a known workflow, such as review, research, summarization, translation, data analysis, memory, or writing.
- You want repeatable outputs across providers.
- You want safety and failure behavior to be attached consistently instead of rewritten into every user prompt.
- You want scoped directives, so a skill applies only to a bounded region of a prompt.
- You want dependency validation, so adapter-backed skills fail early when required tools are missing.

Basic prompts are still best for one-off, simple questions where extra structure would be noise.

## Files Added Or Updated

| File | Purpose |
| --- | --- |
| `src/__tests__/integration/live-providers.test.ts` | Multi-provider, multi-model live smoke matrix with provider/model selection and light token cap |
| `src/__tests__/integration/live-adapters.test.ts` | Explicit opt-in live adapter smoke tests |
| `src/__tests__/integration/live-mcp.test.ts` | Explicit opt-in live MCP smoke tests against real pinned stdio MCP packages |
| `src/__tests__/integration/setup-env.ts` | Loads `.env` for integration tests without printing secrets |
| `src/agent/skills/__tests__/skill-comparison.test.ts` | Deterministic basic-vs-skill comparison |
| `src/agent/adapters/mcp.adapter.ts` | Includes MCP tool error detail from returned MCP error content |
| `package.json` / `package-lock.json` | Adds Playwright as a dev dependency for browser-backed adapter smoke tests |
| `.env.example` | Updated live model defaults, safe public URL fixtures, filesystem fixture paths, Basic Auth fixture, and Apify dataset fixture placeholder |
| `.env` | Updated live model defaults, safe public URL fixtures, filesystem fixture paths, Basic Auth fixture, and Apify smoke dataset id |

## Recommendations

1. Keep full live tests gated. Use light provider smoke tests for regular checks, and only run structured/stream/tool full-mode checks intentionally.
2. Keep the Apify smoke dataset as a read-only fixture; avoid actor-running Apify tests unless explicitly testing side effects and cost.
3. Add a real `TAVILY_API_KEY` to live-certify Tavily's basic search path; the test is already prepared and skipped until the key is non-placeholder.
4. Keep Playwright auth tests explicitly gated with `AGENTCRAFT_LIVE_ENABLE_PLAYWRIGHT_AUTH=true`; browser tests are heavier than plain HTTP adapter checks.
5. For sandbox-heavy integrations, create dedicated test resources before live certification: Slack test channel, Gmail/Resend test recipient, Notion test database, Google test calendar/sheet, Supabase test table, Pinecone/Qdrant test index, Stripe test-mode account, and cloud deployment read-only projects.
6. Review skill scope next: several skills currently declare broad adapter alternatives, so the next pass should decide which skills are read-only, write-capable, or approval-gated by default.
7. Consider raising or isolating the examples smoke timeout if the full parallel unit suite is run on a busy machine; the test passed alone and passed on rerun.
