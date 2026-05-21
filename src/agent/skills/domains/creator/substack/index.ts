
import { SUBSTACK_COMMUNITY_THREAD_WRITER_SKILL_SPEC } from './substack-community-thread-writer.skill.js';
import { SUBSTACK_ISSUE_WRITER_SKILL_SPEC } from './substack-issue-writer.skill.js';
import { SUBSTACK_PAID_FREE_STRATEGY_SKILL_SPEC } from './substack-paid-free-strategy.skill.js';
import { SUBSTACK_POSITIONING_SKILL_SPEC } from './substack-positioning.skill.js';
import { SUBSTACK_RETENTION_REVIEW_SKILL_SPEC } from './substack-retention-review.skill.js';

export const SUBSTACK_DOMAIN_SKILL_SPECS = [
  SUBSTACK_COMMUNITY_THREAD_WRITER_SKILL_SPEC,
  SUBSTACK_ISSUE_WRITER_SKILL_SPEC,
  SUBSTACK_PAID_FREE_STRATEGY_SKILL_SPEC,
  SUBSTACK_POSITIONING_SKILL_SPEC,
  SUBSTACK_RETENTION_REVIEW_SKILL_SPEC,
] as const;
