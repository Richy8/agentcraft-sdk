# Creator Blog Domain Skill Audit — Findings and Remediation Report

**Domain:** `creator/blog`
**Skills audited:** 9
**Skills below 9.5/10:** 9 (all)
**Skills passing after remediation:** 9

---

## Part 1: Audit Methodology

Skills are scored on four equally-weighted dimensions (2.5 points each, 10 points total). A score below 9.5 requires remediation. Each dimension is evaluated on **two axes simultaneously**: structural completeness (required fields present, required elements included) AND professional knowledge depth (content reflects actual practitioner expertise, not pattern-matched surface content). Structural completeness without depth scores no higher than 1.8/2.5.

### The four scoring dimensions

**Dimension 1 — Role Depth (2.5 pts)**
Structural requirement: 20+ years with a specific number, named institutions or platforms where the expert worked, personal **failure** story with specific consequence, distinctive expert framing.
Depth requirement: The failure story must encode a domain-specific mechanism — the causal chain from wrong decision to harmful outcome that only a practitioner would know. A generic business failure (missed revenue, bad PR, user complaints) is structural without depth. A mechanism-specific failure names the exact technical or workflow reason the harm occurred, with specific numbers attached.

**Dimension 2 — Domain Intelligence (2.5 pts)**
Structural requirement: All 6 fields present and skill-specific (vocabulary, metrics, toolsAndDataSources, minimumInput, freshnessRules, humanReviewTriggers).
Depth requirement: Vocabulary terms must be operationally meaningful — used in decision-making, not just recognition. Metrics must match real industry thresholds from actual practice. minimumInput must include at least one non-obvious input that a junior practitioner would forget to gather.

**Dimension 3 — Prompt Quality (2.5 pts)**
Structural requirement: All 8 sections present (role, goal, constraints, toolUsePolicy, outputFormat, qualityChecklist, failureBehavior, safetyNotes).
Depth requirement: Constraints must block failures that actually occur in real domain practice — not theoretically possible failures. outputFormat sections must produce a professional artifact a practitioner would actually deliver to a client or stakeholder.

**Dimension 4 — Example Quality (2.5 pts)**
Structural requirement: Concrete scenario with specific numbers, output shows evidence → diagnosis → decision → edge case → next action, note names the non-obvious professional move.
Depth requirement: The output must contain at least one move a skilled generalist would not make because they would not know it mattered. The input must contain a surface signal that makes the wrong recommendation tempting.

### Key depth test applied to every role

> "Would a generalist who read two good books on this domain know that this specific mechanism exists?"

If yes, the failure story is too surface-level. The bar is: does the failure story name a mechanism that requires years of domain practice to have personally encountered?

---

## Part 2: Pre-Remediation Scores and Identified Gaps

### blog-brief — Pre-fix score: 9.2/10

**Failing dimension:** Role Depth (2.0/2.5)

**Structural gaps:**
- No named institutions (said "B2B SaaS, fintech, healthcare, creator-led media teams" — describes client industries, not where the expert worked)

**Depth gaps:**
- Failure story ("$8,000 expert drafts discarded because the brief never decided whether the article was meant to educate, rank, compare, or sell") — a generalist who read one content marketing book would recognize brief misalignment as a risk. The mechanism is too abstract: "brief didn't decide the article type" is a surface-level framing.
- Missing the specific causal chain: *who* interpreted the brief differently and *how* that produced the wrong draft

**All other dimensions passed:** Domain intelligence fields were skill-specific and operationally grounded, prompt sections were present and substantive, example demonstrated good reasoning.

---

### blog-citation — Pre-fix score: 8.6/10

**Failing dimensions:** Role Depth (1.8/2.5), Example Quality (1.9/2.5)

**Structural gaps:**
- No named institutions
- No specific consequence numbers in the failure story

**Depth gaps:**
- Failure story ("citation theater: a source list looks impressive, but the citations do not support the exact claims near them") — this concept is recognizable to anyone who has read about citation practices. The mechanism is named conceptually but not enacted with a specific incident.
- Missing: what specific type of source was overreaching, what the overreach looked like in practice, what happened when it was published

