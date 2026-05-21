export { COMPETITOR_CONTENT_ANALYSIS_SKILL_SPEC } from './competitor-content-analysis.skill.js';
export { COMPETITOR_POSITIONING_MAP_SKILL_SPEC } from './competitor-positioning-map.skill.js';
export { COMPETITOR_OFFER_REVIEW_SKILL_SPEC } from './competitor-offer-review.skill.js';
export { COMPETITOR_GAP_SYNTHESIS_SKILL_SPEC } from './competitor-gap-synthesis.skill.js';

import { COMPETITOR_CONTENT_ANALYSIS_SKILL_SPEC } from './competitor-content-analysis.skill.js';
import { COMPETITOR_POSITIONING_MAP_SKILL_SPEC } from './competitor-positioning-map.skill.js';
import { COMPETITOR_OFFER_REVIEW_SKILL_SPEC } from './competitor-offer-review.skill.js';
import { COMPETITOR_GAP_SYNTHESIS_SKILL_SPEC } from './competitor-gap-synthesis.skill.js';

export const MARKETING_COMPETITOR_INTELLIGENCE_SKILL_SPECS = [
  COMPETITOR_CONTENT_ANALYSIS_SKILL_SPEC,
  COMPETITOR_POSITIONING_MAP_SKILL_SPEC,
  COMPETITOR_OFFER_REVIEW_SKILL_SPEC,
  COMPETITOR_GAP_SYNTHESIS_SKILL_SPEC,
] as const;
