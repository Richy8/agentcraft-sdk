import { registerSkillSpecs } from "../../registries/skill-registry.js";
import { SUPPORT_CUSTOMER_SUPPORT_SKILL_SPECS } from "./customer-support/index.js";
import { SUPPORT_KNOWLEDGE_BASE_SKILL_SPECS } from "./knowledge-base/index.js";
import { SUPPORT_CUSTOMER_SUCCESS_SKILL_SPECS } from "./customer-success/index.js";

export { defineSupportSkillSpec } from "./support-skill-utils.js";
export type { SupportSkillDefinition } from "./support-skill-utils.js";
export { SUPPORT_CUSTOMER_SUPPORT_SKILL_SPECS } from "./customer-support/index.js";
export { SUPPORT_KNOWLEDGE_BASE_SKILL_SPECS } from "./knowledge-base/index.js";
export { SUPPORT_CUSTOMER_SUCCESS_SKILL_SPECS } from "./customer-success/index.js";

export const SUPPORT_DOMAIN_SKILL_SPECS = [
  ...SUPPORT_CUSTOMER_SUPPORT_SKILL_SPECS,
  ...SUPPORT_KNOWLEDGE_BASE_SKILL_SPECS,
  ...SUPPORT_CUSTOMER_SUCCESS_SKILL_SPECS,
] as const;

registerSkillSpecs(SUPPORT_DOMAIN_SKILL_SPECS);
