import type { DomainSkillCategoryPlan } from '../types.js';

export const SUPPORT_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'support',
    category: 'customer-support',
    title: 'Support And Customer Success',
    plannedSkills: ['ticket-triage', 'support-response-writer', 'refund-policy-review', 'escalation-summary', 'sentiment-risk-review'],
  },
  {
    domain: 'support',
    category: 'knowledge-base',
    title: 'Support And Customer Success',
    plannedSkills: ['kb-gap-analysis', 'kb-article-writer', 'kb-freshness-review', 'support-macro-writer'],
  },
  {
    domain: 'support',
    category: 'customer-success',
    title: 'Support And Customer Success',
    plannedSkills: ['account-health-summary', 'renewal-risk-analysis', 'qbr-writer', 'customer-outcome-plan', 'churn-risk-review'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
