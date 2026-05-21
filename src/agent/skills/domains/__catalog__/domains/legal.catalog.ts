import type { DomainSkillCategoryPlan } from '../types.js';

export const LEGAL_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'legal',
    category: 'contract-review',
    title: 'Legal And Compliance',
    plannedSkills: ['contract-summary', 'contract-risk-review', 'clause-comparison', 'negotiation-issue-list', 'legal-review-brief'],
  },
  {
    domain: 'legal',
    category: 'compliance',
    title: 'Legal And Compliance',
    plannedSkills: ['policy-gap-analysis', 'compliance-checklist', 'regulated-claim-review', 'audit-evidence-summary'],
  },
  {
    domain: 'legal',
    category: 'policy-drafting',
    title: 'Legal And Compliance',
    plannedSkills: ['policy-draft-writer', 'policy-plain-language-review', 'policy-change-summary'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
