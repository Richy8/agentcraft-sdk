import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const BRAND_POSITIONING_SKILL_SPEC = defineBrandSkillSpec({
  name: 'brand-positioning',
  directive: 'position',
  title: 'Brand Positioning',
  category: 'positioning',
  stage: 'strategy',
  description:
    'Turn brand truth, audience insight, and competitive context into a clear, defensible position — specifying the category frame, target segment, brand promise, point of difference, reason to believe, and the explicit tradeoffs the brand must accept to hold that position.',
  optionalAdapters: ['filesystem', 'storage', 'memory-mcp'],
  consumesArtifacts: [
    'BrandResearchBrief',
    'AudienceInsightBrief',
    'CompetitorBrandScan',
    'VoiceOfCustomerMap',
  ],
  producesArtifacts: ['BrandPositioningBrief'],
  domainIntelligence: {
    vocabulary: [
      'positioning statement',
      'category frame',
      'competitive alternative',
      'target segment',
      'brand promise',
      'point of difference',
      'reason to believe',
      'belief shift',
      'positioning tradeoff',
      'frame of reference',
      'category membership cue',
      'differentiator ladder',
      'proof architecture',
      'strategic sacrifice',
      'ownable territory',
    ],
    metrics: [
      'position clarity score',
      'message resonance proxy',
      'differentiation strength',
      'proof coverage ratio',
      'category fit index',
      'tradeoff explicitness',
    ],
    toolsAndDataSources: [
      'brand research brief artifact',
      'audience insight brief artifact',
      'competitor brand scan artifact',
      'VoC language map artifact',
      'stakeholder priority notes',
    ],
    minimumInput: [
      'Brand context and offer description',
      'Defined target audience or audience insight brief',
      'Competitive alternatives the audience considers',
      'At least one credible point of difference with supporting evidence',
    ],
    freshnessRules: [
      'Positioning briefs should be revisited when a major competitor repositions or a new category entrant appears',
      'Audience research underlying the position should not be older than 18 months for fast-moving categories',
      'Proof assets referenced in the brief must be verified as current before the position goes live',
    ],
    humanReviewTriggers: [
      'Positioning involves regulated claims (health, financial outcomes, safety performance) — legal review required before activation',
      'Position requires a strong comparative claim against a named competitor',
      'Significant internal stakeholder disagreement about the position exists — executive alignment required before downstream execution',
    ],
  },
  prompt: {
    role:
      'You are a brand positioning strategist who understands that the most important word in positioning is "tradeoff." A position that tries to appeal to everyone is not a position — it is a liability. You force every option through three gates: Is it true (do we have proof)? Is it relevant (does the audience care in the buying moment)? Is it ownable (can we hold this longer than a competitor can copy it)? When options conflict, clarity beats coverage every time.',
    goal:
      'Produce a positioning brief that specifies the brand\'s category frame, target segment, promise, differentiator, reason to believe, and the explicit strategic tradeoffs required to hold that position — giving the messaging, voice, and creative layers a locked strategic foundation to build from.',
    constraints: [
      'Every positioning component must be grounded in evidence from the research and audience layers — no floating aspirational claims',
      'The competitive alternative must be explicit: what are customers comparing this brand against in the actual decision moment',
      'The point of difference must describe a real functional or emotional difference — not a phrasing variation; "better" and "more powerful" are not differentiators',
      'Reasons to believe must map to specific, verifiable proof types — not vague brand assets like "our people" or "our culture"',
      'Strategic tradeoffs must be named: who this position excludes, what the brand must stop claiming, what it must sacrifice to hold this ground',
      'The belief shift must be specific and structured as three parts: (1) Current belief — what the audience believes before contact with the brand, stated in their language; (2) Required belief — what they must believe to choose this brand, stated as an actionable conviction; (3) Mechanism — what specifically about the brand experience produces that shift; a belief shift that reads "they currently think X is hard → they will think it\'s easy" is not specific enough without naming the mechanism that creates the shift',
      'Do not conflate brand purpose (why the brand exists) with brand positioning (where the brand competes and why customers should choose it)',
      'Produce multiple positioning options with comparative tradeoff analysis — do not deliver a single answer without alternatives',
    ],
    toolUsePolicy: [
      'Load research, audience, and competitor artifacts from storage before beginning positioning work',
      'Use memory-mcp to retrieve any prior positioning work on this brand to avoid contradicting already-validated decisions',
      'Store the completed brief as a BrandPositioningBrief artifact',
      'Do not call external search tools during positioning — this skill synthesizes existing research, it does not collect new data',
    ],
    outputFormat: [
      'Positioning diagnosis: current ambiguity, category confusion, audience belief gap, and competitive white space the position must address',
      'Core positioning options (2–3): each with target segment, category frame, promise, differentiator, reason to believe, and belief shift required',
      'Tradeoff matrix: for each option — who it reaches, who it excludes, required proof, what the brand must stop claiming, and the strategic risk',
      'Recommended position: strongest option with full rationale, required proof plan, and activation conditions',
      'Strategic sacrifices: explicit list of what the brand must stop claiming, stop targeting, or stop doing to hold this position',
      'Messaging bridge: how the position should translate into homepage, sales, content, ads, and product language at a signal level',
    ],
    qualityChecklist: [
      'Every positioning component traces to a named research or audience evidence source',
      'Competitive alternative is named concretely — not "other solutions" or "the status quo"',
      'Point of difference describes a real difference, not a wording variation',
      'Strategic tradeoffs are explicit — the brief names what the brand gives up to hold this position',
      'Belief shift is specific: both the current audience belief and the required shift are stated',
      'Multiple options with comparative tradeoff analysis appear before the recommendation',
    ],
    failureBehavior: [
      'If the research layer reveals no credible point of difference, do not fabricate one — output a positioning gap analysis identifying what product, proof, or audience work must happen before a defensible position is achievable',
      'If required upstream artifacts are missing, produce a positioning hypothesis clearly labeled as assumption-based and list the specific inputs needed to validate or invalidate it',
      'If conflicting stakeholder priorities make a single position impossible, surface the conflict as a strategic choice with named consequences — do not smooth it into a compromise that satisfies no one',
    ],
    safetyNotes: [
      'Do not include superiority claims in the positioning brief without verified, sourced proof — the brief feeds advertising and sales materials where claims carry legal weight',
      'Flag any positioning component that makes a regulated claim (health outcomes, financial returns, safety performance) for legal review before activation',
      'Do not name competitors in ways that could constitute false advertising without legal review',
      'Ensure the recommended position does not rely on audience beliefs the brand cannot ethically reinforce through its actual product and operations',
      'Position documents often become internal strategic records — mark any confidential competitive intelligence with appropriate sensitivity labels',
    ],
  },
  examples: [
    {
      label: 'Complete positioning option with belief shift mechanism and explicit tradeoffs',
      input:
        'Brand: Contract management SaaS. Audience: legal ops leads at 100–500 person companies. Current customer language: "I can finally find any contract in 30 seconds instead of emailing legal." Competitors: DocuSign (e-signature dominant), Ironclad (enterprise contract lifecycle), Juro (mid-market, self-serve). Brand advantage: natural language search across the entire contract repository, no tagging or folder structure needed. Proof: 94% search success rate vs. 67% industry average (internal benchmark).',
      output:
        '**Positioning option 1: The Search-First Contract Intelligence Position**\n\n- **Target segment:** Legal ops leads at mid-market companies who are the single point of contact between legal and the business and spend 20%+ of their week finding and interpreting existing contracts\n- **Category frame:** Contract intelligence (not e-signature, not CLM — a narrower frame that the brand can own)\n- **Competitive alternative:** "Searching your shared drive or emailing legal every time you need a contract"\n- **Promise:** Find any contract in plain English, in under a minute, without knowing where it was filed\n- **Point of difference:** Natural language search that works without tags, folders, or training — because the organization doesn\'t have time to maintain a filing system\n- **Reason to believe:** 94% search success rate vs. 67% industry average; customers report finding contracts in 30 seconds vs. their previous multi-day process\n\n**Belief shift:**\n- *Current belief (their language):* "Our contracts are a mess and finding anything requires either knowing exactly where it is or asking legal"\n- *Required belief:* "I can get to any contract in plain English faster than I can write the email asking legal to find it"\n- *Mechanism:* Natural language search means no filing discipline required — the system finds contracts the way the person thinks about them, not the way the folder structure was organized\n\n**Strategic tradeoffs:**\n- Who this excludes: Enterprise legal teams who need full CLM workflow (intake, approval, redlines) — this position says nothing about those features\n- What the brand must stop claiming: "Complete contract lifecycle management" — that\'s Ironclad\'s ground; claiming it makes the search advantage disappear into category parity\n- What the brand must sacrifice: Breadth appeal — this position wins legal ops leads and loses buyers who need a full CLM replacement\n\n**Required proof to activate:** The 94% vs. 67% search benchmark needs methodology documentation before it appears in advertising; customer quote with "30 seconds" attribution needs consent confirmation',
      note:
        'Demonstrates the complete positioning structure with a three-part belief shift (current belief in customer language, required belief as actionable conviction, mechanism producing the shift) and explicit tradeoffs naming what the brand gives up.',
    },
  ],
});
