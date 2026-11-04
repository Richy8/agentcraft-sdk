# Skill Intelligence Architecture Plan

## Context

The current skill system is passive — skills inject prompt content and depend on the LLM to fill gaps correctly. The goal is to make skills behave like software: they evaluate incoming prompts, determine sufficiency, ask targeted questions when context is missing, and intelligently route multi-step workflows. The end result: users get high-quality output in one interaction instead of burning tokens across 3–5 re-prompt cycles.

This plan addresses four scenarios, built on top of the existing infrastructure:
- `activation-engine.ts` — already has confidence scoring, keyword/semantic matching, capped at 4 skills in auto mode
- `AgentWorkflow` — already has AgentStep, TeamStep, ParallelStep, ConditionStep for chaining
- `AgentMemory` — already supports session-scoped memory via `scope` field
- `ArtifactStore` — already has `link()` for chaining artifacts between agents
- `CreatorPacks` — already groups skills by domain with metadata

---

## What Gets Built (5 Phases)

---

### Phase 1 — Prompt Intelligence Layer
**Files:** `src/agent/skills/prompt-intelligence.ts` (new)

Three pure functions that run before any skill assembly and before the main LLM call:

**1a. `scorePromptQuality(prompt: string): PromptQualityScore`**
Returns `{ score: number (0–1), signals: PromptQualitySignal[] }` scoring:
- Intent clarity: is there a clear verb + object? (write, research, analyze, compare)
- Specificity: named subjects, concrete constraints, audience stated
- Constraint completeness: format, length, tone, goal present
- Self-sufficiency: does the prompt contain its own quality checks or constraints

