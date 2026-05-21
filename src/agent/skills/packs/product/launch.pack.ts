import { definePackSpec } from '../../../packs/registry.js';

export const PRODUCT_LAUNCH_PACK_SPEC = definePackSpec({
  name: 'product-launch-skills',
  description: 'Product Launch skill pack.',
  domain: 'product',
  category: 'launch',
  skillIds: [
    'launch-plan',
    'launch-readiness-review',
    'release-note-writer',
    'go-to-market-brief',
    'rollout-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("product-launch-skills")',
    'agent.use(createSkillPackByName("product-launch-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("product-launch-skills") })',
  ],
});
