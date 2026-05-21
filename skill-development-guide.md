# AgentCraft Domain Skill Development Guide

> **Purpose:** A complete, self-contained blueprint for authoring AgentCraft domain skills that consistently score 9.5/10 or above on audit. Every section is required. Shortcuts are the primary reason skills fail.

---

## 1. The Quality Standard

Every skill is audited on four equally-weighted dimensions (2.5 points each, 10 points total). A skill must score ≥ 9.5 to ship.

Each dimension is scored on **two axes**: structural completeness (required fields present, required elements included) AND professional knowledge depth (content reflects actual practitioner expertise, not pattern-matched surface content). Both axes must pass — structural completeness without depth scores no higher than 1.8/2.5.

| Dimension | Max | Structural requirement | Knowledge depth requirement |
| --- | --- | --- | --- |
| **Role Depth** | 2.5 | 20+ years (specific number), named institutions/platforms/companies, personal failure story with specific consequence unique to this skill's domain | The failure story must encode a domain-specific mechanism — the causal chain from wrong decision to harmful outcome that only a practitioner would know. A generic business failure (missed revenue, bad PR, user complaints) is structural without depth. A mechanism-specific failure (MPP inflation masking real engagement decline, last-touch attribution crediting email in a long-cycle sale, segment logic excluding the wrong state) is both structural AND deep. |
| **Domain Intelligence** | 2.5 | All 6 fields present and skill-specific; vocabulary ≥ 10 terms; metrics include thresholds; minimumInput ≥ 4 items | Vocabulary terms must be operationally meaningful — terms a practitioner uses in decision-making, not just recognition. Metrics must match real industry thresholds from actual practice in this domain (not borrowed from adjacent domains or invented). minimumInput must reflect what practitioners actually pull before starting work in this specific context, including the non-obvious inputs that a junior would forget. |
| **Prompt Quality** | 2.5 | All 8 sections present; constraints ≥ 4; outputFormat ≥ 4 sections; failureBehavior ≥ 3 with fallback/assumption/input structure | Constraints must block failures that actually occur in real domain practice — not theoretically possible failures. outputFormat sections must produce a professional artifact that a practitioner would actually deliver to a client, stakeholder, or team (not a school-essay format dressed in domain vocabulary). safetyNotes must identify the actual downstream risk to the specific professional or organization, not generic "verify before use" caveats. |
| **Example Quality** | 2.5 | Concrete scenario with specific numbers; output shows evidence → diagnosis → decision → edge case → next action; note names the non-obvious move | The output must demonstrate judgment that could only come from field experience — the move a generalist skips because they do not know it matters. The note must name the mechanism, explain what the generalist does instead, and teach a reusable pattern. An example that looks professional but could have been written by reading domain descriptions instead of practicing in the domain fails this axis. |

### The production skill fingerprint

Before writing any field, create a one-line fingerprint:

```typescript
// This skill exists to catch <specific failure> before <specific bad consequence>.
```

Examples:
```typescript
// This skill exists to catch uncapped indemnification exposure before contract execution.
// This skill exists to catch information-gain gaps before content is published into a saturated SERP.
// This skill exists to catch trigger-tracking gaps before a behavioral email sequence goes live.
// This skill exists to catch calendar overload before Wednesday becomes unsalvageable.
```

Every field in the skill must reinforce this fingerprint. If a prompt section does not strengthen it, rewrite or remove it.

### What separates a valid skill from a production skill

A valid skill has the schema, a role, a few constraints, and an example. A production skill does something harder: it forces the model to make the same discriminating judgment a senior practitioner would make under uncertainty.

**Non-negotiable standards:**

- **No generic professional masks.** "You are an experienced X" is not a persona. The role must encode what the expert notices, what they distrust, and which failure they have personally seen damage users, customers, revenue, safety, compliance, delivery, or trust.
- **No interchangeable sibling skills.** Skills in the same category share safety boundaries — nothing else. Role, constraints, output format, checklist, and example must clearly belong to this exact skill and no other.
- **No label-only output formats.** "Findings," "Recommendations," and "Next Steps" are section names, not output specifications. Every output section must state the cognitive job it performs, the evidence it uses, and how it should be judged.
- **No flat examples.** A short correct answer is not enough. Examples must model senior reasoning: diagnosis, evidence boundary, risk, tradeoff, next action, and a non-obvious professional move that a generalist would miss.
- **No vocabulary stuffing.** Domain terms must change the diagnosis, decision, risk score, artifact shape, owner action, or review gate. If a term is present only to sound professional, remove it.
- **No hidden uncertainty.** The skill must keep source-backed facts, user-provided context, tool output, assumptions, and model inference visibly separate.

---

## 2. Repository Structure

### Domain factory architecture

All domain skills flow through one shared factory:

```
src/agent/skills/domains/__shared__/domain-skill-factory.ts
  └── defineDomainSkillSpec(definition: DomainSkillDefinition): SkillSpec
```

Each domain wraps it in a thin domain-specific utility:

```
src/agent/skills/domains/<domain>/<domain>-skill-utils.ts
  └── define[Domain]SkillSpec(definition: Omit<DomainSkillDefinition, 'domain'>): SkillSpec
```

**Critical rule:** Only the domain-level utility exists. There are no category-level sub-factories. Importing `defineContractReviewSkillSpec` or `defineArchitectureSkillSpec` will fail at compile time — these do not exist.

### Correct import pattern

```typescript
// src/agent/skills/domains/legal/contract-review/my-skill.skill.ts
import { defineLegalSkillSpec } from '../legal-skill-utils.js';

export const MY_SKILL_SPEC = defineLegalSkillSpec({
  name: 'my-skill',
  directive: 'perform-action',
  // ...
});
```

---

## 3. The Full Skill Schema

```typescript
interface DomainSkillDefinition {
  name: string;               // kebab-case, unique within domain
  title: string;              // human-readable display name
  description: string;        // one sentence: what it produces and the failure it prevents
  directive: string;          // imperative verb phrase — the ACTION performed
  category: string;           // sub-grouping within domain
  stage: DomainSkillStage;    // 'context' | 'strategy' | 'creation' | 'review' | 'operations'
  requiredAdapters?: string[];
  optionalAdapters?: string[];
  consumesArtifacts: string[];
  producesArtifacts: string[];   // PLURAL array — producesArtifact (singular) does not exist
  domainIntelligence: DomainSkillIntelligence;
  prompt: DomainSkillPrompt;
  examples?: SkillSpecExample[];  // optional in schema, required for 9.5+
}
```

**Common schema mistakes:**
- `producesArtifacts` is a **plural array** — TypeScript rejects the singular form
- `directive` must be an imperative verb phrase — the factory warns when `directive === name`
- All 6 `domainIntelligence` fields are required
- All 8 `prompt` fields are required

### Stage selection

| Stage | Use when |
|---|---|
| `context` | Summarizing, briefing, gathering background |
| `strategy` | Planning, issue lists, negotiation prep |
| `creation` | Drafting, writing, generating |
| `review` | Analyzing, auditing, red-lining |
| `operations` | Running, executing, deploying |

### Directive naming

The directive is the short imperative action the skill performs — not the skill name restated.

| Bad (noun phrase or echoed name) | Good (imperative verb phrase) |
|---|---|
| `'code-review'` | `'review-code'` |
| `'contract-summary'` | `'summarize-contract'` |
| `'dependency-risk-analysis'` | `'analyze-dependency-risk'` |
| `'ad-angle-generator'` | `'generate-ad-angles'` |
| `'runbook-writer'` | `'write-runbook'` |
| `'seo-keyword-research'` | `'research-seo-keywords'` |

---

## 4. The `domainIntelligence` Object — Field-by-Field

The domain intelligence object is not a glossary. It is the expert's operating system: the vocabulary, metrics, data sources, gates, and freshness logic needed to behave like a practitioner in that domain. Every field must be skill-specific — not shared boilerplate from sibling skills.

Before writing any field, ask: **If I copied this field into a sibling skill, would it still be correct?** If yes, it is not specific enough.

---

### Field 1: `vocabulary`

**Purpose:** Domain terms that, when present, change what the model produces. Each term should unlock a more specific, expert-level output.

**The test for each term:** If you removed this term from the vocabulary list, would the model's output quality drop? If no, cut it.

**What fails:**
- The skill's own name as a vocabulary term (e.g., `'ad-audience-research'` in the audience research skill)
- Generic professional terms that appear in every skill (`'stakeholder', 'best practices', 'ROI'`)
- Craft-phrase descriptors that describe the skill's purpose rather than the domain
- Inflated counts of weak terms to look substantive

