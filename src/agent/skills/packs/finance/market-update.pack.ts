import { definePackSpec } from '../../../packs/registry.js';

export const FINANCE_MARKET_UPDATE_PACK_SPEC = definePackSpec({
  name: 'finance-market-update-skills',
  description: 'Market update workflow: synthesize macro news then produce a structured market update with positioning implications.',
  domain: 'finance',
  category: 'market-update',
  skillIds: [
    'macro-news-synthesis',
    'market-update',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("finance-market-update-skills")',
    'agent.use(createSkillPackByName("finance-market-update-skills"))',
    'agent.run({ prompt: "/write-market-update Weekly equity and credit update for IC.", use: createSkillPackByName("finance-market-update-skills") })',
  ],
  humanReviewRequired: true,
});
