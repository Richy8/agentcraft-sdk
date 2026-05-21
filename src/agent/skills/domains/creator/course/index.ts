
import { COURSE_AUDIENCE_RESEARCH_SKILL_SPEC } from './course-audience-research.skill.js';
import { COURSE_CURRICULUM_PLANNER_SKILL_SPEC } from './course-curriculum-planner.skill.js';
import { COURSE_EXERCISE_GENERATOR_SKILL_SPEC } from './course-exercise-generator.skill.js';
import { COURSE_LEARNING_OUTCOME_REVIEW_SKILL_SPEC } from './course-learning-outcome-review.skill.js';
import { COURSE_LESSON_WRITER_SKILL_SPEC } from './course-lesson-writer.skill.js';

export const COURSE_DOMAIN_SKILL_SPECS = [
  COURSE_AUDIENCE_RESEARCH_SKILL_SPEC,
  COURSE_CURRICULUM_PLANNER_SKILL_SPEC,
  COURSE_EXERCISE_GENERATOR_SKILL_SPEC,
  COURSE_LEARNING_OUTCOME_REVIEW_SKILL_SPEC,
  COURSE_LESSON_WRITER_SKILL_SPEC,
] as const;
