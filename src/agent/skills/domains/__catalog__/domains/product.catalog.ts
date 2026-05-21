import type { DomainSkillCategoryPlan } from '../types.js';

export const PRODUCT_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'product',
    category: 'product-research',
    title: 'Product',
    plannedSkills: ['user-problem-research', 'jtbd-synthesis', 'competitor-feature-analysis', 'user-feedback-clustering', 'opportunity-solution-tree'],
  },
  {
    domain: 'product',
    category: 'prd',
    title: 'Product',
    plannedSkills: ['prd-discovery', 'prd-writer', 'user-story-writer', 'acceptance-criteria-review', 'prd-risk-review'],
  },
  {
    domain: 'product',
    category: 'roadmap',
    title: 'Product',
    plannedSkills: ['roadmap-prioritization', 'rice-score-review', 'dependency-map', 'roadmap-narrative-writer'],
  },
  {
    domain: 'product',
    category: 'launch',
    title: 'Product',
    plannedSkills: ['launch-plan', 'launch-readiness-review', 'release-note-writer', 'go-to-market-brief', 'rollout-risk-review'],
  },
  {
    domain: 'product',
    category: 'ux-research',
    title: 'Product',
    plannedSkills: ['interview-guide-writer', 'research-note-synthesis', 'usability-finding-review', 'persona-profile-builder'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
