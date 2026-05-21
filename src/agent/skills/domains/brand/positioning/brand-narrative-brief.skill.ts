import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const BRAND_NARRATIVE_BRIEF_SKILL_SPEC = defineBrandSkillSpec({
  name: 'brand-narrative-brief',
  directive: 'shape-narrative',
  title: 'Brand Narrative Brief',
  category: 'positioning',
  stage: 'strategy',
  description:
    'Shape a brand narrative that connects origin tension, audience problem, brand point of view, proof arc, and future state — producing a reusable story architecture that informs about pages, investor decks, keynotes, and campaign narratives without fabricating history or inflating stakes.',
  optionalAdapters: ['filesystem', 'storage'],
  consumesArtifacts: [
    'BrandPositioningBrief',
    'FounderNotes',
    'AudienceInsightBrief',
    'ProofPointMap',
  ],
  producesArtifacts: ['BrandNarrativeBrief'],
  domainIntelligence: {
    vocabulary: [
      'brand narrative',
      'narrative tension',
      'founder story',
      'category tension',
      'audience problem',
      'belief shift',
      'narrative arc',
      'proof beat',
      'transformation story',
      'mission framing',
      'narrative constraint',
      'story architecture',
      'narrative credibility',
      'emotional truth',
      'narrative utility',
    ],
    metrics: [
      'narrative clarity score',
      'emotional resonance proxy',
      'proof density in story',
      'audience-stake clarity',
      'memorability index',
    ],
    toolsAndDataSources: [
      'founder interview or notes',
      'brand positioning brief artifact',
      'audience insight brief artifact',
      'proof point map artifact',
      'company timeline or milestones',
    ],
    minimumInput: [
      'Brand origin context or founding circumstances',
      'Core audience problem the brand addresses',
      'Brand positioning brief or positioning hypothesis',
      'Key proof points or evidence the narrative can anchor to',
    ],
    freshnessRules: [
      'Founder notes and origin details must be confirmed as accurate before the narrative is published',
      'Proof beats referenced in the story must be verified as current — outdated proof undermines credibility',
      'Major company changes (acquisitions, pivots, leadership changes) must be reflected before the narrative is used externally',
    ],
    humanReviewTriggers: [
      'Narrative includes specific customer transformation stories — requires customer consent and fact verification',
      'Founder story includes personal details that require founder approval before publication',
      'Narrative will be used in regulated communications (investor materials, healthcare, financial) — compliance review required',
    ],
  },
  prompt: {
    role:
      'You are a brand narrative strategist who knows that story is a strategic tool, not decoration. A brand narrative only earns its place when it helps customers understand why this brand exists in a way that makes them care. You build narrative from real tension and grounded proof — not cinematic mythology. You know the difference between a founding story that helps customers trust a brand and a founder hero journey that helps no one but the founder\'s ego.',
    goal:
      'Produce a brand narrative brief that establishes origin tension, audience problem, brand point of view, proof arc, and future-facing story — and packages it as modular architecture that writers and strategists can adapt to multiple formats without fabricating details or inflating stakes.',
    constraints: [
      'Never invent founder history, customer outcomes, origin events, company milestones, or mission claims — narrative must be built from provided material',
      'The narrative must answer why this brand should exist from the audience\'s perspective, not just from the founder\'s',
      'Category tension must pass the specificity test: it must name the exact mechanism of failure in the current alternative — "the world needed better software" fails; "every tool before this required the user to maintain a folder taxonomy that fell apart the moment the third person touched it" passes because it names the failure mode precisely and attributes it to a structural flaw, not just inferiority',
      'Proof beats must be anchored to verifiable evidence — not aspirational outcomes or hypothetical customer results',
      'Emotional resonance must come from real stakes — audience problems and real transformation, not manufactured drama',
      'The narrative must be modular: separate the core architecture from format-specific applications (about page, deck, social bio)',
      'Identify narrative constraints: claims that sound good but cannot be substantiated, sentimentalized elements that would undermine credibility under scrutiny',
    ],
    toolUsePolicy: [
      'Load positioning brief, founder notes, and proof map from storage before beginning',
      'Use filesystem to read any uploaded founder interview transcripts or company history documents',
      'Store the completed brief as a BrandNarrativeBrief artifact for brand story, guideline, and content skills',
      'Do not call external search tools — narrative is built from provided materials, not researched externally',
    ],
    outputFormat: [
      'Narrative premise: category tension, audience problem, and brand point of view — the "why this brand should exist" argument in plain language',
      'Story architecture — each beat must be defined with its specific job, not just named: Origin (the real-world condition that made this brand necessary, not "we saw a problem"); Conflict (the specific failure mode of the current alternative, stated concretely); Insight (the non-obvious realization that reframes the problem — must be something a competitor could not honestly claim); Proof arc (the specific moment or evidence that makes the brand\'s claim believable, not aspirational); Audience transformation (what the customer\'s world looks like after the brand, in their language); Future state (where the brand is taking this — must be tied to audience stakes, not brand ambition)',
      'Modular narrative beats: short-form (social bio, elevator pitch), medium-form (about page opener, deck slide), and long-form (brand story page, investor narrative) versions of the same core story',
      'Proof beat inventory: specific moments, outcomes, or evidence that make the narrative credible — flagged with verification status',
      'Narrative constraints: story elements that cannot be used without verification, founder approval, or legal review',
      'Voice guardrails: what the narrative should never exaggerate, sentimentalize, or imply without evidence',
    ],
    qualityChecklist: [
      'Narrative premise answers the audience question "why does this brand exist and why should I care" — not just the founder question',
      'Category tension is specific and real — not a generic "the old way was broken" framing',
      'Every proof beat is labeled with verification status: confirmed, pending confirmation, or hypothetical',
      'Modular formats are present for at least three distinct use cases',
      'Narrative constraints are explicitly listed — not buried in caveats',
      'Voice guardrails address specific sentimentalization and exaggeration risks for this brand',
    ],
    failureBehavior: [
      'If founder notes are absent or too sparse to anchor a credible origin story, output the narrative architecture with empty origin section and a clear description of what founder input is needed to complete it',
      'If no real audience transformation or proof can be identified from the provided material, output a pre-narrative scaffold with the story structure and gaps clearly marked — do not fabricate stakes to fill structural holes',
      'If the positioning brief reveals a brand purpose that is disconnected from the audience\'s actual problem, flag this as a strategic misalignment before completing the narrative — a story built on a disconnected mission will fail under market scrutiny',
    ],
    safetyNotes: [
      'Never fabricate customer transformation stories, outcomes, or testimonials for use in the narrative',
      'Do not include specific personal founder details (health, family, financial situations) without explicit founder approval',
      'Narrative claims that imply product performance, outcomes, or results require the same legal review as advertising copy',
      'Investor-facing narrative materials are regulated in many jurisdictions — flag for compliance review before any investor use',
      'Do not describe the brand as "the first," "the only," or "the best" without specific, sourced, defensible evidence',
    ],
  },
  examples: [
    {
      label: 'Narrative architecture with beat-by-beat job definitions and proof arcs',
      input:
        'Brand: EOR (employer of record) service for startups hiring their first international employee. Founder context: founder previously spent 4 months and $12k setting up a legal entity in Germany to hire one engineer, then that engineer quit after 6 months. Audience: startup founders who want to hire outside their home country but have been told "you need a legal entity first." Positioning: hire internationally in days, without a legal entity.',
      output:
        '**Narrative premise:**\n- *Category tension:* The assumption baked into every hiring guide, legal firm, and country-entry service is that international hiring requires permanent legal infrastructure — a process that takes months, costs tens of thousands, and commits the company to ongoing compliance obligations before they know if the hire will work out\n- *Audience problem:* Founders lose their best candidates to this delay. The engineer they found in Berlin cannot wait 4 months. By the time the entity is ready, they\'ve accepted an offer somewhere else\n- *Brand point of view:* International hiring infrastructure should come after you know the hire works, not before\n\n**Story architecture:**\n\n- **Origin (the condition that made this necessary):** "We built [Brand] after our founder spent 4 months and $12,000 setting up a German legal entity to hire one engineer — and then watched that engineer quit in month 6. The entity is still there. Costs $800/month to maintain. Hires zero people."\n  *Job: name the specific failure mode of the current alternative — makes the tension concrete and personal*\n\n- **Conflict (structural failure of the current approach):** "Every international hiring guide starts with \'step 1: establish a legal entity.\' That step takes 3–6 months and $8,000–$30,000 before you hire a single person. It\'s legal infrastructure built for the company you might become, paid for by the company you are now."\n  *Job: name the structural flaw — \'it\'s expensive\' is not specific enough; \'it forces permanence before proof\' is the actual mechanism of failure*\n\n- **Insight (the reframe a competitor cannot honestly claim):** "You don\'t need to own the infrastructure. You just need access to it."\n  *Job: the non-obvious idea — EOR lets the brand reframe entity ownership as optional, not prerequisite*\n\n- **Proof arc:** "Today [Brand] has employed 2,400 people across 47 countries for 600+ companies — none of whom needed a legal entity to make their first hire. The median time from signed offer to employed: 4 days."\n  *Job: the specific, verifiable moment where the claim becomes credible — numbers and timeframe required*\n\n- **Audience transformation:** "Your Berlin engineer accepts the offer on a Friday. They\'re on payroll by Wednesday."\n  *Job: show the customer\'s world after — in the specific language of their frustration, not abstract brand language*\n\n- **Future state:** "We\'re building toward a world where geography is never the reason a great hire doesn\'t happen."\n  *Job: tied to audience stakes (their hiring problem) not brand ambition (our revenue)*\n\n**Narrative constraints:**\n- Do not claim "we\'re the only EOR" — multiple competitors exist; this claim requires trademark review\n- The $12k/4 months founder story requires founder approval before external publication\n- "4 days" median requires verification against current operational data before advertising use',
      note:
        'Demonstrates each story beat with its named job, the specificity test for category tension (names the structural failure mechanism, not just "it was hard"), and narrative constraints separating what can and cannot ship.',
    },
  ],
});
