import { definePackSpec } from '../../../packs/registry.js';

export const PERSONAL_PRODUCTIVITY_LIFE_ADMIN_PACK_SPEC = definePackSpec({
  name: 'personal-productivity-life-admin-skills',
  description: 'Personal Productivity And Life Admin Life Admin skill pack.',
  domain: 'personal-productivity',
  category: 'life-admin',
  skillIds: [
    'life-admin-checklist',
    'personal-document-summary',
    'home-project-plan',
    'travel-prep-checklist',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("personal-productivity-life-admin-skills")',
    'agent.use(createSkillPackByName("personal-productivity-life-admin-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("personal-productivity-life-admin-skills") })',
  ],
});
