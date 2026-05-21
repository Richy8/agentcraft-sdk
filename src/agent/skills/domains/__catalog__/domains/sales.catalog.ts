import type { DomainSkillCategoryPlan } from '../types.js';

export const SALES_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'sales',
    category: 'prospecting',
    title: 'Sales',
    plannedSkills: ['prospect-research', 'account-fit-analysis', 'lead-prioritization', 'outreach-personalization', 'prospecting-risk-review'],
  },
  {
    domain: 'sales',
    category: 'proposal',
    title: 'Sales',
    plannedSkills: ['proposal-discovery-synthesis', 'proposal-writer', 'proposal-pricing-rationale', 'proposal-objection-review', 'proposal-red-team-review'],
  },
  {
    domain: 'sales',
    category: 'crm',
    title: 'Sales',
    plannedSkills: ['crm-note-summarizer', 'crm-next-step-planner', 'pipeline-risk-analysis', 'deal-review', 'forecast-narrative-writer'],
  },
  {
    domain: 'sales',
    category: 'objection-handling',
    title: 'Sales',
    plannedSkills: ['objection-research', 'objection-response-writer', 'competitive-objection-review', 'sales-call-coach'],
  },
  {
    domain: 'sales',
    category: 'account-research',
    title: 'Sales',
    plannedSkills: ['account-news-research', 'stakeholder-map', 'buying-committee-analysis', 'account-plan-writer'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
