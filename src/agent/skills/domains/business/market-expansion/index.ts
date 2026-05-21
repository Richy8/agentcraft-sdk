
import { NEW_MARKET_RESEARCH_SKILL_SPEC } from './new-market-research.skill.js';
import { COUNTRY_EXPANSION_BRIEF_SKILL_SPEC } from './country-expansion-brief.skill.js';
import { MARKET_SIZING_REVIEW_SKILL_SPEC } from './market-sizing-review.skill.js';
import { LOCALIZATION_RISK_REVIEW_SKILL_SPEC } from './localization-risk-review.skill.js';
import { EXPANSION_READINESS_REVIEW_SKILL_SPEC } from './expansion-readiness-review.skill.js';

export const BUSINESS_MARKET_EXPANSION_SKILL_SPECS = [
  NEW_MARKET_RESEARCH_SKILL_SPEC,
  COUNTRY_EXPANSION_BRIEF_SKILL_SPEC,
  MARKET_SIZING_REVIEW_SKILL_SPEC,
  LOCALIZATION_RISK_REVIEW_SKILL_SPEC,
  EXPANSION_READINESS_REVIEW_SKILL_SPEC,
] as const;
