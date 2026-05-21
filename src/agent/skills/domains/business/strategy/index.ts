import { BUSINESS_MODEL_ANALYSIS_SKILL_SPEC } from './business-model-analysis.skill.js';
import { MARKET_ENTRY_STRATEGY_SKILL_SPEC } from './market-entry-strategy.skill.js';
import { COMPETITIVE_MOAT_REVIEW_SKILL_SPEC } from './competitive-moat-review.skill.js';
import { STRATEGIC_OPTIONS_BRIEF_SKILL_SPEC } from './strategic-options-brief.skill.js';
import { EXECUTIVE_DECISION_MEMO_SKILL_SPEC } from './executive-decision-memo.skill.js';

export const BUSINESS_STRATEGY_SKILL_SPECS = [
  BUSINESS_MODEL_ANALYSIS_SKILL_SPEC,
  MARKET_ENTRY_STRATEGY_SKILL_SPEC,
  COMPETITIVE_MOAT_REVIEW_SKILL_SPEC,
  STRATEGIC_OPTIONS_BRIEF_SKILL_SPEC,
  EXECUTIVE_DECISION_MEMO_SKILL_SPEC,
] as const;
