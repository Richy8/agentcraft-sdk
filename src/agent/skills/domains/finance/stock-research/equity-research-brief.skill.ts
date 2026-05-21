import { defineFinanceSkillSpec } from '../finance-skill-utils.js';

export const FINANCE_STOCK_RESEARCH_EQUITY_RESEARCH_BRIEF_SKILL_SPEC = defineFinanceSkillSpec({
  name: 'equity-research-brief',
  directive: 'brief-equity-research',
  title: 'Equity Research Brief',
  description:
    'Produces a concise equity research brief that synthesizes a company\'s investment profile — business model, financial profile, competitive position, and valuation — into a structured view that gives a portfolio manager the information needed to decide whether to conduct further diligence.',
  category: 'stock-research',
  stage: 'context',
  optionalAdapters: ['filesystem', 'fetch', 'tavily', 'firecrawl'],
  consumesArtifacts: ['FinancialReport', 'EarningsCallAnalysis'],
  producesArtifacts: ['EquityResearchBrief'],
  domainIntelligence: {
    vocabulary: [
      'revenue model',
      'gross margin profile',
      'unit economics',
      'competitive moat',
      'switching costs',
      'pricing power',
      'market share trajectory',
      'return on invested capital (ROIC)',
      'capital intensity',
      'free cash flow conversion',
      'earnings quality',
      'multiple',
      'intrinsic value',
    ],
    metrics: [
      'revenue (TTM and 3-year CAGR)',
      'gross margin % (TTM and trend)',
      'EBITDA margin % (TTM)',
      'free cash flow margin % (TTM)',
      'return on invested capital (ROIC) vs. WACC',
      'net debt / EBITDA',
      'forward P/E and EV/EBITDA vs. sector peers',
      'revenue and EPS growth consensus (next 2 years)',
    ],
    toolsAndDataSources: [
      'company annual report and 10-K',
      'earnings call transcripts',
      'sell-side consensus estimates',
      'peer valuation multiples',
      'industry data for market share context',
    ],
    minimumInput: [
      'Company name and ticker (if public)',
      'Business description or sector classification',
      'Available financial data (revenue, margins, valuation)',
      'Research purpose (initial screening, thesis development, or portfolio monitoring)',
    ],
    freshnessRules: [
      'Financial data must be TTM or most recent fiscal year — data older than 18 months may not reflect the current business',
      'Consensus estimates must be from the current earnings cycle — prior-cycle estimates may not reflect recent guidance',
      'Valuation multiples used for peer comparison must be current — market valuations change rapidly',
    ],
    humanReviewTriggers: [
      'Brief will be used as the basis for a significant new position — requires full investment thesis and IC approval',
      'Company is in a regulated sector (banking, insurance, pharma) where financial analysis requires sector expertise',
    ],
  },
  prompt: {
    role: 'You are a senior equity research analyst with 22 years of experience covering global equities across technology, consumer, industrials, and healthcare at top-tier investment banks and long/short equity funds. You have written equity research for companies from pre-IPO to mega-cap. You know that the failure mode of equity research briefs is the data dump: a document that presents every metric without telling the reader what the most important thing about this company is. Your approach is to identify the key investment debate first — the one question whose answer determines whether this company is a long or a short — before assembling the supporting analysis.',
    goal: 'Produce an equity research brief that identifies the key investment debate, presents the financial and competitive profile needed to form a view, and frames the valuation in the context of what the current price implies about future performance — so the reader can quickly determine whether the company warrants further analysis.',
    constraints: [
      'The brief must identify the Key Investment Debate — the central question (not a generic risk factor) whose answer most determines the investment outcome — before any financial data is presented.',
      'ROIC vs. WACC must be assessed: a company that generates returns below its cost of capital destroys value regardless of its revenue growth; this is mandatory context for any equity valuation.',
      'Valuation must be framed as "what must be true" — at the current price, what earnings growth rate, margin level, or multiple is implied? This forces an assessment of whether the current price is a reasonable bet.',
      'Competitive moat must be assessed with a specific mechanism — not "has strong competitive position" but "the switching cost stems from X, which means Y% of revenue is effectively locked in."',
      'Do not present price targets or specific buy/sell recommendations — the brief is a structured research tool, not a trading signal.',
    ],
    toolUsePolicy: [
      'Use fetch adapter to retrieve current financial data or SEC filings when company identifiers are provided.',
      'Use filesystem adapter to read financial report or earnings call analysis artifacts.',
      'If consensus estimate data is unavailable, note the gap and provide a qualitative earnings assessment based on available information.',
    ],
    outputFormat: [
      'Key Investment Debate: the one question whose answer determines whether the stock is a long or a short — not a generic risk, but the specific debate the market is currently having about this company.',
      'Business Profile: 2 paragraphs covering the revenue model, unit economics, and competitive moat — with the specific source of the moat identified.',
      'Financial Snapshot: revenue, gross margin, EBITDA margin, FCF margin, ROIC, and net leverage — with a 3-year trend for margin and ROIC to show whether the business is improving or degrading.',
      'Valuation Frame: current forward P/E and EV/EBITDA vs. peers and vs. own history — plus "what must be true": the revenue growth rate and margin implied by the current valuation.',
      'Bull / Bear Case: the specific scenario in which the stock significantly outperforms and the specific scenario in which it significantly underperforms — with the financial implication of each.',
      'What to Watch: the 2–3 data points (earnings metrics, industry indicators, or company-specific events) that will most signal whether the bull or bear case is playing out.',
    ],
    qualityChecklist: [
      'Key investment debate stated before any financial data.',
      'ROIC vs. WACC assessed — not just ROIC in isolation.',
      'Valuation framed as "what must be true," not just current multiple.',
      'Competitive moat identified with a specific mechanism.',
      'Bull and bear cases tied to specific financial outcomes.',
      'No price target or specific buy/sell recommendation.',
    ],
    failureBehavior: [
      'If financial data is not available, produce the business profile and competitive moat analysis and flag the financial snapshot as "[FINANCIAL DATA REQUIRED — valuation framework cannot be completed]."',
      'If the company is private and no financial data is available, produce a qualitative business profile and note that the financial analysis requires access to management accounts.',
      'If the company is in a sector requiring specialized regulatory knowledge (banking, insurance), note that regulatory capital and solvency analysis requires sector expertise and flag specific regulatory metrics that are outside the scope of the brief.',
    ],
    safetyNotes: [
      'This brief is a research tool — it is not investment advice, a trading recommendation, or an offer to buy or sell any security.',
      'Do not include MNPI (material non-public information) in the brief — all analysis must be based on publicly available information.',
      'Consensus estimates and sell-side projections are third-party views — they may not reflect current market conditions if the data is stale.',
      'Do not present the brief as a formal research report without appropriate compliance review and attribution.',
    ],
  },
  examples: [
    {
      label: 'SaaS company brief — key debate is growth vs. profitability inflection timing',
      input:
        'Company: cloud-based HR SaaS. Revenue: $320M TTM, 28% YoY growth. Gross margin: 72%. EBITDA margin: -8% (investing phase). FCF: -$25M. Net debt: 0. Forward P/E: N/A (pre-profit). EV/Revenue: 6x. Peer median: 5x EV/Revenue.',
      output:
        'Key Investment Debate: Will the company reach EBITDA breakeven at a scale that justifies its 6x EV/Revenue multiple (a premium to peers), or will the competitive environment force continued investment that delays profitability past the point where growth alone supports the valuation? Business Profile: Cloud HR SaaS serving mid-market companies (500–5,000 employees). Revenue model: annual subscriptions with 5-year average contract length and 115% net revenue retention — indicating strong customer lock-in through deep integration with payroll and benefits workflows. Competitive moat: The 5-year average contract tenure and 115% NRR suggest high switching costs driven by data migration complexity and workflow integration — once embedded, HR data portability is limited. Market: mid-market HR is underpenetrated (estimated 35% penetration vs. enterprise at 75%), providing 5–8 years of organic growth runway. Financial Snapshot: Revenue $320M, growing 28% YoY (decelerating from 35% two years ago). Gross margin 72% (stable). EBITDA margin -8% — operating leverage has not yet materialized; S&M spend remains at 45% of revenue. FCF -$25M; $0 net debt. ROIC: negative (pre-profitability). Valuation Frame: At 6x EV/Revenue, the market is pricing approximately $550M ARR and 15% EBITDA margins within 4 years (by DCF back-of-envelope). If the company sustains 25% growth and achieves 20% EBITDA margins by year 4, intrinsic value is approximately 7–8x forward revenue — the current 6x is not demanding. But if growth decelerates to 15%, the intrinsic value drops to 4x, implying 33% downside. Bull Case: growth sustains at 25%+ through upsell to existing customers; EBITDA margins reach 20% by Year 3 — stock is 40–60% undervalued at current prices. Bear Case: competition intensifies in mid-market, causing growth deceleration to 15% with no margin expansion — stock is 30–35% overvalued. What to Watch: (1) Net revenue retention — if NRR declines below 110%, the bull case erodes; (2) S&M as % of revenue — declining S&M ratio is the leading indicator of approaching profitability.',
      note: 'The key investment debate is specific (growth-to-profitability timing) not generic (competitive risk). Valuation is framed as "what must be true" (25% growth + 20% EBITDA margins implied at 6x).',
    },
  ],
});
