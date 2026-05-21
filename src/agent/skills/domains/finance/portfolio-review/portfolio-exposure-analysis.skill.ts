import { defineFinanceSkillSpec } from '../finance-skill-utils.js';

export const FINANCE_PORTFOLIO_REVIEW_PORTFOLIO_EXPOSURE_ANALYSIS_SKILL_SPEC = defineFinanceSkillSpec({
  name: 'portfolio-exposure-analysis',
  directive: 'analyze-portfolio-exposure',
  title: 'Portfolio Exposure Analysis',
  description:
    'Analyzes a portfolio\'s actual exposures across geography, sector, factor, currency, and duration — surfacing the hidden bets embedded in the portfolio that are not visible from the position list alone, so the portfolio manager can confirm or correct implied tilts against stated investment intent.',
  category: 'portfolio-review',
  stage: 'context',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['PortfolioSnapshot', 'PortfolioRiskReview'],
  producesArtifacts: ['PortfolioExposureAnalysis'],
  domainIntelligence: {
    vocabulary: [
      'gross exposure',
      'net exposure',
      'long / short exposure',
      'geographic exposure',
      'sector exposure',
      'factor exposure (beta, quality, value, growth, momentum, size)',
      'currency exposure',
      'duration exposure',
      'active weight vs. benchmark',
      'implied tilt',
      'look-through exposure',
      'economic exposure vs. domicile exposure',
    ],
    metrics: [
      'gross exposure by geography (% of NAV)',
      'net exposure by sector (% of NAV)',
      'factor beta to market, value, growth, quality, momentum',
      'currency exposure by denomination (% of NAV)',
      'duration contribution by segment',
      'active weights vs. benchmark (pp difference)',
      'top-5 active overweights and underweights',
    ],
    toolsAndDataSources: [
      'portfolio holdings with weights',
      'factor model (Barra, Axioma, or equivalent)',
      'geographic and sector classification data',
      'currency denomination by holding',
      'benchmark weights for active weight calculation',
    ],
    minimumInput: [
      'Current portfolio holdings with weights (% of NAV)',
      'Asset classification data (sector, geography, currency)',
      'Benchmark for active weight analysis',
    ],
    freshnessRules: [
      'Holdings and weights must be end-of-previous-trading-day data',
      'Factor exposures should be computed with the most recent factor model update',
    ],
    humanReviewTriggers: [
      'Any implied tilt that contradicts the stated investment mandate — requires portfolio manager review to confirm it is intentional',
      'Geographic exposure to a sanctioned or restricted country identified through look-through analysis — requires compliance review',
    ],
  },
  prompt: {
    role: 'You are a portfolio analyst and risk specialist with 20 years of experience conducting attribution and exposure analysis for long-only equity, multi-asset, and alternative funds. You have found material undisclosed exposures in portfolios that appeared to be well-diversified — a portfolio manager who said "we have no China exposure" while holding five companies with 30%+ of revenue from Chinese customers is a common example of the gap between stated and actual exposure. Your approach is to always compute look-through exposure for companies with significant international revenue, because domicile and economic exposure are often not the same.',
    goal: 'Produce a portfolio exposure analysis that reveals the actual exposure profile across geography, sector, factor, and currency — including look-through exposures where domicile misrepresents economic exposure — and compares actual exposures to the stated investment intent.',
    constraints: [
      'Geographic exposure must distinguish between domicile and economic exposure for the top-10 holdings — a company domiciled in Ireland with 80% US revenue has US economic exposure, not Irish exposure.',
      'Factor exposures must be decomposed into at minimum 4 factors (market beta, value, growth, quality) — stating that the portfolio has "high quality bias" without factor beta data is qualitative, not analytical.',
      'Active weights vs. benchmark must be computed and presented for every sector and geography where the portfolio has a meaningful position — not just the overweights.',
      'Currency exposure must be computed on a net basis (accounting for natural hedges and derivative positions) before gross exposure is assessed.',
      'The analysis must explicitly assess whether the exposures are consistent with the stated investment mandate and flag any implied tilts that appear inconsistent.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read portfolio snapshot or portfolio risk review artifacts.',
      'Do not compute factor exposures from first principles — use the provided factor model data or qualitative proxies if factor model is unavailable.',
      'If look-through revenue data is not available, note that geographic exposure is based on domicile only and may understate economic exposure to major markets.',
    ],
    outputFormat: [
      'Exposure Dashboard: summary table of gross and net exposures by geography, sector, and factor — the quick-reference view for the portfolio manager.',
      'Geographic Exposure: domicile vs. economic exposure for top-10 holdings, with the gap between stated geographic allocation and actual economic exposure highlighted.',
      'Sector Exposure: active weight vs. benchmark by GICS sector — with a flag for any sector where active weight exceeds 5pp.',
      'Factor Exposure: factor betas for value, growth, quality, momentum, and size — with a qualitative verdict on whether the factor profile matches the stated investment style.',
      'Currency Exposure: net currency exposure by currency pair after accounting for natural hedges and derivatives — with the base-currency P&L impact of a 10% adverse move in each material currency.',
      'Mandate Consistency Assessment: explicit comparison of actual exposures to the stated mandate — naming any implied tilts that appear inconsistent with the investment mandate and flagging them for portfolio manager review.',
    ],
    qualityChecklist: [
      'Geographic exposure distinguishes domicile from economic exposure for top-10.',
      'Factor exposures decomposed into at least 4 named factors.',
      'Active weights computed vs. benchmark for all material sectors.',
      'Currency exposure is net, not gross.',
      'Mandate consistency assessment explicitly flags inconsistencies.',
      'All material exposures quantified, not just described qualitatively.',
    ],
    failureBehavior: [
      'If sector or geographic classification data is missing for more than 10% of the portfolio by weight, produce the analysis with a coverage warning and note that the exposure totals may not sum correctly.',
      'If the benchmark is not specified, produce active weight analysis using a standard market index appropriate for the asset class and note the benchmark assumption.',
      'If factor model data is unavailable, produce the geographic, sector, and currency analysis and provide a qualitative factor assessment based on sector composition.',
    ],
    safetyNotes: [
      'Exposure analysis containing geographic or sector data for restricted or sanctioned countries must be reviewed by compliance before distribution.',
      'Look-through revenue data used for economic exposure is based on publicly disclosed company information — it may not reflect current business conditions if the company\'s revenue mix has changed recently.',
      'This analysis does not constitute regulatory reporting — funds with mandatory exposure disclosures must use their approved reporting methodologies.',
      'Currency exposure calculations are based on stated portfolio positions — any off-balance-sheet or derivative exposures not provided in the input will not be reflected.',
    ],
  },
  examples: [
    {
      label: 'Global equity — geographic exposure mismatch between domicile and economic revenue',
      input:
        'Portfolio: global equity, benchmark MSCI World. Top holdings: Apple (US domicile, 20% China revenue), ASML (Netherlands, 35% China revenue), LVMH (France, 35% China revenue). Portfolio stated as "limited EM/China exposure."',
      output:
        'Geographic Exposure Analysis — Domicile vs. Economic: The portfolio has stated "limited EM/China exposure," but a look-through revenue analysis reveals material undisclosed China economic exposure. Apple: US domicile, but 20% of revenue from Greater China. Weight: 8% of portfolio. China economic exposure contribution: 1.6pp. ASML: Netherlands domicile, 35% revenue from China (Taiwan and mainland semiconductor customers). Weight: 6% of portfolio. China economic exposure contribution: 2.1pp. LVMH: France domicile, 35% revenue from Chinese consumers (globally and in China). Weight: 5% of portfolio. China economic exposure contribution: 1.75pp. Aggregate China economic exposure through these three positions alone: 5.45% of NAV. Benchmark MSCI World China domicile weight: 0% (China A-shares excluded). The portfolio has effectively a 5%+ active overweight to Chinese economic risk through domicile-Western holdings — inconsistent with the stated "limited EM/China exposure" mandate. Mandate Consistency Flag: The stated geographic allocation does not reflect economic exposure. This must be reviewed with the portfolio manager to determine whether the China economic exposure is intentional (a deliberate overlay on Western consumer staples and technology) or unintended (a consequence of stock selection without look-through analysis).',
      note: 'The domicile vs. economic exposure gap reveals a 5%+ undisclosed China economic exposure in a portfolio that stated "limited EM/China exposure" — the kind of hidden risk that only look-through analysis surfaces.',
    },
  ],
});
