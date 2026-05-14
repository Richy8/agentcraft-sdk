import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class SummarizeSkill {
  static readonly skillName = 'summarize';

  static create() {
    return createBuiltInSkill(SKILL_SPECS.summarize);
  }
}
