# Changelog

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
