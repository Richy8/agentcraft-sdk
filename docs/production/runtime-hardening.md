# Runtime Hardening

AgentCraft's runtime hardening work focuses on keeping the public API stable while moving high-risk behavior into smaller, testable modules. The goal is not to change how users call `Agent.create()` or `agent.run()`; it is to make skill routing, prompt assembly, cache replay, memory injection, and adapter lifecycle behavior easier to inspect and safer to maintain.

## Current Status

| Area                  | Hardening status                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Runtime orchestration | `Agent` delegates run and stream execution to `agent/runtime/agent-runtime.ts`.                                                            |
| Structured output     | Native JSON-mode and tool-fallback behavior lives in `agent/runtime/structured-output-flow.ts`.                                            |
| Adapter attachment    | `.use(...)` validation, dependency checks, pack expansion, and tool conflict checks live in `agent/adapters/attachment-manager.ts`.        |
| Adapter lifecycle     | Attached and run-scoped adapter init/cleanup order is isolated in `agent/adapters/lifecycle-manager.ts` and `agent/adapters/run-scope.ts`. |
| Skill activation      | `always`, `auto`, and `directive-only` selection logic lives in `agent/skills/activation-engine.ts`.                                       |
| Prompt assembly       | Adaptive section scoring, prompt compression, and sanitized prompt inspection live in `agent/skills/prompt-assembler.ts`.                  |
| Tool routing          | Tool selection, policy wrapping, tracing, cache-aware execution, and budgets are split across `agent/tools/*`.                             |
| Cache                 | `AgentCache` remains the public facade while memory, file, Redis, Postgres, and SQLite backends live in `agent/cache/backends/*`.          |
| Memory                | `AgentMemory` remains the public facade while local, custom, embedding, and vector-client behavior lives in `agent/memory/*`.              |

## Validation Gates

Use the offline gates before publishing a change:

```sh
npm run typecheck
npm test
npm run packs:check
npm run build
npm run docs:api:check
npm run examples:typecheck
npm run examples:check
npm run exports:smoke
npm run format:check
```

Use live gates only when credentials are configured and the run intentionally allows network calls:

```sh
npm run benchmark:live:light
npm run test:int:light
npm run test:int:skills
```

Live tests are opt-in through environment gates. Keep `INTEGRATION_TESTS=false` and `AGENTCRAFT_LIVE_ALLOW_WRITES=false` by default.

## What To Inspect

Use these runtime outputs to verify that a feature is doing real work rather than silently adding prompt or tool overhead:

| Output                                 | What it proves                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `response.selection.activationReasons` | Which skills activated, why they activated, and the confidence behind the decision.                    |
| `response.measurement`                 | Estimated prompt/completion token footprint after skill assembly and compression.                      |
| `response.cache`                       | Cache hits, misses, skipped unsafe tools, avoided calls, estimated saved tokens, and hit-rate summary. |
| `response.costReport`                  | Provider/model cost estimate for the run.                                                              |
| `response.trace`                       | Span-level runtime behavior when tracing is enabled.                                                   |
| `AgentReports.*`                       | Redacted markdown, JSON, and HTML artifacts for review and support handoff.                            |

## Security Posture

- Public skill inspection is sanitized by default and does not expose raw prompt bodies.
- Raw skill specs remain internal implementation details.
- Cache eligibility is centralized and refuses write tools, confirmation-gated tools, and sensitive cache metadata.
- Memory and cache events redact URLs, connection strings, and secret-like payloads.
- Tool side effects still flow through tool policy, approvals, read-only mode, and dry-run controls.

## Remaining Risk

The runtime is now split into smaller services, but future work should keep pressure on these areas:

- Add more service-level tests around multi-turn tool loops, streaming tool calls, and mixed skill-pack activation.
- Keep prompt assembly thresholds documented when tuning section scoring.
- Run live benchmark gates before claiming real token or cost savings.
- Keep docs examples aligned with public package paths and sanitized inspection APIs.
- Avoid reintroducing large files when adding cache, memory, pack, or skill features.
