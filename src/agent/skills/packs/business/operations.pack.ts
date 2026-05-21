import { definePackSpec } from '../../../packs/registry.js';

export const BUSINESS_OPERATIONS_PACK_SPEC = definePackSpec({
  name: 'business-operations-skills',
  description: 'Business Operations skill pack.',
  domain: 'business',
  category: 'operations',
  skillIds: [
    'business-process-analysis',
    'operating-model-design',
    'cost-optimization-brief',
    'business-kpi-review',
    'business-risk-register',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("business-operations-skills")',
    'agent.use(createSkillPackByName("business-operations-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("business-operations-skills") })',
  ],
});
