# Changelog

## Unreleased

- Added `promptCompression` on `Agent.create()` and `agent.run()` with `none`, `safe`, `balanced`, and `aggressive` modes for reducing skill and creator-pack prompt overhead.
- Added `response.costReport` for run-level cost reporting and aggregate cost reports for teams and workflows.
- Added `RunBudget.mode` with `fail-closed`, `prefer-cache`, `downgrade-model`, and `request-approval`.
- Added `createPricingStalenessReport()` for model-pricing metadata checks.
- Added richer `response.selection.activationReasons` with confidence and reason codes for directive, exact alias, creator artifact, capability, keyword/domain alias, and semantic-ready routing.
- Hardened cached tool accounting so cached replay avoids live tool execution and no longer increments executed tool-call counts.
- Added benchmark helpers and OpenAI-light live benchmark coverage for flat prompt, directive skill, creator pack `always`, creator pack `auto`, compressed creator pack, cache warm/replay, memory-informed output, and artifact-resume output.
- Tuned creator-skill auto activation ranking so explicit creation intent keeps the relevant creation skill inside the bounded activation cap.
- Added live skills certification fallback reporting for provider/model responses that are too short or low-quality under the configured model.
- Added artifact-store schema validation through `ArtifactRegistry` for memory, file, and SQLite stores.
- Added `ArtifactStore.updateByType()`, `listLinks()`, `capabilities()`, file-store history, and typed artifact helper APIs.
- Added creator memory freshness metadata, stale-memory warnings, durable write approval policy, default secret/sensitive-data blocking, and compact `summarizeContext()`.
- Added docs and examples for cost/cache compression, artifact validation/link traversal, memory freshness, and benchmark interpretation.

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
- Production adapters, MCP wrappers, skills, AgentTeam, structured output, streaming, observability, budgets, and security regression coverage.
