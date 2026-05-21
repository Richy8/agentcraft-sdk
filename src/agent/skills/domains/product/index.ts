import { registerSkillSpecs } from "../../registries/skill-registry.js";
import { PRODUCT_PRODUCT_RESEARCH_SKILL_SPECS } from "./product-research/index.js";
import { PRODUCT_PRD_SKILL_SPECS } from "./prd/index.js";
import { PRODUCT_ROADMAP_SKILL_SPECS } from "./roadmap/index.js";
import { PRODUCT_LAUNCH_SKILL_SPECS } from "./launch/index.js";
import { PRODUCT_UX_RESEARCH_SKILL_SPECS } from "./ux-research/index.js";

export { defineProductSkillSpec } from "./product-skill-utils.js";
export type { ProductSkillDefinition } from "./product-skill-utils.js";
export { PRODUCT_PRODUCT_RESEARCH_SKILL_SPECS } from "./product-research/index.js";
export { PRODUCT_PRD_SKILL_SPECS } from "./prd/index.js";
export { PRODUCT_ROADMAP_SKILL_SPECS } from "./roadmap/index.js";
export { PRODUCT_LAUNCH_SKILL_SPECS } from "./launch/index.js";
export { PRODUCT_UX_RESEARCH_SKILL_SPECS } from "./ux-research/index.js";

export const PRODUCT_DOMAIN_SKILL_SPECS = [
  ...PRODUCT_PRODUCT_RESEARCH_SKILL_SPECS,
  ...PRODUCT_PRD_SKILL_SPECS,
  ...PRODUCT_ROADMAP_SKILL_SPECS,
  ...PRODUCT_LAUNCH_SKILL_SPECS,
  ...PRODUCT_UX_RESEARCH_SKILL_SPECS,
] as const;

registerSkillSpecs(PRODUCT_DOMAIN_SKILL_SPECS);
