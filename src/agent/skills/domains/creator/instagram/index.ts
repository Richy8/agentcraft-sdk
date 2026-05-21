
import { INSTAGRAM_CAPTION_WRITER_SKILL_SPEC } from './instagram-caption-writer.skill.js';
import { INSTAGRAM_CAROUSEL_BRIEF_SKILL_SPEC } from './instagram-carousel-brief.skill.js';
import { INSTAGRAM_HASHTAG_REVIEW_SKILL_SPEC } from './instagram-hashtag-review.skill.js';
import { INSTAGRAM_REEL_SCRIPTWRITER_SKILL_SPEC } from './instagram-reel-scriptwriter.skill.js';
import { INSTAGRAM_VISUAL_DIRECTION_SKILL_SPEC } from './instagram-visual-direction.skill.js';

export const INSTAGRAM_DOMAIN_SKILL_SPECS = [
  INSTAGRAM_CAPTION_WRITER_SKILL_SPEC,
  INSTAGRAM_CAROUSEL_BRIEF_SKILL_SPEC,
  INSTAGRAM_HASHTAG_REVIEW_SKILL_SPEC,
  INSTAGRAM_REEL_SCRIPTWRITER_SKILL_SPEC,
  INSTAGRAM_VISUAL_DIRECTION_SKILL_SPEC,
] as const;
