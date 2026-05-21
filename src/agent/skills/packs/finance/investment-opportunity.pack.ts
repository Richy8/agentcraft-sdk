import { definePackSpec } from '../../../packs/registry.js';

export const FINANCE_INVESTMENT_OPPORTUNITY_PACK_SPEC = definePackSpec({
  name: 'finance-investment-opportunity-skills',
  description: 'Finance Investment Opportunity skill pack.',
  domain: 'finance',
  category: 'investment-opportunity',
  skillIds: [
    'opportunity-screener',
    'cross-country-opportunity-scan',
    'private-market-opportunity-brief',
    'investment-thesis-writer',
    'investment-red-flag-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("finance-investment-opportunity-skills")',
    'agent.use(createSkillPackByName("finance-investment-opportunity-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("finance-investment-opportunity-skills") })',
  ],
  humanReviewRequired: true,
});
