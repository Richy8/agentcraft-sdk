# AgentCraft Production Readiness Audit

Date: 2026-05-12  
Latest audit pass: 2026-05-12, after cache hardening, full release gate, and live skills certification  
Audit status: release-candidate ready for guarded public package exposure  
Recommended release posture: public 0.1.x release candidate with documented maturity limits, sandboxed write-tool guidance, and dated live-certification boundaries

## Executive Verdict

AgentCraft is now materially stronger than the previous audit. The package builds, exports cleanly, passes the full local release gate, has a meaningful unit test suite, includes a large creator skills surface, supports adapters/MCP wrappers, has CI release-gate coverage, and now passes light live skills certification across OpenAI, Anthropic, Gemini, Cohere, DeepSeek, and Groq.

The major runtime and release-gate blockers from the previous audit have been remediated: smart skill activation no longer activates every attached creator skill, run-scoped `.use` is available, actual tool executions are budgeted by `maxToolCalls`, the formatter gate is operational, docs/examples are typechecked against public APIs, TypeDoc warnings are cleared, CI is present, and MCP external tools now fail safer by default. The cache system has also moved from a basic file cache to a production-grade safe-tool-result cache with deterministic keys, namespace/version isolation, atomic writes, size limits, explicit stale/corrupt/oversize statuses, invalidation helpers, in-flight de-duplication, and observability for avoided tool calls.

The system is credible for guarded public package exposure as a 0.1.x release candidate. The skills layer has moved from static/local confidence to light multi-provider live certification, including a live safe-read tool/cache replay. It should still avoid claims that every adapter, MCP, write workflow, and untrusted external skill path is fully production-certified until the full adapter/MCP/write-capable certification matrix and marketplace-grade trust controls are complete.

The most important blockers are:

- [x] `skillActivation: "auto"` over-activation was fixed after this audit.
- [x] `budget.maxToolCalls` now wraps actual tool execution after this audit.
- [x] `npm run format:check` now passes after adding `prettier` and formatting docs/examples.
- [x] The invalid docs snippets found for `AgentCache.file({ root })` were corrected after this audit.
- [x] Docs/examples are typechecked against public package API snippets.
- [x] CI workflow exists to enforce the release gate on PRs and pushes to `main`.
- [ ] Live certification is still partial across the full MCP/adapter/write-capable ecosystem.
- [x] Dependency audit is CI-enforced and currently clean for moderate-or-higher advisories.
- [x] TypeDoc internal creator schema warnings were resolved by exporting the referenced schema symbols.
- [x] Cache hardening is complete for single-process safe-tool-result caching.
- [x] `npm run release:check` passed end-to-end after cache hardening.
- [x] `npm run test:int:skills:full` passed after pinning Gemini to `gemini-2.5-flash-lite`.
- [x] Live skills certification report exists at `reports/agentcraft-live-skills-certification.md`.

## Audit Method

- [x] Reviewed the project map and repo rules in `AGENTS.md`.
- [x] Reviewed package exports, scripts, docs commands, integration-test commands, and public subpath exports.
- [x] Reviewed core runtime files under `src/agent`.
- [x] Reviewed skills, creator packs, skill loaders, manifests, artifact/citation/link helpers, and creator workflow tests.
- [x] Reviewed adapters, tool policy, guardrails, cache, MCP registry/wrappers, and provider protocols.
- [x] Reviewed docs and examples enough to detect public API drift and snippet quality risks.
- [x] Ran the local QA suite.
- [x] Ran a light live OpenAI provider smoke test.
- [x] Ran live creator/cache integration smoke tests.
- [x] Re-scanned the codebase after tests for TODOs, skips, placeholder language, API drift, and stale docs patterns.
- [x] Added and ran public example/docs snippet typechecking.
- [x] Added and ran CI dependency-audit allowlist validation.
- [x] Ran local skills certification with `npm run test:skills`.
- [x] Ran light live multi-provider skills certification with real provider calls.

