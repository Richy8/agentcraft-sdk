import { definePackSpec } from '../../../packs/registry.js';

export const SALES_ACCOUNT_RESEARCH_PACK_SPEC = definePackSpec({
  name: 'sales-account-research-skills',
  description: 'Sales Account Research skill pack.',
  domain: 'sales',
  category: 'account-research',
  skillIds: [
    'account-news-research',
    'stakeholder-map',
    'buying-committee-analysis',
    'account-plan-writer',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("sales-account-research-skills")',
    'agent.use(createSkillPackByName("sales-account-research-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("sales-account-research-skills") })',
  ],
});
