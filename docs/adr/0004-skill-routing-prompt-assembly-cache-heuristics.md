# ADR 0004: Skill Routing, Prompt Assembly, and Cache Heuristics

## Status

Accepted

## Context

AgentCraft needs to attach high-value skill context without dumping every skill
prompt into the model window. The runtime also needs to avoid replaying unsafe
tool side effects from cache. Both behaviors depend on heuristics that must be
visible enough for maintainers to tune safely.

## Decision

Keep skill activation, adaptive prompt assembly, and tool-cache eligibility in
focused runtime modules with documented thresholds.

## Skill Activation

Skill activation lives in `src/agent/skills/activation-engine.ts`.

- `always` activates every attached skill.
- `directive-only` activates only skills explicitly invoked with `/directive`.
- `auto` activates up to four skills whose metadata matches the user prompt.

The auto cap of `4` protects the system prompt from pack-wide prompt bloat. A
skill must reach at least `0.74` confidence before it can be auto-activated.
This threshold is intentionally above weak keyword matching but below exact
directive matching, allowing metadata signals such as domain, category, stage,
produced artifacts, and domain intelligence to contribute.

Confidence bands:

- `1.0`: explicit directive or always-on activation.
- `0.90+`: exact skill or directive alias match.
- `0.78-0.86`: domain/category/stage/artifact intelligence match.
- `0.74`: lowest accepted keyword/capability match.

Auto activation ignores prompt text inside fenced code blocks and lines marked as
retrieved/external/tool/source content, because those are treated as untrusted
retrieval context rather than user intent.

## Adaptive Prompt Assembly

Adaptive assembly lives in `src/agent/skills/prompt-assembler.ts`.

Every active skill always contributes role, goal, constraints, and safety notes.
Other sections are scored and included only when they are likely to improve the
run:

- Tool policy receives weight from tool intent, research intent, high-risk
  actions, and configured relevant adapters.
- Output format receives weight from deliverable intent, review intent, and
  execution-oriented skill stages.
- Quality checklist receives weight when the run asks for a deliverable or
  review.
- Failure behavior receives weight when the prompt is underspecified, risky, or
  likely missing required inputs.
- Examples receive weight when a single skill is active and the user asks for a
  concrete deliverable.

Section thresholds:

- `minimal`: include non-example sections scoring `85+`.
- `compact`: include sections scoring `68+`, with one near-miss allowance.
- `adaptive-safe`: include sections scoring `55+`, with two near-miss allowances.
- `full`: include the raw full skill prompt.

The near-miss allowance prevents valuable sections from being omitted because a
prompt used adjacent wording. It is deliberately small so adaptive assembly
still reduces prompt footprint.

## Cache Eligibility

Tool cache eligibility lives in `src/agent/cache-eligibility.ts`.

All strategies reject:

- sensitive cache metadata
- write tools
- tools requiring confirmation

Strategy behavior:

- `conservative`: cache `none` side-effect tools, and cache `read` tools only
  when tool metadata marks them safe or deterministic.
- `auto`: cache `none` and `read` tools.
- `aggressive`: cache `none`, `read`, and `external` tools, while still refusing
  writes and confirmation-gated tools.

This keeps replay safety centralized and prevents cache backends from deciding
whether a tool result is safe to reuse.
