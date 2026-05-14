import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class TranslationSkill {
  static readonly skillName = 'translation';

  static create() {
    return createBuiltInSkill(SKILL_SPECS.translation);
  }
}