**What passes:**
- Terms that have specific operational meaning in this domain and change the expert's diagnosis
- Terms that distinguish expert analysis from surface-level analysis
- 10–14 terms maximum — quality over count

**Failing vocabulary (ads skill):**
```typescript
vocabulary: [
  'ad angle generator',           // ← the skill's own name, circular
  'paid advertising',             // ← too generic, present in every marketing skill
  'creative performance',         // ← generic, adds no analytical leverage
]
```

**Passing vocabulary (ads skill):**
```typescript
vocabulary: [
  'angle mechanism',              // ← the belief change that makes a specific angle work
  'conversion belief',            // ← what the buyer must believe for the conversion to happen
  'surface feature mimicry',      // ← copying competitor angle without understanding why it worked
  'isolation variable',           // ← the single element being tested in one variant
  'belief tapping vs. belief creation', // ← whether you are activating existing beliefs or building new ones
  'AIDA decay rate',              // ← how quickly a given hook loses effectiveness at scale
]
```

The passing terms change what the model asks about, classifies, and flags. The failing terms produce the same output whether present or absent.

---

### Field 2: `metrics`

**Purpose:** The quantitative signals this skill reads and produces, with the thresholds that change the expert's decision.

**What fails:**
- Metric names without units or thresholds (`'conversion rate'`, `'email performance'`, `'readability score'`)
- Metrics shared across all sibling skills in a category (recycled from a template)
- Metrics that describe what the skill does rather than what it measures

**What passes:**
- Specific threshold that changes the expert's recommendation
- The decision implication of each threshold (what happens when the metric crosses the line)
- Metrics unique to this skill's specific analytical purpose

**Failing metrics:**
```typescript
metrics: [
  'conversion rate',              // ← no threshold, no decision implication
  'open rate',                    // ← no threshold
  'click-through rate',           // ← could be in any email/ads skill
]
```

**Passing metrics (email performance review skill):**
```typescript
metrics: [
  'human-confirmed open rate (Apple MPP-adjusted); watch threshold: <15% of sent is a deliverability signal',
  'click-to-open rate (CTOR); industry benchmark 8–12%; <5% signals promise-body mismatch',
  'unsubscribe rate; watch threshold: >0.5% per send; spam complaint threshold: >0.1%',
  'inbox placement rate by ISP; <90% triggers deliverability audit before next send',
  'list health decay rate: >2% hard bounce per month requires immediate list hygiene',
]
```

Each metric tells the model what to measure, when to escalate, and what decision follows.

---

### Field 3: `toolsAndDataSources`

**Purpose:** The actual documents, feeds, exports, and tools this skill consumes — specific enough that a practitioner knows exactly what to pull before starting work.

**What fails:**
- Generic categories (`'relevant documents'`, `'industry data'`, `'market research'`)
- Items recycled from the domain template that are not relevant to this specific skill (e.g., `'approval checklist for claims and publishing'` in a competitor content analysis skill)
- Vague source descriptions that could apply to any skill in the category

**What passes:**
- Named tools with the specific export or report required
- Source descriptions that include the date-stamping or versioning requirement
- Only items that this skill actually uses — no padding

**Failing toolsAndDataSources (email segmentation analysis):**
```typescript
toolsAndDataSources: [
  'brand or messaging guidelines',          // ← not a segmentation data source
  'approval checklist for claims',          // ← not relevant to segmentation
  'analytics export with date range',       // ← too generic
]
```

**Passing toolsAndDataSources (email segmentation analysis):**
```typescript
toolsAndDataSources: [
  'CRM export with field schema, consent status, opt-in date, and opt-in source per record',
  'engagement history by list cohort: opens, clicks, and purchase events with dates (Apple MPP-adjusted)',
  'suppression list and unsubscribe log with timestamp and reason code',
  'ESP segment definition export with criteria, last-updated date, and sending history',
  'prior-period send performance by segment (open rate, CTOR, unsubscribe, revenue-per-recipient)',
]
```

---

### Field 4: `minimumInput`

**Purpose:** The exact inputs the skill checks for before beginning work. Missing any one item triggers `failureBehavior`.

**The most common structural failure in the entire domain:** A generic 4-item boilerplate shared across all sibling skills (`'business goal', 'target audience', 'offer context', 'any available data'`). This scores 1.5/2.5 automatically.

**What fails:**
- Generic inputs that describe what almost any marketing/engineering/legal skill needs
- Only the obvious primary artifact without the decision context that makes it actionable
- Same list as every sibling skill in the category

**What passes:**
- Inputs specific enough that a junior team member knows exactly what file to pull and what version/date it requires
- Includes the decision context, not just the artifact (a contract review needs the business objective, not just the contract)
- At least one input that is non-obvious — the thing a junior would forget to gather

**Failing minimumInput (email sequence planner):**
```typescript
minimumInput: [
  'Business goal or campaign objective',
  'Target audience or segment',
  'Offer context or value proposition',
  'Any available performance data',
]
```

**Passing minimumInput (email sequence planner):**
```typescript
minimumInput: [
  'Lifecycle stage and conversion definition (what action ends the sequence and suppresses further sends)',
  'Trigger events available from product/CRM: list which behavioral events are live in the system, not just planned',
  'Suppression rules: what segments must not receive this sequence and what conditions pause or exit a subscriber',
  'Current sequence inventory: what sequences are already running that could overlap with this one',
  'Prior performance baseline for this segment: CTOR, unsubscribe rate, and conversion rate to calibrate expectations',
]
```

The passing list gates on the specific data failure that causes behavioral sequences to misfire. The failing list could serve any marketing task.

---

### Field 5: `freshnessRules`

**Purpose:** The non-obvious conditions under which previously gathered data becomes stale for this specific skill's purpose.

**What fails:**
- Generic rules that apply to everything (`'Use the most current version of all documents'`)
- Rules copied from a sibling skill that describe a different domain (e.g., a travel prep rule appearing in a document summary skill)
- Rules that say "data must be current" without explaining what makes it stale for this skill specifically

**What passes:**
- Rules that name a specific event or time window that invalidates prior evidence for this skill
- Rules that explain WHY the staleness matters — what wrong decision the stale data would produce

**Failing freshnessRules:**
```typescript
freshnessRules: [
  'Use current data for best results.',
  'Verify all information before making recommendations.',
]
```

**Passing freshnessRules (SEO SERP analysis):**
```typescript
freshnessRules: [
  'SERP snapshots older than 72 hours may not reflect a recent algorithm update; check Google Search Status Dashboard for core updates before using older snapshots',
  'Competitor ranking positions change on 24-hour crawl cycles; a position reading from last week may be 3+ positions stale if a core update deployed in the interim',
  'Featured snippet and People Also Ask box composition changes faster than organic rankings; re-pull SERP features if more than 48 hours old when the query is time-sensitive',
]
```

Each rule names the specific mechanism that makes the data stale and the threshold at which it matters.

---

### Field 6: `humanReviewTriggers`

**Purpose:** The specific conditions that require a human to review before the output is acted on — naming the exact professional and the exact reason.

**What fails:**
- Generic triggers (`'output requires human review before use'`)
- Triggers that name a generic role without explaining why that role specifically (`'requires management review'`)
- A single boilerplate trigger shared across all skills in the domain

**What passes:**
- Each trigger names a specific professional function (not a generic title) and the specific risk that function is qualified to assess
- Triggers that are non-obvious — things a junior would not think to escalate

**Failing humanReviewTriggers:**
```typescript
humanReviewTriggers: [
  'Any output that will be published requires an accountable marketing owner to approve.',
]
```

**Passing humanReviewTriggers (ad compliance review):**
```typescript
humanReviewTriggers: [
  'Ads making outcome claims in regulated verticals (healthcare, financial services, education, legal services) require review by in-house regulatory counsel or an external compliance attorney before launch — FTC enforcement in these sectors treats agency-drafted copy as the advertiser\'s direct liability',
  'Ads using customer testimonials, case studies, or logos require documented permission and a signed release on file — the ad platform\'s approval of the creative does not substitute for the legal permission',
  'Ads containing before/after comparisons, clinical or safety claims, or competitive superiority statements require MLR (medical/legal/regulatory) committee review before trafficking — these claims carry the highest FTC substantiation burden',
]
```

---

## 5. The `prompt` Object — All 8 Sections in Depth

All 8 fields are required. The factory passes them verbatim — no injection, no fallback, no merging. What you write is what the model receives.

### The anti-template rule

Shared domain patterns are acceptable only for:
- Common safety boundaries
- Common tool distrust and approval rules  
- Shared privacy/security/professional review warnings

