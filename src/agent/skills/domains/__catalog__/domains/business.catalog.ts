import type { DomainSkillCategoryPlan } from '../types.js';

export const BUSINESS_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'business',
    category: 'investments',
    title: 'Business',
    plannedSkills: ['business-investment-opportunity-research', 'business-investment-thesis-writer', 'business-due-diligence-brief', 'business-valuation-review', 'business-investment-risk-review', 'business-exit-scenario-analysis'],
  },
  {
    domain: 'business',
    category: 'strategy',
    title: 'Business',
    plannedSkills: ['business-model-analysis', 'market-entry-strategy', 'competitive-moat-review', 'strategic-options-brief', 'executive-decision-memo'],
  },
  {
    domain: 'business',
    category: 'operations',
    title: 'Business',
    plannedSkills: ['business-process-analysis', 'operating-model-design', 'cost-optimization-brief', 'business-kpi-review', 'business-risk-register'],
  },
  {
    domain: 'business',
    category: 'partnerships',
    title: 'Business',
    plannedSkills: ['partnership-opportunity-research', 'partnership-proposal-writer', 'partner-fit-analysis', 'partnership-risk-review'],
  },
  {
    domain: 'business',
    category: 'business-plan',
    title: 'Business',
    plannedSkills: ['business-plan-research', 'business-plan-writer', 'financial-projection-narrative', 'go-to-market-plan-review', 'investor-pitch-review'],
  },
  {
    domain: 'business',
    category: 'market-expansion',
    title: 'Business',
    plannedSkills: ['new-market-research', 'country-expansion-brief', 'market-sizing-review', 'localization-risk-review', 'expansion-readiness-review'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
