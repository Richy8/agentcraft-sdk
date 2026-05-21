
import { NEWSLETTER_AUDIENCE_RESEARCH_SKILL_SPEC } from './newsletter-audience-research.skill.js';
import { NEWSLETTER_ISSUE_PLANNER_SKILL_SPEC } from './newsletter-issue-planner.skill.js';
import { NEWSLETTER_SPONSORSHIP_COPY_REVIEW_SKILL_SPEC } from './newsletter-sponsorship-copy-review.skill.js';
import { NEWSLETTER_SUBJECT_LINE_REVIEW_SKILL_SPEC } from './newsletter-subject-line-review.skill.js';
import { NEWSLETTER_WRITER_SKILL_SPEC } from './newsletter-writer.skill.js';

export const NEWSLETTER_DOMAIN_SKILL_SPECS = [
  NEWSLETTER_AUDIENCE_RESEARCH_SKILL_SPEC,
  NEWSLETTER_ISSUE_PLANNER_SKILL_SPEC,
  NEWSLETTER_SPONSORSHIP_COPY_REVIEW_SKILL_SPEC,
  NEWSLETTER_SUBJECT_LINE_REVIEW_SKILL_SPEC,
  NEWSLETTER_WRITER_SKILL_SPEC,
] as const;