Everything else must be skill-specific. If a prompt section could be moved to a sibling skill without becoming wrong, it is not specific enough.

---

### Section 1: `role`

**The single highest-leverage field.** This is where audit scores separate. The role is not a title — it is a professional operating contract that encodes what the expert notices, what they distrust, and which failure they have personally seen cause damage.

**The four required elements:**

1. **Specific years of experience** — a named number (20+), not "over two decades"
2. **Named institutions or contexts** — companies, regulatory bodies, platforms, industries, client types
3. **A personal failure story** — specific consequence, unique to this skill's domain, that explains why the hardest constraint exists
4. **The expert's distinctive framing** — the mental model or default assumption that a non-expert does not hold

**The failure story is the most important element.** It is not decoration. It encodes the reason the hardest constraint is non-negotiable. Without it, constraints become rules without reasons — and the model applies them mechanically rather than judgmentally.

The failure story must be:
- Specific to this skill's analytical purpose (not shared with siblings)
- Concrete in its consequence (dollars, days, accounts, regulatory actions, rejected deliverables)
- Mechanistically connected to the constraint it supports

**What the role should also encode:**

The role should include the expert's default bias — the thing they distrust until proven otherwise:
- A paid media strategist distrusts lookalike audiences seeded from demographic data when behavioral data is available.
- An SEO strategist distrusts keyword volume data when intent classification has not been confirmed against SERP features.
- A compliance reviewer distrusts creative that has passed internal review but has not been tested against the net impression doctrine.
- A campaign performance analyst distrusts MQL counts before checking whether the definition changed between periods.

This bias is what makes the skill behave like a professional instead of a content template.

**Failing role:**
```
You are an experienced digital marketing strategist with 20+ years in the field.
You have worked with many organizations on campaign performance and understand
both strategic and executional needs across digital channels.
```

Fails because: no named institutions, no failure story, no distinctive framing, could describe anyone.

**Passing role (email performance review):**
```
You are an email marketing performance analyst and deliverability specialist
with 22 years of experience managing email programs at Eloqua, Braze, and
Klaviyo — and consulting for enterprise senders in retail, SaaS, and financial
services. You have rebuilt email programs after Apple MPP rolled out in
September 2021 and watched teams confidently scale budgets on a 38% open rate
that was 80% bot traffic. You approved a campaign as a success based on that
rate, recommended $400K in follow-on investment, and watched the next quarter
produce 60% fewer real opens because human engagement had been declining behind
the inflated MPP numbers the entire time. You know that open rate has been a
corrupted signal since iOS 15, and any performance review that treats it as
ground truth is producing fiction dressed as data.
```

Passes because: 22 years (specific), named platforms (Eloqua, Braze, Klaviyo), failure story with specific dollar amount and specific mechanism (MPP inflation), distinctive framing (open rate is corrupted signal since iOS 15).

---

### Section 2: `goal`

**One sentence.** What this skill produces AND the professional failure it prevents.

Do not write "Produce high-quality output" or "Help the user achieve their marketing goals." Write what the expert is specifically trying to prevent and what artifact prevents it.

**Failing goal:**
```
Help the user create effective email sequences that drive engagement and conversions.
```

**Passing goal:**
```
Produce an email sequence architecture that maps each email to a verified trigger
event and a confirmed suppression rule — so the sequence delivers the right
message at the right behavioral moment without firing post-goal, post-unsubscribe,
or post-suppression sends that damage deliverability and subscriber trust.
```

The passing goal names the specific failure (post-goal and post-suppression sends), the specific artifact (sequence architecture with trigger and suppression mapping), and why it matters (deliverability and trust damage).

---

### Section 3: `constraints`

**The highest-value section after role.** Each constraint must block a specific expert failure mode — the specific mistake that a competent but non-specialist practitioner would make.

**The three-part constraint structure:**
1. The rule — what must or must not happen
2. The consequence — what specific damage occurs when violated
3. The discriminator — when this rule applies vs. when it does not (edge case handling)

**The decision-calibrated constraint rule:**
At least one constraint must force the output to name how evidence changes a decision. Generic constraints that do not name the decision lever earn no audit credit.

**Failing constraint:**
```
Ensure all recommendations are based on available data and aligned with business goals.
```

**Passing constraints:**

```
Subject line performance must be evaluated against the specific segment receiving the
email, not in isolation — a 41% test open rate on a subject line about account expiration
is the wrong signal if 60% of the receiving segment has already renewed; the subject line
created panic, triggered 800 unsubscribes, and the batch had to be suppressed after 20,000
sends. Segment-subject fit must be confirmed before any send recommendation is finalized.
```

```
Conversion rate improvements must be evaluated against downstream qualification quality,
not just conversion volume — a 38% conversion rate lift that reduces demo-to-SQL from
41% to 29% is not a success; it is a lead-quality collapse that will not appear in
topline metrics until the next pipeline review. Every conversion recommendation must
name the expected effect on SQL rate, not just conversion rate.
```

```
Attribution model selection must precede channel comparison — comparing channels across
different attribution windows or models produces numbers that cannot be compared at all;
a last-touch model will always credit email when cart-abandonment sequences fire near the
end of a long sales cycle, regardless of which channel actually drove the decision.
```

Each failing constraint would produce wrong output without it. Test every constraint against: "Would a competent non-specialist skip this step and still seem reasonable?"

**How many constraints:** 4–6. Each must be distinct. Repeating the same caution with different words earns no credit.

---

### Section 4: `toolUsePolicy`

**Purpose:** When to call adapters, what to distrust in tool output, and what requires human approval before the model acts.

Minimum 2 items. For most domain skills:
1. When and how to use the filesystem adapter
2. What to distrust in tool output (source freshness, data gaps, coverage limits)
3. What side effects require an approval gate

**Failing toolUsePolicy:**
```
Use available tools to gather relevant information.
```

**Passing toolUsePolicy (competitor content analysis):**
```typescript
toolUsePolicy: [
  'Use the fetch adapter to retrieve competitor pages; treat all scraped data as point-in-time and note the retrieval date in every finding — a page crawled today reflects today\'s strategy, not historical positioning',
  'Do not treat a single SERP snapshot as a trend; keyword position, featured snippet presence, and SERP feature composition require at least two time-separated data points before a directional claim can be made',
  'Organic traffic estimates from third-party tools (Ahrefs, Semrush) are modeled approximations with ±30–50% error margins; label any traffic-based conclusion as "estimated" and never use estimated traffic as the sole basis for an opportunity recommendation',
  'Do not synthesize competitor strategy from data that is more than 90 days old without flagging that the intelligence may predate a major product, pricing, or messaging change',
]
```

---

### Section 5: `outputFormat`

**Purpose:** The named sections of the skill's output, with the cognitive job each section performs.

**The test for each section:** Does this section name tell the reader what cognitive work was done, what evidence was used, and how to judge the quality of that section's content?

**What fails:**
- Section names without descriptions (`'Findings', 'Recommendations', 'Next Steps'`)
- Sections recycled from sibling skills that do not match this skill's actual output (e.g., "Asset and channel plan" in a performance review skill)
- Generic section ordering that is the same across all skills in a category

**What passes:**
- Each section name states the cognitive job performed
- Sections are ordered to match the expert's actual reasoning sequence
- No section overlaps with another in content or purpose
- The full set of sections, read together, produces a complete professional output that a senior practitioner would recognize as their work product

**Standard cognitive jobs that every domain output should cover (adapted to the skill):**
- **Verdict or diagnosis:** the decision, risk level, readiness classification, or root cause
- **Evidence inventory:** what is sourced, inferred, missing, stale, or tool-derived
- **Decision logic:** why the evidence changes the recommendation
- **Risk or edge-case register:** what could break, who is harmed, what approval is needed
- **Tradeoff or non-goal:** what not to do and why
- **Next action:** owner, artifact, metric, review gate, or verification step

**Failing outputFormat (campaign performance review):**
```typescript
outputFormat: [
  'Campaign summary: an overview of the campaign.',
  'Asset and channel plan: the channels used.',    // ← planning artifact in a review skill
  'Owner and dependency map: stakeholders.',        // ← planning artifact in a review skill
  'Recommendations: what to do next.',
]
```

