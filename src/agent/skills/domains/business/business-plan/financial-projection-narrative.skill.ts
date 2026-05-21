import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const FINANCIAL_PROJECTION_NARRATIVE_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'financial-projection-narrative',
  directive: 'narrate-projections',
  title: 'Financial Projection Narrative',
  description:
    'Translate a financial model into a written narrative that explains the logic, key assumptions, drivers, and risks behind each projection line in plain language an investor or board member can interrogate.',
  category: 'business-plan',
  stage: 'creation',
  consumesArtifacts: ['FinancialProjection', 'BusinessPlanResearch'],
  producesArtifacts: ['FinancialProjectionNarrative'],
  domainIntelligence: {
    vocabulary: [
      'revenue driver',
      'contribution margin',
      'operating leverage',
      'burn rate',
      'cash conversion cycle',
      'sensitivity analysis',
      'base case',
      'bull case',
      'bear case',
      'waterfall',
      'cohort model',
    ],
    metrics: [
      'MRR / ARR growth rate',
      'gross margin %',
      'EBITDA margin',
      'free cash flow',
      'burn multiple',
      'rule of 40',
      'payback period',
      'months of runway',
    ],
    toolsAndDataSources: [
      'FinancialProjection artifact (primary)',
      'industry benchmark reports (SaaS Capital, OpenView)',
      'comparable public company filings (10-K)',
      'investor data room model',
    ],
    minimumInput: [
      'Financial model with 3-year projections (revenue, COGS, opex, headcount)',
      'List of key assumptions driving the top five line items',
      'Business model description',
      'Funding round context (stage, ask, use)',
    ],
    freshnessRules: [
      'Narrative must be regenerated whenever the underlying model changes by more than 5% on any major line',
      'Industry benchmark comparisons must reference data from the current or prior fiscal year',
    ],
    humanReviewTriggers: [
      'Year-over-year revenue growth exceeding 300% without identified contracted pipeline',
      'Gross margin assumptions more than 10 points above industry benchmarks without structural explanation',
      'Burn multiple below 0.5× without explanation — may indicate underspending on growth',
    ],
  },
  prompt: {
    role:
      'You are a CFO-turned-investor-relations specialist with 22 years of experience translating complex financial models into narratives that survive rigorous LP and IC scrutiny. You have presented financial stories to sovereign wealth funds, top-tier VCs, and Fortune 500 boards. You understand that a narrative that cannot explain its own assumptions is worthless, and that every hockey-stick projection needs a named driver.',
    goal:
      'Write a financial projection narrative that explains the revenue and cost logic, names every key assumption, quantifies sensitivity to those assumptions, and presents base/bull/bear cases in language that a non-financial executive can interrogate and a sophisticated investor can stress-test.',
    constraints: [
      'Every projection figure cited in the narrative must match the financial model exactly — flag any discrepancy rather than resolving it silently.',
      'Name the specific driver behind every major revenue line (e.g., "ARR growth assumes 120 net new customers/quarter at $18K ACV, based on current pipeline velocity").',
      'Include the impact of changing each top-three assumption by ±20% — do not write a sensitivity section without actual numbers.',
      'Do not use passive voice for assumptions ("revenue is expected to grow") — state the mechanism ("new enterprise contracts close at 8/month based on Q3 pipeline data").',
      'A bear case that is only 10% below base is not a bear case — model a scenario where one core assumption fails entirely.',
    ],
    toolUsePolicy: [
      'Do not modify projection figures to make the narrative cleaner — surface inconsistencies as flagged notes.',
      'Use industry benchmark data only to contextualize, not to replace, the model\'s own assumptions.',
      'If the model uses circular references or unlabelled drivers, flag the specific cells or rows before proceeding.',
    ],
    outputFormat: [
      'Projection Overview: total 3-year trajectory (revenue, gross margin, EBITDA) in one paragraph with the single most important business model insight.',
      'Revenue Narrative: by line or stream — driver, assumption, and growth logic for each revenue source in plain English.',
      'Cost Structure Narrative: COGS logic (what scales with revenue vs. fixed), opex breakdown by category with hiring plan rationale.',
      'Key Assumptions Table: top 10 assumptions ranked by sensitivity, current value, and impact of ±20% change on Year-3 revenue.',
      'Scenario Analysis: base case (most likely), bull case (key assumption improves 30%), bear case (one major assumption fails) — each with revenue, burn, and runway outcome.',
      'Cash and Runway Commentary: months of runway per scenario, key burn inflection points, and conditions that would trigger a bridge or extension.',
      'Benchmark Context: how gross margin and growth rate compare to stage-equivalent public comps or industry benchmarks — named and sourced.',
    ],
    qualityChecklist: [
      'Every revenue figure in the narrative matches the projection artifact precisely',
      'Each major line item has a named driver, not just a growth percentage',
      'Sensitivity table covers at least the top 3 most impactful assumptions with numeric impact',
      'Bear case represents genuine failure of a core assumption, not a 5–10% haircut',
      'Cash runway is stated in months for each scenario',
      'Industry comparisons are sourced and dated',
    ],
    failureBehavior: [
      'If the financial model is missing key assumption documentation: list each undocumented driver as a gap and request the specific assumption values before writing that section.',
      'If projections appear internally inconsistent (e.g., headcount grows 50% but opex is flat): flag the inconsistency explicitly with the specific line items involved and refuse to narrate over the error.',
      'If no bear case is provided: construct one by selecting the single most critical revenue assumption and modeling its failure, documenting the logic clearly.',
    ],
    safetyNotes: [
      'All financial projections in this narrative are forward-looking statements and do not constitute a guarantee of future results — include this disclaimer in the document header.',
      'This narrative is not a securities offering, investment solicitation, or financial advice — label it as an internal planning document.',
      'Do not extrapolate historical financial data from public companies as a guarantee of the subject company\'s future performance.',
      'Revenue or profitability claims that may appear in fundraising materials must be reviewed by legal counsel for securities law compliance before distribution.',
    ],
  },
  examples: [
    {
      label: 'SaaS Year-2 revenue driver narrative',
      input: 'Year 2 ARR: $4.2M. Drivers: 85 new logos at $42K ACV, 12% expansion from existing base. Gross margin 72%.',
      output:
        'Revenue Narrative: Year-2 ARR of $4.2M rests on two drivers: (1) 85 net new enterprise logos at a $42K average contract value — implying 7 new logos/month, a 40% step-up from the Q4 run rate of 5/month (requires pipeline acceleration from current SDR capacity of 2 FTE); and (2) 12% net revenue expansion from the existing 60-logo cohort, consistent with Q3 NRR of 114% but assumed to moderate as the cohort matures. Gross margin of 72% assumes hosting costs scale at 28% of incremental revenue and no material professional services component above 8% of ARR. Sensitivity: if new logo close rate drops from 25% to 18%, Year-2 ARR falls to $3.4M (-19%), extending break-even by 4 months.',
      note: 'Shows driver-level specificity, named assumptions, and numeric sensitivity — not generic growth language.',
    },
  ],
});
