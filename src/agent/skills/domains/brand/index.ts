import { registerSkillSpecs } from "../../registries/index.js";
import { BRAND_RESEARCH_SKILL_SPECS } from "./research/index.js";
import { BRAND_POSITIONING_SKILL_SPECS } from "./positioning/index.js";
import { BRAND_MESSAGING_SKILL_SPECS } from "./messaging/index.js";
import { BRAND_VOICE_SKILL_SPECS } from "./voice/index.js";

export { defineBrandSkillSpec } from "./brand-skill-utils.js";
export type { BrandSkillDefinition } from "./brand-skill-utils.js";

export const BRAND_DOMAIN_SKILL_SPECS = [
  ...BRAND_RESEARCH_SKILL_SPECS,
  ...BRAND_POSITIONING_SKILL_SPECS,
  ...BRAND_MESSAGING_SKILL_SPECS,
  ...BRAND_VOICE_SKILL_SPECS,
] as const;

registerSkillSpecs(BRAND_DOMAIN_SKILL_SPECS);
