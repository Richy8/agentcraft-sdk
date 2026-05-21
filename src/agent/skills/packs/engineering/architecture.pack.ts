import { definePackSpec } from '../../../packs/registry.js';

export const ENGINEERING_ARCHITECTURE_PACK_SPEC = definePackSpec({
  name: 'engineering-architecture-skills',
  description: 'Engineering Architecture skill pack.',
  domain: 'engineering',
  category: 'architecture',
  skillIds: [
    'architecture-review',
    'design-doc-writer',
    'dependency-risk-analysis',
    'system-boundary-review',
    'scalability-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("engineering-architecture-skills")',
    'agent.use(createSkillPackByName("engineering-architecture-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("engineering-architecture-skills") })',
  ],
});
