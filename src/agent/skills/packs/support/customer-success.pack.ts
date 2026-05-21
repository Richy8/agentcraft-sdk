import { definePackSpec } from '../../../packs/registry.js';

export const SUPPORT_CUSTOMER_SUCCESS_PACK_SPEC = definePackSpec({
  name: 'support-customer-success-skills',
  description: 'Support And Customer Success Customer Success skill pack.',
  domain: 'support',
  category: 'customer-success',
  skillIds: [
    'account-health-summary',
    'renewal-risk-analysis',
    'qbr-writer',
    'customer-outcome-plan',
    'churn-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("support-customer-success-skills")',
    'agent.use(createSkillPackByName("support-customer-success-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("support-customer-success-skills") })',
  ],
});
