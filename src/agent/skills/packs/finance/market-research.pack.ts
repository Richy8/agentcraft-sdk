import { definePackSpec } from '../../../packs/registry.js';

export const FINANCE_MARKET_RESEARCH_PACK_SPEC = definePackSpec({
  name: 'finance-market-research-skills',
  description: 'Finance Market Research skill pack.',
  domain: 'finance',
  category: 'market-research',
  skillIds: [
    'market-update',
    'macro-news-synthesis',
    'sector-rotation-analysis',
    'country-market-scan',
    'currency-risk-brief',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("finance-market-research-skills")',
    'agent.use(createSkillPackByName("finance-market-research-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("finance-market-research-skills") })',
  ],
  humanReviewRequired: true,
});
