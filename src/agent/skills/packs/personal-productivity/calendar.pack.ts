import { definePackSpec } from '../../../packs/registry.js';

export const PERSONAL_PRODUCTIVITY_CALENDAR_PACK_SPEC = definePackSpec({
  name: 'personal-productivity-calendar-skills',
  description: 'Personal Productivity calendar: audit your schedule, prep for meetings, and resolve conflicts.',
  domain: 'personal-productivity',
  category: 'calendar',
  skillIds: [
    'calendar-audit',
    'meeting-prep-brief',
    'schedule-conflict-resolution',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("personal-productivity-calendar-skills")',
    'agent.use(createSkillPackByName("personal-productivity-calendar-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("personal-productivity-calendar-skills") })',
  ],
});
