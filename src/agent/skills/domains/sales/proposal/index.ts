export { SALES_PROPOSAL_PROPOSAL_DISCOVERY_SYNTHESIS_SKILL_SPEC } from "./proposal-discovery-synthesis.skill.js";
export { SALES_PROPOSAL_PROPOSAL_WRITER_SKILL_SPEC } from "./proposal-writer.skill.js";
export { SALES_PROPOSAL_PROPOSAL_PRICING_RATIONALE_SKILL_SPEC } from "./proposal-pricing-rationale.skill.js";
export { SALES_PROPOSAL_PROPOSAL_OBJECTION_REVIEW_SKILL_SPEC } from "./proposal-objection-review.skill.js";
export { SALES_PROPOSAL_PROPOSAL_RED_TEAM_REVIEW_SKILL_SPEC } from "./proposal-red-team-review.skill.js";

import { SALES_PROPOSAL_PROPOSAL_DISCOVERY_SYNTHESIS_SKILL_SPEC } from "./proposal-discovery-synthesis.skill.js";
import { SALES_PROPOSAL_PROPOSAL_WRITER_SKILL_SPEC } from "./proposal-writer.skill.js";
import { SALES_PROPOSAL_PROPOSAL_PRICING_RATIONALE_SKILL_SPEC } from "./proposal-pricing-rationale.skill.js";
import { SALES_PROPOSAL_PROPOSAL_OBJECTION_REVIEW_SKILL_SPEC } from "./proposal-objection-review.skill.js";
import { SALES_PROPOSAL_PROPOSAL_RED_TEAM_REVIEW_SKILL_SPEC } from "./proposal-red-team-review.skill.js";

export const SALES_PROPOSAL_SKILL_SPECS = [
  SALES_PROPOSAL_PROPOSAL_DISCOVERY_SYNTHESIS_SKILL_SPEC,
  SALES_PROPOSAL_PROPOSAL_WRITER_SKILL_SPEC,
  SALES_PROPOSAL_PROPOSAL_PRICING_RATIONALE_SKILL_SPEC,
  SALES_PROPOSAL_PROPOSAL_OBJECTION_REVIEW_SKILL_SPEC,
  SALES_PROPOSAL_PROPOSAL_RED_TEAM_REVIEW_SKILL_SPEC,
] as const;
