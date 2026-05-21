
import { TIKTOK_HOOK_WRITER_SKILL_SPEC } from './tiktok-hook-writer.skill.js';
import { TIKTOK_RETENTION_REVIEW_SKILL_SPEC } from './tiktok-retention-review.skill.js';
import { TIKTOK_SAFETY_REVIEW_SKILL_SPEC } from './tiktok-safety-review.skill.js';
import { TIKTOK_SCRIPTWRITER_SKILL_SPEC } from './tiktok-scriptwriter.skill.js';
import { TIKTOK_SHOT_LIST_SKILL_SPEC } from './tiktok-shot-list.skill.js';
import { TIKTOK_TREND_RESEARCH_SKILL_SPEC } from './tiktok-trend-research.skill.js';

export const TIKTOK_DOMAIN_SKILL_SPECS = [
  TIKTOK_HOOK_WRITER_SKILL_SPEC,
  TIKTOK_RETENTION_REVIEW_SKILL_SPEC,
  TIKTOK_SAFETY_REVIEW_SKILL_SPEC,
  TIKTOK_SCRIPTWRITER_SKILL_SPEC,
  TIKTOK_SHOT_LIST_SKILL_SPEC,
  TIKTOK_TREND_RESEARCH_SKILL_SPEC,
] as const;
