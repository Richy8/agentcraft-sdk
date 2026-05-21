import type { DomainSkillCategoryPlan } from '../types.js';

export const BRAND_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'brand',
    category: 'research',
    title: 'Brand',
    plannedSkills: ['brand-research', 'audience-insight-research', 'voice-of-customer-mining', 'competitor-brand-scan'],
  },
  {
    domain: 'brand',
    category: 'positioning',
    title: 'Brand',
    plannedSkills: ['brand-positioning', 'brand-differentiation-map', 'brand-promise-writer', 'brand-narrative-brief'],
  },
  {
    domain: 'brand',
    category: 'messaging',
    title: 'Brand',
    plannedSkills: ['messaging-framework-writer', 'tagline-options-writer', 'value-proposition-writer', 'brand-story-writer', 'proof-point-mapper'],
  },
  {
    domain: 'brand',
    category: 'voice',
    title: 'Brand',
    plannedSkills: ['brand-voice-profile', 'tone-of-voice-guide', 'brand-guideline-writer', 'brand-consistency-review'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
