import { definePackSpec } from '../../../packs/registry.js';

export const SALES_PROSPECTING_PACK_SPEC = definePackSpec({
  name: 'sales-prospecting-skills',
  description: 'Sales Prospecting skill pack.',
  domain: 'sales',
  category: 'prospecting',
  skillIds: [
    'prospect-research',
    'account-fit-analysis',
    'lead-prioritization',
    'outreach-personalization',
    'prospecting-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("sales-prospecting-skills")',
    'agent.use(createSkillPackByName("sales-prospecting-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("sales-prospecting-skills") })',
  ],
});
