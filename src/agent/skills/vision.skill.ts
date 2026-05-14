import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class VisionSkill {
  static readonly skillName = 'vision';

  static create() {
    return createBuiltInSkill(SKILL_SPECS.vision);
  }
}
