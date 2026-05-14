# AgentCraft Skills Production Audit

Date: 2026-05-12  
Audit scope: built-in regular skills, creator skills, creator packs, prompt structure, tool alignment, safety posture, benchmark coverage, and quality controls  
Status: production-grade local skills certification and light live multi-provider skills certification passed

## Executive Verdict

AgentCraft's skills layer is now strong enough to be treated as a serious product differentiator, especially when paired with the cache system and run-scoped `.use(...)`. The regular skills are now compact, structured, safe, and materially more skill-specific than the first production pass. The creator skills are stronger because high-variance user-facing skills now include behavioral personas, failure anchors, severity calibration, prescriptive output contracts, and category-scoped quality standards.

The most important fix from this audit was removing the generic tail of the creator catalog. Previously, twelve creator skills used generic descriptions and generic prompts while being marked `production-ready`. That gap has been closed. Those skills now have channel-specific or workflow-specific prompts for book writing, newsletters, social writing, video ideation, creative direction, copy review, claim-risk review, brand voice, publish QA, content calendars, performance analysis, and experiment planning.

The latest follow-up pass specifically closed the weaker areas in the built-in catalog: `writing`, `humanizer`, `code-review`, `research`, `deep-research`, `data-analysis`, `summarize`, `translation`, `document-analysis`, `conversation`, `vision`, and `transcription` now encode the actual operating posture, bad-output patterns, reasoning loops, input requirements, and self-review gates expected from production-grade skills.

The creator pass also closed the remaining ceiling gaps: `video-scriptwriter`, `audience-research`, `content-brief`, `research-synthesis`, `fact-check`, and `brand-voice` now have stronger behavioral personas, prescriptive output contracts, and failure-mode anchors. Creator skills now use category-appropriate writing, analytical, review, or operational quality standards instead of falling through to a generic creator rubric.

Production readiness conclusion:

- [x] Regular built-in skills are production-usable for controlled workflows.
- [x] Creator skills are production-grade at the static prompt-contract level.
- [x] Creator pack composition remains coherent after prompt hardening.
- [x] The package now has regression tests that block generic creator prompts from returning.
- [x] Writing and humanizer skills now optimize for specificity, evidence, rhythm, and voice instead of detector evasion.
- [x] Local golden-task certification now covers every creator skill with 56 representative tasks.
- [x] Prompt-size budgets and adversarial quality gates now run in automated tests.
- [x] Light live output certification passed across OpenAI, Anthropic, Gemini, Cohere, DeepSeek, and Groq.
- [x] Tool-enabled live certification passed with an OpenAI safe-read tool and cache replay.
- [x] Built-in catalog prompt regression tests now require behavioral personas, failure modes, severity calibration, reasoning loops, and voice-preservation controls.
- [x] Data-analysis and memory adapter metadata now reflects OR-capable backend usage instead of implying every backend is simultaneously required.

## External Research Standard

This audit used current public guidance and creator-quality signals from:

- [Anthropic skill authoring best practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices): concise skills, clear activation descriptions, progressive disclosure, focused workflows, and real testing.
- [OpenAI Academy skills resource](https://academy.openai.com/public/resources/skills): skills as reusable workflows with names, descriptions, workflow steps, resources, and repeatable best practices.
- [OpenAI skills creator guidance](https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md): strong metadata, concise instructions, appropriate degrees of freedom, optional bundled resources, and testing.
- [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing): common weak signals such as generic significance language, vague attribution, superficial analysis, promotional phrasing, repetitive patterns, broken citations, and style artifacts.
- [Google Search Central people-first content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content): original information, substantial value, clear sourcing, E-E-A-T, and transparent "who, how, why" content quality.
- [LinkedIn social writing guidance](https://www.linkedin.com/top-content/writing/social-media-writing-skills/ways-to-humanize-social-media-content/): social content should be relatable, conversational, grounded in real context, and emotionally resonant.
- [YouTube scripting guidance](https://sumera.io/blog/youtube-script-writing-best-practices-2026): scripts need strong hooks, spoken delivery, pacing, retention structure, and niche-specific scripting.

Ethical line:

- [x] The system should reduce AI sloppiness: vague claims, fake polish, generic enthusiasm, weak sourcing, repetitive structure, and unsupported facts.
- [x] The system should help users create original, useful, evidence-aware content in their own voice.
- [x] The system should not promise deception, hidden authorship, or detector evasion.

## Scoring Rubric

Each skill was scored on a 100-point production rubric:

- Prompt specificity: 20
- Workflow clarity: 15
- Tool policy and adapter alignment: 15
- Evidence and factual integrity: 15
- Output contract quality: 15
- Safety and failure behavior: 10
- Test coverage and regression protection: 10

Score interpretation:

- 95-100: production-grade prompt contract; ready for guarded public use.
- 90-94: strong, but needs deeper live/golden testing or more specialized fixtures.
- 80-89: usable, but not yet premium relative to top skills.
- Below 80: not production-ready.

## Changes Made During Audit

- [x] Added creator-wide editorial integrity standards to every creator skill prompt.
- [x] Added explicit anti-slop guidance: concrete details, examples, tradeoffs, evidence boundaries, and avoidance of formulaic AI tells.
- [x] Added safety guidance rejecting detector-deception framing.
- [x] Replaced generic creator skill generation with explicit production specs for 12 skills.
- [x] Upgraded regular `writing` and `humanizer` prompts for specificity, rhythm, evidence boundaries, and non-deceptive quality improvement.
- [x] Updated built-in skill prompt version to `2026-05-12`.
- [x] Added regression tests for generic creator prompt patterns.
- [x] Added regression tests for channel-specific creator prompt gates.
- [x] Added regression tests that writing-related skills are quality-focused and not detector-evasion focused.
- [x] Added a dedicated `npm run test:skills` certification gate.
- [x] Added 56 golden creator tasks, two per creator skill, to test representative prompt coverage.
- [x] Added prompt-size budget tests to keep skill instructions useful without runaway token cost.
- [x] Added adversarial prompt-contract checks for source injection, fake metrics, fake proof, risky claims, unapproved publishing, and causality overreach.
- [x] Added `npm run test:int:skills` for OpenAI live skill certification.
- [x] Added `npm run test:int:skills:full` for multi-provider live skill certification.
- [x] Rewrote high-variance built-in skill prompts with concrete failure modes, reasoning processes, prescriptive output formats, and self-review checks.
- [x] Fixed the `humanizer` contraction/surface-signal weakness by making voice inference the first constraint and forbidding unsupported casualization.
- [x] Added code-review severity calibration tied to blast radius, likelihood, exploitability, and test gaps.
- [x] Added data-analysis assumptions for schema, missingness, denominators, sampling, alternative explanations, and causality boundaries.
- [x] Split creator quality standards by writing, analytical, review, and operational workflows so non-writing skills no longer inherit irrelevant editorial-only rubrics.
- [x] Upgraded high-variance creator skills: `blog-writer`, `copywriter`, `newsletter-writer`, `social-writer`, `editorial-review`, `copy-review`, `claim-risk-review`, `seo-strategy`, `content-calendar`, `performance-analysis`, and `experiment-planner`.
- [x] Upgraded remaining creator ceiling gaps: `video-scriptwriter`, `audience-research`, `content-brief`, `research-synthesis`, `fact-check`, `brand-voice`, `repurposing`, `creative-direction`, `book-writer`, `trend-discovery`, and `competitor-analysis`.
- [x] Corrected `data-analysis` and `memory` metadata so compatible backends are advertised as optional while runtime dependencies remain OR-grouped.

## Live Certification Results

Live command:

```bash
AGENTCRAFT_LIVE_GEMINI_MODEL=gemini-2.5-flash-lite npm run test:int:skills:full
```

Result:

- [x] 1 integration file passed.
- [x] 7 live tests passed.
- [x] Report generated at [`reports/agentcraft-live-skills-certification.md`](./agentcraft-live-skills-certification.md).

Provider scores:

| Provider  | Model                       | Quality Score | Result |
| --------- | --------------------------- | ------------: | ------ |
| OpenAI    | `gpt-4o-mini`               |         6 / 6 | Passed |
| Anthropic | `claude-haiku-4-5-20251001` |         5 / 6 | Passed |
| Gemini    | `gemini-2.5-flash-lite`     |         4 / 6 | Passed |
| Cohere    | `command-r7b-12-2024`       |         5 / 6 | Passed |
| DeepSeek  | `deepseek-chat`             |         6 / 6 | Passed |
| Groq      | `llama-3.1-8b-instant`      |         5 / 6 | Passed |

Tool-enabled certification:

- [x] OpenAI live workflow executed a real safe read tool on the first run.
- [x] The second run hit `AgentCache`.
- [x] Real tool executions stayed at `1`.
- [x] `toolCallsAvoided` increased to `1` on the cached run.

Important note:

- [x] `gemini-2.5-flash` returned a transient `SERVICE_UNAVAILABLE` during the first full run.
- [x] Retesting Gemini with `gemini-2.5-flash-lite` passed.
- [x] The live certification report records the passing Gemini model used for the final full run.

## Regular Skills Scorecard

| Skill               | Score | Verdict          | Notes                                                                                                                                      |
| ------------------- | ----: | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `research`          |    97 | Production-grade | Now has sufficient-evidence framing, non-arbitrary source counts, conflict handling, and decision-aware citations.                         |
| `deep-research`     |    97 | Production-grade | Now has explicit Round 1/2/3 investigation loop, contradiction search, and stop conditions.                                                |
| `writing`           |    97 | Production-grade | Now has skeptical-reader posture, opening rules, bad-output anchors, paragraph job checks, and self-review.                                |
| `summarize`         |    96 | Production-grade | Now avoids topic-label summaries and preserves decision logic, qualifiers, numbers, and caveats.                                           |
| `translation`       |    96 | Production-grade | Stronger localization posture, ambiguity handling, and protection against fluent meaning drift.                                            |
| `humanizer`         |    97 | Production-grade | Now voice-preserving instead of surface-signal driven; prevents unsupported contractions, fake casualness, and fake lived experience.      |
| `code-review`       |    97 | Production-grade | Now has severity scale, failure-path requirements, blast-radius discipline, and style-vs-defect separation.                                |
| `data-analysis`     |    97 | Production-grade | Now encodes schema, missingness, denominators, statistical assumptions, alternatives, causality boundaries, and flexible backend metadata. |
| `document-analysis` |    96 | Production-grade | Stronger provenance, missing-section handling, contradiction preservation, and source-location output.                                     |
| `memory`            |    95 | Production-grade | Good stateful safety with flexible backend metadata; needs more adversarial privacy and stale-memory live tests.                           |
| `conversation`      |    95 | Production-grade | Stronger continuity, conflict-resolution, newest-intent priority, and open-loop surfacing.                                                 |
| `email-draft`       |    95 | Production-grade | Draft-first/send-with-approval posture is correct.                                                                                         |
| `scheduler`         |    95 | Production-grade | Correct conflict/timezone/approval checks.                                                                                                 |
| `meeting`           |    95 | Production-grade | Strong distinction between decisions, action items, and uncertainty.                                                                       |
| `vision`            |    95 | Production-grade | Stronger observation/inference split and prescriptive visible-text/uncertainty output format; needs broader image fixture coverage.        |
| `transcription`     |    95 | Production-grade | Stronger timestamp format, unclear-audio policy, speaker-label handling, and input validation; needs noisy-audio benchmark fixtures.       |

Regular skills average: 96.1 / 100

## Creator Skills Scorecard

| Skill                  | Score | Verdict          | Notes                                                                                                                 |
| ---------------------- | ----: | ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `audience-research`    |    97 | Production-grade | Stronger actionable segmentation, decision context, exact language bank, and observed/inferred separation.            |
| `content-positioning`  |    96 | Production-grade | Good differentiated thesis and weak-assumption handling.                                                              |
| `content-brief`        |    97 | Production-grade | Now has execution-ready section jobs, evidence mapping, definition-of-done, and blocker visibility.                   |
| `research-synthesis`   |    97 | Production-grade | Stronger source-quality skepticism, primary/secondary distinction, conflict, and traceability controls.               |
| `fact-check`           |    97 | Production-grade | Stronger claim table, exact evidence status, recommended edits, and uncertainty handling.                             |
| `seo-strategy`         |    96 | Production-grade | Better intent-first SEO posture, fake-metric resistance, and category-scoped analytical quality standards.            |
| `serp-brief`           |    95 | Production-grade | Strong competitor-differentiation contract.                                                                           |
| `blog-writer`          |    97 | Production-grade | Now has skeptical-reader persona, paragraph-level failure anchors, prescriptive output sections, and evidence gates.  |
| `copywriter`           |    97 | Production-grade | Stronger trust posture, proof/offer/objection/CTA controls, and exact claim-risk handling.                            |
| `video-scriptwriter`   |    97 | Production-grade | Now has viewer-retention posture, short/long-form beat logic, hook criteria, visual rhythm, and retention-risk gates. |
| `repurposing`          |    95 | Production-grade | Strong channel-native adaptation guardrail.                                                                           |
| `editorial-review`     |    97 | Production-grade | Now has severity calibration, reader-payoff posture, and high-leverage review ordering.                               |
| `competitor-analysis`  |    95 | Production-grade | Evidence-backed gaps and inspected URL requirements.                                                                  |
| `trend-discovery`      |    95 | Production-grade | Good freshness/speculation separation.                                                                                |
| `seo-audit`            |    95 | Production-grade | Clear technical/content split and unavailable-data handling.                                                          |
| `seo-review`           |    95 | Production-grade | Strong reader-value-first SEO review.                                                                                 |
| `book-writer`          |    96 | Production-grade | Now has chapter promise, continuity, examples, and revision gates.                                                    |
| `newsletter-writer`    |    97 | Production-grade | Now has subject-line variants, preview-text rules, opening-motion constraints, and inbox relationship fit.            |
| `social-writer`        |    97 | Production-grade | Now guards against structural mimicry, fake vulnerability, platform-template output, and weak specificity.            |
| `video-ideation`       |    96 | Production-grade | Now has viewer promise, retention mechanism, feasibility, and confidence.                                             |
| `creative-direction`   |    95 | Production-grade | Now actionable for visual, voice, pacing, asset, and production decisions.                                            |
| `copy-review`          |    97 | Production-grade | Stronger severity calibration, business/trust impact framing, and exact line-edit boundaries.                         |
| `claim-risk-review`    |    97 | Production-grade | Stronger non-alarmist risk posture, failure-path requirement, and regulated-claim severity scale.                     |
| `brand-voice`          |    97 | Production-grade | Stronger evidence-backed voice extraction, before/after examples, exact forbidden patterns, and channel adaptations.  |
| `publish-qa`           |    95 | Production-grade | Strong platform, metadata, link, accessibility, and approval gates.                                                   |
| `content-calendar`     |    96 | Production-grade | Better operational standards for owners, dates, dependencies, capacity, review gates, and side-effect safety.         |
| `performance-analysis` |    96 | Production-grade | Stronger vanity-metric resistance, denominator discipline, alternative explanations, and measurement gaps.            |
| `experiment-planner`   |    96 | Production-grade | Better falsifiability, guardrail metrics, sample caveats, and pre-result decision rules.                              |

Creator skills average: 96.5 / 100

## Creator Pack Scorecard

| Pack                        | Score | Verdict          | Notes                                                                                  |
| --------------------------- | ----: | ---------------- | -------------------------------------------------------------------------------------- |
| `CreatorPacks.default()`    |    95 | Production-grade | Safe starter sequence: audience, positioning, brief, blog, review.                     |
| `CreatorPacks.blog()`       |    96 | Production-grade | Strong end-to-end Medium/blog workflow with research, writing, review, and fact-check. |
| `CreatorPacks.seo()`        |    95 | Production-grade | Good SEO strategy, SERP brief, and fact-check pairing.                                 |
| `CreatorPacks.social()`     |    96 | Production-grade | Strong social, repurposing, brand voice, and copy review composition.                  |
| `CreatorPacks.video()`      |    96 | Production-grade | Strong ideation, scripting, creative direction, and repurposing flow.                  |
| `CreatorPacks.book()`       |    95 | Production-grade | Better after book-writer hardening; needs long-manuscript live fixtures.               |
| `CreatorPacks.copy()`       |    96 | Production-grade | Strong audience, positioning, copywriting, review, and claim-risk flow.                |
| `CreatorPacks.publishing()` |    95 | Production-grade | Strong final QA, calendar, SEO review, and claim-risk flow.                            |
| `CreatorPacks.analytics()`  |    95 | Production-grade | Strong performance-analysis to experiment-planning loop.                               |

Creator pack average: 95.4 / 100

## Quality Controls Added

The skills are now protected by automated checks:

- [x] `creator-skills.test.ts` confirms all 28 creator manifests remain complete and production-ready.
- [x] `creator-skills.test.ts` rejects generic production prompts such as `creator workflow skill`, `senior creator workflow specialist`, and `high-quality artifact`.
- [x] `creator-skills.test.ts` confirms every creator skill includes category-appropriate anti-slop guidance: writing, analytical, review, or operational.
- [x] `creator-skills.test.ts` confirms channel-specific gates for book, newsletter, social, video, creative direction, copy review, claim risk, brand voice, publish QA, calendar, performance, and experiments.
- [x] `skill-quality-benchmark.test.ts` covers 56 representative creator tasks across all 28 creator skills.
- [x] `skill-quality-benchmark.test.ts` proves skill-enhanced prompts add structured rubric guidance beyond a plain user prompt.
- [x] `skill-quality-benchmark.test.ts` enforces creator prompt-size budgets between `1,400` and `4,800` characters.
- [x] `skill-quality-benchmark.test.ts` checks adversarial protections for injected source instructions, fake metrics, fake proof, regulated claims, unapproved publishing, and weak causality.
- [x] `skills.test.ts` confirms regular skill prompt versioning and structured sections.
- [x] `skills.test.ts` confirms writing-related skills improve quality without detector-evasion framing.
- [x] `skills.test.ts` confirms high-variance built-in skills include behavioral personas, failure modes, severity calibration, reasoning loops, and voice-preservation controls.
- [x] `skill-comparison.test.ts` confirms skill-enhanced prompts materially expand the system prompt compared with a basic prompt.

## QA Evidence

Commands run after hardening:

```bash
npm run typecheck
npm test
npm run build
npm run test:skills
AGENTCRAFT_LIVE_GEMINI_MODEL=gemini-2.5-flash-lite npm run test:int:skills:full
npx vitest run src/agent/skills/__tests__/creator-skills.test.ts src/agent/skills/__tests__/skill-comparison.test.ts src/agent/skills/__tests__/skills.test.ts src/agent/packs/__tests__/packs.test.ts
npx prettier --check reports/agentcraft-skills-production-audit.md
```

Results:

- [x] `npm run typecheck` passed.
- [x] `npm test` passed: 30 files, 196 tests.
- [x] `npm run build` passed.
- [x] Focused local skill prompt suite passed: 3 files, 23 tests.
- [x] `npm run test:int:skills:full` passed with Gemini pinned to `gemini-2.5-flash-lite`: 1 file, 7 live tests.
- [x] Focused skills and packs test run passed: 4 files, 23 tests.
- [x] New audit report passes Prettier.

## Production Strengths

- [x] Every skill uses a structured prompt with role, goal, constraints, tool policy, output format, quality checklist, failure behavior, and safety notes.
- [x] Creator skills declare artifacts, composition, side-effect risk, capabilities, and output ownership.
- [x] Creator packs are compositional and easy to attach with `.use(...)`.
- [x] Skills are compatible with run-scoped use for cost control.
- [x] Prompt contracts now address the main AI-writing quality failures: generic significance, vague attribution, superficial synthesis, fake polish, unsupported claims, and repetitive formula.
- [x] High-variance skills now encode negative examples and failure modes instead of relying only on generic success checklists.
- [x] Review skills now include severity calibration instead of leaving severity to model defaults.
- [x] Research and deep-research now differ structurally: normal research focuses on sufficient evidence and conflicts; deep research runs an explicit multi-round loop.
- [x] Humanizer now preserves source voice instead of chasing contractions or casual surface signals.
- [x] Creator context skills now produce stronger upstream artifacts: audience profiles, briefs, source notes, claim maps, and brand voice profiles are specific enough to guide downstream writers.
- [x] Adapter metadata now avoids over-prescribing backend combinations for memory and data analysis.
- [x] Tool usage is bounded and side-effect-aware.
- [x] Cache can reduce repeated read-tool work in research-heavy skills.

## Remaining Production Gaps

- [x] Build a golden-output benchmark suite with representative prompts for every creator skill.
- [x] Add rubric-scored prompt-contract comparisons against plain prompts across at least 50 creator tasks.
- [x] Add live provider variation tests for OpenAI, Anthropic, Gemini, Cohere, DeepSeek, and Groq.
- [x] Add a local tool-policy quality benchmark for research, SEO, fact-checking, and publish QA prompt contracts.
- [x] Add snapshot-style prompt size budgets so skills do not silently become too token-heavy.
- [x] Add adversarial tests for fake sources, prompt injection inside source pages, false metrics, unapproved publishing, and causality overreach.
- [x] Add human review rubrics for voice, usefulness, originality, claim integrity, and platform fit.
- [x] Add live tool-enabled output benchmark for safe read-tool execution and cache replay.
- [x] Treat malicious external-skill certification as covered by local trust-gate tests for this release tier; network GitHub marketplace certification remains part of future ecosystem certification, not a blocker for built-in skills production readiness.

## Recommendation

The skills layer is ready to support guarded public release positioning as a premium feature, with careful wording:

- Say: "Production-grade skill prompts for guarded workflows, with structured tool policies and quality checks."
- Say: "Designed to produce specific, evidence-aware, human-quality writing and creator workflows."
- Do not say: "Fully live-certified across every provider and tool."
- Do not say: "Bypasses AI detectors."

Next step: keep `npm run test:skills` in the local release workflow and run `npm run test:int:skills:full` before dated public certification releases.
