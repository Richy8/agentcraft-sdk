import { registerSkillSpecs } from '../../registries/index.js';
import { BUSINESS_INVESTMENTS_SKILL_SPECS } from './investments/index.js';
import { BUSINESS_STRATEGY_SKILL_SPECS } from './strategy/index.js';
import { BUSINESS_OPERATIONS_SKILL_SPECS } from './operations/index.js';
import { BUSINESS_PARTNERSHIPS_SKILL_SPECS } from './partnerships/index.js';
import { BUSINESS_BUSINESS_PLAN_SKILL_SPECS } from './business-plan/index.js';
import { BUSINESS_MARKET_EXPANSION_SKILL_SPECS } from './market-expansion/index.js';

export { defineBusinessSkillSpec } from './business-skill-utils.js';
export type { BusinessSkillDefinition } from './business-skill-utils.js';
export { BUSINESS_INVESTMENTS_SKILL_SPECS } from './investments/index.js';
export { BUSINESS_STRATEGY_SKILL_SPECS } from './strategy/index.js';
export { BUSINESS_OPERATIONS_SKILL_SPECS } from './operations/index.js';
export { BUSINESS_PARTNERSHIPS_SKILL_SPECS } from './partnerships/index.js';
export { BUSINESS_BUSINESS_PLAN_SKILL_SPECS } from './business-plan/index.js';
export { BUSINESS_MARKET_EXPANSION_SKILL_SPECS } from './market-expansion/index.js';

export const BUSINESS_DOMAIN_SKILL_SPECS = [
  ...BUSINESS_INVESTMENTS_SKILL_SPECS,
  ...BUSINESS_STRATEGY_SKILL_SPECS,
  ...BUSINESS_OPERATIONS_SKILL_SPECS,
  ...BUSINESS_PARTNERSHIPS_SKILL_SPECS,
  ...BUSINESS_BUSINESS_PLAN_SKILL_SPECS,
  ...BUSINESS_MARKET_EXPANSION_SKILL_SPECS,
] as const;

registerSkillSpecs(BUSINESS_DOMAIN_SKILL_SPECS);
