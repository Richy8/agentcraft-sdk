import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class WritingSkill {
  static readonly skillName = 'writing';

  static create() {
    return createBuiltInSkill(SKILL_SPECS.writing);
  }
}
