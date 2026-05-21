import { definePackSpec } from '../../../packs/registry.js';

export const PERSONAL_PRODUCTIVITY_TASKS_PACK_SPEC = definePackSpec({
  name: 'personal-productivity-tasks-skills',
  description: 'Personal Productivity And Life Admin Tasks skill pack.',
  domain: 'personal-productivity',
  category: 'tasks',
  skillIds: [
    'task-prioritization',
    'weekly-plan-writer',
    'personal-backlog-triage',
    'habit-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("personal-productivity-tasks-skills")',
    'agent.use(createSkillPackByName("personal-productivity-tasks-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("personal-productivity-tasks-skills") })',
  ],
});
