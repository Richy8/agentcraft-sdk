
import { COVER_LETTER_WRITER_SKILL_SPEC } from './cover-letter-writer.skill.js';
import { LINKEDIN_PROFILE_OPTIMIZER_SKILL_SPEC } from './linkedin-profile-optimizer.skill.js';
import { RESUME_ATS_REVIEW_SKILL_SPEC } from './resume-ats-review.skill.js';
import { RESUME_ROLE_RESEARCH_SKILL_SPEC } from './resume-role-research.skill.js';
import { RESUME_TAILORING_SKILL_SPEC } from './resume-tailoring.skill.js';
import { RESUME_WRITER_SKILL_SPEC } from './resume-writer.skill.js';

export const RESUME_DOMAIN_SKILL_SPECS = [
  COVER_LETTER_WRITER_SKILL_SPEC,
  LINKEDIN_PROFILE_OPTIMIZER_SKILL_SPEC,
  RESUME_ATS_REVIEW_SKILL_SPEC,
  RESUME_ROLE_RESEARCH_SKILL_SPEC,
  RESUME_TAILORING_SKILL_SPEC,
  RESUME_WRITER_SKILL_SPEC,
] as const;