## QA Results

| Check                                  | Result    | Notes                                                                                                                      |
| -------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------- |
| `npm run release:check`                | Passed    | Full local release gate passed after cache hardening.                                                                      |
| `npm test`                             | Passed    | 30 test files, 194 tests passed.                                                                                           |
| `npm run typecheck`                    | Passed    | Strict TypeScript passed.                                                                                                  |
| `npm run build`                        | Passed    | Dist generated successfully.                                                                                               |
| `npm run exports:smoke`                | Passed    | Public exports load after build.                                                                                           |
| `npm run examples:check`               | Passed    | Examples transpile and import whitelist passes.                                                                            |
| `npm run examples:typecheck`           | Passed    | Runnable examples and copyable docs snippets typecheck against public package paths.                                       |
| `npm run docs:build`                   | Passed    | VitePress built successfully in 92.63s after the final docs edit; TypeDoc emitted 0 warnings.                              |
| `npm run package:size`                 | Passed    | Dist size reported as `1277723 bytes`.                                                                                     |
| `npm run format:check`                 | Passed    | `prettier` added and docs/examples formatted.                                                                              |
| `npm run audit:ci`                     | Passed    | Dependency audit passed with no moderate-or-higher advisories.                                                             |
| Focused cache suite                    | Passed    | 6 cache tests passed for TTL, namespace/version isolation, corruption, oversize, safe replay, de-dupe, and bypass.         |
| Focused adapter/MCP/skill safety suite | Passed    | 3 files, 41 tests; covers MCP confirmations, wrapper allowlists/roots, package pinning, and external skill checksums.      |
| `npm run test:skills`                  | Passed    | 5 files, 27 tests; covers all creator skills, prompt budgets, adversarial prompt contracts, and pack composition.          |
| `npm run test:int:skills:full`         | Passed    | 7 live tests across OpenAI, Anthropic, Gemini, Cohere, DeepSeek, Groq, plus OpenAI safe-read tool/cache replay.            |
| Live OpenAI provider smoke             | Passed    | `gpt-4o-mini`, very low token cap, 1 provider test passed, 18 skipped.                                                     |
| Live creator/cache smoke               | Passed    | 2 tests passed after activation alias and blog-plan prompt refinement.                                                     |
| Live skills certification report       | Generated | `reports/agentcraft-live-skills-certification.md`; final run used `gemini-2.5-flash-lite` after `gemini-2.5-flash` outage. |
| Raw `npm audit --audit-level=moderate` | Passed    | No moderate-or-higher advisories reported during this pass.                                                                |

## Readiness Score

Overall guarded public release-candidate readiness: 97 / 100

- Core runtime: 96 / 100
- Public API/export hygiene: 96 / 100
- Provider support: 90 / 100
- Adapter/MCP safety: 95 / 100
- Creator skills and packs: 96 / 100
- Cache system: 96 / 100
- Docs/examples: 95 / 100
- CI/release governance: 96 / 100
- Live certification depth: 86 / 100

Score interpretation:

- [x] The package is at `97 / 100` for guarded release-candidate readiness because the local runtime, public API, docs, CI gates, cache system, skills layer, and adapter/MCP safety controls now pass the release bar.
- [x] The cache system now clears the `95+` target for the current supported scope: deterministic, single-process, safe-tool-result caching.
- [x] The skills layer now clears the `95+` target for local certification and light multi-provider live certification.
- [x] Adapter/MCP safety now clears the `95+` target for local certification and guarded release-candidate use.
- [ ] Full ecosystem certification is not yet `95+` because the full live adapter, MCP, write-capable, and external-skill marketplace matrix has not been re-run in every sandbox service.
- [ ] Do not collapse guarded release readiness and full ecosystem certification into the same marketing claim.

## Critical Findings

### Skill Auto-Activation Over-Selects Skills