**Passing outputFormat (campaign performance review):**
```typescript
outputFormat: [
  'Performance vs. objective: actual results against stated campaign goal — separated by metric type (volume metrics, quality metrics, pipeline metrics); anomalies >15% above or below target are flagged for investigation before they are reported as success or failure',
  'Channel contribution: each channel\'s role in the outcome with attribution model stated and caveat labeled — do not compare channels across different attribution windows',
  'Attribution caveats: findings that may be artifacts of the measurement model rather than real performance signals — including any period where definition, tracking, or scoring may have changed',
  'Next-cycle decisions: the specific changes to budget, targeting, creative, or measurement that the data supports — each decision names the evidence basis and the expected effect',
  'Anomaly log: results that are materially above or below historical baseline with a hypothesis for cause — anomalies that lack a credible hypothesis are flagged for data investigation before being used in planning',
  'Open questions: data gaps, model limitations, or missing context that would change the conclusions if resolved',
]
```

---

### Section 6: `qualityChecklist`

**Purpose:** Pre-finalization verification — the checks the model performs on its own output before returning it.

Each item must be phrased as a yes/no question the model can answer by reading its draft. Generic items earn no credit.

**What fails:**
- Items that are true of all good outputs regardless of skill (`'Output is clear and well-organized'`)
- Items repeated from sibling skills without modification
- Items that state goals rather than checks (`'Ensure recommendations are actionable'`)

**What passes:**
- Items that catch the specific failure modes this skill is designed to prevent
- Items that verify the skill's unique analytical contribution was applied
- At minimum one anti-slop item for domains prone to polished but empty output

**Failing qualityChecklist:**
```typescript
qualityChecklist: [
  'Output is accurate and complete.',
  'Recommendations are actionable.',
  'Tone is appropriate for the audience.',
]
```

**Passing qualityChecklist (SEO technical audit):**
```typescript
qualityChecklist: [
  'Every finding is scored on both technical severity AND revenue exposure — a finding that is technically severe but touches zero revenue pages is lower priority than a finding that is technically minor but affects the top-10 revenue templates',
  'Canonicalization findings have been checked for revenue-template impact before being labeled "low priority" — the default "low priority" label for canonical issues is wrong when the affected pages generate measurable organic revenue',
  'Technical changes and content changes are listed in separate sections — mixing them creates execution confusion because they have different owners and different risk profiles',
  'Each finding names the specific engineering or platform owner who must implement the fix — "developers" is not an owner',
  'No finding recommends structural URL changes without a redirect strategy attached — URL changes without redirects destroy accumulated link equity',
  'The priority order reflects both severity and implementation difficulty — a high-severity fix that requires 6 months of engineering work should be ranked below a medium-severity fix that deploys in an afternoon',
]
```

**Anti-slop item for text-heavy skills:**
```typescript
'No sentence exists only to sound professional; every sentence changes evidence quality, risk assessment, scope boundary, owner action, or decision confidence.'
```

---

### Section 7: `failureBehavior`

**Purpose:** Recovery paths for the 3 most likely failure conditions — missing input, ambiguous input, and input that makes the task impossible.

**The key rule:** Failure behavior must preserve forward motion without hallucinating. Every item has three parts:
1. **Fallback artifact** — what partial output can still be produced
2. **Conservative assumption** — what assumption is being applied and why it limits confidence
3. **Smallest missing input** — the exact next input needed to unblock the full answer

**Failing failureBehavior:**
```typescript
failureBehavior: [
  'If information is missing, ask the user for clarification.',
  'If data is unavailable, note this in the output.',
  'If the task cannot be completed, explain why.',
]
```

These are stalls, not recovery paths. They produce no useful output and no forward motion.

**Passing failureBehavior (email sequence planner):**
```typescript
failureBehavior: [
  'If trigger events are described as "planned" rather than confirmed live in the system: document the sequence architecture with all trigger dependencies labeled as unverified, mark the sequence as blocked from execution until triggers are confirmed live, and specify the exact verification check required (confirm in ESP event log that the event fires with the correct payload)',
  'If prior performance data is unavailable for the target segment: build the sequence against category benchmarks (CTOR 8–12%, unsubscribe <0.5% per send) and flag each timing and frequency decision as benchmark-derived rather than segment-derived; request 30 days of actual send data before the sequence is scaled beyond a 500-subscriber pilot',
  'If the lifecycle stage or conversion definition is not specified: default to a mid-funnel nurture architecture (awareness → consideration → decision) with soft CTAs, and flag that the sequence cannot be suppressed correctly without a defined conversion event — present the suppression configuration as a required field before the sequence is activated',
]
```

---

### Section 8: `safetyNotes`

**Purpose:** The execution boundary — what the skill produces vs. what requires human professional action.

Every safetyNotes section must include:
- The boundary between drafting and executing
- The specific professional whose judgment this skill does not substitute for
- Confidentiality or data sensitivity handling
- At least one injection/hallucination risk boundary

**Domain-specific execution boundaries that must appear:**

| Domain | Required boundary statement |
|---|---|
| Legal | Do not provide legal advice; output requires qualified legal counsel review |
| Finance | Do not provide personalized investment, tax, or financial advice |
| Healthcare | Do not diagnose, prescribe, or replace clinician judgment |
| Sales | Do not send outreach, enroll contacts, or mutate CRM records |
| Support | Do not promise refunds, credits, fixes, or timelines without approval metadata |
| Marketing | Do not publish, post, or traffic creative without claim approval and legal sign-off |
| Engineering | Do not merge, deploy, or execute infrastructure changes without engineering review |
| Product | Do not create issues, publish release notes, or commit roadmap changes without approval |

**Failing safetyNotes:**
```typescript
safetyNotes: [
  'Always verify information before use.',
  'This output should be reviewed by a qualified professional.',
  'Do not use this output as professional advice.',
]
```

**Passing safetyNotes (ad compliance review):**
```typescript
safetyNotes: [
  'This review identifies compliance risk; it does not constitute legal advice. Claims flagged as high-risk require review by qualified regulatory counsel before the creative is trafficked — the FTC holds advertisers, not agencies or tools, liable for false or misleading advertising',
  'Net impression assessment requires human judgment about how a reasonable consumer perceives the full creative unit — this review identifies individual claims, but only a compliance attorney or experienced MLR reviewer can assess whether the combination of visual, audio, and text creates a misleading impression under the FTC Act',
  'Platform policies update without notice; a compliance review completed before a policy update may not reflect current enforcement standards. Always confirm against the live platform policy before trafficking',
  'Do not traffic any creative flagged as requiring legal review — even if the advertiser wishes to proceed, doing so without resolution creates documented liability that is worse than the delay',
  'Competitor claims, comparative advertising, and superiority statements require substantiation that must exist before the ad runs, not after — do not traffic comparative claims without written substantiation on file',
]
```

---

## 6. Examples — The Professional Reasoning Standard

The `examples` field is optional in the TypeScript schema but **required to score above 9.5**. Every production skill must have at least one example.

### What an example must demonstrate

An example is not a sample answer. It is a problem-solving dataset row that teaches the model the expert's judgment pattern. The model learns from examples — so each one must demonstrate how an expert moves from messy, real-world input to a defensible professional decision.

Every example must show:

| Element | What it demonstrates |
|---|---|
| **Problem framing** | What the user appears to ask vs. what the real professional problem is |
| **Evidence classification** | What is source-backed, what is inferred, what is stale, what is missing |
| **Decision path** | The steps that connect evidence to the verdict |
| **Skill-specific judgment** | The exact professional discriminator this skill exists to apply |
| **Edge case or risk boundary** | What could break, who could be harmed, what approval is needed |
| **Tradeoff or non-goal** | What the expert intentionally refuses to do |
| **Next action** | A concrete owner/action/check — not "monitor results" |

### The four-part structure

```typescript
examples: [{
  label:  'Scenario name — names what professional judgment is being demonstrated',
  input:  'Concrete real-world input with specific numbers, dates, clauses, metrics, or quotes',
  output: 'Multi-step professional reasoning: diagnosis → evidence trace → decision logic → edge case → tradeoff → next action',
  note:   'The senior move: what a junior practitioner would miss, and why this output handles it correctly',
}]
```

### Input quality standard

The input must be concrete enough that a wrong recommendation is possible. Generic inputs produce only correct-looking output. Real inputs produce diagnostic tension.

**Minimum required signals in an input:**
- At least one specific number, date, dollar amount, metric reading, or count
- Enough context that the wrong recommendation is tempting
- At least one signal that the expert must classify (not just use)

**Failing input:**
```
A company wants to review their email performance and understand how to improve
their campaigns going forward.
```

**Passing input:**
```
Email performance review request: 3-week promotional campaign, 180,000 subscribers,
4 sends. Reported metrics from ESP: average open rate 34%, CTOR 2.1%, unsubscribe
rate 0.22%, revenue-per-send $18,400. List is 67% Apple Mail users based on device
reports. Prior campaign (same segment, 6 weeks ago): open rate 28%, CTOR 2.4%,
revenue-per-send $21,200. Sales team reports the campaign underperformed expectations
despite the "best open rates we've seen in 18 months."
```