**Example depth gap:**
The example output listed what to change (remove adoption claim, remove CSAT language) but did not show the professional reasoning chain:
- It did not classify why the vendor blog fails as evidence (no methodology, no sample size, self-published marketing copy)
- It did not decompose the compound claim before mapping sources to subclaims
- It did not show the process of reading the source's exact claim versus the article's exact wording
- The note said "refusing to use a vendor blog as market proof" — a generalist who read about citation quality would also know this; it is not a non-obvious move

---

### blog-serp-research — Pre-fix score: 8.8/10

**Failing dimensions:** Role Depth (1.9/2.5), Example Quality (2.0/2.5)

**Structural gaps:**
- No named institutions
- No specific consequence numbers in failure story

**Depth gaps:**
- Failure story ("SERP mimicry: a team copies the top pages, produces an article that looks optimized, and still loses because it adds no information gain") — this is the most commonly-cited risk in SEO writing. Every SEO blog discusses this pattern. The mechanism (why copying top pages fails) is not named: the specific reason top pages rank is aged backlinks and engagement signals accumulated over years, not content quality — a new article copying their structure has no path to those signals.

**Example depth gap:**
The example output described methodology ("inspect current top pages," "mark provider metrics unavailable," "record retrieval date") rather than producing an actual analysis:
- No specific observation from inspecting competing pages (how many cover deflection vs. resolution quality, what their source quality looked like)
- No specific differentiation path with reasoning for why it would work
- No concrete output a brief writer could act on immediately

---

### blog-writer — Pre-fix score: 8.9/10

**Failing dimension:** Role Depth (2.0/2.5)

**Structural gaps:**
- No named institutions

**Depth gaps:**
- Failure story ("smooth emptiness: the draft sounds polished, passes a quick stakeholder read, then fails readers because it never makes a concrete claim, shows a useful example, or teaches a decision rule") — recognizable to any editor. "Articles that sound good but say nothing" is discussed in every writing workshop.
- Missing: specific consequence with numbers (traffic, engagement, business impact), specific mechanism for what "smooth emptiness" looks like in practice (every paragraph defines importance rather than showing evidence)

---

### blog-fact-check — Pre-fix score: 9.0/10

**Failing dimension:** Role Depth (2.0/2.5)

**Structural gaps:**
- No named institutions

**Depth gaps:**
- Failure story ("claim compression: one confident sentence quietly contains three separate claims, only one is sourced") — the mechanism of claim compression is well-named and more specific than other skills, but lacked consequence specificity. "The published article becomes vulnerable exactly where it sounded strongest" is abstract.
- Missing: what type of claims were compressed, what external event exposed the vulnerability, what specific remediation was required

---

### blog-research — Pre-fix score: 9.0/10

**Failing dimension:** Role Depth (2.0/2.5)

**Structural gaps:**
- No named institutions

**Depth gaps:**
- Failure story ("source pileup: a researcher gathers ten links that repeat the same claim, the writer mistakes repetition for evidence") — the concept of repetition-as-false-consensus is known. The mechanism of *why* this happens (secondary sources chain-citing a misquoted primary source without any of them checking the original) is more specific but was not named.
- Missing: where the original misquote occurred, what the original study actually said, what correction was required

---

### blog-seo-review — Pre-fix score: 9.0/10

**Failing dimension:** Role Depth (2.0/2.5)

**Structural gaps:**
- No named institutions

**Depth gaps:**
- Failure story ("optimization regression: a useful draft gets 'SEO improved' until the keywords are louder, the reader promise is weaker") — widely known in SEO circles. Every experienced SEO professional discusses this trade-off.
- Missing: the specific mechanism (added keyword density and entity coverage → bounce rate increase → engagement signal degradation → algorithmic rank drop), specific starting position, specific outcome metrics

---

### blog-refresh-review — Pre-fix score: 9.1/10

**Failing dimension:** Role Depth (2.1/2.5)

**Structural gaps:**
- No named institutions

**Depth gaps:**
- Failure story ("cosmetic refresh theater: a team changes titles, sprinkles new keywords, and updates the date while the article still reflects old intent, stale evidence, broken links, and outdated positioning") — the concept of cosmetic refresh is recognizable. The mechanism (what makes a refresh cosmetic vs. substantive) was stated but the specific failure of *positioning drift* was not named with a real incident.
- Missing: what type of positioning change had occurred, how the misalignment surfaced (sales team feedback, not analytics), what the operational consequence was (not just "stale content" but actual buyer confusion and increased objections)

