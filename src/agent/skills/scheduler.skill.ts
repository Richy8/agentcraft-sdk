import { GoogleCalendarAdapter } from '../adapters/index.js';
import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class SchedulerSkill {
  static readonly skillName = 'scheduler';

  static create() {
    return createBuiltInSkill(SKILL_SPECS.scheduler, { dependsOn: [GoogleCalendarAdapter] });
  }
}
