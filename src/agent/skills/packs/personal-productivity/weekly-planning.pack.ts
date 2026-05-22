import { definePackSpec } from '../../../packs/registry.js';

export const PERSONAL_PRODUCTIVITY_WEEKLY_PLANNING_PACK_SPEC = definePackSpec({
  name: 'personal-productivity-weekly-planning-skills',
  description: 'Weekly planning workflow: prioritize tasks, draft the week plan, and turn it into time blocks.',
  domain: 'personal-productivity',
  category: 'weekly-planning',
  skillIds: [
    'weekly-plan-writer',
    'time-blocking-plan',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("personal-productivity-weekly-planning-skills")',
    'agent.use(createSkillPackByName("personal-productivity-weekly-planning-skills"))',
    'agent.run({ prompt: "/write-weekly-plan Plan my week given these tasks and meetings.", use: createSkillPackByName("personal-productivity-weekly-planning-skills") })',
  ],
});
