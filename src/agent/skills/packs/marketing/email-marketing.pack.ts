import { definePackSpec } from '../../../packs/registry.js';

export const MARKETING_EMAIL_MARKETING_PACK_SPEC = definePackSpec({
  name: 'marketing-email-marketing-skills',
  description: 'Marketing Email Marketing skill pack.',
  domain: 'marketing',
  category: 'email-marketing',
  skillIds: [
    'email-sequence-planner',
    'email-copywriter',
    'email-subject-line-review',
    'email-segmentation-analysis',
    'email-performance-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("marketing-email-marketing-skills")',
    'agent.use(createSkillPackByName("marketing-email-marketing-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("marketing-email-marketing-skills") })',
  ],
});
