import { definePackSpec } from '../../../packs/registry.js';

export const ENGINEERING_DEVOPS_PACK_SPEC = definePackSpec({
  name: 'engineering-devops-skills',
  description: 'Engineering Devops skill pack.',
  domain: 'engineering',
  category: 'devops',
  skillIds: [
    'deployment-risk-review',
    'ci-failure-analysis',
    'infrastructure-change-review',
    'runbook-writer',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("engineering-devops-skills")',
    'agent.use(createSkillPackByName("engineering-devops-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("engineering-devops-skills") })',
  ],
});