The passing input creates diagnostic tension: open rates are up but revenue is down. The Apple Mail percentage is the key signal. The model must classify the open rate data before it can assess performance.

### Output quality standard

The output must show professional reasoning embedded in the result — not a flat recommendation.

**The output must include all of these:**

1. **Diagnosis** — what is really happening beneath the surface
2. **Evidence trace** — the specific facts from the input that support the diagnosis
3. **Non-obvious move** — what the expert does that a generalist would skip
4. **Edge case or risk boundary** — what could break the recommendation
5. **Tradeoff** — what is intentionally being deferred or rejected
6. **Next action** — specific, owner-named, time-bound where possible
7. **Skill-specific judgment** — the analytical discriminator unique to this skill

**Failing output (surface-level):**
```
The campaign performed well based on open rates. CTOR was acceptable.
Recommend A/B testing subject lines and optimizing send time for future campaigns.
```

**Passing output (professional reasoning chain):**
```
Performance Verdict: the campaign underperformed despite inflated open rate — do not
report this as a success or use it to inform budget decisions.

Evidence trace: 67% Apple Mail users means roughly 60,000+ of the reported "opens"
are MPP bot-triggered reads with no human engagement signal. Stripping estimated bot
opens, the human open rate is approximately 11–14% — lower than the prior campaign's
28% reported rate. The drop in CTOR from 2.4% to 2.1% and revenue-per-send from
$21,200 to $18,400 confirms that real engagement declined while reported metrics
improved. The sales team's "underperformance" assessment is correct; the ESP dashboard
created a false signal.

Non-obvious move: the prior campaign's 28% open rate must also be re-examined for MPP
inflation — if bot-opens were already inflating that figure, the six-week trend is
worse than the comparison suggests.

Tradeoff: do not optimize for open rate as a primary KPI until the send list is
segmented by mail client; doing so would compound the signal corruption.

Risk: presenting this campaign's open rate numbers to leadership without the MPP
caveat creates budget allocation risk — the next campaign may be over-funded based
on fictional engagement data.

Next action: implement Apple MPP detection segmentation in ESP before the next send;
report CTOR and revenue-per-send as the primary performance signals; request a
retroactive MPP adjustment on the prior 6-month performance baseline before the
next planning cycle.
```

### Note quality standard

The note is the highest-value field in the example for teaching the model judgment.

**What fails:**
```
This example shows how the skill produces high-quality email performance analysis.
```

**What fails (common boilerplate across all skills):**
```
The non-obvious move is [craft phrase]: the skill makes the marketing decision explicit
before producing an artifact.
```

**What passes:**
```
The non-obvious move is MPP desegregation before performance assessment: the expert
does not accept the ESP's open rate report at face value when 67% of the list is Apple
Mail. The judgment that changes the entire assessment — "your best open rates in 18
months are mostly bot traffic" — requires knowing that Apple MPP fires pixel loads at
delivery for a large portion of opens, regardless of whether a human opened the email.
A generalist analyst sees open rate up and reaches for subject line optimization. The
expert sees Apple Mail percentage first and reclassifies the entire dataset before
making any other judgment.
```

The passing note explains the specific mechanism, names what the generalist would do instead, and teaches a reusable judgment pattern.

### Example length guidance

- Output field: 130–300 words
- Full example (label + input + output + note): 200–700 words
- Shorter is acceptable only when extreme domain compression is appropriate and all elements are still present

---

## 7. Common Failure Modes and How to Fix Them

### Failure: minimumInput is generic boilerplate

The most common structural failure across entire domains. The same 4-item list (`'business goal, target audience, offer context, any available data'`) appears in every skill.

**Fix:** For each skill, ask: "What specific data would a junior team member need to pull before this expert could begin work?" List those items. Include at least one non-obvious input — the thing the junior would forget.

### Failure: Role shared across sibling skills

All 6 skills in a category have the same failure story, the same named platforms, the same distinctive framing — only the last sentence changes.

**Fix:** Each skill needs a failure story connected to its specific analytical purpose. The email copywriter's failure story must be about copy that failed, not about deliverability. The email subject line reviewer's failure story must be about a subject line that caused harm, not about segmentation. If swapping the failure story between two sibling skills produces no contradiction, both stories are wrong.

### Failure: outputFormat sections recycled from wrong skill type

Planning section labels (`'Asset and channel plan'`, `'Owner and dependency map'`) appearing in performance review skills. Review section labels appearing in strategy skills.

**Fix:** Read the skill's stage and directive. A `review` stage skill produces a diagnosis and findings — never a plan or calendar. A `strategy` stage skill produces an architecture and sequence — never a findings list. Map each output section to the actual artifact the skill produces.

### Failure: constraints are generic caution statements

`'Ensure output is accurate and complete'`, `'Recommendations must be based on data'`, `'Output must connect audience, offer, channel, proof, metric, and approval path'` appear identically across all 36 skills in a domain.

**Fix:** For each constraint, ask: "What specifically goes wrong when a competent non-specialist misses this?" If the answer is "nothing domain-specific," the constraint is filler. Replace it with the specific failure mode.

### Failure: example note uses boilerplate phrasing

`'The non-obvious move is [craft]: the skill makes the marketing decision explicit before producing an artifact, so the output is not generic [category] advice.'` — this sentence is identical across all 36 skills except for noun substitution.

**Fix:** The note must name the specific analytical mechanism, explain what the generalist does instead, and teach a reusable judgment pattern for this skill specifically.

### Failure: unescaped apostrophes in single-quoted strings

```typescript
// WRONG — breaks the string literal
output: 'The peers' 8x EV/Revenue and today's price'

// CORRECT
output: 'The peers\' 8x EV/Revenue and today\'s price'
// Or use template literal
output: `The peers' 8x EV/Revenue and today's price`
```

### Failure: importing a non-existent sub-factory

```typescript
// WRONG — these do not exist
import { defineContractReviewSkillSpec } from '../contract-review-skill-utils.js';
import { defineArchitectureSkillSpec } from '../architecture-skill-utils.js';

// CORRECT — only the domain-level factory exists
import { defineLegalSkillSpec } from '../legal-skill-utils.js';
import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';
```

### Failure: polished output without operational consequence

A domain skill that does not change a decision, owner action, scope boundary, review gate, or artifact shape is not useful. This failure sounds intelligent but leaves the user with nothing to do.

Fix every skill by ensuring at least one output section answers:
- What changes because of this skill's judgment?
- Who acts next?
- What evidence would reverse or confirm the recommendation?
- What must not happen yet?

---

## 8. Worked Example: Full Skill from Requirement to Audit

**Requirement:** Email marketing domain, email subject line review category. Skill that reviews proposed subject lines before send.

### Step 1: Write the fingerprint

```typescript
// This skill exists to catch promise-body mismatch and segment-subject misfit before
// a subject line is deployed to 100,000+ subscribers and triggers unsubscribes,
// spam complaints, and deliverability damage.
```

### Step 2: Set metadata

```typescript
name: 'email-subject-line-review',
directive: 'review-email-subject-lines',   // not 'email-subject-line-review'
category: 'email-marketing',
stage: 'review',
optionalAdapters: ['filesystem'],
consumesArtifacts: ['EmailDraft', 'EmailPerformanceData'],
producesArtifacts: ['SubjectLineReview'],
```

### Step 3: Write the role

Identify the expert: not a generic email marketer, but specifically someone who reviews subject lines for promise-body fit and deliverability risk. The failure story must be about a subject line, not about segmentation or deliverability strategy.

```
You are an email subject line strategist and deliverability risk reviewer
with 21 years of experience auditing pre-send email creative at Salesforce
Marketing Cloud, HubSpot, and Klaviyo, and for enterprise senders in
e-commerce, SaaS, and financial services with lists exceeding 500,000
subscribers. You approved "Your account is expiring soon" as a test winner
with a 41% open rate — then watched it deploy to 180,000 subscribers, 60%
of whom had already renewed. The word "expiring" triggered panic in renewed
users, generated 1,400 unsubscribes in the first hour, and produced 0.19%
spam complaints that triggered a domain reputation flag. The subject line
was correct for 40% of the list and catastrophic for the other 60%. You had
reviewed it in isolation, not against the segment's account state. You know
that a subject line is not a copywriting exercise — it is a promise made to
a specific person about a specific email. The promise must match the body
and the subject line must be appropriate for the exact state of the
subscriber receiving it, not just the average subscriber on the list.
```

### Step 4: Write domainIntelligence

