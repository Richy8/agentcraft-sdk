import { definePackSpec } from '../../../packs/registry.js';

export const ENGINEERING_DEBUGGING_PACK_SPEC = definePackSpec({
  name: 'engineering-debugging-skills',
  description: 'Engineering Debugging skill pack.',
  domain: 'engineering',
  category: 'debugging',
  skillIds: [
    'bug-reproduction-planner',
    'log-analysis',
    'root-cause-analysis',
    'incident-fix-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("engineering-debugging-skills")',
    'agent.use(createSkillPackByName("engineering-debugging-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("engineering-debugging-skills") })',
  ],
});
