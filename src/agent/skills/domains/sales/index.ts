import { registerSkillSpecs } from "../../registries/skill-registry.js";
import { SALES_PROSPECTING_SKILL_SPECS } from "./prospecting/index.js";
import { SALES_PROPOSAL_SKILL_SPECS } from "./proposal/index.js";
import { SALES_CRM_SKILL_SPECS } from "./crm/index.js";
import { SALES_OBJECTION_HANDLING_SKILL_SPECS } from "./objection-handling/index.js";
import { SALES_ACCOUNT_RESEARCH_SKILL_SPECS } from "./account-research/index.js";

export { defineSalesSkillSpec } from "./sales-skill-utils.js";
export type { SalesSkillDefinition } from "./sales-skill-utils.js";
export { SALES_PROSPECTING_SKILL_SPECS } from "./prospecting/index.js";
export { SALES_PROPOSAL_SKILL_SPECS } from "./proposal/index.js";
export { SALES_CRM_SKILL_SPECS } from "./crm/index.js";
export { SALES_OBJECTION_HANDLING_SKILL_SPECS } from "./objection-handling/index.js";
export { SALES_ACCOUNT_RESEARCH_SKILL_SPECS } from "./account-research/index.js";

export const SALES_DOMAIN_SKILL_SPECS = [
  ...SALES_PROSPECTING_SKILL_SPECS,
  ...SALES_PROPOSAL_SKILL_SPECS,
  ...SALES_CRM_SKILL_SPECS,
  ...SALES_OBJECTION_HANDLING_SKILL_SPECS,
  ...SALES_ACCOUNT_RESEARCH_SKILL_SPECS,
] as const;

registerSkillSpecs(SALES_DOMAIN_SKILL_SPECS);
