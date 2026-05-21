import { definePackSpec } from '../../../packs/registry.js';

export const BUSINESS_BUSINESS_PLAN_PACK_SPEC = definePackSpec({
  name: 'business-business-plan-skills',
  description: 'Business Business Plan skill pack.',
  domain: 'business',
  category: 'business-plan',
  skillIds: [
    'business-plan-research',
    'business-plan-writer',
    'financial-projection-narrative',
    'go-to-market-plan-review',
    'investor-pitch-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("business-business-plan-skills")',
    'agent.use(createSkillPackByName("business-business-plan-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("business-business-plan-skills") })',
  ],
});
