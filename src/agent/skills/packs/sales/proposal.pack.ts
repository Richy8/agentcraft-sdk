import { definePackSpec } from '../../../packs/registry.js';

export const SALES_PROPOSAL_PACK_SPEC = definePackSpec({
  name: 'sales-proposal-skills',
  description: 'Sales Proposal skill pack.',
  domain: 'sales',
  category: 'proposal',
  skillIds: [
    'proposal-discovery-synthesis',
    'proposal-writer',
    'proposal-pricing-rationale',
    'proposal-objection-review',
    'proposal-red-team-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("sales-proposal-skills")',
    'agent.use(createSkillPackByName("sales-proposal-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("sales-proposal-skills") })',
  ],
});