Severity: high, remediated after audit  
Area: core agent runtime, creator skills, packs

Previous issue: `selectActiveSkills` included each skill manifest's own name and description in the searchable haystack. Because each skill's activation terms also included its own name/directive-derived terms, auto activation could match every attached creator skill.

Impact:

- [x] A prompt can no longer activate every creator skill merely because the skill is attached.
- [x] Creator packs now benefit from prompt-scoped activation terms and domain aliases.
- [x] Run-scoped `use` lets expensive skills/adapters attach only for the prompt that needs them.

Remediation completed:

- [x] Match activation terms against the user prompt and explicit task context, not against the skill's own manifest text.
- [x] Add unit tests proving that a blog prompt activates blog-relevant skills without activating unrelated skills.
- [x] Add creator domain aliases so natural prompts like "Medium article plan" activate `blog-writer`.
- [x] Add tests for per-run scoped skills.
- [x] Re-run focused and full unit tests.
- [x] Re-run live creator/cache smoke successfully.

### Tool Call Budget Is Not an Actual Tool Execution Budget

Severity: high, remediated after audit  
Area: agent runtime, safety, cost control

Previous issue: `budget.maxToolCalls` checked the number of exposed tools before execution. It did not count actual tool calls made during provider execution.

Impact:

- [x] Users can now expose multiple tools while capping actual executions.
- [x] Tool execution now fails closed once the run budget is reached.
- [x] `selection.executedToolCalls` reports actual executed calls for observability.

Remediation completed:

- [x] Removed exposed-tool-count enforcement from `maxToolCalls`.
- [x] Added a real executed-tool-call counter around tool invocation.
- [x] Fail closed when the maximum is reached.
- [x] Added tests proving multiple exposed tools can exist while only actual executions count.

### Formatter Gate Was Broken

Severity: high, remediated after audit  
Area: release governance

Previous issue: `npm run format:check` failed because `prettier` was not installed in the project dependencies.

Impact:

- [x] The documented QA command is now usable.
- [x] Docs/examples formatting can now be enforced locally.
- [ ] CI still needs to include the format gate.

Remediation completed:

- [x] Add `prettier` to `devDependencies`.
- [x] Re-run `npm install`.
- [x] Re-run `npm run format:check`.
- [ ] Add the command to CI.

### Docs Cache Setup Snippets Drifted

Severity: high, remediated after audit  
Area: docs, user onboarding, public API trust

Previous issue: several docs snippets used:

```ts
AgentCache.file({ root: ".agentcraft/cache" });
```

The actual public API is:

```ts
AgentCache.file(".agentcraft/cache");
```

Affected docs discovered during the earlier audit:

- [x] `docs/persistence/agent-cache.md`
- [x] `docs/examples-cookbook/creator.md`
- [x] `docs/configuration/cache-config.md`
- [x] `docs/configuration/overview.md`
- [x] `docs/examples-cookbook/production.md`

Remediation completed:

- [x] Correct every cache snippet found by the audit search.
- [ ] Add docs snippet typechecking so this class of drift cannot recur.
- [ ] Prefer a small compile fixture that imports only public package paths.

### Public Example Checks Do Not Typecheck Against the Package API

Severity: high, remediated after audit  
Area: docs/examples, release confidence

Previous issue: `npm run examples:check` transpiled examples and checked import allowlists, but it did not fully typecheck snippets against the built public declarations.

Impact:

- [x] Runnable examples now typecheck against built public declarations.
- [x] Copyable TypeScript docs snippets that import from public `agentcraft` paths now typecheck.
- [x] Stale public API patterns are blocked, including `new Agent(...)`, `toolPolicy.maxCalls`, `maxCostUsd`, stale `json_schema` examples, and `AgentCache.file({ root })`.

Remediation completed:

- [x] Add `examples:typecheck`.
- [x] Include docs snippet extraction for copyable TypeScript blocks.
- [x] Run against the same public import paths users use: `agentcraft`, `agentcraft/adapters`, `agentcraft/skills`, `agentcraft/mcp`, `agentcraft/packs`, and `agentcraft/team`.
- [x] Add `examples:typecheck` to CI.

## Section-by-Section Audit

## Core Agent Runtime

Files reviewed:

- [x] `src/agent/agent.ts`
- [x] `src/agent/config.ts`
- [x] `src/agent/types.ts`
- [x] `src/agent/tool-result.ts`
- [x] `src/agent/structured-output.ts`
- [x] `src/agent/guardrails.ts`

What is strong:

- [x] `Agent.create` is the intended public setup path.
- [x] `agent.run({ use: [...] })` supports run-scoped skills, adapters, and packs for cost-sensitive prompts.
- [x] `skillActivation: "auto"` now uses prompt/directive/alias matching instead of self-matching skill manifests.
- [x] Tool execution has policy hooks, timeout handling, retry handling, redaction, and max result byte controls.
- [x] `budget.maxToolCalls` now limits actual tool executions.
- [x] Structured output support exists.
- [x] Guardrail utilities exist for prompt-injection, unsafe URL, PII, secrets, and destructive action patterns.
- [x] Tool result metadata distinguishes cache hits, approval requirements, retries, timeout, and redaction.

Gaps:

- [x] Auto skill activation correction was implemented after this audit.
- [x] Tool execution budget now has real executed-call accounting.
- [ ] Regex-based guardrails are useful defaults but should not be described as comprehensive security.
- [ ] Runtime JavaScript users can still technically call class constructors even if TypeScript marks them private. Docs should keep pushing factory usage, and runtime guards may be worth adding before public launch.

Production recommendation:

- [x] Treat the runtime as beta-ready after fixing auto activation and true tool-call budgeting.
- [ ] Add more adversarial activation tests for ambiguous multi-intent prompts before public launch.

## Provider Protocols

Files reviewed:

- [x] `src/protocols/openai-compat.protocol.ts`
- [x] `src/protocols/cohere.protocol.ts`
- [x] `src/protocols/types.ts`
- [x] `src/provider-registry/registry.ts`
- [x] `src/model-registry/catalog.ts`

What is strong:

- [x] OpenAI GPT-5-style routing through Responses API is implemented.
- [x] Cohere newer reasoning/chat models have a v2 chat path.
- [x] Provider registry and model registry are cleanly separated.
- [x] Live smoke coverage passed for OpenAI with `gpt-4o-mini`.
- [x] Prior live report shows broader provider coverage was performed.

Gaps:

- [ ] This audit did not re-run the full live provider matrix to avoid token/key burn.
- [ ] Model catalog freshness is manual.
- [ ] Pricing/capability metadata should be periodically verified before public docs claim latest model support.

Production recommendation:

- [ ] Add scheduled/manual release certification for provider matrix.
- [ ] Keep "latest model" claims tied to dated certification reports.

## Adapters

Files reviewed:

- [x] `src/agent/adapters/index.ts`
- [x] `src/agent/adapters/tool-policy.ts`
- [x] `src/agent/adapters/fetch.adapter.ts`
- [x] `src/agent/adapters/filesystem.adapter.ts`
- [x] `src/agent/adapters/mcp.adapter.ts`
- [x] Adapter unit and integration-adjacent tests.

What is strong:

- [x] Adapter capabilities use side-effect metadata.
- [x] Read/write boundaries are represented.
- [x] Tool policy can require approval and block side effects.
- [x] Filesystem and fetch adapters have meaningful safety controls.
- [x] Prior reports show live coverage for Fetch, Basic Auth, GitHub, Firecrawl, Apify, Filesystem, and Playwright.
- [x] Generic MCP adapter enforces allowed tools, allowed resources, roots, command allowlists, and version-pinned stdio packages.
- [x] External/write MCP tools require confirmation by default unless metadata proves read-only/no-side-effect behavior.
- [x] Write-capable workflows are covered locally through filesystem, database, GitHub, storage, email, publishing, and MCP policy tests.

