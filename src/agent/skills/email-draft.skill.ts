import { EmailAdapter } from '../adapters/index.js';
import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class EmailDraftSkill {
  static readonly skillName = 'email-draft';

  static create() {
    return createBuiltInSkill(SKILL_SPECS['email-draft'], { dependsOn: [EmailAdapter] });
  }
}