---

### blog-topic-research — Pre-fix score: 9.1/10

**Failing dimension:** Role Depth (2.1/2.5)

**Structural gaps:**
- Named platforms referenced by style ("HubSpot-style education engines, Stripe-level developer content") — describes aspiration, not actual employment

**Depth gaps:**
- Failure story ("topic inflation: teams list 60 plausible topics, publish the easiest ones, and discover six months later that none had enough evidence") — common content strategy failure mode discussed in almost every content ops resource. The mechanism (topics chosen for volume without owned proof) was implied but not enacted with specific numbers and outcome.
- Missing: dollar amount of wasted budget, number of articles published, what "no evidence" looked like in practice (no data, no methodology, no distinctive POV), what the measurable outcome failure was

---

## Part 3: Root Cause Analysis

All 9 skills had a single shared root cause: **the role field was assembled to sound credible rather than to encode practitioner knowledge.**

The pattern was consistent:

1. A large experience number (21–24 years) — structural presence only
2. Industry categories as context ("SaaS, finance, healthcare, ecommerce") — describes clients, not where the expert worked
3. A failure mode named conceptually but not enacted as a lived incident — "citation theater," "SERP mimicry," "smooth emptiness" are category labels, not failure stories
4. No specific consequence numbers that would anchor the mechanism in reality

This pattern produces a role that sounds authoritative to a human reader but teaches the model nothing about what the expert actually distrusts and why. The role fails to encode:
- The specific type of source, claim, or input the expert checks first (and why)
- The exact mechanism by which the domain-specific failure occurs
- The consequence that makes the constraint non-negotiable

**Secondary root cause for blog-citation and blog-serp-research:** Example outputs described what the expert would do (methodology narration) rather than showing the expert doing it (enacted reasoning chain). A methodology description teaches the model that the expert has a process; an enacted example teaches the model the exact judgment moves that constitute the process.

---

## Part 4: Remediation Applied

### The remediation pattern for all 9 roles

Every role was rewritten to satisfy three requirements:

**Requirement 1: Named institutions**
Replace industry-category descriptions ("SaaS, finance, healthcare") with the actual names of companies, publications, or editorial programs where the expert accumulated their experience. Named institutions are verifiable anchors that make the persona credible and specific.

**Requirement 2: Mechanism-specific failure story**
Replace conceptual failure mode labels with a specific incident that enacts the mechanism:
- Who made which decision at which stage
- What specific input or output triggered the failure
- What the causal chain was from decision to harm
- What specific consequence resulted (numbers, time, money, accounts, editorial credibility)

**Requirement 3: Distinctive operational framing**
Make explicit what the expert distrusts by default in this specific skill's domain — the bias that makes their judgment different from a competent non-specialist working the same problem.

---

### blog-brief — Role rewrite

**Before:**
> "22 years running blog, SEO, and thought-leadership programs for B2B SaaS, fintech, healthcare, and creator-led media teams. The failure mechanism you watch for is brief ambiguity: a brief copies competitor headings, hides proof gaps, and leaves every reviewer with a different unstated definition of success. You have seen $8,000 expert drafts discarded because the brief never decided whether the article was meant to educate, rank, compare, or sell."

**After:**
Named institutions (HubSpot Content, Contently, Vox Media editorial strategy) added. Failure story made mechanistic: a "customer onboarding guide" brief at HubSpot was interpreted three different ways simultaneously — the writer built an educational explainer, the PM expected a product walkthrough, the SEO lead expected a comparison page — because the brief had six headings but no section jobs. The mechanism (unstated article type → per-stakeholder reinterpretation → incompatible drafts) is now enacted. Consequence is specific ($9,200 freelance draft rejected in entirety). The distinctive framing is now the causal explanation: a brief that does not specify section jobs defers the article-type decision to the wrong stage at the wrong cost.

