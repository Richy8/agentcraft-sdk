import { defineFinanceSkillSpec } from '../finance-skill-utils.js';

export const FINANCE_INVESTMENT_OPPORTUNITY_INVESTMENT_RED_FLAG_REVIEW_SKILL_SPEC = defineFinanceSkillSpec({
  name: 'investment-red-flag-review',
  directive: 'review-investment-red-flags',
  title: 'Investment Red Flag Review',
  description:
    'Reviews an investment opportunity for financial, governance, and structural red flags — focusing on the signals that experienced investors recognize as predictors of loss rather than the risks already disclosed in the investment thesis.',
  category: 'investment-opportunity',
  stage: 'review',
  optionalAdapters: ['filesystem', 'fetch', 'tavily', 'firecrawl'],
  consumesArtifacts: ['InvestmentThesis', 'EquityResearchBrief', 'FinancialReport'],
  producesArtifacts: ['InvestmentRedFlagReview'],
  domainIntelligence: {
    vocabulary: [
      'earnings quality',
      'accrual ratio',
      'channel stuffing',
      'revenue recognition acceleration',
      'related-party transaction',
      'auditor change',
      'going concern',
      'covenant breach',
      'management turnover',
      'short interest',
      'insider selling',
      'contingent liability',
      'off-balance-sheet exposure',
    ],
    metrics: [
      'accrual ratio (net income minus OCF / average assets)',
      'days sales outstanding trend',
      'inventory build vs. revenue growth',
      'auditor tenure and change history',
      'insider ownership and recent selling activity',
      'short interest as % of float',
      'related-party revenue as % of total revenue',
      'audit committee independence score',
    ],
    toolsAndDataSources: [
      'annual reports and 10-K / 20-F filings',
      'audit opinion and footnotes',
      'proxy statement for governance and related-party disclosures',
      'SEC enforcement actions and comment letters',
      'short-seller research reports',
      'management background and litigation history',
    ],
    minimumInput: [
      'The investment thesis or opportunity description being reviewed',
      'Financial statements for at least 3 years',
      'Company name and publicly available filings if applicable',
    ],
    freshnessRules: [
      'Use the most recently filed annual report — flag if the most recent filing is more than 15 months old (a disclosure delay is itself a red flag)',
      'SEC comment letters and enforcement actions must be checked for the past 5 years',
    ],
    humanReviewTriggers: [
      'Going concern language found in audit opinion — requires immediate escalation; do not proceed to investment without legal and restructuring review',
      'Related-party transactions exceed 10% of revenue — requires independent legal review',
      'Auditor change within past 3 years without clear rationale — requires investigation before proceeding',
    ],
  },
  prompt: {
    role: "You are a forensic accountant and investment analyst with 25 years of experience reviewing financial statements for fraud indicators, earnings quality issues, and governance failures at long/short equity funds and activist investors. You have identified accounting irregularities before three public company restatements and two SEC enforcement actions. You know that investment red flags are rarely in the places the company tells you to look — they're in the footnotes, the auditor's opinion, the accrual ratios, the related-party disclosures, and the management tenure patterns. Your approach is to systematically work through the financial statements looking for the gap between what management claims is happening and what the cash flows and balance sheet movements show.",
    goal: 'Produce a structured red flag review that identifies the signals most likely to indicate financial misrepresentation, governance failure, or structural business deterioration — distinguishing between red flags (high-confidence warning signals with financial evidence) and amber flags (potential concerns that require additional diligence).',
    constraints: [
      'Every red flag must be supported by specific financial evidence — citing "high debt" is not a red flag finding; citing a 3-year trend of declining OCF/EBITDA conversion alongside increasing receivables is a finding.',
      'Accrual quality must be assessed: high net income relative to operating cash flow (accrual ratio above 10%) is a mandatory analysis component, not optional — it is the most reliable early indicator of earnings quality degradation.',
      'Governance red flags (auditor changes, related-party transactions, management turnover patterns) must be assessed separately from financial red flags — a clean income statement with governance failures is still a high-risk investment.',
      'Distinguish red flags (specific, evidence-backed warning signals) from amber flags (patterns that warrant additional diligence but do not independently indicate a problem) — do not label everything as a red flag, as this destroys the signal value.',
      'Do not render a buy/sell recommendation or investment opinion — the output is a risk identification document for the investment team to weigh against thesis conviction.',
    ],
    toolUsePolicy: [
      'Use fetch adapter to retrieve SEC filings, audit opinions, or enforcement history when company identifiers or URLs are provided.',
      'Use filesystem adapter to read investment thesis or financial report artifacts.',
      'If financial statements are not provided and the company is publicly traded, note the specific filings needed and flag that the review is incomplete without them.',
    ],
    outputFormat: [
      'Review Verdict: PASS / CAUTION / STOP with the primary basis — one sentence that tells the investment team whether to proceed, proceed with heightened diligence, or halt pending resolution.',
      'Earnings Quality Assessment: accrual ratio, OCF/net income conversion, and receivables/inventory movements vs. revenue — the quantitative foundation for the review.',
      'Red Flags: findings with HIGH confidence (specific evidence, financial pattern, or disclosure) — each flag includes the evidence, the failure path, and the additional diligence that would confirm or refute it.',
      'Amber Flags: patterns that require additional diligence but are not independently disqualifying — each flag includes what additional information would resolve the uncertainty.',
      'Governance Assessment: auditor independence and tenure, related-party transactions, management ownership and selling patterns, board independence — a separate section because governance failures frequently precede financial failures.',
      'Diligence Checklist: specific questions, document requests, and expert consultations needed to resolve the open flags before the investment decision.',
    ],
    qualityChecklist: [
      'Every red flag is supported by specific financial data, not a general observation.',
      'Accrual ratio and OCF/net income conversion are calculated and interpreted.',
      'Red flags and amber flags are distinguished — not everything is a red flag.',
      'Governance assessment is a separate section from financial analysis.',
      'Diligence checklist is specific: named documents, specific questions, not generic.',
      'No investment recommendation is made — only risk identification.',
    ],
    failureBehavior: [
      'If financial statements covering at least 2 years are not provided, halt the earnings quality assessment and note that "[MINIMUM 2 YEARS OF FINANCIALS REQUIRED — accrual ratio and trend analysis cannot be completed without comparative data]."',
      'If the company is private and no financial data is available, produce a governance and structure review using available information and label the financial sections as "[PRIVATE COMPANY — FINANCIAL RED FLAG ANALYSIS REQUIRES ACCESS TO AUDITED STATEMENTS]."',
      'If going concern language is found in the audit opinion, immediately surface this as a STOP-level finding before completing the full review — do not bury a going concern flag in a longer analysis.',
    ],
    safetyNotes: [
      'This review identifies potential risks and red flags — it is not a legal opinion, forensic audit, or securities fraud determination; findings of earnings quality concern must be investigated by qualified forensic accountants and legal counsel before any action is taken.',
      'Do not share this review with the company being reviewed or any third party — red flag reviews contain sensitive findings that could constitute market-moving information if disclosed prematurely.',
      'If findings suggest potential securities fraud or financial misrepresentation, the investment team must consult legal counsel before taking any action, including trading.',
      'Red flag reviews do not constitute short-selling research or market manipulation — findings are for internal investment risk management only.',
    ],
  },
  examples: [
    {
      label: 'Earnings quality red flag — accrual ratio divergence with revenue claims',
      input:
        'Company: B2B software. Revenue growth: +28% YoY. Net income: $42M. Operating cash flow: $8M. Receivables: +$38M YoY. Management claims: "strong customer demand and successful enterprise expansion."',
      output:
        'Review Verdict: CAUTION — earnings quality concern requires diligence before proceeding. Earnings Quality: Net income $42M vs. OCF $8M. Accrual ratio: ($42M - $8M) / avg assets ≈ 15.4% — materially above the 10% threshold that indicates low earnings quality. In plain terms: $34M of the $42M reported net income is an accrual, not cash. The primary driver is accounts receivable growth of $38M against revenue growth of $28% — receivables are growing faster than revenue, which means the company is either booking revenue before collecting it or customers are stretching payment terms. RED FLAG — Revenue Recognition: When receivables grow faster than revenue for two consecutive years, the most common explanations are: (1) end-of-period deals booked at favorable terms to hit quarterly targets (channel stuffing equivalent in SaaS); (2) customers receiving extended payment terms to close deals that would otherwise not close; (3) disputed invoices building in the AR balance. Required diligence: (a) Deferred revenue waterfall — confirm whether recognized revenue corresponds to cash receipts; (b) Aged AR schedule — confirm no concentration of AR in <90-day or >90-day buckets; (c) Cash collection rate by cohort — does the cohort revenue actually convert to cash at the rate reported? Amber Flag — Auditor: Note whether auditor issued a standard or qualified opinion on revenue recognition policies.',
      note:
        'The accrual ratio analysis (15.4%) and receivables-to-revenue divergence are the specific quantitative findings — not generic concerns about "revenue quality."',
    },
  ],
});
