# AgentCraft Examples

These examples are intentionally commented. They are meant to teach the package value proposition while showing practical configuration choices.

## Quick Learning Path

1. `basic-chat.ts` - smallest useful agent.
2. `structured-output.ts` - schema-driven responses.
3. `streaming-with-tools.ts` - event stream with tool calls/results.
4. `guardrails-and-approvals.ts` - safe side-effect controls.
5. `observability-tracing.ts` - traces for debugging and telemetry.
6. `agent-pool-routing.ts` - explicit AgentPool fallback, downgrade, and routing.
7. `agent-team.ts` - fixed multi-agent orchestration.
8. `agent-team-spawn.ts` - dynamic team formation.

## Scenario Coverage

- Local/private execution: `local-ollama-private.ts`
- Prompt assembly: `prompt-assembly.ts`
- Filesystem safety: `filesystem-safe-agent.ts`
- Browser automation: `browser-automation.ts`
- Read-only database analysis: `database-readonly.ts`
- GitHub native adapter: `github-review-agent.ts`
- GitHub MCP: `mcp-github-agent.ts`
- Custom MCP connection: `custom-mcp-connection.ts`
- Built-in MCP + memory skill: `built-in-mcp-skill-memory.ts`
- Research skill: `research-agent.ts`
- Creator packs: `creator-pack-workflow.ts`
- Creator memory and analytics history: `creator-memory-analytics.ts`
- Custom skills: `custom-skills.ts`
- Adapter + skill workflow: `adapter-skill-workflow.ts`
- Customer operations workflow: `customer-ops-workflow.ts`
- Cost admission control: `cost-budgeting.ts`
- Custom adapter authoring: `custom-adapter.ts`
- Model catalog and cost previews: `model-catalog-and-cost.ts`
- Multimodal inputs: `multimodal-inputs.ts`
- Skill directives: `skill-directives.ts`
- Dynamic AgentTeam spawn: `agent-team-spawn.ts`

Most examples use environment variables from `../.env.example`. Live cloud/provider examples can incur API costs.

## Adding Or Editing Examples

- Keep examples readable without running them. Most examples intentionally use top-level `await`, so they should be reviewed as runnable recipes but not imported from tests.
- Explain whether string and enum config values are required, optional, or interchangeable.
- Use environment variables for secrets and name the required variable in comments.
- Prefer deterministic mocks or replay fixtures for test-style examples.
- Run `npm run examples:check` after adding an example. It verifies TypeScript syntax, supported package imports, and VitePress source includes without calling live providers.

## Config Value Guide

Common string/enum-style config values used across examples:

- `model`: use the typed `Provider` catalog when possible, such as `Provider.openai['gpt-4o-mini']` or `Provider.ollama['llama3.2']`. You can also pass provider-prefixed strings like `openai:gpt-4o-mini`, but the catalog is safer.
- `AgentPool.strategy`: `cost`, `speed`, `quality`, `round-robin`, `random`, or `best-fit`.
- `AgentPool.fallbackMode`: `none`, `first-error`, `retryable`, `non-retryable`, or `all`.
- `AgentTeam.executionHint`: `parallel`, `sequential`, `pipeline`, or `auto`.
- `AgentTeam.mode`: `orchestrator` or `planner-executor-reviewer`.
- Tool `security.sideEffect`: `none`, `read`, `write`, or `external`.
- Adapter `metadata.kind`: `placeholder`, `mcp-backed`, `native-sdk`, or `custom`.
- Adapter `metadata.auth`: `none`, `api-key`, `oauth`, `aws`, `connection-string`, or `custom`.
- Structured output `toolFallback`: `auto`, `true`, or `false`.
- JSON schema `type`: `object`, `array`, `string`, `number`, `boolean`, or `null`.
- Creator pack `skillActivation`: `always`, `auto`, or `directive-only`.
- Creator pack `toolSelection`: `all` or `auto`.
- Agent cache `strategy`: `conservative`, `auto`, or `aggressive`.
