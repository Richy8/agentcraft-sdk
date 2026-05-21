import { definePackSpec } from '../../../packs/registry.js';

export const PERSONAL_PRODUCTIVITY_CALENDAR_PACK_SPEC = definePackSpec({
  name: 'personal-productivity-calendar-skills',
  description: 'Personal Productivity And Life Admin Calendar skill pack.',
  domain: 'personal-productivity',
  category: 'calendar',
  skillIds: [
    'calendar-audit',
    'time-blocking-plan',
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
