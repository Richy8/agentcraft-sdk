export { PRODUCT_LAUNCH_LAUNCH_PLAN_SKILL_SPEC } from "./launch-plan.skill.js";
export { PRODUCT_LAUNCH_LAUNCH_READINESS_REVIEW_SKILL_SPEC } from "./launch-readiness-review.skill.js";
export { PRODUCT_LAUNCH_RELEASE_NOTE_WRITER_SKILL_SPEC } from "./release-note-writer.skill.js";
export { PRODUCT_LAUNCH_GO_TO_MARKET_BRIEF_SKILL_SPEC } from "./go-to-market-brief.skill.js";
export { PRODUCT_LAUNCH_ROLLOUT_RISK_REVIEW_SKILL_SPEC } from "./rollout-risk-review.skill.js";
import { PRODUCT_LAUNCH_LAUNCH_PLAN_SKILL_SPEC } from "./launch-plan.skill.js";
import { PRODUCT_LAUNCH_LAUNCH_READINESS_REVIEW_SKILL_SPEC } from "./launch-readiness-review.skill.js";
import { PRODUCT_LAUNCH_RELEASE_NOTE_WRITER_SKILL_SPEC } from "./release-note-writer.skill.js";
import { PRODUCT_LAUNCH_GO_TO_MARKET_BRIEF_SKILL_SPEC } from "./go-to-market-brief.skill.js";
import { PRODUCT_LAUNCH_ROLLOUT_RISK_REVIEW_SKILL_SPEC } from "./rollout-risk-review.skill.js";

export const PRODUCT_LAUNCH_SKILL_SPECS = [
  PRODUCT_LAUNCH_LAUNCH_PLAN_SKILL_SPEC,
  PRODUCT_LAUNCH_LAUNCH_READINESS_REVIEW_SKILL_SPEC,
  PRODUCT_LAUNCH_RELEASE_NOTE_WRITER_SKILL_SPEC,
  PRODUCT_LAUNCH_GO_TO_MARKET_BRIEF_SKILL_SPEC,
  PRODUCT_LAUNCH_ROLLOUT_RISK_REVIEW_SKILL_SPEC,
] as const;
