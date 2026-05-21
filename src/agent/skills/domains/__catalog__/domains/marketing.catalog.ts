import type { DomainSkillCategoryPlan } from '../types.js';

export const MARKETING_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'marketing',
    category: 'digital-marketing',
    title: 'Marketing',
    plannedSkills: ['digital-marketing-strategy', 'digital-channel-mix-planner', 'digital-funnel-audit', 'digital-attribution-review', 'digital-growth-experiment-planner', 'digital-marketing-performance-brief'],
  },
  {
    domain: 'marketing',
    category: 'seo',
    title: 'Marketing',
    plannedSkills: ['seo-keyword-research', 'seo-serp-analysis', 'seo-content-brief', 'seo-technical-audit', 'seo-internal-link-planner', 'seo-content-refresh-review'],
  },
  {
    domain: 'marketing',
    category: 'ads',
    title: 'Marketing',
    plannedSkills: ['ad-audience-research', 'ad-angle-generator', 'ad-copywriter', 'ad-creative-brief', 'ad-compliance-review', 'ad-variant-analysis'],
  },
  {
    domain: 'marketing',
    category: 'campaign',
    title: 'Marketing',
    plannedSkills: ['campaign-strategy', 'campaign-calendar', 'campaign-brief', 'campaign-asset-planner', 'campaign-performance-review'],
  },
  {
    domain: 'marketing',
    category: 'email-marketing',
    title: 'Marketing',
    plannedSkills: ['email-sequence-planner', 'email-copywriter', 'email-subject-line-review', 'email-segmentation-analysis', 'email-performance-review'],
  },
  {
    domain: 'marketing',
    category: 'landing-page',
    title: 'Marketing',
    plannedSkills: ['landing-page-positioning', 'landing-page-copywriter', 'landing-page-wireframe-brief', 'landing-page-conversion-review', 'landing-page-claim-risk-review'],
  },
  {
    domain: 'marketing',
    category: 'competitor-intelligence',
    title: 'Marketing',
    plannedSkills: ['competitor-content-analysis', 'competitor-positioning-map', 'competitor-offer-review', 'competitor-gap-synthesis'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
