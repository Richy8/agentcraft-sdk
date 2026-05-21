export { CAMPAIGN_STRATEGY_SKILL_SPEC } from './campaign-strategy.skill.js';
export { CAMPAIGN_CALENDAR_SKILL_SPEC } from './campaign-calendar.skill.js';
export { CAMPAIGN_BRIEF_SKILL_SPEC } from './campaign-brief.skill.js';
export { CAMPAIGN_ASSET_PLANNER_SKILL_SPEC } from './campaign-asset-planner.skill.js';
export { CAMPAIGN_PERFORMANCE_REVIEW_SKILL_SPEC } from './campaign-performance-review.skill.js';
import { CAMPAIGN_STRATEGY_SKILL_SPEC } from './campaign-strategy.skill.js';
import { CAMPAIGN_CALENDAR_SKILL_SPEC } from './campaign-calendar.skill.js';
import { CAMPAIGN_BRIEF_SKILL_SPEC } from './campaign-brief.skill.js';
import { CAMPAIGN_ASSET_PLANNER_SKILL_SPEC } from './campaign-asset-planner.skill.js';
import { CAMPAIGN_PERFORMANCE_REVIEW_SKILL_SPEC } from './campaign-performance-review.skill.js';

export const MARKETING_CAMPAIGN_SKILL_SPECS = [
  CAMPAIGN_STRATEGY_SKILL_SPEC,
  CAMPAIGN_CALENDAR_SKILL_SPEC,
  CAMPAIGN_BRIEF_SKILL_SPEC,
  CAMPAIGN_ASSET_PLANNER_SKILL_SPEC,
  CAMPAIGN_PERFORMANCE_REVIEW_SKILL_SPEC,
] as const;
