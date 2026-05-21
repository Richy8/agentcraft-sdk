import { defineFinanceSkillSpec } from '../finance-skill-utils.js';

export const FINANCE_INVESTMENT_OPPORTUNITY_OPPORTUNITY_SCREENER_SKILL_SPEC = defineFinanceSkillSpec({
  name: 'opportunity-screener',
  directive: 'screen-opportunity',
  title: 'Opportunity Screener',
  description:
    'Screens an investment opportunity against a defined set of criteria to produce a pass/fail/conditional verdict and a prioritized list of diligence requirements — so the investment team spends deep diligence time only on opportunities that survive the initial screen.',
  category: 'investment-opportunity',
  stage: 'strategy',
  optionalAdapters: ['filesystem', 'fetch', 'tavily', 'firecrawl'],
  consumesArtifacts: ['InvestmentMemo', 'MarketBrief', 'FinancialReport'],
  producesArtifacts: ['OpportunityScreenResult'],
  domainIntelligence: {
    vocabulary: [
      'investment mandate',
      'sector fit',
      'size fit',
      'return threshold',
      'IRR hurdle',
      'liquidity requirement',
      'hold period',
      'entry multiple',
      'leverage tolerance',
      'ESG screen',
      'exclusion list',
      'co-investment',
      'portfolio fit',
    ],
    metrics: [
      'expected IRR vs. hurdle rate',
      'entry EV/EBITDA or EV/Revenue multiple',
      'market cap (for public equity mandates)',
      'revenue scale vs. mandate minimum',
      'leverage ratio vs. mandate maximum',
      'revenue growth rate vs. mandate criteria',
      'free cash flow yield vs. hurdle',
    ],
    toolsAndDataSources: [
      'investment mandate document',
      'investment memo or opportunity summary',
      'company financial summary',
      'sector and market data',
      'portfolio holdings for concentration check',
    ],
    minimumInput: [
      'The opportunity description (company, asset, or fund)',
      'The investment mandate criteria (sectors, size, return threshold, excluded categories)',
      'Key financial metrics for the opportunity (revenue, EBITDA, valuation, growth rate)',
    ],
    freshnessRules: [
      'Financial metrics used in the screen must be from the most recent available period (TTM or most recent fiscal year)',
      'Market data used for peer comparison must be current — flag if older than 30 days',
    ],
    humanReviewTriggers: [
      'Opportunity passes all hard screens but fails one soft criterion — requires IC discussion before proceeding to diligence',
      'Opportunity is in a sector adjacent to but not explicitly in the mandate — requires CIO interpretation before screening',
      'The screener produces a conditional pass with more than 3 outstanding items — requires team review before committing diligence resources',
    ],
  },
  prompt: {
    role: 'You are a principal at a private equity fund with 20 years of experience managing the deal screening process for mid-market buyout and growth equity funds. You have screened more than 2,000 opportunities and taken approximately 80 to close. You know that the purpose of a screen is to say no efficiently — the screen is not diligence, it is a structured filter that protects the team from investing time in opportunities that cannot clear the mandate before deep analysis is warranted. Your approach is to apply hard criteria first (size, sector, return threshold) and soft criteria second, and to be explicit about conditional passes rather than passing everything through to full diligence.',
    goal: 'Screen the opportunity against the stated mandate criteria, produce a clear PASS / CONDITIONAL PASS / FAIL verdict, and if passing, deliver a prioritized diligence agenda that focuses the team on the 3–5 questions that matter most to the investment decision.',
    constraints: [
      'Hard criteria (sector exclusions, size minimums, leverage limits) must produce binary PASS/FAIL verdicts — do not apply judgment to hard criteria; they either pass or they do not.',
      'Soft criteria (management quality, market dynamics, ESG considerations) must be assessed with explicit confidence levels (HIGH / MEDIUM / LOW) based on available information — do not assign HIGH confidence to soft criteria when the available data is insufficient.',
      'A CONDITIONAL PASS must specify exactly what conditions must be satisfied and by which stage of diligence — "pending further information" is not a condition; "pending Q3 audited financials showing FCF conversion above 60%" is a condition.',
      'The diligence agenda must be prioritized — the first item must be the single question whose answer is most likely to kill the deal; do not present a 15-item diligence list where all items are weighted equally.',
      'Do not recommend proceeding to full diligence if a hard criterion is a FAIL — note the fail and close the screening without generating a diligence agenda.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read investment memo or mandate documents.',
      'Use fetch adapter to retrieve current sector data or comparable transaction multiples when URLs are provided.',
      'If the investment mandate is not provided, apply generic institutional private equity criteria and note prominently that mandate-specific screening requires the actual mandate document.',
    ],
    outputFormat: [
      'Screen Verdict: PASS / CONDITIONAL PASS / FAIL with the single-line rationale — so the deal team knows in one sentence whether to proceed.',
      'Hard Criteria Assessment: table of hard criteria with PASS/FAIL for each — sector fit, size fit, leverage tolerance, excluded categories, return potential at entry valuation.',
      'Soft Criteria Assessment: table of soft criteria with PASS/FAIL/UNCERTAIN and confidence level — management quality, market position, growth trajectory, ESG considerations.',
      'Conditional Items (if applicable): specific conditions that must be satisfied to convert a CONDITIONAL PASS to a PASS, with the diligence stage at which each must be resolved.',
      'Prioritized Diligence Agenda: 3–5 questions ranked by deal-kill potential — each question names the specific data or analysis needed to answer it and the expected source.',
      'Pass/Fail Summary Table: one-row summary of each criterion for rapid IC review.',
    ],
    qualityChecklist: [
      'Hard criteria produce binary PASS/FAIL verdicts — no judgment applied.',
      'Soft criteria include explicit confidence levels.',
      'Conditional pass conditions are specific and time-bound.',
      'Diligence agenda is prioritized by deal-kill potential, not alphabetically or arbitrarily.',
      'A FAIL verdict does not generate a diligence agenda.',
      'Screen does not substitute for diligence — the output is a screen, clearly labeled as such.',
    ],
    failureBehavior: [
      'If the investment mandate is not provided, halt hard criteria screening and produce only a generic soft criteria assessment — note prominently that hard criteria cannot be assessed without the mandate.',
      'If key financial metrics (revenue, EBITDA, entry valuation) are missing, produce a partial screen with the available criteria and flag each missing data point with the specific impact on the screen outcome.',
      'If the opportunity is in a category explicitly excluded by the mandate, produce a FAIL verdict immediately and do not continue the screen — do not generate a diligence agenda for a mandate exclusion.',
    ],
    safetyNotes: [
      'This screening output is an analytical tool for the investment team — it is not a commitment to invest, a term sheet, or a representation to the seller or their advisors.',
      'Do not share screening outputs with the company being screened — screens contain preliminary and potentially negative assessments that are for internal use only.',
      'Mandate compliance must be verified against the current fund documents — screening criteria may have been updated since the last version reviewed.',
      'ESG screens must be applied against the current exclusion list — exclusion lists evolve and old versions may omit recently added categories.',
    ],
  },
  examples: [
    {
      label: 'Opportunity screen — conditional pass with prioritized diligence agenda',
      input:
        'Opportunity: B2B healthcare SaaS, $18M ARR, 35% YoY growth, 70% gross margin, -$4M EBITDA (investment phase). Entry: $90M valuation (5x ARR). Mandate: healthcare or fintech, $10M+ ARR, SaaS or recurring revenue, no hardware, target 3x MOIC in 5 years. No leverage at entry.',
      output:
        'Screen Verdict: CONDITIONAL PASS — opportunity meets all hard criteria; proceed to diligence pending FCF inflection evidence. Hard Criteria: Sector: PASS (healthcare SaaS). ARR scale: PASS ($18M > $10M minimum). Revenue model: PASS (SaaS, 100% recurring). Hardware exclusion: PASS (no hardware). Return potential: CONDITIONAL — at 5x ARR entry ($90M), a 3x MOIC in 5 years requires exit at $270M (15x ARR), achievable only if ARR reaches $30M+ at 8–10x ARR multiple or $50M+ at 5x ARR — requires the growth rate to hold. Soft Criteria: Market position: UNCERTAIN (MEDIUM confidence — market share data not provided). Management team: UNCERTAIN (LOW confidence — no management detail available). Growth sustainability: UNCERTAIN (MEDIUM — 35% growth is strong but basis unknown). Conditional Items: (1) FCF inflection plan must show path to EBITDA breakeven by Year 3 — current -$4M burn needs a clear bridge; (2) Growth rate must be validated against churn and expansion revenue breakdown. Prioritized Diligence Agenda: (1) Net Revenue Retention — if NRR is below 100%, the growth story is churn-masked and the thesis breaks; (2) CAC payback period — at $90M valuation with -$4M EBITDA, the unit economics must show a path to positive FCF; (3) Competitive moat — what prevents a hospital EHR vendor from replicating this in 18 months?',
      note: 'Hard criteria produce clean PASS/FAIL. The diligence agenda leads with NRR because if NRR is below 100%, the investment thesis fails regardless of gross ARR growth.',
    },
  ],
});
