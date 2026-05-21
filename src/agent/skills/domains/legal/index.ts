import { registerSkillSpecs } from '../../registries/index.js';
import { LEGAL_CONTRACT_REVIEW_SKILL_SPECS } from './contract-review/index.js';
import { LEGAL_COMPLIANCE_SKILL_SPECS } from './compliance/index.js';
import { LEGAL_POLICY_DRAFTING_SKILL_SPECS } from './policy-drafting/index.js';

export { defineLegalSkillSpec } from './legal-skill-utils.js';
export type { LegalSkillDefinition } from './legal-skill-utils.js';

export const LEGAL_DOMAIN_SKILL_SPECS = [
  ...LEGAL_CONTRACT_REVIEW_SKILL_SPECS,
  ...LEGAL_COMPLIANCE_SKILL_SPECS,
  ...LEGAL_POLICY_DRAFTING_SKILL_SPECS,
] as const;

registerSkillSpecs(LEGAL_DOMAIN_SKILL_SPECS);