Gaps:

- [ ] Some write-capable integrations remain locally tested and policy-certified, but not all have fresh sandbox-account live certification in this pass.
- [x] Public docs should be very explicit that write adapters require approval metadata and safe sandbox setup.
- [ ] Adapter-specific error simulation should be expanded for auth failure, timeout, rate limit, malformed response, and permission denied.

Production recommendation:

- [x] Keep write-capable adapters behind explicit opt-in until sandbox certification exists for each one.

## MCP Layer

Files reviewed:

- [x] `src/agent/mcp-servers/index.ts`
- [x] `src/agent/mcp-servers/shared.ts`
- [x] `src/agent/mcp-servers/registry.ts`
- [x] `src/agent/adapters/mcp.adapter.ts`
- [x] `src/agent/__tests__/mcp-servers.test.ts`

What is strong:

- [x] Built-in MCP wrappers have a central registry.
- [x] Several MCP package specs are pinned.
- [x] Some wrappers fail closed when a package is not pinned.
- [x] Generic MCP configuration supports tool/resource/root constraints.
- [x] MCP adapter converts remote MCP tools into AgentCraft tool definitions.
- [x] External MCP tools require confirmation by default unless metadata proves they are read-only or side-effect-free.
- [x] Friendly wrappers for high-risk/common MCPs now expose `allowedTools`, `allowedResources`, and `roots` through `McpWrapperSecurityOptions`.
- [x] Wrapper-level allowlists are covered for hosted HTTP MCP and stdio MCP factories.
- [x] Filesystem MCP roots default to configured allowed paths and reject traversal roots.

Gaps:

- [x] Wrapper-level allowlists are now first-class for key friendly wrapper APIs and still available universally through `MCPAdapter.connect`.
- [x] Generic MCP tools now default to confirmation-required for external/write side effects.
- [ ] External MCP testing is still partial and dependent on available tokens/sandbox services.
- [ ] Public docs should strongly distinguish "discoverable MCP" from "certified safe MCP".

Production recommendation:

- [x] Add default conservative approval behavior for external MCP tools.
- [x] Add wrapper-level allowlists to the friendly MCP wrapper APIs.
- [ ] Certify MCPs in tiers: local-safe, read-only external, write-capable external.

## Skills And Creator Packs

Files reviewed:

- [x] `src/agent/skills/index.ts`
- [x] `src/agent/skills/loaders.ts`
- [x] `src/agent/skills/creator-skills.ts`
- [x] `src/agent/packs/index.ts`
- [x] `src/agent/creator/types.ts`
- [x] `src/agent/creator/artifacts.ts`
- [x] Creator skill tests and E2E-style workflow tests.

What is strong:

- [x] The creator skill catalog is substantial and coherent.
- [x] Creator packs give users ergonomic entry points.
- [x] Skills remain directly importable/configurable.
- [x] External GitHub skill loading supports pinned refs and trust gates.
- [x] Creator workflow tests exercise multi-skill, pack, artifact, citation, review, publishing, and external loading flows.
- [x] Live creator/cache smoke tests passed.
- [x] Blog skill planning prompt was refined after live smoke caught a quality-signal weakness under a low token cap.
- [x] Generic creator skill prompt templates were replaced with explicit production prompts for book, newsletter, social, video ideation, creative direction, copy review, claim-risk review, brand voice, publish QA, content calendar, performance analysis, and experiment planning.
- [x] Local golden-task certification now covers 56 representative creator tasks across all 28 creator skills.
- [x] Prompt-size budgets and adversarial prompt-contract tests are enforced through `npm run test:skills`.
- [x] Light live skills certification passed across OpenAI, Anthropic, Gemini, Cohere, DeepSeek, and Groq.
- [x] Live OpenAI tool/cache certification proved safe-read tool replay: first run executed the tool, second run hit cache and avoided the real tool call.

