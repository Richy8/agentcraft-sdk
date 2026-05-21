import { definePackSpec } from '../../../packs/registry.js';

export const BUSINESS_PARTNERSHIPS_PACK_SPEC = definePackSpec({
  name: 'business-partnerships-skills',
  description: 'Business Partnerships skill pack.',
  domain: 'business',
  category: 'partnerships',
  skillIds: [
    'partnership-opportunity-research',
    'partnership-proposal-writer',
    'partner-fit-analysis',
    'partnership-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("business-partnerships-skills")',
    'agent.use(createSkillPackByName("business-partnerships-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("business-partnerships-skills") })',
  ],
});
