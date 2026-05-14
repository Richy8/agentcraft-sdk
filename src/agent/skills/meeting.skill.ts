import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class MeetingSkill {
  static readonly skillName = 'meeting';

  static create() {
    return createBuiltInSkill(SKILL_SPECS.meeting);
  }
}
