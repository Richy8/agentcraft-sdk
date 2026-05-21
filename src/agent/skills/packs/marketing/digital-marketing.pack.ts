import { definePackSpec } from '../../../packs/registry.js';

export const MARKETING_DIGITAL_MARKETING_PACK_SPEC = definePackSpec({
  name: 'marketing-digital-marketing-skills',
  description: 'Marketing Digital Marketing skill pack.',
  domain: 'marketing',
  category: 'digital-marketing',
  skillIds: [
    'digital-marketing-strategy',
    'digital-channel-mix-planner',
    'digital-funnel-audit',
    'digital-attribution-review',
    'digital-growth-experiment-planner',
    'digital-marketing-performance-brief',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("marketing-digital-marketing-skills")',
    'agent.use(createSkillPackByName("marketing-digital-marketing-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("marketing-digital-marketing-skills") })',
  ],
});
