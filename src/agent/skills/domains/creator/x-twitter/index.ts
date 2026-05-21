
import { X_COMMUNITY_REPLY_WRITER_SKILL_SPEC } from './x-community-reply-writer.skill.js';
import { X_HOOK_REVIEW_SKILL_SPEC } from './x-hook-review.skill.js';
import { X_POST_WRITER_SKILL_SPEC } from './x-post-writer.skill.js';
import { X_THREAD_WRITER_SKILL_SPEC } from './x-thread-writer.skill.js';
import { X_TOPIC_RESEARCH_SKILL_SPEC } from './x-topic-research.skill.js';
import { X_TREND_RISK_REVIEW_SKILL_SPEC } from './x-trend-risk-review.skill.js';

export const X_TWITTER_DOMAIN_SKILL_SPECS = [
  X_COMMUNITY_REPLY_WRITER_SKILL_SPEC,
  X_HOOK_REVIEW_SKILL_SPEC,
  X_POST_WRITER_SKILL_SPEC,
  X_THREAD_WRITER_SKILL_SPEC,
  X_TOPIC_RESEARCH_SKILL_SPEC,
  X_TREND_RISK_REVIEW_SKILL_SPEC,
] as const;