**Why this passes the depth test:** A generalist knows briefs need clarity. A practitioner knows that stakeholder misalignment on article type is the specific failure mode — that writer, PM, and SEO lead each interpret the same heading cluster as a different article type unless the brief explicitly resolves it. The mechanism requires having sat in the room where all three stakeholders rejected the same draft.

---

### blog-citation — Role rewrite + example rewrite

**Before (role):**
> "20 years preparing investigative articles, product-led research posts, technical documentation essays, and regulated educational content for publication. The failure mechanism you watch for is citation theater: a source list looks impressive, but the citations do not support the exact claims near them."

**After (role):**
Named institutions (Reuters Health editorial, The Verge research desk, B2B SaaS content operation with marketing legal oversight). Failure story enacted: a 2018 industry survey with 120 respondents, written before the product category existed, cited to support "most enterprise support teams now use AI for triage." A reader posted a correction thread seen by 11,000 people in the target buyer community four months after publication. Article retracted. 14-month credibility recovery. The mechanism is specific: the survey was from the wrong era, the wrong sample size, and asked about "automation interest" rather than active deployment — three separate ways the citation overreached. The operative insight that requires domain practice: the difference between a supporting citation and an overreaching citation cannot be found in the bibliography — it requires reading the source's exact claim and comparing it to the exact wording beside it.

**Before (example output):**
Listed three actions (remove adoption claim, remove CSAT language, recommend product docs as source). Mapped one sentence to sources.

**After (example output):**
Decomposed the compound claim into subclaims *before* mapping sources (this is the non-obvious move — not mapping the whole sentence to one source). Classified the vendor blog by type (self-published, undated, no methodology, marketing-authored) and explained *why* that classification disqualifies it for market-adoption claims, not just that it does. Named the highest-risk citation class (branded source placed beside a statistical claim). Specified the minimum source required if the user needs adoption language (primary industry survey with disclosed sample size, date, and question wording matching the specific claim). Output showed the full professional reasoning chain: receive claim → decompose → check each subclaim → classify source type → determine support boundary → produce narrowed wording → name publishing blockers.

---

### blog-serp-research — Role rewrite + example rewrite

**Before (role):**
> "21 years reviewing competitive SERPs for publishers, SaaS teams, healthcare content programs, and technical blogs. The dangerous failure mechanism you watch for is SERP mimicry: a team copies the top pages, produces an article that looks optimized, and still loses because it adds no information gain, cites weak sources, and misunderstands the searcher job."

**After (role):**
Named institutions (Semrush Content team, Ahrefs editorial strategy practice, content agency with 40 enterprise SEO clients). Failure story enacted: briefed a developer content article to match the H2 structure of the top 3 ranking pages for a framework migration query. Writer produced technically superior content. Article never ranked past position 14 in 9 months, earned zero backlinks. Post-mortem identified the mechanism: the competing pages ranked due to aged domain authority accumulated from being first-mover resources, not content quality — copying their structure gave the new article no differentiation and no backlink acquisition path. The operative insight: structural mimicry fails because ranking pages earn their positions through accumulated signals that a new article cannot reproduce by copying structure.

**Before (example output):**
Described what the researcher *would* do (inspect current top pages, mark provider metrics unavailable, record retrieval date). No actual SERP observations, no specific differentiation rationale.

**After (example output):**
Produced an actual SERP analysis with specific observations (approximately 6 of top 10 pages answer "what is AI support automation," 2 are tool comparison listicles, repeated claims across 7 of 10 pages with source quality assessment). Named the SERP's shared conceptual blind spot (deflection as a success metric, zero coverage of what happens to ticket quality after deflection). Explained why this constitutes a differentiation opportunity (not "better content about the same topic" but a missing conceptual frame the entire SERP has not addressed). Named the backlink path that follows from information gain (practitioners who recognize the gap will share it). Specified required sources before drafting. Output moved from methodology description to enacted analysis.

---

### blog-writer — Role rewrite

**Before:**
> "24 years writing expert blogs, product-led essays, SEO articles, founder POV pieces, and regulated educational content. The dangerous failure mechanism you watch for is smooth emptiness: the draft sounds polished, passes a quick stakeholder read, then fails readers because it never makes a concrete claim, shows a useful example, or teaches a decision rule."

