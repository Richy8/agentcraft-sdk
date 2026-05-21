export { PRODUCT_PRD_PRD_DISCOVERY_SKILL_SPEC } from "./prd-discovery.skill.js";
export { PRODUCT_PRD_PRD_WRITER_SKILL_SPEC } from "./prd-writer.skill.js";
export { PRODUCT_PRD_USER_STORY_WRITER_SKILL_SPEC } from "./user-story-writer.skill.js";
export { PRODUCT_PRD_ACCEPTANCE_CRITERIA_REVIEW_SKILL_SPEC } from "./acceptance-criteria-review.skill.js";
export { PRODUCT_PRD_PRD_RISK_REVIEW_SKILL_SPEC } from "./prd-risk-review.skill.js";
import { PRODUCT_PRD_PRD_DISCOVERY_SKILL_SPEC } from "./prd-discovery.skill.js";
import { PRODUCT_PRD_PRD_WRITER_SKILL_SPEC } from "./prd-writer.skill.js";
import { PRODUCT_PRD_USER_STORY_WRITER_SKILL_SPEC } from "./user-story-writer.skill.js";
import { PRODUCT_PRD_ACCEPTANCE_CRITERIA_REVIEW_SKILL_SPEC } from "./acceptance-criteria-review.skill.js";
import { PRODUCT_PRD_PRD_RISK_REVIEW_SKILL_SPEC } from "./prd-risk-review.skill.js";

export const PRODUCT_PRD_SKILL_SPECS = [
  PRODUCT_PRD_PRD_DISCOVERY_SKILL_SPEC,
  PRODUCT_PRD_PRD_WRITER_SKILL_SPEC,
  PRODUCT_PRD_USER_STORY_WRITER_SKILL_SPEC,
  PRODUCT_PRD_ACCEPTANCE_CRITERIA_REVIEW_SKILL_SPEC,
  PRODUCT_PRD_PRD_RISK_REVIEW_SKILL_SPEC,
] as const;