Gaps:

- [x] Auto activation bug was fixed after this audit.
- [x] Live output quality tests now exist for the skills layer, with rubric scoring and generated report evidence.
- [ ] External skill loading lacks checksum/signature verification.
- [ ] External skill loading lacks a recommended organization/repo allowlist policy.
- [x] Skill evaluation includes a local golden task suite and reviewer-style rubric dimensions.
- [ ] Live skill certification is still a light representative certification, not an exhaustive topic/provider/channel benchmark.

Production recommendation:

- [x] Position creator packs as guarded public release-candidate ready for reviewed workflows.
- [x] Avoid claiming broad autonomous creator quality beyond the tested certification tier.
- [x] Add a skills certification matrix through `reports/agentcraft-skills-production-audit.md` and `reports/agentcraft-live-skills-certification.md`.

## Agent Cache

Files reviewed:

- [x] `src/agent/cache.ts`
- [x] `src/agent/__tests__/cache.test.ts`
- [x] Live creator/cache integration test report.

What is strong:

- [x] File-backed cache exists.
- [x] Cache keys include adapter/tool/input dimensions.
- [x] Safe read-like tool results can be cached.
- [x] Live cache smoke verified a hit after first execution.
- [x] Cache can reduce repeated safe tool calls.
- [x] Cache keys are deterministic through stable object-key serialization.
- [x] Cache scopes are isolated by `namespace` and `version`, which gives SaaS tenants, projects, and skill/prompt revisions clean invalidation boundaries.
- [x] File writes are atomic through temp-file write plus rename.
- [x] Cache entries can enforce `maxEntryBytes` to avoid replaying oversized payloads.
- [x] `getEntry` reports `hit`, `miss`, `stale`, `corrupt`, and `oversize` statuses instead of flattening every non-hit into a silent miss.
- [x] Expired entries are deleted on read and can be cleaned through `pruneExpired`.
- [x] `delete`, `clear`, and `pruneExpired` are available for explicit invalidation.
- [x] Concurrent identical safe-tool cache misses are de-duplicated inside an agent instance.
- [x] Tool-result cache metadata now reports stale/corrupt/oversized events and `toolCallsAvoided`.
- [x] Run-level cache bypass is supported for prompts that must force fresh reads.
- [x] Cache docs now describe the feature honestly as safe-tool-result caching and document namespace/version/TTL/size controls.
- [x] Focused unit coverage verifies TTL behavior, namespace/version isolation, invalidation, corrupt entries, oversize entries, safe read-only replay, write-tool non-replay, in-flight de-duplication, and per-run bypass.

Gaps:

- [ ] Cache currently covers safe tool results, not all provider/model prompt calls.
- [ ] Cache is not a distributed cache.
- [ ] Cross-process file locking is not implemented; use one process per cache namespace/root or a future distributed cache backend for multi-process workloads.
- [ ] Encryption-at-rest is not built in; deployers should place the cache under an encrypted filesystem or add a custom encrypted cache controller.
- [ ] External side-effect tools are conservatively not cached, which is safe but limits savings.
- [x] Invalid `AgentCache.file({ root })` snippets found by the audit search were corrected after this audit.

Production recommendation:

- [x] Document cache honestly as tool-result caching.
- [ ] Add optional provider prompt-cache integration separately.
- [x] Document single-process expectations and namespace/version isolation.
- [x] Add tenant-aware cache examples for SaaS users.
- [ ] Add a custom cache-controller example for Redis/Postgres/S3-compatible distributed deployments.
- [ ] Add cache benchmark reporting for avoided calls, latency, and cost deltas.

## Security

Files reviewed:

- [x] `src/agent/guardrails.ts`
- [x] `src/agent/adapters/tool-policy.ts`
- [x] `src/security/__tests__/security-regression.test.ts`
- [x] Adapter and MCP side-effect metadata.

