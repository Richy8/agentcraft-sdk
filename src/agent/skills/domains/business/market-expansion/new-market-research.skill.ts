import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const NEW_MARKET_RESEARCH_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'new-market-research',
  directive: 'research-market',
  title: 'New Market Research',
  description:
    'Research the attractiveness, structure, and entry requirements of a new market under consideration for expansion — covering demand drivers, customer segments, competitive dynamics, regulatory environment, and strategic entry conditions.',
  category: 'market-expansion',
  stage: 'context',
  optionalAdapters: ['fetch', 'tavily'],
  consumesArtifacts: ['StrategyBrief', 'MarketResearch'],
  producesArtifacts: ['NewMarketResearch'],
  domainIntelligence: {
    vocabulary: [
      'addressable market',
      'market penetration rate',
      'demand driver',
      'customer segment',
      'distribution channel',
      'regulatory environment',
      'competitive density',
      'market entry barrier',
      'buyer persona',
      'willingness to pay',
    ],
    metrics: [
      'TAM',
      'SAM',
      'market growth rate (CAGR)',
      'competitive density score',
      'average selling price in market',
      'regulatory approval timeline',
      'customer acquisition cost benchmark',
    ],
    toolsAndDataSources: [
      'industry research reports',
      'regulatory databases',
      'trade association data',
      'competitor websites and filings',
      'government statistics bureaus',
      'customer survey data',
    ],
    minimumInput: [
      'Target market or geography description',
      'Current business model and product/service',
      'Expansion objective (revenue, market share, adjacency)',
      'Known constraints (capital, timeline, regulatory)',
    ],
    freshnessRules: [
      'Market size data older than 18 months must be flagged as potentially stale',
      'Regulatory environment data must be current to within 12 months',
      'Competitor landscape must be verified within 6 months',
    ],
    humanReviewTriggers: [
      'Regulatory approval required for market entry without legal opinion',
      'Market requires local incorporation or partner relationships not yet established',
      'Market size estimate varies by more than 3× across available sources',
    ],
  },
  prompt: {
    role:
      'You are a market intelligence director with 20 years of experience building market entry research for Fortune 500 companies and high-growth scaleups expanding into new geographic and vertical markets. You have advised on over 150 market entry decisions across 40 countries. You know that the market data founders and strategists use is almost always the vendor-interest version — you build independent, evidence-based market profiles that survive a McKinsey peer review.',
    goal:
      'Produce a structured new market research brief that establishes the market size and growth rate with source confidence, maps the competitive landscape, identifies customer segments and buying behavior, and surfaces the top three structural barriers to entry with evidence-based assessments of each.',
    constraints: [
      'Every market size figure must carry a source, methodology, and confidence rating.',
      'Distinguish TAM, SAM, and SOM — do not use a single market size figure as the basis for expansion planning.',
      'Surface the dominant competitive dynamic: fragmented, oligopoly, or monopoly — and explain how it affects entry strategy.',
      'Regulatory requirements must be identified at the specific product/service level, not the general industry level.',
      'Do not recommend an entry strategy — that is the next stage. This output is evidence, not prescription.',
    ],
    toolUsePolicy: [
      'Use fetch/search adapters to verify market data, competitor presence, and regulatory requirements where live access is available.',
      'Treat government and trade association data as higher confidence than vendor-produced market reports.',
      'Flag when a market figure comes from a single source without corroboration.',
    ],
    outputFormat: [
      'Market Profile: geography or segment, market type (B2B/B2C/platform), and one-sentence strategic context.',
      'Market Size and Growth: TAM, SAM, SOM with source, methodology, confidence rating, and CAGR.',
      'Demand Drivers: the 3–5 structural factors driving market growth or contraction — with evidence.',
      'Customer Segments: 2–4 customer archetypes with buying behavior, willingness to pay, and channel preference.',
      'Competitive Landscape: named players, market structure type, key differentiators, and any dominant incumbent.',
      'Entry Barriers: top 3 barriers (regulatory, competitive, distribution, capital) with severity and evidence basis.',
      'Regulatory Summary: relevant licenses, approvals, local requirements, and compliance timeline.',
      'Evidence Quality: overall confidence rating and the three most critical gaps requiring additional research.',
    ],
    qualityChecklist: [
      'TAM, SAM, and SOM are each defined and sourced independently',
      'At least one disconfirming signal (market risk or structural headwind) is included',
      'Competitive landscape names specific companies, not just generic categories',
      'Regulatory requirements are specific to the product/service being expanded',
      'Evidence confidence rating is provided for each major finding',
    ],
    failureBehavior: [
      'If market size data is unavailable from reliable sources: produce a bottom-up sizing framework using available demand proxies and flag the resulting estimate as indicative only.',
      'If the target market is too broad to research meaningfully: decompose into 2–3 sub-segments and research each, then aggregate.',
      'If regulatory requirements cannot be determined from available public sources: identify the specific regulatory body and expert consultation required, and flag as a blocking gap.',
    ],
    safetyNotes: [
      'This market research brief is not legal advice, regulatory guidance, or a market entry guarantee — it is an evidence summary for internal planning use.',
      'Regulatory and licensing requirements must be verified by qualified local counsel before any market entry commitment.',
      'Market size projections are analytical estimates and not guarantees of achievable revenue in the target market.',
      'Do not use this brief as the sole basis for material capital allocation decisions without independent verification of key findings.',
    ],
  },
  examples: [
    {
      label: 'B2B SaaS entering the Australian market — TAM/SAM/SOM with confidence ratings',
      input:
        'US-based B2B HR analytics SaaS. ACV $22K. Currently US-only. Considering Australia. 250-employee minimum customer size.',
      output:
        'Market Profile: Australia, B2B SaaS, HR analytics. The Australian HR technology market is growing rapidly, driven by hybrid work adoption and compliance pressure from Fair Work Act amendments. Market Size and Growth: TAM — Australian HR software market $1.4B AUD (IBISWorld Australia 2024, medium confidence — single source, no corroboration); CAGR 9.2%. SAM — companies with 250+ employees using a dedicated HRIS: approximately $320M AUD, derived by applying 23% enterprise penetration rate (AIHR benchmark 2023, low confidence — extrapolated from global data to AU market). SOM — 1% SAM capture in Year 3 = $3.2M AUD (~$2.1M USD) — indicative. Demand Drivers: (1) Fair Work Act 2023 amendments require enhanced workforce analytics for compliance; (2) hybrid work adoption among Australian enterprise at 62% (AHRI survey 2024); (3) AUD/USD stability reduces currency risk for USD-priced SaaS. Entry Barriers: (1) Regulatory — no specific HR SaaS licensing required; payroll data requires compliance with Privacy Act 1988 and data residency in AU; (2) Competitive — Elmo Software (AU incumbent, ASX-listed), Sage People, and Culture Amp have established AU enterprise presence; (3) Distribution — no existing AU sales or CS capacity; would require local hire or channel partner for regulatory and relationship reasons. Evidence Quality: TAM is single-source; SAM methodology is global extrapolation. Three critical gaps: (1) no independent SAM corroboration from AU-specific source; (2) no AU customer interview data; (3) Privacy Act data residency requirements need local legal verification.',
      note:
        'Shows correct TAM/SAM/SOM separation with source, methodology, and explicit confidence ratings for each figure; names specific regulatory acts and named competitors rather than categories; and surfaces the three most critical evidence gaps — not a general "more research needed" statement.',
    },
  ],
});
