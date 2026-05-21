import { definePackSpec } from '../../../packs/registry.js';

export const FINANCE_STOCK_RESEARCH_PACK_SPEC = definePackSpec({
  name: 'finance-stock-research-skills',
  description: 'Finance Stock Research skill pack.',
  domain: 'finance',
  category: 'stock-research',
  skillIds: [
    'stock-screening',
    'equity-research-brief',
    'earnings-call-analysis',
    'financial-statement-review',
    'valuation-risk-review',
    'catalyst-analysis',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("finance-stock-research-skills")',
    'agent.use(createSkillPackByName("finance-stock-research-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("finance-stock-research-skills") })',
  ],
  humanReviewRequired: true,
});
