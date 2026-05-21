import { definePackSpec } from '../../../packs/registry.js';

export const SALES_CRM_PACK_SPEC = definePackSpec({
  name: 'sales-crm-skills',
  description: 'Sales Crm skill pack.',
  domain: 'sales',
  category: 'crm',
  skillIds: [
    'crm-note-summarizer',
    'crm-next-step-planner',
    'pipeline-risk-analysis',
    'deal-review',
    'forecast-narrative-writer',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("sales-crm-skills")',
    'agent.use(createSkillPackByName("sales-crm-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("sales-crm-skills") })',
  ],
});