```typescript
domainIntelligence: {
  vocabulary: [
    'promise-body fit',              // subject line and email body address the same topic
    'segment-subject fit',           // subject line is appropriate for this segment's state
    'curiosity gap',                 // implies the email has an answer the reader needs
    'urgency truthfulness',          // stated urgency exists in the email body
    'personalization token accuracy',// merge tag output matches subscriber data
    'deliverability trigger phrase', // words that increase spam filter scoring
    'spam complaint velocity',       // rate of complaints in first 60 minutes post-send
    'preview text as extension',     // preview text continues the subject, not repeats it
    'scarcity truthfulness',         // stated scarcity is accurate and provable
    'aggressive vs. earned urgency', // earned urgency has a real trigger; aggressive urgency manufactures pressure
  ],
  metrics: [
    'open rate baseline for this segment and send type (prior 90 days, MPP-adjusted)',
    'unsubscribe rate watch threshold: >0.5% per send is a subject line or segment fit problem',
    'spam complaint threshold: >0.08% triggers ISP review; >0.1% triggers deliverability action',
    'CTOR benchmark for this send type: <5% signals subject line overpromised the body',
    'subject line character count: 28–50 characters for mobile-first display; >60 characters truncates on most clients',
  ],
  toolsAndDataSources: [
    'email body copy (required for promise-body fit assessment)',
    'segment definition and account state data (required for segment-subject fit)',
    'prior open rate and CTOR baseline for this segment (MPP-adjusted where available)',
    'prior unsubscribe rate baseline for comparable sends',
    'preview text draft (required to assess subject + preview as a unit)',
  ],
  minimumInput: [
    'The subject line candidates to review (1–5 variants)',
    'The email body copy (required — subject line review without body access is a promise assessment without truth)',
    'The specific segment receiving the email: what subscriber state defines this group (account status, lifecycle stage, purchase history)',
    'Prior open rate and CTOR baseline for this segment over the last 90 days (MPP-adjusted)',
  ],
  freshnessRules: [
    'Prior performance baseline must be from the same send type and segment — a welcome sequence open rate does not predict promotional open rates for the same list',
    'Subject line compliance standards for regulated verticals (financial, healthcare) change when platform policies update — confirm against current platform policy before clearing any claim-adjacent subject lines',
  ],
  humanReviewTriggers: [
    'Subject lines that contain urgency claims about account status, expiration, or restriction require segment verification against the actual account data before send — a subject line that is false for any significant portion of the receiving segment requires list segmentation, not just copy revision',
    'Subject lines for regulated verticals (financial services, healthcare) that reference outcomes, rates, or clinical effects require compliance or legal review before deployment',
  ],
},
```

### Step 5: Write all 8 prompt sections

**role:** (written above in Step 3)

**goal:**
```
Review proposed subject lines for promise-body fit, segment-subject fit,
deliverability risk, and urgency truthfulness — so every subject line deployed
to the list makes a promise the email body keeps, to subscribers in a state
where that promise is accurate and appropriate.
```

**constraints:**
```typescript
constraints: [
  'Subject lines must be reviewed against the email body, not in isolation — a subject line scored on curiosity, urgency, or specificity without reading the body being promised cannot detect promise-body mismatch, which is the primary driver of post-open unsubscribes and spam complaints',
  'Segment-subject fit must be assessed against the specific segment\'s state, not the average subscriber — an accurate subject line for 60% of the list that is alarming or false for 40% is a failed subject line for that send; segment splitting is the correct fix, not copy revision',
  'Urgency and scarcity claims must be true in the email body — manufactured urgency ("last chance," "expires tonight") without a corresponding offer condition in the body trains subscribers to distrust urgency signals, which reduces future performance on sends where the urgency is real',
  'Deliverability trigger phrases must be flagged regardless of copy quality — a technically excellent subject line that contains spam trigger words will be filtered before the subscriber sees it; deliverability risk is not a copy quality tradeoff',
  'Preview text must be reviewed as a unit with the subject line — subject and preview together are the full pre-open context; a strong subject line paired with a preview that repeats the subject or reveals the punchline before the open is a wasted impression',
]
```

**outputFormat:**
```typescript
outputFormat: [
  'Promise-body fit assessment: for each subject line variant, the specific promise being made is named and matched against what the email body delivers — mismatch is flagged with the exact location in the body where the promise breaks down',
  'Segment-subject fit assessment: the subject line is evaluated against the specific state of the receiving segment — any variant that would be false, alarming, or inappropriate for a portion of the segment is flagged with the affected subscriber state and the required segmentation fix',
  'Deliverability risk flags: specific phrases, character combinations, or structural patterns that may increase spam filter scoring — with the risk level and the recommended substitution',
  'Variant ranking with rationale: the variants ranked by expected performance for this specific segment, with the reasoning connecting segment state, body promise, and urgency truthfulness to the ranking',
  'Approval conditions: the specific conditions that must be true before any flagged variant can be sent — including segment verification requirements, body copy changes, and compliance review gates',
]
```

**qualityChecklist:**
```typescript
qualityChecklist: [
  'Every variant reviewed against the full email body — no subject line was scored without reading the promise it makes',
  'Segment state confirmed against the subject line — a subject line was not cleared without verifying it is appropriate for the actual state of subscribers in this segment',
  'Urgency and scarcity claims traced to a corresponding condition in the body',
  'Preview text assessed as a unit with the subject line',
  'Deliverability trigger phrases checked against current filter lists, not just known historical patterns',
  'Approval conditions are specific and actionable — not "requires review" but "requires confirmed account-state data showing X% of segment is in the stated condition"',
]
```

**failureBehavior:**
```typescript
failureBehavior: [
  'If the email body is not provided: complete the deliverability risk and structural assessment only; mark promise-body fit as "cannot assess — body required" and block all send recommendations until body is provided; do not speculate about whether the body matches the subject',
  'If the segment definition is not provided: assess all variants for structural and deliverability risk, flag urgency and scarcity claims as "segment fit unverified," and mark any variant that references account status, expiration, or personalization as blocked until segment data is confirmed',
  'If no prior performance baseline is available: complete the structural review against category benchmarks (unsubscribe <0.5%, spam complaint <0.1%) and label all performance expectations as benchmark-derived; note that segment-specific calibration requires at least 90 days of comparable send history',
]
```

**safetyNotes:**
```typescript
safetyNotes: [
  'Do not approve any variant for send — this review produces a recommendation; the send decision and execution remain with the email team and require human approval',
  'Subject lines that reference account status, security, billing, or legal action must be verified against actual subscriber data before send; false urgency in these categories triggers spam complaints and, in regulated industries, regulatory scrutiny',
  'This review assesses deliverability risk based on known filter patterns; ISP filter algorithms change without notice and a cleared subject line may still be filtered in specific ISP environments — monitor inbox placement after deployment',
  'Personalization tokens must be verified for fallback handling before any subject line that uses merge tags is deployed — a broken token produces "Hi [FIRSTNAME]" at scale, which damages trust and deliverability',
]
```

### Step 6: Write the example

```typescript
examples: [{
  label: 'Account-status subject line that is accurate for 40% of the list and harmful for 60%',
  input: 'Subject line candidates for re-engagement campaign: (A) "Your account is expiring soon", (B) "Don\'t let your progress disappear", (C) "One step to keep your account active". Segment: all users who have not logged in for 30+ days. List size: 180,000. Prior open rate (same segment, 90 days): 19% MPP-adjusted. Email body: reminder that unused accounts are archived after 60 days of inactivity; CTA is "Log in now." Account state data: 61% of the segment (110,000 users) have already logged in within the last 7 days but still qualify for the 30-day re-engagement trigger because the segment logic uses a 30-day window, not a 7-day window.',
  output: 'Segment-subject fit verdict: Variant A is blocked. Evidence: 61% of the 180,000-subscriber segment (approximately 110,000 subscribers) logged in within the last 7 days. "Your account is expiring soon" is false for those users — their account is not expiring, they are active. Deploying Variant A to this segment creates panic in the majority of recipients, not just the minority who are genuinely inactive. Historical reference: a structurally identical send in a comparable deployment produced 1,400 unsubscribes in the first hour and 0.19% spam complaints — both above threshold — before the send was paused. Promise-body fit: Variant B ("Don\'t let your progress disappear") has a promise-body mismatch — the email body describes account archiving, not progress loss; the body must be revised before Variant B can be used or the subject must be changed. Variant C ("One step to keep your account active") passes both fit tests: it is accurate for active users (keeping the account active is always a valid action), is not alarming, and the body delivers the single-step CTA. Recommended variant: C, but only after segment logic is corrected to exclude users who logged in within the last 7 days. Approval condition: segment re-pull with 7-day active exclusion applied before any send is approved. Expected performance: 19–23% MPP-adjusted open rate; CTOR 4–6% based on segment engagement history.',
  note: 'The non-obvious move is segment-state verification before copy selection. A generalist reviewer scores subject lines on curiosity, urgency, and specificity — Variant A scores well on all three — and passes it. The expert checks whether the stated condition is true for the people receiving the email. The segment logic is the defect, not the copy. Variant A is correctly urgent copy for the 39% of the list who are genuinely inactive; it is harmful copy for the 61% who are not. The fix is not copy revision — it is segment correction. This judgment cannot be made from the subject line alone; it requires reading the segment definition and cross-referencing it against actual account state data.',
}]
```

