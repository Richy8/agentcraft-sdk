import { definePackSpec } from '../../../packs/registry.js';

export const FINANCE_FINANCIAL_REPORTING_PACK_SPEC = definePackSpec({
  name: 'finance-financial-reporting-skills',
  description: 'Finance Financial Reporting skill pack.',
  domain: 'finance',
  category: 'financial-reporting',
  skillIds: [
    'monthly-finance-summary',
    'variance-analysis',
    'budget-narrative-writer',
    'cash-flow-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("finance-financial-reporting-skills")',
    'agent.use(createSkillPackByName("finance-financial-reporting-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("finance-financial-reporting-skills") })',
  ],
  humanReviewRequired: true,
});