What is strong:

- [x] Side-effecting tools can require approval.
- [x] Read-only policies can block writes.
- [x] Basic prompt-injection and secret/PII detection exists.
- [x] Filesystem and network adapter safety boundaries exist.
- [x] External skills require pinned refs and trust decisions.
- [x] External skills can now be constrained by `allowedRepos`.
- [x] External local and GitHub skills can now verify `skill.json` and `SKILL.md` SHA-256 checksums before loading.
- [x] Untrusted write-capable external skills remain blocked by default.

Gaps:

- [ ] Guardrails are baseline regex-style checks, not a full security boundary.
- [x] Untrusted MCP and external skills now have stricter default warnings, allowlists, checksums, and confirmation gates for the release-candidate tier.
- [ ] Secret redaction should be tested against more provider/tool result shapes.
- [ ] Public production requires a written threat model.

Production recommendation:

- [ ] Add a formal threat model covering tools, MCP, browser automation, external skills, cache, filesystem, and provider prompts.

## Docs And Examples

Files reviewed:

- [x] `docs/`
- [x] `examples/`
- [x] `scripts/check-examples.mjs`
- [x] `scripts/smoke-exports.mjs`

What is strong:

- [x] Docs structure has improved significantly.
- [x] Feature sections now exist for skills, adapters, MCPs, packs, cache, configuration, and examples.
- [x] Examples pass the current import whitelist/transpile check.
- [x] VitePress build passes.

Gaps:

- [x] Previously invalid cache snippets were corrected.
- [x] Docs snippets that import public package paths are typechecked.
- [x] TypeDoc emits 0 internal schema warnings.
- [ ] Some sections may still read as reference material rather than polished first-run onboarding.
- [ ] Public docs need release-status badges per feature: stable, beta, experimental, live-certified, local-only.

Production recommendation:

- [x] Fix invalid snippets found by stale API scan.
- [x] Add docs snippet typechecking.
- [ ] Add feature maturity labels.
- [ ] Keep docs and examples in the release gate.

## CI And Release Governance

What is strong:

- [x] Package scripts exist for most important local gates.
- [x] Export smoke test exists.
- [x] Package size check exists.
- [x] Integration tests are gated by environment flags.
- [x] GitHub Actions CI now runs the release gate on pull requests and pushes to `main`.
- [x] Dependency audit is enforced by `npm run audit:ci`.

Gaps:

- [x] `.github/workflows/ci.yml` exists.
- [x] Formatter command now passes after remediation.
- [x] Automated release gate enforces typecheck, unit tests, examples, examples typecheck, build, docs, exports, package size, format, and dependency audit.
- [x] Release checklist is documented at `docs/production/release-checklist.md`.

Production recommendation:

- [x] Add CI before public exposure.
- [x] Add a release checklist that references this audit.
- [ ] Add a dated certification report for each public release.

## Dependency Audit

`npm run audit:ci` passed with no moderate-or-higher advisories during this audit pass. This materially improves the release-governance score because the dependency gate is now both automated and clean.

Current dependency tree observed during this audit:

- [x] `vitepress@1.6.4`
- [x] VitePress docs build passes under the current dependency tree.
- [x] `vitest@4.1.5` uses `vite@8.0.11` and `esbuild@0.28.0`, which are outside the reported vulnerable range.

Recommended handling:

- [x] Avoid exposing VitePress dev servers beyond localhost; docs scripts bind to `127.0.0.1`.
- [x] Add `npm run audit:ci` to the release gate.
- [x] Keep dependency audit clean before publishing.
- [ ] Re-check dependency advisories before each public release.

## Production Exposure Decision

### Safe To Use Now

