
import { FACEBOOK_ADJACENT_CONTENT_REVIEW_SKILL_SPEC } from './facebook-adjacent-content-review.skill.js';
import { FACEBOOK_AUDIENCE_RESEARCH_SKILL_SPEC } from './facebook-audience-research.skill.js';
import { FACEBOOK_COMMUNITY_ENGAGEMENT_PLANNER_SKILL_SPEC } from './facebook-community-engagement-planner.skill.js';
import { FACEBOOK_GROUP_POST_WRITER_SKILL_SPEC } from './facebook-group-post-writer.skill.js';
import { FACEBOOK_POST_WRITER_SKILL_SPEC } from './facebook-post-writer.skill.js';

export const FACEBOOK_DOMAIN_SKILL_SPECS = [
  FACEBOOK_ADJACENT_CONTENT_REVIEW_SKILL_SPEC,
  FACEBOOK_AUDIENCE_RESEARCH_SKILL_SPEC,
  FACEBOOK_COMMUNITY_ENGAGEMENT_PLANNER_SKILL_SPEC,
  FACEBOOK_GROUP_POST_WRITER_SKILL_SPEC,
  FACEBOOK_POST_WRITER_SKILL_SPEC,
] as const;
