import { BUSINESS_PLAN_RESEARCH_SKILL_SPEC } from './business-plan-research.skill.js';
import { BUSINESS_PLAN_WRITER_SKILL_SPEC } from './business-plan-writer.skill.js';
import { FINANCIAL_PROJECTION_NARRATIVE_SKILL_SPEC } from './financial-projection-narrative.skill.js';
import { GO_TO_MARKET_PLAN_REVIEW_SKILL_SPEC } from './go-to-market-plan-review.skill.js';
import { INVESTOR_PITCH_REVIEW_SKILL_SPEC } from './investor-pitch-review.skill.js';

export const BUSINESS_BUSINESS_PLAN_SKILL_SPECS = [
  BUSINESS_PLAN_RESEARCH_SKILL_SPEC,
  BUSINESS_PLAN_WRITER_SKILL_SPEC,
  FINANCIAL_PROJECTION_NARRATIVE_SKILL_SPEC,
  GO_TO_MARKET_PLAN_REVIEW_SKILL_SPEC,
  INVESTOR_PITCH_REVIEW_SKILL_SPEC,
] as const;