- [x] Internal development.
- [x] Controlled demos.
- [x] Private beta with known users.
- [x] Guarded public 0.1.x package release with documented feature maturity.
- [x] Read-only adapter workflows.
- [x] OpenAI-backed light flows.
- [x] Creator pack experiments with manual review.
- [x] Cache experiments for safe read-like tool results.
- [x] Cost-sensitive prompts using run-scoped `use` plus `budget.maxToolCalls`.

### Not Safe To Claim Yet

- [ ] Fully certified for every provider, adapter, MCP, and write-capable workflow.
- [ ] Fully certified across all adapters and MCPs.
- [ ] Comprehensive token reduction across all agent calls.
- [ ] Fully proven autonomous skill selection across all ambiguous creator prompts.
- [ ] Safe untrusted external skill marketplace.
- [ ] Safe untrusted write-capable MCP ecosystem.
- [ ] Complete docs/API drift prevention.

## Required Launch Checklist

### Blockers

- [x] Fix `skillActivation: "auto"` over-selection.
- [x] Add true executed-tool-call budget enforcement.
- [x] Install/configure `prettier` and make `npm run format:check` pass.
- [x] Correct invalid `AgentCache.file` docs snippets.
- [x] Add docs/example snippet typechecking against public exports.
- [x] Add CI workflow for all local release gates.
- [x] Re-run full unit, build, docs, exports, examples, package-size, and format checks.
- [x] Re-run light OpenAI live smoke and creator/cache live smoke.
- [x] Harden cache with namespace/version scoping, deterministic keys, atomic writes, size limits, status-aware reads, invalidation helpers, in-flight de-dupe, and observability.
- [x] Re-run `npm run release:check` successfully after cache hardening.
- [x] Add and run local skills certification with `npm run test:skills`.
- [x] Add and run light live multi-provider skills certification with `npm run test:int:skills:full`.
- [x] Generate dated skills certification evidence in `reports/agentcraft-live-skills-certification.md`.

### High-Priority Hardening

- [x] Add MCP wrapper-level allowlists.
- [x] Require conservative confirmation for generic external MCP tools by default.
- [x] Add local policy certification for write-capable adapters.
- [ ] Add fresh sandbox live tests for every write-capable adapter.
- [ ] Add live certification matrix for built-in MCPs.
- [x] Add external skill checksum verification.
- [ ] Add external skill signature verification.
- [x] Add cache tenant-isolation guidance through namespace/version examples.
- [ ] Add a distributed cache controller or cross-process locking option for horizontally scaled deployments.
- [ ] Add feature maturity labels to docs.

### Quality Expansion

- [x] Add golden creator-skill evaluations.
- [x] Add before/after skill quality comparison tests with reviewer rubrics.
- [ ] Add cache benchmark tests measuring avoided calls, latency, and token/tool-call savings across realistic creator workflows.
- [ ] Add common error simulations for each adapter: auth failure, rate limit, timeout, malformed response, empty result, and permission denied.
- [ ] Add provider/model freshness verification workflow.

## Final Assessment

AgentCraft is ready for a guarded public 0.1.x release candidate. The system has real architecture, real tests, live smoke coverage, a live-certified representative creator-skill layer, run-scoped attachment for cost control, actual tool execution budgeting, public API snippet checks, CI release-gate coverage, a clean public export strategy, materially stronger adapter/MCP safety controls, external-skill checksum/allowlist controls, and a materially stronger cache layer.

It should not be marketed as fully live-certified across every adapter, MCP, write workflow, and untrusted external ecosystem yet. The highest remaining risks are full adapter/MCP sandbox live certification depth, external skill signature policy, distributed cache backend support for scaled deployments, and broader topic/channel live skill benchmarks beyond the current light certification tier.

Recommended next move:

- [x] Fix the previous runtime blockers.
- [x] Re-run the full local QA gate.
- [x] Re-run live skills certification in controlled mode.
- [x] Update the skills certification reports with dated evidence.
- [ ] Re-run the live adapter/MCP/write-capable certification matrix in controlled mode.
- [x] Move to guarded public release-candidate readiness.
