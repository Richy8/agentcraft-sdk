import type { DomainSkillCategoryPlan } from '../types.js';

export const HEALTHCARE_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'healthcare',
    category: 'patient-education',
    title: 'Healthcare',
    plannedSkills: ['patient-education-writer', 'medical-plain-language-review', 'care-instruction-summary', 'health-claim-risk-review'],
  },
  {
    domain: 'healthcare',
    category: 'clinical-admin',
    title: 'Healthcare',
    plannedSkills: ['clinical-note-summary', 'intake-summary', 'referral-letter-draft', 'care-plan-summary'],
  },
  {
    domain: 'healthcare',
    category: 'medical-research',
    title: 'Healthcare',
    plannedSkills: ['medical-literature-synthesis', 'evidence-grade-review', 'clinical-guideline-comparison'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