### Step 7: Typecheck

```sh
npm run typecheck
```

Fix all errors before declaring complete. Common: wrong field names, unescaped apostrophes, missing required fields.

### Step 8: Self-audit

| Dimension | Score | Reason |
|---|---|---|
| Role Depth | 2.5 | 21 years, named platforms (SFMC, HubSpot, Klaviyo), failure story specific to subject line review (account-expiring story with specific consequence: 1,400 unsubscribes, domain flag), distinctive framing (subject line is a promise to a specific person in a specific state) |
| Domain Intelligence | 2.5 | All 6 fields specific to subject line review; minimumInput gates on the email body and segment state, not just the subject line variants; freshnessRules address send-type baseline staleness |
| Prompt Quality | 2.5 | All 8 sections present; constraints block the specific failure (segment-state assessment, promise-body matching, urgency truthfulness); outputFormat sections match subject line review output |
| Example Quality | 2.5 | Concrete segment-state data (61% recently active), specific consequence numbers (1,400 unsubscribes, 0.19% complaint rate), output shows the full reasoning chain, note names the non-obvious move (segment verification before copy selection) |
| **Total** | **10.0** | |

---

## 9. Quick Checklist Before Submitting

### Structural completeness (schema and field presence)

- [ ] One-line skill fingerprint written and every section reinforces it
- [ ] Imported from the domain-level factory utility only (no sub-factories)
- [ ] `producesArtifacts` is a plural array
- [ ] `directive` is an imperative verb phrase, not an echo of `name`
- [ ] `vocabulary` contains only real domain terms — skill name removed, no stuffing
- [ ] `metrics` include units, thresholds, and decision implications
- [ ] `minimumInput` is skill-specific — not the generic 4-item boilerplate
- [ ] `freshnessRules` name the specific event or time window that makes data stale for this skill
- [ ] `humanReviewTriggers` name the specific professional and the specific risk
- [ ] All 8 `prompt` sections are present and skill-specific
- [ ] Role includes 20+ years (named number), named institutions, failure story unique to this skill
- [ ] Goal names the artifact and the failure it prevents
- [ ] At least one constraint states how evidence changes a specific decision
- [ ] `outputFormat` sections are not recycled from a sibling skill
- [ ] `qualityChecklist` items are yes/no checks against this skill's specific output
- [ ] `failureBehavior` items provide fallback artifact + conservative assumption + smallest missing input
- [ ] `safetyNotes` define the execution boundary and required human owner
- [ ] At least one example with label/input/output/note
- [ ] Input contains at least one concrete number, date, or metric with diagnostic tension
- [ ] Output shows diagnosis, evidence trace, edge case, tradeoff, and next action
- [ ] Note names the specific non-obvious professional move
- [ ] Apostrophes in single-quoted strings are escaped
- [ ] `npm run typecheck` passes with zero errors

Then apply the full depth audit in Section 10 before declaring done.

---

## 10. Self-Audit: Professional Knowledge Depth Test

This section tests whether your skill content reflects real practitioner expertise — not whether it looks professional. Structure can be added in 20 minutes. Domain knowledge depth takes years to build and cannot be faked by pattern-matching from domain descriptions.

**Run this audit after the structural checklist passes.** A skill that clears Section 9 but fails Section 10 scores at most 7.5/10 and must be rewritten.

The four-question test for every field: **Could this have been written by someone who only read about this domain, or does it require someone who has practiced in it?** If you cannot confidently answer "requires practice," the field needs to be rewritten.

---

### Dimension 1: Role Depth — Depth Questions

#### 1.1 — Failure story mechanism test

Read your failure story. Identify the causal mechanism — the specific chain of events from wrong decision to harmful consequence. Then ask:

> "Would a generalist who read two good books on this domain know that this specific mechanism exists?"

If yes, the failure story is too surface-level. Generalists know that campaigns miss targets, products ship late, contracts have risk, emails get filtered. They do not know:

- That Apple MPP fires pixel loads at delivery, not on human open, and that a list with 67% Apple Mail users will show a 38% open rate that is 80% bot traffic
- That last-touch attribution systematically overcredits email in long-cycle sales because cart-abandonment sequences fire near purchase decisions regardless of which channel drove the consideration
- That a segment logic using a 30-day inactivity window can include users who logged in 7 days ago because the window is a rolling trigger, not a state check
- That FTC net impression doctrine evaluates the whole creative unit — headline, visual, audio, body — not individual claims in isolation

If your failure story describes a mechanism from that second list — something requiring field experience to know — it passes. If it describes something from the first list — something anyone who read about the domain would know — rewrite it.

#### 1.2 — Expert framing swap test

Take your role's distinctive framing — the default bias or operating assumption that shapes every judgment. Then ask:

> "If I placed this framing in a sibling skill's role, would anything contradict?"

If the framing survives the swap, it is not skill-specific. An email performance analyst who distrusts open rates (MPP bias) does not share that bias with an email subject line reviewer (who distrusts copy scores untested against segment state) or an email sequence planner (who distrusts trigger events listed as "planned" rather than confirmed live). If your role's framing applies equally to every skill in the category, rewrite it.

#### 1.3 — Consequence specificity test

Read the harm described in your failure story. Ask:

> "Is this consequence named with enough specificity that someone could look up whether this incident plausibly happened?"

"Cost the company revenue" — too generic. "Generated 1,400 unsubscribes in the first hour and 0.19% spam complaints that triggered a domain reputation flag" — specific enough. "Increased churn" — too generic. "Reduced demo-to-SQL from 41% to 29%, which did not appear in topline metrics until the next pipeline review" — specific enough. If your consequence is generic, the failure story teaches nothing and the constraint it supports has no reason to exist.

---

### Dimension 2: Domain Intelligence — Depth Questions

#### 2.1 — Vocabulary operational test

For each term in your `vocabulary` list, ask:

> "Does knowing this term change what the practitioner measures, classifies, prioritizes, or flags — or does it only change the vocabulary they use to describe what they already knew?"

Terms that pass: *promise-body fit* (changes what you check before approving a subject line), *angle mechanism* (changes what you ask when copying a competitor ad), *attribution model staleness* (changes when you trust a channel comparison report), *net impression doctrine* (changes what claims you flag beyond individual sentences).

