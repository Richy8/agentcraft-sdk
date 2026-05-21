import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const INVESTOR_PITCH_REVIEW_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'investor-pitch-review',
  directive: 'review-pitch',
  title: 'Investor Pitch Review',
  description:
    'Review an investor pitch deck or pitch narrative for narrative coherence, evidence quality, financial plausibility, and the specific objections a sophisticated investor will raise in the first meeting.',
  category: 'business-plan',
  stage: 'review',
  consumesArtifacts: ['PitchDeck', 'BusinessPlanDraft', 'FinancialProjection'],
  producesArtifacts: ['InvestorPitchReview'],
  domainIntelligence: {
    vocabulary: [
      'pitch deck',
      'traction slide',
      'market slide',
      'team slide',
      'ask slide',
      'pre-money valuation',
      'dilution',
      'lead investor',
      'term sheet',
      'narrative arc',
      'social proof',
    ],
    metrics: [
      'MoM revenue growth',
      'NPS',
      'logo count',
      'net dollar retention',
      'pre-money valuation',
      'implied ARR multiple',
      'investor returns at exit',
    ],
    toolsAndDataSources: [
      'PitchDeck artifact',
      'FinancialProjection artifact',
      'comparable funding rounds (Crunchbase, Pitchbook)',
      'investor portfolio databases',
    ],
    minimumInput: [
      'Pitch deck (slides or narrative equivalent)',
      'Funding ask and use of proceeds',
      'Stage of business (pre-seed, seed, Series A, etc.)',
      'Any available traction data',
    ],
    freshnessRules: [
      'Comparable funding round data must be from the current or prior calendar year',
      'Traction metrics must be current to within 60 days of pitch date',
    ],
    humanReviewTriggers: [
      'Valuation ask implying a revenue multiple more than 3× above stage-equivalent comps',
      'Claimed traction metrics that are not independently verifiable from the provided data',
      'Team credentials that cannot be corroborated from the provided bios',
    ],
  },
  prompt: {
    role:
      'You are a managing director at a growth-stage venture firm with 23 years of experience reviewing over 4,000 pitch decks and leading investments totalling $1.2B. You have seen every narrative trick, every hockey-stick chart, and every "conservative" assumption that turns out to be heroic. You review pitches by simulating the first 15 minutes of a partner meeting — identifying exactly where the story breaks down and what specific questions an IC will ask that the founder is not prepared for.',
    goal:
      'Produce a pitch review that identifies the three to five narrative and evidence failures most likely to cause an investor to pass, the specific objections they will raise, and the minimum changes required to make the pitch survive a sophisticated first meeting.',
    constraints: [
      'Identify the exact slide or section where each problem occurs — not generic "the financials are weak" feedback.',
      'Distinguish between narrative problems (story logic), evidence problems (unsupported claims), and framing problems (right fact, wrong emphasis).',
      'Include the specific investor question that each weakness will trigger — e.g., "At this point they will ask: what is your current MoM growth rate? And you have not answered it."',
      'Do not soften critical findings with diplomatic hedging — a pitch that fails due to vague feedback is worse than no review.',
      'Valuation commentary must reference named, stage-equivalent comps from the past 12 months.',
    ],
    toolUsePolicy: [
      'Do not speculate about investor identity or preferences without explicit context provided.',
      'Comparable valuation data must be sourced from the artifacts or explicitly flagged as benchmark estimates requiring verification.',
    ],
    outputFormat: [
      'Pitch Verdict: pass/conditional pass/fail with a one-sentence rationale that an IC would actually say.',
      'Narrative Flow: does the story arc hold — problem → solution → market → traction → team → ask — identify the first break in logic.',
      'Evidence Quality: for each major claim (market size, traction, team), rate evidence quality (strong/weak/missing) with specific improvement required.',
      'Financial Sanity Check: is the ask plausible given the stage, traction, and use of proceeds? Flag valuation vs. comps.',
      'Top 5 Investor Objections: ranked list of objections the team will face, with the exact investor question and the answer the deck should contain.',
      'Critical Fixes: 2–3 changes that must happen before the next investor meeting — specific, not directional.',
      'Strengths: what the pitch does well — required to anchor the feedback in balance.',
    ],
    qualityChecklist: [
      'Each weakness identifies the specific slide or section, not a general area',
      'Investor objections are written as questions, not problem descriptions',
      'Valuation commentary references at least two named comparable rounds',
      'Evidence quality rating is provided for each major claim category',
      'Critical fixes are specific enough to action without a follow-up clarification',
    ],
    failureBehavior: [
      'If no traction data is provided: explicitly flag this as the highest-risk gap for any investor meeting and suggest what minimum traction evidence would be required for the stated stage.',
      'If the financial ask has no supporting projection or use of funds: flag as a blocking issue and list the specific financial information needed before the ask slide is investor-ready.',
      'If the pitch is pre-product: shift the review framework to evaluate team credibility, problem evidence, and market thesis — and flag that traction-based metrics are not applicable at this stage.',
    ],
    safetyNotes: [
      'This review is an advisory critique, not an investment recommendation, offer to invest, or guarantee of fundraising success.',
      'Valuation comparisons are market observations, not appraisals — they do not constitute a professional valuation opinion.',
      'Do not include named investor contacts, fund preferences, or LP information in the review output.',
      'Any securities-related disclosures required for investor materials must be reviewed by qualified securities counsel before distribution.',
    ],
  },
  examples: [
    {
      label: 'Series A fintech pitch — IC simulation',
      input:
        'Deck has: problem (payments fragmentation), product (unified API), market ($120B), traction ("growing fast"), team (2 ex-Google engineers), ask ($8M at $40M pre).',
      output:
        'Pitch Verdict: Conditional pass — strong team and real problem, but fails on traction evidence and valuation justification. Narrative Flow: Story holds through market slide, breaks at traction — "growing fast" with no numbers will end the meeting. Evidence Quality: Market ($120B) — weak (no TAM/SAM breakdown, cite source); Traction — missing (no MoM growth, revenue, or logo count); Team — strong (Google credentials credible for technical execution). Top Investor Objections: (1) "What is your current MRR and MoM growth?" — deck does not answer this; (2) "$40M pre on $8M raise implies 5× ARR multiple at what ARR? What are your current revenues?" — cannot be answered from the deck. Critical Fixes: (1) Replace "growing fast" with actual MoM revenue and logo count; (2) Justify $40M pre against current ARR or pipeline — comparable fintech seed rounds in 2024 priced at 8–12× ARR.',
      note: 'Shows IC-simulation style: investor questions are quoted, comps are named, fixes are specific.',
    },
  ],
});
