import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_COURSE_PACK_SPEC = definePackSpec({
  name: 'creator-course-skills',
  description: 'Creator Course skill pack.',
  domain: 'creator',
  category: 'course',
  skillIds: [
    'course-audience-research',
    'course-curriculum-planner',
    'course-lesson-writer',
    'course-exercise-generator',
    'course-learning-outcome-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-course-skills")',
    'agent.use(createSkillPackByName("creator-course-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-course-skills") })',
  ],
});
