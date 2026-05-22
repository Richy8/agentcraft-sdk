import type { DomainSkillCategoryPlan } from '../types.js';

export const FINANCE_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'finance',
    category: 'stock-research',
    title: 'Finance',
    plannedSkills: ['stock-screening', 'equity-research-brief', 'earnings-call-analysis', 'financial-statement-review', 'valuation-risk-review', 'catalyst-analysis'],
  },
  {
    domain: 'finance',
    category: 'market-update',
    title: 'Finance',
    plannedSkills: ['macro-news-synthesis', 'market-update'],
  },
  {
    domain: 'finance',
    category: 'market-research',
    title: 'Finance',
    plannedSkills: ['sector-rotation-analysis', 'country-market-scan', 'currency-risk-brief'],
  },
  {
    domain: 'finance',
    category: 'portfolio-review',
    title: 'Finance',
    plannedSkills: ['portfolio-exposure-analysis', 'portfolio-risk-review', 'allocation-drift-review', 'portfolio-fit-brief'],
  },
  {
    domain: 'finance',
    category: 'investment-opportunity',
    title: 'Finance',
    plannedSkills: ['opportunity-screener', 'cross-country-opportunity-scan', 'private-market-opportunity-brief', 'investment-thesis-writer', 'investment-red-flag-review'],
  },
  {
    domain: 'finance',
    category: 'financial-reporting',
    title: 'Finance',
    plannedSkills: ['monthly-finance-summary', 'variance-analysis', 'budget-narrative-writer', 'cash-flow-risk-review'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
