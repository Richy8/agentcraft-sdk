
import { WEBINAR_FOLLOWUP_SEQUENCE_SKILL_SPEC } from './webinar-followup-sequence.skill.js';
import { WEBINAR_OUTLINE_WRITER_SKILL_SPEC } from './webinar-outline-writer.skill.js';
import { WEBINAR_PROMO_COPYWRITER_SKILL_SPEC } from './webinar-promo-copywriter.skill.js';
import { WEBINAR_SLIDE_BRIEF_SKILL_SPEC } from './webinar-slide-brief.skill.js';
import { WEBINAR_TOPIC_RESEARCH_SKILL_SPEC } from './webinar-topic-research.skill.js';

export const WEBINAR_DOMAIN_SKILL_SPECS = [
  WEBINAR_FOLLOWUP_SEQUENCE_SKILL_SPEC,
  WEBINAR_OUTLINE_WRITER_SKILL_SPEC,
  WEBINAR_PROMO_COPYWRITER_SKILL_SPEC,
  WEBINAR_SLIDE_BRIEF_SKILL_SPEC,
  WEBINAR_TOPIC_RESEARCH_SKILL_SPEC,
] as const;