Terms that fail: *email marketing* (present in every email skill), *conversion optimization* (describes the skill's purpose, not a decision term), *best practices* (adds no analytical leverage to any output).

If more than 3 of your vocabulary terms fail this test, the vocabulary is stuffed. Cut the failing terms and replace with terms that have operational leverage.

#### 2.2 — Metrics reality test

For each metric in your `metrics` list, ask:

> "Is this threshold derived from actual practice in this specific domain, or did I invent a plausible-sounding number?"

Invented thresholds are one of the most common depth failures. They sound professional but provide wrong calibration. If you are not certain a threshold reflects real industry benchmarks, either:

- Use a range that reflects genuine uncertainty (`'3–8%'` rather than `'5%'`)
- Name the source or context that establishes the threshold (`'ISP complaint threshold: >0.1% triggers deliverability action per major ISP enforcement logs'`)
- Replace the metric with one you can calibrate accurately

A skill with invented thresholds actively harms output quality — the model will use your wrong number as ground truth.

#### 2.3 — minimumInput junior gap test

Read your `minimumInput` list and ask:

> "Would a competent junior team member know to gather all of these before starting work, without being told?"

If yes for every item, your list is too obvious. Production-quality `minimumInput` must contain at least one item that a competent junior would forget — not because they are careless, but because the non-obvious input requires knowing that a specific failure exists.

Examples of non-obvious inputs that only experienced practitioners know to require:

- *Email sequence planner:* "Which trigger events are live in the system, not just planned" — a junior does not know that sequences built on unconfirmed triggers silently fail
- *Subject line review:* "The email body (required — review without body access is a promise assessment without truth)" — a junior treats subject line review as a standalone copywriting task
- *Ad compliance review:* "The full creative unit including visual and audio, not just the ad copy" — a junior does not know that FTC net impression assessment requires the whole unit
- *Contract review:* "The business objective of the transaction (what the party is trying to achieve), not just the contract text" — a junior treats contract review as a text audit, not a negotiation tool

If every item in your `minimumInput` is something a junior would know to gather, add at least one non-obvious gate.

#### 2.4 — freshnessRules mechanism test

For each freshness rule, ask:

> "Does this rule explain WHY the data becomes stale for this specific skill's purpose — or does it just say 'use current data'?"

A freshness rule without a mechanism teaches nothing and produces the same behavior as no rule at all. The mechanism is the rule:

- "SERP snapshots older than 72 hours may not reflect a recent core update" — mechanism: Google deploys core updates that reshuffle rankings; 72 hours is the window within which most visible ranking shifts have propagated
- "Prior open rate baseline must be from the same send type" — mechanism: welcome sequences and promotional sends produce structurally different engagement profiles; comparing across types produces wrong calibration

If your freshness rules say "use current data" or "verify all information before recommendations," they have no mechanism and fail this test.

#### 2.5 — humanReviewTriggers professional specificity test

For each trigger, ask:

> "Does this name the specific professional function (not just a title) AND the specific risk that function is qualified to assess?"

"Requires management review" — fails (no specific function, no specific risk). "Ads in regulated verticals require in-house regulatory counsel review before trafficking — FTC enforcement in these sectors treats agency-drafted copy as the advertiser's direct liability" — passes (specific function: regulatory counsel; specific risk: advertiser liability under FTC enforcement; specific mechanism: agency copy treated as advertiser's own). The professional specificity forces the model to escalate to the right person for the right reason, not just flag "needs review."

---

### Dimension 3: Prompt Quality — Depth Questions

#### 3.1 — Constraints real-practice test

For each constraint, ask:

> "Is this a failure mode that actually occurs in professional practice in this domain — or is it a theoretically possible failure that I included because it sounds cautious?"

Theoretical failures produce useless constraints: "Do not provide output that may be inaccurate" is a theoretical caution. "Do not compare channels across different attribution windows — a last-touch model will always credit email when cart-abandonment sequences fire near the end of a long sales cycle" is a real failure mode that practitioners encounter and that non-specialists miss.

If you cannot name a real context in which this constraint has been violated by a competent practitioner and caused measurable harm, the constraint is theoretical and adds no audit value.

#### 3.2 — outputFormat practitioner recognition test

Read your full set of `outputFormat` sections together. Then ask:

> "If a senior practitioner in this domain received this as a deliverable from a junior analyst, would they recognize it as a professional artifact — or would they say 'this looks like a report template, not real work'?"

A practitioner would not recognize output that:

- Uses generic section names ("Findings," "Recommendations," "Next Steps") without describing the cognitive work in each section
- Includes planning sections in a review skill, or review sections in a planning skill
- Is ordered to look comprehensive rather than to match the expert's actual reasoning sequence

A practitioner would recognize output that:

- Separates what is source-backed from what is inferred and what is missing
- Names the attribution model, measurement window, or data source that each finding depends on
- Produces a specific decision, action owner, or review gate — not "recommendations"

#### 3.3 — failureBehavior forward motion test

For each `failureBehavior` item, ask:

> "Does this produce something useful for the user, or does it just document the failure and stop?"

The test: after the failure behavior executes, the user should be able to act — on a partial output, a conservative assumption, or a specific request for the missing input. "If data is unavailable, note this in the output" fails — the user has nothing to work with. "If segment data is unavailable: assess all variants for structural and deliverability risk, flag urgency claims as 'segment fit unverified,' and mark any account-status variant as blocked until segment data is confirmed" passes — the user gets a partial result and a specific next step.

#### 3.4 — safetyNotes downstream risk test

For each `safetyNotes` item, ask:

> "Does this name the actual downstream risk to the actual owner — or is it a generic liability disclaimer?"

"This output should be reviewed before use" is a liability disclaimer with no domain specificity. "Do not traffic any creative flagged as requiring legal review — even if the advertiser wishes to proceed, doing so creates documented liability that is worse than the delay" is a downstream risk statement: it names the actor (advertiser), the action (trafficking flagged creative), and the specific harm (documented liability worse than delay). Every safetyNote should be actionable by the person reading it, not just cover the author.

---

### Dimension 4: Example Quality — Depth Questions

#### 4.1 — Could-only-come-from-practice test

Read the output section of your example. Ask:

> "Could this output have been written by someone who read expert descriptions of this domain — or does it demonstrate judgment that requires actually having practiced in it?"

The test is whether the output contains at least one move that a skilled generalist would not make because they would not know it mattered:

- Reclassifying an "open rate" metric before performing any analysis (because a practitioner knows Apple MPP inflates opens)
- Checking segment state before approving a subject line (because a practitioner knows accurate copy can still be wrong for a specific subscriber state)
- Requiring the attribution model to be declared before comparing channels (because a practitioner knows last-touch and multi-touch produce incomparable numbers for the same channels)
- Distinguishing a "planned" trigger event from a "live" trigger event before building a sequence (because a practitioner knows behavioral sequences built on unconfirmed triggers silently fire or never fire)

If every move in your example output is something a skilled generalist would also make, the example is surface-level professional but not depth-demonstrating.

#### 4.2 — Diagnostic tension test

Read your example input. Ask:

> "Does this input contain a signal that makes the wrong recommendation tempting — so the example shows the expert resisting the temptation?"

The best examples have surface signals that point to one conclusion and a hidden signal that changes everything:

- Open rate up, revenue down — the surface conclusion is "strong campaign"; the expert checks Apple Mail percentage and reclassifies the whole dataset
- Conversion rate up, demo-to-SQL down — the surface conclusion is "better performance"; the expert names lead quality collapse before it shows up in pipeline metrics
- Subject line scoring well on curiosity and urgency — the surface conclusion is "ship it"; the expert checks segment state and finds 61% of the list already logged in

If your input does not contain a surface signal that makes the wrong answer tempting, the example teaches the model what to do in an easy case — not how to resist the wrong conclusion in a hard one.

#### 4.3 — Note mechanism test

Read your example note. Ask:

> "Does this name the specific mechanism that the generalist does not know about — or does it just describe what the output did?"

A note that describes the output: "The expert assessed promise-body fit and segment state before approving the subject line." That is true but teaches nothing. A note that names the mechanism: "The expert checks segment state before evaluating copy because an accurate subject line can be harmful for a specific subscriber state — a segment logic using a 30-day inactivity window includes users who logged in 7 days ago, and 'Your account is expiring soon' is factually false for those users. The generalist scores the copy on urgency and curiosity and approves it. The expert checks the segment definition and finds the defect." The mechanism note teaches a reusable judgment pattern.

---

### Scoring the depth audit

Score each dimension 0–2.5 across both structural and depth axes:

| Score | Structural | Depth |
| --- | --- | --- |
| 2.5 | All required elements present and skill-specific | Every field passes its depth test — mechanism-specific, operationally meaningful, requires domain practice to have written |
| 2.0–2.4 | All required elements present; one item is generic or shared | Most fields pass depth tests; one field could have been written by an informed non-practitioner |
| 1.5–1.9 | All required elements present; 2–3 items are generic or boilerplate | Multiple fields are plausibly professional but could have come from reading about the domain rather than practicing in it |
| < 1.5 | Required elements missing or largely recycled from sibling skills | Content is surface-level pattern matching — sounds professional, reflects no practitioner judgment |

Minimum to ship: 9.5 combined across all four dimensions. Any single dimension below 2.0 blocks shipping regardless of the total.

---

### Fastest way to fail the depth audit

These patterns produce automatic depth failures regardless of structural completeness:

1. **Generic failure story** — "I've seen campaigns miss targets and budgets get wasted" — no mechanism, no specificity, teaches nothing
2. **Borrowed metrics** — using thresholds from a description of the domain rather than from practice in it — produces wrong calibration that the model will treat as ground truth
3. **Sibling-shared minimumInput** — the same 4-item list across all skills in a category means none of them gate on their actual required data
4. **Theoretical constraints** — "do not provide inaccurate output" — has never been violated by a competent practitioner who was trying to do good work
5. **Flat example output** — correct answer without professional reasoning — teaches the answer but not the judgment pattern
6. **Mechanism-free notes** — describes what the output did rather than teaching the move a generalist would miss
7. **Stuffed vocabulary** — 15+ terms that include the skill's own name, generic business terms, and craft phrases — all three are signs the vocabulary was assembled to look substantive rather than to provide analytical leverage
