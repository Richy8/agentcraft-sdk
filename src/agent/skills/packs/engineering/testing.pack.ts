import { definePackSpec } from '../../../packs/registry.js';

export const ENGINEERING_TESTING_PACK_SPEC = definePackSpec({
  name: 'engineering-testing-skills',
  description: 'Engineering Testing skill pack.',
  domain: 'engineering',
  category: 'testing',
  skillIds: [
    'test-plan-writer',
    'unit-test-generator',
    'integration-test-planner',
    'edge-case-analysis',
    'regression-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("engineering-testing-skills")',
    'agent.use(createSkillPackByName("engineering-testing-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("engineering-testing-skills") })',
  ],
});