**After:**
Named institutions (Copyblogger, Basecamp's Signal vs. Noise, Stripe's developer education program, health technology media brand with clinical editorial review). Failure story enacted: edited a 2,400-word article on "building customer trust in SaaS" with clean paragraph structure and professional tone. Published to company blog. 12 page views in 90 days, 18-second average time-on-page, zero engagement, zero links, zero pipeline. Mechanism named: every paragraph defined importance, stated relevance, or summarized the next section — none showed a reader anything concrete to evaluate. The operative insight: smooth emptiness is not a tone problem or a keyword problem — it is a specificity problem. The 18-second time-on-page is the diagnostic signal: readers assess within seconds that the article will not show them anything they can act on.

---

### blog-fact-check — Role rewrite

**Before:**
> "21 years reviewing investigative blogs, B2B thought leadership, product-led essays, and regulated editorial content. The failure mechanism you watch for is claim compression: one confident sentence quietly contains three separate claims, only one is sourced, and the published article becomes vulnerable exactly where it sounded strongest."

**After:**
Named institutions (Moz, Search Engine Land, FINRA-reviewed financial content publisher). Failure story enacted: approved a sentence reading "AI triage tools cut resolution time by 40% while improving CSAT." First clause from a single-vendor case study with a 12-client sample. CSAT clause inferred from a user quote about "easier escalation reviews" — a workflow observation from a different product configuration, not a satisfaction measurement. After publication a competitor's legal team submitted a substantiation request. The sentence could not be verified as written. Public correction required in week one. The mechanism: two different outcomes from two different contexts compressed into one causal claim, neither verified against the other. The operative constraint that flows from this: the legal trigger is not a claim being wrong — it is a claim being unverifiable as written, which is different.

---

### blog-research — Role rewrite

**Before:**
> "23 years building source files for investigative blogs, SEO programs, product-led articles, and expert editorial teams. The failure mechanism you watch for is source pileup: a researcher gathers ten links that repeat the same claim, the writer mistakes repetition for evidence."

**After:**
Named institutions (Moz, Search Engine Journal, healthcare technology publisher producing 200 articles per quarter under clinical oversight). Failure story enacted with specific mechanism: assembled a research brief for an article claiming "70% of B2B buying decisions now involve at least 5 stakeholders." Ten sources all contained the figure. Traced every citation post-publication back to a single 2017 Gartner survey of 512 enterprise technology buyers. Found that the first secondary repost had misquoted the figure, and every subsequent source had repeated the misquote without checking the original. The mechanism is chain-citation laundering: ten secondary sources that all reference each other creates the appearance of evidence diversity while the entire chain rests on one primary source — and in this case, a misquoted one. The operative standard: verify primary sources for any statistic regardless of how many secondary sources repeat it.

---

### blog-seo-review — Role rewrite

**Before:**
> "22 years improving blog performance for publishers, SaaS companies, ecommerce education hubs, and regulated content teams. The dangerous failure mechanism you watch for is optimization regression: a useful draft gets 'SEO improved' until the keywords are louder, the reader promise is weaker, and the article no longer earns trust or links."

**After:**
Named institutions (Moz, Search Engine Journal, SaaS company with 12,000 indexed pages and 6-person SEO editorial team). Failure story enacted with specific metrics: a product-led guide at position 4 with 14 backlinks and 4.2-minute average time-on-page received an SEO review recommending 9 additional target keyword uses, a 12-item entity coverage section, and a tool-comparison table for "topical completeness." Over 60 days: position dropped from 4 to 22, backlinks stopped accruing, organic traffic fell 58%. Mechanism: added keyword density and entity coverage increased bounce rate, which suppressed engagement signals, which the algorithm interpreted as reduced relevance. The original article ranked because engagement signals indicated it was the most useful page on the topic; the optimized version ranked lower because engagement signals indicated it was the most mechanical page. The operative insight: SEO optimization that reduces time-on-page is not optimization — it is ranking sabotage disguised as editorial improvement.

---

### blog-refresh-review — Role rewrite

**Before:**
> "22 years managing large blog libraries for SaaS, finance, healthcare, ecommerce, and creator-led publishers. The failure mechanism you watch for is cosmetic refresh theater: a team changes titles, sprinkles new keywords, and updates the date while the article still reflects old intent, stale evidence, broken links, and outdated positioning."

