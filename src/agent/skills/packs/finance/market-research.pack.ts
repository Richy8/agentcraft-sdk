import { definePackSpec } from '../../../packs/registry.js';

export const FINANCE_MARKET_RESEARCH_PACK_SPEC = definePackSpec({
  name: 'finance-market-research-skills',
  description: 'Finance macro and market research: sector rotation, country market scans, and currency risk briefs.',
  domain: 'finance',
  category: 'market-research',
  skillIds: [
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
