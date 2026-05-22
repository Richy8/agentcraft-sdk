import { registerSkillSpecs } from '../../registries/skill-registry.js';
import { PERSONAL_PRODUCTIVITY_TASKS_SKILL_SPECS } from './tasks/index.js';
import { PERSONAL_PRODUCTIVITY_WEEKLY_PLANNING_SKILL_SPECS } from './weekly-planning/index.js';
import { PERSONAL_PRODUCTIVITY_CALENDAR_SKILL_SPECS } from './calendar/index.js';
import { PERSONAL_PRODUCTIVITY_LIFE_ADMIN_SKILL_SPECS } from './life-admin/index.js';
import { PERSONAL_PRODUCTIVITY_COMMUNICATION_SKILL_SPECS } from './communication/index.js';

export { definePersonalProductivitySkillSpec } from './personal-productivity-skill-utils.js';
export type { PersonalProductivitySkillDefinition } from './personal-productivity-skill-utils.js';
export { PERSONAL_PRODUCTIVITY_TASKS_SKILL_SPECS } from './tasks/index.js';
export { PERSONAL_PRODUCTIVITY_WEEKLY_PLANNING_SKILL_SPECS } from './weekly-planning/index.js';
export { PERSONAL_PRODUCTIVITY_CALENDAR_SKILL_SPECS } from './calendar/index.js';
export { PERSONAL_PRODUCTIVITY_LIFE_ADMIN_SKILL_SPECS } from './life-admin/index.js';
export { PERSONAL_PRODUCTIVITY_COMMUNICATION_SKILL_SPECS } from './communication/index.js';

export const PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_SPECS = [
  ...PERSONAL_PRODUCTIVITY_TASKS_SKILL_SPECS,
  ...PERSONAL_PRODUCTIVITY_WEEKLY_PLANNING_SKILL_SPECS,
  ...PERSONAL_PRODUCTIVITY_CALENDAR_SKILL_SPECS,
  ...PERSONAL_PRODUCTIVITY_LIFE_ADMIN_SKILL_SPECS,
  ...PERSONAL_PRODUCTIVITY_COMMUNICATION_SKILL_SPECS,
] as const;

registerSkillSpecs(PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_SPECS);
