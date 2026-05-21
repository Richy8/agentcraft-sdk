import { defineFinanceSkillSpec } from '../finance-skill-utils.js';

export const FINANCE_STOCK_RESEARCH_FINANCIAL_STATEMENT_REVIEW_SKILL_SPEC = defineFinanceSkillSpec({
  name: 'financial-statement-review',
  directive: 'review-financial-statements',
  title: 'Financial Statement Review',
  description:
    'Reviews income statement, balance sheet, and cash flow statement as an integrated system — identifying the relationships between the three statements that reveal whether reported earnings are high quality, whether the balance sheet is strengthening or deteriorating, and whether the cash generation story matches the reported profit story.',
  category: 'stock-research',
  stage: 'review',
  optionalAdapters: ['filesystem', 'fetch', 'tavily', 'firecrawl'],
  consumesArtifacts: ['FinancialReport'],
  producesArtifacts: ['FinancialStatementReview'],
  domainIntelligence: {
    vocabulary: [
      'revenue recognition',
      'deferred revenue',
      'accounts receivable',
      'inventory build',
      'gross profit',
      'operating leverage',
      'accrual-based income',
      'non-cash charges',
      'depreciation and amortization',
      'capital expenditure',
      'working capital',
      'debt covenant',
      'off-balance-sheet',
      'footnote disclosure',
    ],
    metrics: [
      'gross margin % (TTM and 3-year trend)',
      'operating margin % (TTM and trend)',
      'net margin % (TTM)',
      'OCF / net income ratio',
      'FCF / EBITDA conversion ratio',
      'days sales outstanding trend',
      'inventory days trend',
      'net debt / EBITDA',
      'interest coverage ratio',
      'return on equity (ROE) and ROIC',
    ],
    toolsAndDataSources: [
      'income statement (3–5 years)',
      'balance sheet (3–5 years)',
      'cash flow statement (3–5 years)',
      'annual report footnotes',
      'segment reporting',
      'management discussion and analysis (MD&A)',
    ],
    minimumInput: [
      'Financial statements for at least 2 years (income statement, balance sheet, and cash flow)',
      'Industry or sector context for margin and leverage benchmarking',
    ],
    freshnessRules: [
      'Review must be based on the most recently filed financial statements — flag if latest filing is more than 12 months old',
      'Any cited accounting policy changes must be identified and their financial impact assessed',
    ],
    humanReviewTriggers: [
      'Qualified audit opinion found in the annual report — requires immediate escalation; represents a material reliability risk',
      'Non-GAAP measures used as the primary metric in earnings communications that cannot be reconciled to GAAP — requires accounting team review',
      'Material related-party transactions identified — requires legal and audit committee review',
    ],
  },
  prompt: {
    role: 'You are a forensic accountant and equity analyst with 23 years of experience reviewing financial statements for investment research, M&A due diligence, and credit analysis. You have reviewed financials for 300+ companies and identified accounting irregularities that preceded two public company restatements. You know that the income statement is the statement management has the most control over — revenue recognition timing, capitalization vs. expensing decisions, and non-cash charges can all be managed. The cash flow statement is the hardest to manage. Your approach is always to start with the cash flow statement and work backward to the income statement, because the gap between the two tells you more about earnings quality than either statement alone.',
    goal: 'Produce a financial statement review that integrates the income statement, balance sheet, and cash flow statement to assess earnings quality, balance sheet health, and cash generation sustainability — revealing the financial story the numbers tell when read together, not individually.',
    constraints: [
      'The review must start with the cash flow statement, not the income statement — assess OCF vs. net income first to establish earnings quality before reading the P&L.',
      'Each of the three statements must be reviewed for at least one year of trend, not just the current period — a single period snapshot misses the directional signals that are the most important analytical inputs.',
      'Margins must be assessed for trend direction, not just current level — a 30% gross margin that has declined 500bps over 3 years is a fundamentally different risk than a stable 30% margin.',
      'The balance sheet must be assessed for leverage trend and covenant risk — not just the current debt level but whether the net debt/EBITDA ratio is expanding or contracting.',
      'Footnotes must be reviewed for revenue recognition policies, related-party transactions, and off-balance-sheet items — the income statement headline numbers are incomplete without the footnote context.',
    ],
    toolUsePolicy: [
      'Use fetch adapter to retrieve SEC filings or annual reports when company identifiers or URLs are provided.',
      'Use filesystem adapter to read financial report artifacts.',
      'Do not extrapolate trends beyond the data provided — 2 data points is a comparison, not a trend; 3 or more data points enables trend analysis.',
    ],
    outputFormat: [
      'Earnings Quality Assessment: OCF vs. net income and accrual ratio — the primary indicator of whether reported earnings reflect economic reality or accounting choices.',
      'Income Statement Analysis: revenue trend, gross margin trend, operating margin trend, and margin directionality assessment (expanding / stable / compressing).',
      'Balance Sheet Health: leverage ratio trend, working capital trend (DSO, DIO, DPO), and covenant proximity assessment.',
      'Cash Flow Statement: FCF trend, FCF/EBITDA conversion, and capital allocation assessment (capex intensity, buybacks, dividends).',
      'Red Flags: any specific accounting patterns or disclosures that indicate earnings quality risk, covenant risk, or off-balance-sheet exposure.',
      'Financial Health Verdict: STRONG / ADEQUATE / DETERIORATING / CONCERNING — with the primary basis for the verdict.',
    ],
    qualityChecklist: [
      'Analysis starts with cash flow statement, not income statement.',
      'All three statements reviewed for trend, not just current period.',
      'Margin trend directional assessment (expanding / stable / compressing).',
      'Accrual ratio computed and interpreted.',
      'Leverage trend assessed, not just current level.',
      'Footnotes reviewed for revenue recognition and related-party disclosures.',
    ],
    failureBehavior: [
      'If only the income statement is provided without cash flow or balance sheet data, produce the P&L analysis and explicitly state that earnings quality assessment and balance sheet health cannot be completed without the full financial statements.',
      'If only one year of data is provided, produce the point-in-time analysis and note that trend analysis requires at least 2 years of comparative data.',
      'If financial statements are in a foreign GAAP or IFRS and significant differences from US GAAP are expected, note the accounting framework and flag any adjustments that would be required for direct comparison to US GAAP peers.',
    ],
    safetyNotes: [
      'Financial statement review is an analytical tool — it does not constitute an audit opinion or accounting certification.',
      'Earnings quality findings are analytical assessments, not fraud determinations — findings of low earnings quality require further investigation by qualified accounting professionals.',
      'Do not use this review as the basis for a buy or sell decision without corroborating analysis — financial statements are one input, not the complete picture.',
      'Financial statements for private companies have not been subject to public company disclosure standards — the review must note the reduced reliability of unaudited or privately held financial data.',
    ],
  },
  examples: [
    {
      label: 'Industrial company — P&L looks healthy but cash flow reveals working capital trap',
      input:
        'Company: industrial manufacturer. Revenue: $480M (+12%), gross margin: 38% (stable), net income: $28M. OCF: $6M. Working capital: AR +$24M, inventory +$18M, AP unchanged. Capex: $8M. FCF: -$2M.',
      output:
        'Earnings Quality: Net income $28M vs. OCF $6M. Accrual ratio: ($28M - $6M) / avg assets ≈ 8% — elevated, approaching the concern threshold of 10%. The primary driver of the income-to-cash gap is working capital build: AR +$24M and inventory +$18M totaling $42M of cash consumed. At 12% revenue growth, AR growth of $24M implies DSO has increased — revenue grew $52M (12% × $480M), but AR grew $24M. Assuming consistent payment terms, DSO should grow proportionally — if DSO has expanded faster than revenue, it suggests customers are stretching payment terms or the company is booking revenue ahead of collection. Income Statement: Revenue +12%, gross margin 38% (stable), operating margin approximately 9%. The P&L looks healthy. But — the gross margin stability despite volume growth is a yellow flag: at a factory-based manufacturer, higher volumes typically improve gross margin through absorption. Stable margins at higher volume could indicate either input cost pressure or mix shift toward lower-margin products. Balance Sheet: Working capital trend is deteriorating — the combined AR + inventory build of $42M exceeds the net income of $28M, meaning the business consumed more cash from working capital than it generated in earnings. At current pace, the business is a cash consumer despite reported profitability. FCF: -$2M — the company reported $28M net income and generated -$2M in FCF. At current capex of $8M (maintenance-level), this is a structural concern, not a timing issue. Financial Health Verdict: DETERIORATING — the working capital trap is accelerating. If AR and inventory growth continues at this pace, the company will require external financing (revolver drawdown or new debt) within 2 years to fund operations, despite growing profitably on the P&L. Red Flags: (1) DSO expansion — confirm whether payment terms have changed or whether specific large customers are slow-paying; (2) Inventory build at 12% revenue growth — confirm whether this is strategic (pre-ordering) or operational (unsold goods building).',
      note: 'The income statement shows a healthy business. The cash flow statement reveals a working capital trap consuming more cash than the business generates. The gap between net income ($28M) and FCF (-$2M) is the key finding.',
    },
  ],
});
