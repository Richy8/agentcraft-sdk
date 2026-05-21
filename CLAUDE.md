# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run build           # compile TypeScript to dist/
npm run typecheck       # type-check without emitting (also used as lint)
npm test                # run all unit tests (mocked, no API keys needed)
npm run test:watch      # watch mode
npm run test:skills     # run skill/pack tests only
npm run benchmark:mock  # cost/cache/skill benchmark (mocked)

# Run a single test file
npx vitest run src/agent/__tests__/agent.test.ts

# Integration tests (require live API keys — opt-in)
INTEGRATION_TESTS=true npm run test:int:light   # OpenAI only
INTEGRATION_TESTS=true npm run test:int         # all providers

# Docs site
npm run docs:dev        # local VitePress server at 127.0.0.1

# Pre-release gate (type-check + test + build + examples + exports)
npm run release:check
```

## Architecture

The package ships six entry points (`dist/index.js`, `dist/adapters.js`, `dist/skills.js`, `dist/packs.js`, `dist/mcp.js`, `dist/team.js`) compiled from `src/`. All source is ES module (`"type": "module"`), Node16 resolution, strict TypeScript.

### Core Runtime (`src/agent/`)

`Agent` (`agent.ts`) is the central class. It holds a `BaseLLMProvider` (resolved at creation from `src/provider-registry/`) and manages the run lifecycle: preflight budget checks → skill/adapter prompt assembly → LLM call → structured output parsing → post-run budget enforcement → trace/event emission.

Key subsystems wired into `Agent`:

- **Providers** (`src/providers/`, `src/provider-registry/`): protocol adapters for OpenAI, Anthropic, Google Gemini, AWS Bedrock, Cohere, and any OpenAI-compatible endpoint. `ProviderFactory` resolves the right adapter from `PROVIDER_REGISTRY`.
- **Adapters** (`src/agent/adapters/`): tool wrappers for filesystem, fetch, GitHub, database, browser, MCP, image, email, calendar, sheets, analytics, etc. All adapters flow through `runToolWithPolicy` for approval gating, dry-run, redaction, and audit.
- **Skills** (`src/agent/skills/`): structured prompt fragments with metadata. Skills live in domain folders under `src/agent/skills/domains/` (brand, business, creator, data-analytics, engineering, finance, healthcare, legal, marketing, personal-productivity, product, sales, support). The `SkillRegistry` manages registration and lookup; `buildSkillPrompt` assembles the final prompt fragment.
- **Creator Packs** (`src/agent/packs/`, `src/packs.ts`): pre-assembled skill bundles for content workflows. `CreatorPacks` (blog, SEO, social, video, book, etc.) attach skills + adapters to an agent via `.use()`.
- **Cache** (`src/agent/cache.ts`): `AgentCache` with memory, file, SQLite, Postgres, and Redis backends. Supports `warm()`, hit-rate reporting, and distributed locking.
- **Workflow** (`src/agent/workflow/`): `AgentWorkflow` for step-graphs with `AgentStep`, `ApprovalStep`, `ConditionStep`, `CustomStep`, `ParallelStep`, `TeamStep`, `ToolStep`.
- **Memory** (`src/agent/memory/`): `AgentMemory` for semantic memory with local, Qdrant, Pinecone, Supabase vector backends.
- **Budget / Cost** (`src/agent/budgets.ts`, `src/cost-calculator/`): preflight estimation, post-run enforcement, staleness reports.
- **Workspace** (`src/agent/workspace.ts`): `AgentWorkspace` wires cache, adapters, tool policy, budget, events, and artifact stores as a shared context for teams/workflows.
- **Governance** (`src/agent/governance/`): `ApprovalQueue` (memory-backed) for queuing write-tool approvals before execution.
- **Observability** (`src/agent/observability.ts`): `RunTracer`, OpenTelemetry sink, trace replay.
- **Eval / Reports** (`src/agent/eval/`, `src/agent/reports/`): `AgentEval` for regression suites, `AgentReports` for markdown run artifacts.

### Other `src/` modules

- `src/artifact-store/` — `FileArtifactStore`, `MemoryArtifactStore`, `SQLiteArtifactStore` for durable typed persistence.
- `src/artifact-registry/` — 19 built-in creator artifact schemas.
- `src/prompt-assembler/` — `PromptAssembler` for file-based prompt loading/composition.
- `src/model-registry/` — model catalog with pricing metadata; `BestFitResolver` for capability-based selection.
- `src/protocols/` — normalized `ToolDefinition` / `ToolResult` types shared across providers.
- `src/testing/` — `DeterministicFakeProvider` for unit tests without API calls.
- `src/errors/` — typed error hierarchy (`AgentCraftError` base).
- `src/security/` — input sanitization and secret detection used by guardrails.

### Adding a Skill

1. Create a file under the appropriate `src/agent/skills/domains/<domain>/` directory.
2. Use the domain-specific factory (e.g., `defineEngineeringSkillSpec`, `defineBrandSkillSpec`) — not the base `defineRoutineDomainSkillSpec` directly.
3. Re-export from that domain's `index.ts`.
4. Register with `registerSkillSpecs(...)` if it belongs in the default registry.

**Directive naming convention:** `directive` must be a short imperative verb or verb phrase describing the ACTION the skill performs — not the skill name. Good: `'audit'`, `'synthesize'`, `'draft'`, `'review-code'`. Bad: `'code-review'`, `'brand-research'`. The factory emits a development warning when `directive === name`.

### Adding a Provider

Implement `BaseLLMProvider` (`src/providers/base.provider.ts`), register in `PROVIDER_REGISTRY` (`src/provider-registry/registry.ts`), and add model entries to `MODEL_CATALOG`.

## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
