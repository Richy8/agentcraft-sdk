
import { MEDIUM_ARTICLE_WRITER_SKILL_SPEC } from './medium-article-writer.skill.js';
import { MEDIUM_AUDIENCE_RESEARCH_SKILL_SPEC } from './medium-audience-research.skill.js';
import { MEDIUM_PUBLICATION_FIT_REVIEW_SKILL_SPEC } from './medium-publication-fit-review.skill.js';
import { MEDIUM_STORY_ANGLE_SKILL_SPEC } from './medium-story-angle.skill.js';
import { MEDIUM_TITLE_SUBTITLE_REVIEW_SKILL_SPEC } from './medium-title-subtitle-review.skill.js';

export const MEDIUM_DOMAIN_SKILL_SPECS = [
  MEDIUM_ARTICLE_WRITER_SKILL_SPEC,
  MEDIUM_AUDIENCE_RESEARCH_SKILL_SPEC,
  MEDIUM_PUBLICATION_FIT_REVIEW_SKILL_SPEC,
  MEDIUM_STORY_ANGLE_SKILL_SPEC,
  MEDIUM_TITLE_SUBTITLE_REVIEW_SKILL_SPEC,
] as const;
