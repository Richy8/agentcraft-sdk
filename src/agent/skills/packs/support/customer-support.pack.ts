import { definePackSpec } from '../../../packs/registry.js';

export const SUPPORT_CUSTOMER_SUPPORT_PACK_SPEC = definePackSpec({
  name: 'support-customer-support-skills',
  description: 'Support And Customer Success Customer Support skill pack.',
  domain: 'support',
  category: 'customer-support',
  skillIds: [
    'ticket-triage',
    'support-response-writer',
    'refund-policy-review',
    'escalation-summary',
    'sentiment-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("support-customer-support-skills")',
    'agent.use(createSkillPackByName("support-customer-support-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("support-customer-support-skills") })',
  ],
});
