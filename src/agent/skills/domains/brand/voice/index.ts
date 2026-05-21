import { BRAND_VOICE_PROFILE_SKILL_SPEC } from './brand-voice-profile.skill.js';
import { TONE_OF_VOICE_GUIDE_SKILL_SPEC } from './tone-of-voice-guide.skill.js';
import { BRAND_GUIDELINE_WRITER_SKILL_SPEC } from './brand-guideline-writer.skill.js';
import { BRAND_CONSISTENCY_REVIEW_SKILL_SPEC } from './brand-consistency-review.skill.js';

export const BRAND_VOICE_SKILL_SPECS = [
  BRAND_VOICE_PROFILE_SKILL_SPEC,
  TONE_OF_VOICE_GUIDE_SKILL_SPEC,
  BRAND_GUIDELINE_WRITER_SKILL_SPEC,
  BRAND_CONSISTENCY_REVIEW_SKILL_SPEC,
] as const;