A score ≥ 0.75 → "well-written" → skills operate in **elevation mode** (strategic uplift only, don't fill gaps)
A score < 0.75 → "under-specified" → skills operate in **gap-fill mode** (clarify missing context before running)

**1b. `classifyPromptIntent(prompt: string): PromptIntentClassification`**
Returns:
```typescript
{
  type: 'single-task' | 'multi-step' | 'ambiguous';
  steps?: DetectedStep[];   // e.g. [{action:'research'}, {action:'outline'}, {action:'write'}, {action:'humanize'}]
  confidence: number;
}
```
Detects chained directives via transition markers: "then", "from there", "after that", "finally", sequential skill directives (e.g. `/research ... /outline ... /write`).

**1c. `scorePromptSufficiency(skill: AgentSkill, prompt: string, gathered?: GatheredContext): SufficiencyResult`**
Returns `{ score: number, missingFields: ClarificationQuestion[] }`.
Extends the existing `missingInputLikely()` in `prompt-assembler.ts` into a scored result per skill, checking against the skill's `clarification.questions` schema (added in Phase 2).

---

### Phase 2 — Clarification Schema + Pre-flight Gate
**Files:**
- `src/agent/skills/types.ts` — add `clarification` field to `BuiltInSkillSpec`
- `src/agent/skills/runtime-prompt-bridge.ts` — add pre-flight decision point
- `src/agent/skills/conversation-context.ts` (new) — session context accumulator

**2a. `ClarificationSchema` on skill specs**
```typescript
clarification?: {
  threshold: number;          // 0–1, sufficiency score required to proceed (e.g. 0.6)
  questions: Array<{
    field: string;            // internal key e.g. 'audience'
    prompt: string;           // what to ask e.g. "Who is the target audience?"
    required: boolean;
    inferableFrom?: string[]; // skip question if these terms appear in prompt
  }>;
}
```
Questions are skill-authored and deterministic — not LLM-generated. The skill decides what it needs.

**2b. Pre-flight decision in `runtime-prompt-bridge.ts`**
New function `resolvePreflightDecision()` runs before `applySkillSystemPromptsForRun`:
```typescript
type PreflightDecision =
  | { mode: 'proceed' }
  | { mode: 'clarify'; questions: ClarificationQuestion[]; format: 'text' | 'json' }
  | { mode: 'workflow'; blueprint: WorkflowBlueprint }  // see Phase 3
```
If `mode === 'clarify'`, the agent returns structured questions without making a main LLM call. Response format respects the agent's configured `responseFormat`.

**2c. `ConversationContext` accumulator**
Stored in session-scoped `AgentMemory` under a skill-keyed namespace. Tracks what clarification answers have been gathered so users don't re-answer on subsequent turns of the same agent instance. On re-entry, gathered context is merged into the enriched prompt before the main run.

**Activation mode clarification (no code change, documentation only):**
- Skills attached to **agent creation** → can use `auto` or `directive-only`
- Skills attached to **agent run** → `directive-only` only (user must explicitly invoke via `/directive`)
- `always` mode → removed as user-facing option; retained as internal constant only
- In `auto` mode: only skills from the attached pack/skill set activate — never from the full registry

---

### Phase 3 — Workflow Intent Auto-routing (Scenario 2)
**Files:**
- `src/agent/skills/activation-engine.ts` — add multi-step intent branch
- `src/agent/skills/workflow-blueprint.ts` (new) — WorkflowBlueprint builder

**3a. Multi-step intent detection in activation engine**
When `classifyPromptIntent()` returns `type: 'multi-step'` with confidence ≥ 0.8, `selectActiveSkillMatches` returns a `WorkflowBlueprint` alongside (or instead of) individual skill matches.

**3b. `WorkflowBlueprint` type**
```typescript
interface WorkflowBlueprint {
  steps: Array<{
    directive: string;         // which skill handles this step
    inputFrom?: string;        // artifact type from previous step
    outputArtifact: string;    // artifact type this step produces
    skillRef: AgentSkill;
  }>;
  artifactChain: string[];     // ordered artifact types that flow between steps
}
```

**3c. Blueprint → AgentWorkflow translation**
`buildWorkflowFromBlueprint(blueprint, workspace)` creates an `AgentWorkflow` with sequential `AgentStep`s, each configured to:
- Read its `inputFrom` artifact from the store at step start
- Write its `outputArtifact` to the store on completion
- Pass only relevant context to each sub-agent (not the full accumulated system prompt)

The final step's output is returned to the user. Intermediate artifacts are accessible in the store for the full session.

**Execution is fully transparent to the user.** The workflow runs silently behind a single apparent agent interaction. No blueprint is surfaced, no step confirmations, no intermediate responses. The user sends one prompt and receives one final output — the result of the last step in the chain. Internally it's sequential sub-agents with artifact handoffs; externally it feels exactly like a single agent run. Multi-step complexity is hidden infrastructure, not a UX feature.

---

### Phase 4 — Skill Manifests + Domain Awareness (Scenario 4)
**Files:**
- `src/agent/skills/types.ts` — add `SkillManifest` type
- One manifest per skill domain folder (e.g. `src/agent/skills/domains/creator/blog/manifest.ts`)
- Shareable distribution as JSON/YAML alongside the TypeScript source

**4a. `SkillManifest` type — the contract/entry file**
```typescript
interface SkillManifest {
  name: string;
  description: string;           // what this skill tree does (activation signal)
  entryDirective: string;        // primary directive e.g. 'write-blog'
  domain: string;
  subSkills: Array<{
    skillId: string;
    role: 'primary' | 'support' | 'specialist';
    directive: string;
    inputFrom?: string[];        // artifact types consumed
    outputArtifact?: string;     // artifact type produced
    domainSpecializations?: string[]; // e.g. ['tech', 'fashion', 'lifestyle', 'finance']
  }>;
  dataFlow: Array<{
    from: string;               // skillId
    to: string;                 // skillId
    via: string;                // artifact type
  }>;
  domainSpecializations?: string[];  // domains this skill tree handles
}
```

**4b. Domain specialization via reference files**
Each sub-skill (e.g. `blog-research`) gets domain-specific reference files in its folder:
```
skills/domains/creator/blog/
  manifest.ts                    ← contract/tree (TypeScript, compiled)
  manifest.json                  ← shareable distribution (auto-generated from manifest.ts)
  blog-writer/
    blog-writer.skill.ts         ← entry skill
    tech.ref.ts                  ← tech domain rules
    fashion.ref.ts               ← fashion domain rules
    lifestyle.ref.ts
  blog-research/
    blog-research.skill.ts
    tech.ref.ts
    ...
```
The assembler injects the relevant domain reference file when the prompt contains domain signals (tech vocabulary, fashion terms, etc.).

**4c. Manifest-aware activation**
The activation engine reads the manifest to understand the full skill tree rather than matching individual skills in isolation. When a manifest matches, it activates the right sub-skills in the right roles — not a flat list of all registered skills.

---

### Phase 5 — Prompt Elevation Mode (Scenario 3)
**Files:** `src/agent/skills/prompt-assembler.ts` — add elevation mode path

**5a. Assembly mode gated by prompt quality**
```typescript
function resolveAssemblyIntent(
  qualityScore: PromptQualityScore,
  skill: AgentSkill
): 'gap-fill' | 'elevate'
```
- `gap-fill` (score < 0.75): standard behavior — fill missing context, front-load constraints, inject failure behavior
- `elevate` (score ≥ 0.75): suppress gap-filling sections, inject strategic direction only — quality checklist, output format for excellence, advanced constraints. Don't re-explain what the user already specified.

**5b. Low-intent prompt handling (Scenario 3a)**
When `classifyPromptIntent()` returns `type: 'ambiguous'` and quality score < 0.35, the pre-flight returns a single high-level question: "What are you trying to create or accomplish?" rather than injecting all skills speculatively. No skills activate until intent is established.

**5c. Optional pre-analysis mini-agent**
Flag-controlled (`agent.run({ preAnalysis: true })`). Fires a small, fast LLM call (Haiku/Flash tier) to analyze complex ambiguous prompts and return structured intent metadata. Adds ~200ms latency but only on prompts where deterministic analysis fails. The structured output feeds directly into `classifyPromptIntent`.

---

## Build Order

| # | What | Why first |
|---|------|-----------|
| 1 | `PromptQualityScore` + `classifyPromptIntent` | All other phases depend on these signals |
| 2 | `ClarificationSchema` on skill specs + `scorePromptSufficiency` | Foundation for pre-flight gate |
| 3 | Pre-flight decision in `runtime-prompt-bridge` + `ConversationContext` | Scenario 1 end-to-end |
| 4 | Elevation vs gap-fill assembly mode | Scenario 3 — high value, low complexity |
| 5 | `WorkflowBlueprint` + blueprint→workflow translation | Scenario 2 — depends on Phase 1 |
| 6 | `SkillManifest` + domain reference files | Scenario 4 — most structural work |

---

## Locked Decisions

- **Workflow execution**: Fully transparent — runs silently as a single apparent interaction. No user-facing steps or confirmations.
- **Pre-analysis agent**: Mini-agent, opt-in via `agent.run({ preAnalysis: true })`. Haiku/Flash tier, ~200ms added latency.
- **Manifest format**: TypeScript for built-in skills (compiled, type-safe). JSON/YAML as the shareable/distributable format for external skill authors.
- **Activation modes**: `auto` and `directive-only` retained. `always` removed as user-facing option.

---

## Verification

After each phase:
- `npm run typecheck` — no new type errors
- `npm test` — existing tests pass
- Manual: attach a blog pack to an agent, run a low-context prompt, confirm clarification questions return
- Manual: run "research → outline → write → humanize" prompt, confirm silent workflow executes end-to-end
- Manual: run a well-written prompt, confirm skills elevate rather than override
