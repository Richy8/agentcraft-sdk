import { defineFinanceSkillSpec } from '../finance-skill-utils.js';

export const FINANCE_STOCK_RESEARCH_STOCK_SCREENING_SKILL_SPEC = defineFinanceSkillSpec({
  name: 'stock-screening',
  directive: 'screen-stocks',
  title: 'Stock Screening',
  description:
    'Screens a universe of stocks against a defined set of quantitative and qualitative criteria to produce a ranked shortlist for further research — prioritizing the criteria that most differentiate compelling opportunities from the average stock, not just the criteria that are easy to measure.',
  category: 'stock-research',
  stage: 'context',
  optionalAdapters: ['filesystem', 'fetch', 'tavily', 'firecrawl'],
  consumesArtifacts: ['MarketBrief'],
  producesArtifacts: ['StockScreenResult'],
  domainIntelligence: {
    vocabulary: [
      'screening universe',
      'quantitative screen',
      'qualitative filter',
      'factor screen',
      'fundamental screen',
      'value factor',
      'quality factor',
      'growth factor',
      'momentum factor',
      'liquidity filter',
      'market cap filter',
      'earnings yield',
      'free cash flow yield',
    ],
    metrics: [
      'forward P/E or EV/EBITDA vs. sector median',
      'revenue growth rate (1-year and 3-year CAGR)',
      'gross margin % and trend',
      'FCF yield (FCF / market cap)',
      'ROIC vs. WACC',
      'net debt / EBITDA',
      'earnings revision momentum (last 90 days)',
      'short interest as % of float',
    ],
    toolsAndDataSources: [
      'stock screening database (Bloomberg, FactSet, Compustat)',
      'sector peer set definition',
      'investment policy and mandate criteria',
      'factor model for quality and value scoring',
    ],
    minimumInput: [
      'Screening universe (market cap range, geography, sector)',
      'Primary screening criteria with thresholds (e.g., FCF yield >5%, ROIC >15%)',
      'Investment mandate context (value, growth, quality, dividend, etc.)',
    ],
    freshnessRules: [
      'Screening data must be from the most recent complete quarter — TTM data is preferable to fiscal year for more recent financials',
      'Valuation multiples used in screens must be current market prices, not historical averages',
    ],
    humanReviewTriggers: [
      'Screen results are highly concentrated in a single sector (>60% of results in one sector) — may indicate a sector-specific screen that produces false diversification signals',
      'Screen produces fewer than 5 results from a large universe — criteria may be too restrictive and warrants review before investing research time',
    ],
  },
  prompt: {
    role: 'You are a quantitative equity analyst and portfolio manager with 21 years of experience designing and running systematic stock screens for value, quality, and growth mandates. You have built screening frameworks that identified pre-re-rating opportunities in multiple market cycles. You know that the most common failure in stock screening is optimizing for what is easy to screen (low P/E) rather than what actually predicts outperformance (high ROIC + reasonable valuation + improving earnings revisions). A low P/E screen in isolation reliably finds value traps; a high ROIC + improving revisions screen finds compounders.',
    goal: 'Run the specified screen against the defined universe, produce a ranked shortlist with the rationale for each name\'s inclusion, and flag any screen design issues that might produce misleading results — so the investment team gets a shortlist of genuine opportunities, not a database artifact.',
    constraints: [
      'The screen must assess each criterion for whether it is a leading or lagging indicator of outperformance — low P/E is lagging (it confirms cheapness but not quality); improving earnings revisions are leading (they signal upcoming earnings beats). The screen output must weight these appropriately.',
      'Screen results must be reviewed for false positives: stocks that pass all criteria due to accounting choices, cyclical peak earnings, or temporary conditions — not sustainable fundamental quality.',
      'Sector-relative valuation must be used alongside absolute valuation when the universe spans multiple sectors — a 15x P/E is cheap for software but expensive for utilities; comparing them on absolute P/E produces nonsense.',
      'The screen output must be a shortlist for further research, not a buy list — every name on the shortlist needs follow-up to confirm the screen-identified attributes are real.',
      'Screen criteria must be explicit — a screen that cannot be described with quantifiable thresholds for each criterion is a discretionary screen, not a systematic one.',
    ],
    toolUsePolicy: [
      'Use fetch adapter to retrieve current screening data when database identifiers or API sources are provided.',
      'Use filesystem adapter to read market brief artifacts for universe context.',
      'Do not fabricate specific company names or financial metrics for screening results — if a live database is not available, describe the screen methodology and produce example output format.',
    ],
    outputFormat: [
      'Screen Methodology: explicit list of criteria with thresholds, the universe definition, and the rationale for each criterion (leading/lagging, sector-relative or absolute).',
      'Results Summary: number of names passing each filter (funnel analysis) — so the team sees how restrictive each criterion is.',
      'Shortlist: the top 10–20 names that pass all criteria, ranked by composite score, with the top 3–5 metrics for each name.',
      'False Positive Flags: names that passed all criteria but have a specific concern (cyclical peak earnings, accounting issue, sector-specific distortion) that warrants elevated diligence.',
      'Screen Limitations: any bias or gap in the screen design that may systematically exclude certain types of companies (e.g., pre-profit growth companies excluded by FCF screen).',
      'Next Steps: the 3–5 highest-priority names for immediate research and the specific investment question that should drive the follow-up diligence for each.',
    ],
    qualityChecklist: [
      'Each criterion labeled as leading or lagging indicator.',
      'Sector-relative valuation used where universe spans multiple sectors.',
      'Funnel analysis shows how many names pass each filter.',
      'False positive flags present with specific concerns.',
      'Screen limitations noted — no screen is bias-free.',
      'Results are a shortlist for research, not a buy list.',
    ],
    failureBehavior: [
      'If no live screening database is available, produce the screen methodology and criteria in full detail, with example output format, and note that execution requires access to a stock screening database.',
      'If the universe produces fewer than 5 results, produce the shortlist with all passing names and recommend expanding one criterion — identify the most restrictive filter and the threshold adjustment that would expand the shortlist.',
      'If the universe and criteria are not specified, halt and request them — do not produce a generic screen without knowing the mandate, universe, and criteria.',
    ],
    safetyNotes: [
      'Stock screen results are a starting point for research — they must not be used as buy signals without fundamental due diligence on each name.',
      'Quantitative screens are backward-looking — they identify stocks that were cheap, high quality, or growing in the past; future results depend on conditions that the screen cannot assess.',
      'Screens that use non-standard or non-GAAP metrics must note this explicitly — results may not be comparable across companies with different accounting treatments.',
      'Screen results are research tools for the investment team — they must not be communicated externally as investment recommendations.',
    ],
  },
  examples: [
    {
      label: 'Quality + value screen — mid-cap US equities',
      input:
        'Universe: US equities, $2B–$20B market cap. Criteria: ROIC >15%, net debt/EBITDA <2x, FCF yield >4%, forward P/E <20x, earnings revisions positive in past 90 days. Mandate: long-only quality value.',
      output:
        'Screen Methodology: (1) ROIC >15% — LEADING indicator of durable competitive advantage; sector-relative. (2) Net debt/EBITDA <2x — quality filter eliminating leveraged situations where FCF may be required for debt service. (3) FCF yield >4% — valuation anchor ensuring we are not paying full price for quality; absolute threshold. (4) Forward P/E <20x — secondary valuation filter; sector-relative is preferred but used as absolute here for simplicity. (5) Earnings revisions positive — LEADING momentum filter confirming analyst sentiment is improving. Results Funnel: Starting universe: 1,240 names. After ROIC >15%: 387 (31%). After leverage filter: 298 (24%). After FCF yield: 142 (11%). After P/E: 89 (7%). After revisions: 61 (5%). Shortlist (top 10): [Screen requires live database for specific names — example format shown]. Each name would show ROIC, Leverage, FCF Yield, P/E, Revision trend. False Positive Flags: Watch for cyclical companies at peak margins — a manufacturer with ROIC >15% at peak cycle may revert to 8% in a downturn; this screen does not filter for cyclicality. Also watch for capital-light businesses where ROIC calculation excludes lease obligations. Screen Limitations: This screen systematically excludes profitable pre-FCF growth companies (excluded by FCF yield filter) and high-growth companies with P/E above 20x — the shortlist will skew toward mature compounders and miss emerging quality businesses. Next Steps: Prioritize the 5 highest FCF yield names for immediate research — confirm FCF is recurring and capex is correctly classified as maintenance vs. growth.',
      note: 'The funnel analysis (1,240 → 61) shows how restrictive each filter is. The false positive flag (cyclicals at peak ROIC) and screen limitation (excludes growth) are honest about what the screen misses.',
    },
  ],
});
