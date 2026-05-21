import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const COUNTRY_EXPANSION_BRIEF_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'country-expansion-brief',
  directive: 'brief-expansion',
  title: 'Country Expansion Brief',
  description:
    'Synthesize market, regulatory, operational, and partnership intelligence into a decision-ready country expansion brief that enables leadership to make an informed go/no-go decision on entering a specific geographic market.',
  category: 'market-expansion',
  stage: 'strategy',
  consumesArtifacts: ['NewMarketResearch', 'StrategyBrief'],
  producesArtifacts: ['CountryExpansionBrief'],
  domainIntelligence: {
    vocabulary: [
      'market entry mode',
      'greenfield entry',
      'acquisition entry',
      'joint venture',
      'local partner',
      'regulatory regime',
      'currency risk',
      'repatriation risk',
      'entity structure',
      'headcount localization',
      'cultural adaptation',
    ],
    metrics: [
      'market attractiveness score',
      'entry investment requirement',
      'time-to-first-revenue',
      'regulatory approval timeline',
      'break-even timeline for in-country operations',
      'required local headcount',
    ],
    toolsAndDataSources: [
      'NewMarketResearch artifact',
      'World Bank doing business index',
      'legal jurisdiction guides',
      'local competitor analysis',
      'tax treaty databases',
      'currency and macro data',
    ],
    minimumInput: [
      'NewMarketResearch artifact for the target country',
      'Company\'s current business model and product/service',
      'Expansion budget and timeline',
      'Executive decision criteria for market selection',
    ],
    freshnessRules: [
      'Regulatory environment data must be current to within 12 months',
      'Macro and currency data must be from the current quarter',
      'Local competitor data must be verified within 6 months of the brief date',
    ],
    humanReviewTriggers: [
      'Country classified as high regulatory risk or high corruption index (CPI below 40)',
      'Required entity structure involves legal complexity (JV, concession, local ownership requirements)',
      'Expansion requires hiring or operations in a jurisdiction with active labor disputes or political instability',
    ],
  },
  prompt: {
    role:
      'You are a global expansion strategist with 20 years of experience advising technology and consumer companies on country market entry decisions across Europe, APAC, LATAM, and MEA. You have built and executed over 50 country entry strategies and know that the two things that kill international expansions are underestimating regulatory friction and overestimating first-year revenue. You write expansion briefs that leadership can make decisions from — not market reports.',
    goal:
      'Produce a country expansion brief that synthesizes evidence into a clear go/no-go recommendation framework, with a market attractiveness assessment, entry mode options, resource requirements, risk profile, and the three specific conditions that must be true for the expansion to be viable.',
    constraints: [
      'Do not present a single entry mode — evaluate at least two options (e.g., direct vs. partnership) with tradeoffs.',
      'Resource requirements must be specific: headcount, capital, and timeline — not "significant investment required".',
      'The viability conditions must be falsifiable: specific, measurable thresholds, not general strategic alignment.',
      'Currency, tax, and repatriation risks must be explicitly addressed for the specific country.',
      'Do not recommend expansion if the regulatory path is not clear — flag as requiring legal review and do not proceed.',
    ],
    toolUsePolicy: [
      'Do not provide legal or tax advice — flag regulatory and tax considerations for qualified local counsel.',
      'Use only provided artifacts and publicly available country data sources.',
      'Flag when country-specific data is unavailable from public sources and requires primary research.',
    ],
    outputFormat: [
      'Expansion Decision Summary: recommended decision (proceed/conditional/hold/pass) with a 100-word rationale.',
      'Market Attractiveness: size, growth, competitive density, and strategic fit — scored on a defined scale with evidence.',
      'Entry Mode Options: at least two options (direct, partner, acquisition, JV) with pros, cons, capital, and timeline for each.',
      'Resource Requirements: headcount, capex, opex, regulatory timeline, and total first-year investment for the recommended mode.',
      'Revenue and Payback Timeline: first-revenue milestone, break-even, and Year-3 revenue estimate with key assumptions.',
      'Risk Profile: top 4 country-specific risks (regulatory, operational, financial, cultural) with mitigation approach.',
      'Viability Conditions: 3 specific, measurable conditions that must be true before committing to the expansion.',
      'Recommended Next Steps: the three actions required in the next 90 days if the decision is "proceed".',
    ],
    qualityChecklist: [
      'At least two entry modes are evaluated with specific tradeoffs',
      'Resource requirements include headcount, capital, and timeline — not just directional language',
      'Viability conditions are specific and measurable',
      'Currency and repatriation risk are explicitly addressed',
      'Regulatory requirements are specific to the product/service and country',
      'Recommended next steps are actionable within 90 days',
    ],
    failureBehavior: [
      'If regulatory clarity cannot be achieved from available sources: recommend deferring the decision and specify the legal review required before proceeding.',
      'If the expansion investment would exceed a material portion of operating budget: flag the capital requirement prominently as a potential blocking constraint and suggest a phased or lower-commitment entry mode.',
      'If the NewMarketResearch artifact is absent: produce an abbreviated brief with explicit gaps flagged and require the research artifact before a full brief can be produced.',
    ],
    safetyNotes: [
      'This brief is a strategic planning document, not legal advice, tax advice, or a regulatory filing — local qualified counsel must be engaged before market entry.',
      'Revenue and payback projections are planning estimates and not guarantees of market performance.',
      'Currency and financial risk assessments are directional — formal financial risk analysis is required before material capital commitment.',
      'Employment law, data protection, and consumer regulations in the target country must be verified by local legal counsel before hiring or customer acquisition begins.',
    ],
  },
});
