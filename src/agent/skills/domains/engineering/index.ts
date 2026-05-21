import { registerSkillSpecs } from '../../registries/index.js';
import { ENGINEERING_CODE_REVIEW_SKILL_SPECS } from './code-review/index.js';
import { ENGINEERING_ARCHITECTURE_SKILL_SPECS } from './architecture/index.js';
import { ENGINEERING_TESTING_SKILL_SPECS } from './testing/index.js';
import { ENGINEERING_DEBUGGING_SKILL_SPECS } from './debugging/index.js';
import { ENGINEERING_DEVOPS_SKILL_SPECS } from './devops/index.js';

export { defineEngineeringSkillSpec } from './engineering-skill-utils.js';
export type { EngineeringSkillDefinition } from './engineering-skill-utils.js';

export const ENGINEERING_DOMAIN_SKILL_SPECS = [
  ...ENGINEERING_CODE_REVIEW_SKILL_SPECS,
  ...ENGINEERING_ARCHITECTURE_SKILL_SPECS,
  ...ENGINEERING_TESTING_SKILL_SPECS,
  ...ENGINEERING_DEBUGGING_SKILL_SPECS,
  ...ENGINEERING_DEVOPS_SKILL_SPECS,
] as const;

registerSkillSpecs(ENGINEERING_DOMAIN_SKILL_SPECS);
