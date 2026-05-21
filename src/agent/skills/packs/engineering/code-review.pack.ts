import { definePackSpec } from '../../../packs/registry.js';

export const ENGINEERING_CODE_REVIEW_PACK_SPEC = definePackSpec({
  name: 'engineering-code-review-skills',
  description: 'Engineering Code Review skill pack.',
  domain: 'engineering',
  category: 'code-review',
  skillIds: [
    'code-review',
    'security-code-review',
    'performance-code-review',
    'api-contract-review',
    'migration-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("engineering-code-review-skills")',
    'agent.use(createSkillPackByName("engineering-code-review-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("engineering-code-review-skills") })',
  ],
});