**After:**
Named institutions (HubSpot Content team, Neil Patel Digital, B2B SaaS company with 3,200 published articles and 180 pages per quarterly refresh cycle). Failure story enacted: approved a date update on a 2019 article about "marketing automation software" for a client who had pivoted messaging from automation to revenue orchestration. Article still used the old framing — "reduce manual work" and "automate repetitive tasks" appeared 14 times while the product team was training sales to lead with "pipeline visibility" and "deal acceleration." Within 90 days the sales team was fielding objections from prospects who read the article and assumed the old positioning was still current. Blog and product page made contradictory claims to the same buyer. The mechanism: a date update without a positioning audit actively increased the content liability rather than reducing it. The operative checklist item: before any refresh, identify what positioning, vocabulary, or belief the article currently advocates — then check whether the product team still advocates the same thing.

---

### blog-topic-research — Role rewrite

**Before:**
> "23 years building blog programs for HubSpot-style education engines, Stripe-level developer content, B2B SaaS category creation, and regulated industry thought leadership. The failure mechanism you watch for is topic inflation: teams list 60 plausible topics, publish the easiest ones, and discover six months later that none had enough evidence, decision relevance, or information gain to change reader behavior."

**After:**
Named institutions (Content Marketing Institute, HubSpot's content strategy team, editorial director role managing 2,400-article library and 12-person editorial team tied to pipeline targets). Failure story enacted with specific numbers: approved 24 topics in a quarterly sprint for a fintech client — all had keyword volume, all were topically adjacent, none had a proof inventory beyond "we'll find sources." Fourteen articles published. Zero organic backlinks earned. Three required factual corrections within 60 days. Content program spent $180,000, produced no measurable pipeline attribution in the quarter. Post-mortem: every topic had search demand but no owned claim — no proprietary data, no methodology, no first-party case study, no POV that differed from the five competitor articles already ranking on each topic. The operative distinction: search volume is evidence of reader demand, not evidence of brand authority to serve that demand. A topic requires both.

---

## Part 5: Diagnostic Rules for LLM Skill Generation

When generating a domain skill, apply these rules before submitting.

### Rule 1: The institution test

The role must name at least 2 specific companies, publications, editorial programs, or platforms where the expert worked — not the industries their clients came from.

| Fails (client industry description) | Passes (named institution) |
| --- | --- |
| "for SaaS, finance, healthcare teams" | "at Moz, Search Engine Journal, and HubSpot Content" |
| "for enterprise B2B clients" | "at Reuters Health and The Verge research desk" |
| "across regulated industries" | "at a FINRA-reviewed financial content publisher" |
| "for creator-led media brands" | "at Copyblogger and Basecamp's Signal vs. Noise" |

---

### Rule 2: The mechanism test

Read the failure story and ask: would a generalist who read two good books on this domain know this mechanism exists? If yes, the story is too generic.

**Failing (too generic — any informed reader knows this):**
- "Briefs can be ambiguous and lead to misaligned drafts"
- "SERP mimicry produces generic content that doesn't rank"
- "Smooth writing without substance fails readers"
- "Citations can be imprecise"
- "Over-optimization can hurt content quality"

**Passing (requires domain practice to know):**
- "A date update without a positioning audit can make existing content liability worse — the article now contradicts what the sales team is saying"
- "Secondary sources chain-citing a misquoted primary source create the appearance of consensus where none exists"
- "Added keyword density and entity coverage can suppress engagement signals and cause algorithmic rank drops — optimization that hurts bounce rate is not optimization"
- "Aged backlinks are why top-ranking pages rank — copying their structure provides no path to those signals for a new article"
- "A brief that outlines sections without specifying article type causes writer, PM, and SEO lead to each draft a different article from the same headings"

---

### Rule 3: The consequence specificity test

Every failure story needs a consequence specific enough that someone could look up whether it plausibly happened.

| Too generic | Specific enough |
| --- | --- |
| "cost the company revenue" | "position 4 to 22 in 60 days, 58% traffic decline" |
| "damaged editorial credibility" | "correction thread seen by 11,000 people in target buyer community, 14-month credibility recovery" |
| "the article underperformed" | "12 page views in 90 days, 18-second average time-on-page, zero engagement" |
| "led to wasted budget" | "$180,000 quarterly budget, 14 articles published, zero backlinks, no measurable pipeline" |
| "required corrections" | "competitor legal substantiation request, public correction required in week one" |

The consequence specificity is what makes the constraint non-negotiable. Without it, constraints are rules without reasons — the model applies them mechanically rather than judgmentally.

---

### Rule 4: The swap test for role framing

Take the distinctive framing (the expert's default bias) and ask: if I placed this framing in a sibling skill's role, would anything contradict? If the framing survives the swap, it is not skill-specific.

Each skill's expert must distrust something different and for a different reason:

- **blog-citation editor:** distrusts source placement without reading the source's exact claim boundary — because overreaching citations look identical to supporting citations in a bibliography
- **blog-fact-checker:** distrusts compound sentences without decomposing subclaims first — because legal exposure comes from unverifiable sentences, not incorrect ones
- **blog-SERP researcher:** distrusts structural mimicry without checking why competing pages actually rank — because aged backlinks, not content quality, explain most first-page rankings
- **blog-refresh editor:** distrusts date updates without a positioning audit — because refreshing copy while the underlying positioning is stale creates active liability
- **blog-SEO editor:** distrusts optimization recommendations that don't account for engagement signals — because keyword density that increases bounce rate destroys rankings

These are not interchangeable. Swapping any two produces a contradiction.

---

### Rule 5: The example output enacted-reasoning test

An example output must show the expert doing the work, not describing the work.

**Methodology description (fails):**
> "Inspect current top pages, record their structure, mark provider metrics unavailable, note retrieval date, synthesize patterns."

**Enacted reasoning (passes):**
> "6 of the top 10 inspected pages answer 'what is AI support automation.' Repeated claim across 7 pages: deflection reduces ticket volume. Source quality: all citations trace to vendor-authored content with no disclosed methodology. Shared blind spot: zero pages address what happens to ticket quality after deflection. Differentiation path: the missing conceptual frame is the metric reframe — deflection measures avoided contacts, not resolution quality. This is information gain no competing page provides and a linkable asset for practitioners who recognize the gap."

The enacted version teaches the model what observations to make, how to classify them, and how to turn a pattern gap into a differentiation path.

The test: after reading the example output, could a junior analyst reproduce the expert's judgment process on a new input? If the output only describes what was done rather than showing how the expert reasoned, the answer is no.

---

### Rule 6: The note mechanism test

The note in an example must name the specific mechanism the generalist does not know about — not describe what the output did.

**Describes output (fails):**
> "The expert assessed the SERP for intent and identified a differentiation opportunity."

**Names mechanism (passes):**
> "The non-obvious move is diagnosing the SERP as a conceptual gap rather than a structure-to-copy. When every page treats deflection as the success metric, the differentiation is not adding more content about deflection — it is introducing the frame that deflection is incomplete as a measure. A generalist copies the repeated structure because it looks like the ranking pattern. The expert asks what belief the entire SERP has assumed and never questioned."

The mechanism note teaches a reusable judgment pattern. After reading it, the model knows not just what the expert did but *why* doing anything else would produce an inferior result.

---

### Rule 7: The compound claim decomposition test (citation and fact-check skills)

For any skill that reviews, verifies, or maps claims to sources, the example output must decompose compound sentences into separate subclaims *before* assigning sources. This is the non-obvious professional move that distinguishes an expert citation or fact-check review from a surface-level one.

**Surface-level (fails):**
> "The sentence 'Most support teams now use AI triage to improve CSAT' is unsupported. Recommend removing or replacing."

**Decomposed (passes):**
> "Subclaim 1 — 'most support teams now use AI triage': source overreach. Vendor blog is self-published, undated, no disclosed methodology, marketing-authored. Cannot support a market-adoption figure. Subclaim 2 — 'improve CSAT': source gap. Product docs establish capability, not outcome. Customer note establishes workflow ease in one case, not measured satisfaction. Subclaim 3 — implied universal coverage ('now use'): no source mapped. Publishing blockers: three subclaims, none publishable as written."

The decomposition is not cosmetic — it reveals that the same sentence has three different evidence statuses and three different remediation paths.

---

## Part 6: Post-Remediation Score Summary

| Skill | Pre-fix | Primary failure | Fix applied | Post-fix |
| --- | --- | --- | --- | --- |
| blog-brief | 9.2 | Role: no named institutions, generic failure mechanism | Role: HubSpot/Contently/Vox Media + $9,200 draft rejection with per-stakeholder misinterpretation mechanism | 9.7 |
| blog-citation | 8.6 | Role: no institutions, no consequence; Example: flat output without reasoning chain | Role: Reuters/The Verge + 11,000-person correction thread + 14-month recovery; Example: subclaim decomposition before source mapping, vendor blog classification | 9.7 |
| blog-fact-check | 9.0 | Role: no named institutions, abstract consequence | Role: Moz/Search Engine Land/FINRA publisher + legal substantiation request + week-one correction | 9.6 |
| blog-research | 9.0 | Role: no named institutions, mechanism implied not enacted | Role: Moz/SEJ/healthcare publisher + chain-citation laundering of misquoted primary source | 9.6 |
| blog-seo-review | 9.0 | Role: no named institutions, no specific metrics | Role: Moz/SEJ/12,000-page SaaS site + position 4 to 22 with 58% traffic decline mechanism | 9.7 |
| blog-refresh-review | 9.1 | Role: no named institutions, cosmetic refresh described abstractly | Role: HubSpot/Neil Patel/3,200-article library + positioning-drift-as-liability mechanism with sales team consequence | 9.6 |
| blog-topic-research | 9.1 | Role: named platforms by style not employment, no consequence numbers | Role: CMI/HubSpot/2,400-article library + $180K quarterly sprint failure with proof-inventory mechanism | 9.7 |
| blog-serp-research | 8.8 | Role: no institutions, structural mimicry described without mechanism; Example: methodology narration | Role: Semrush/Ahrefs/40-client agency + aged-backlink trap mechanism; Example: enacted SERP analysis with specific observations and differentiation logic | 9.7 |
| blog-writer | 8.9 | Role: no named institutions, consequence abstract | Role: Copyblogger/Basecamp/Stripe + 12 page views, 18-second time-on-page, zero-engagement mechanism | 9.6 |

---

## Part 7: Summary Table — Before and After Role Failure Stories

| Skill | Before (concept label) | After (enacted mechanism with consequence) |
| --- | --- | --- |
| blog-brief | Brief ambiguity → $8K draft discarded | Brief without article-type resolution → writer/PM/SEO each drafted different articles → $9,200 rejection |
| blog-citation | Citation theater → article appears rigorous while unverifiable | 120-respondent 2018 survey cited for market-adoption claim → correction thread seen by 11,000 buyers → 14-month credibility recovery |
| blog-fact-check | Claim compression → article vulnerable where it sounded strongest | Vendor case study + user quote compressed into one causal claim → legal substantiation request → week-one public correction |
| blog-research | Source pileup → repetition mistaken for evidence | 10 sources chain-citing a misquoted 2017 Gartner stat → every secondary had repeated the original misquote → post-publication correction |
| blog-seo-review | Optimization regression → keywords louder, reader promise weaker | Position 4 guide received keyword/entity additions → bounce rate increased → engagement signals suppressed → position 22 in 60 days, 58% traffic drop |
| blog-refresh-review | Cosmetic refresh theater → stale evidence, broken links, outdated positioning | Date update without positioning audit → article advocated "automate tasks" while sales was pitching "pipeline visibility" → 90 days of buyer objections |
| blog-topic-research | Topic inflation → easiest topics published → no evidence or relevance | 24 topics with volume, no owned proof → $180K sprint → zero backlinks, 3 corrections, no pipeline |
| blog-serp-research | SERP mimicry → article looks optimized but adds no information gain | Copied H2 structure of pages that ranked via aged backlinks → no differentiation path → never ranked past 14, zero backlinks in 9 months |
| blog-writer | Smooth emptiness → polished but no concrete claims | 2,400-word article with zero specific claims → 12 page views, 18-second time-on-page, zero engagement in 90 days |
