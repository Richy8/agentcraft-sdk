import type { DomainSkillCategoryPlan } from '../types.js';

export const DATA_ANALYTICS_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'data-analytics',
    category: 'dashboard',
    title: 'Data Analytics',
    plannedSkills: ['dashboard-requirements-writer', 'metric-definition-review', 'dashboard-insight-writer', 'data-quality-review'],
  },
  {
    domain: 'data-analytics',
    category: 'experiment-analysis',
    title: 'Data Analytics',
    plannedSkills: ['experiment-design-review', 'ab-test-analysis', 'causality-risk-review', 'experiment-readout-writer'],
  },
  {
    domain: 'data-analytics',
    category: 'reporting',
    title: 'Data Analytics',
    plannedSkills: ['weekly-metric-summary', 'executive-data-brief', 'anomaly-investigation', 'cohort-analysis-brief'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
