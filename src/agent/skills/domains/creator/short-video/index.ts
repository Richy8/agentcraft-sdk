
import { SHORT_VIDEO_CAPTION_WRITER_SKILL_SPEC } from './short-video-caption-writer.skill.js';
import { SHORT_VIDEO_IDEATION_SKILL_SPEC } from './short-video-ideation.skill.js';
import { SHORT_VIDEO_PLATFORM_ADAPTER_SKILL_SPEC } from './short-video-platform-adapter.skill.js';
import { SHORT_VIDEO_SCRIPTWRITER_SKILL_SPEC } from './short-video-scriptwriter.skill.js';
import { SHORT_VIDEO_SHOT_LIST_SKILL_SPEC } from './short-video-shot-list.skill.js';

export const SHORT_VIDEO_DOMAIN_SKILL_SPECS = [
  SHORT_VIDEO_CAPTION_WRITER_SKILL_SPEC,
  SHORT_VIDEO_IDEATION_SKILL_SPEC,
  SHORT_VIDEO_PLATFORM_ADAPTER_SKILL_SPEC,
  SHORT_VIDEO_SCRIPTWRITER_SKILL_SPEC,
  SHORT_VIDEO_SHOT_LIST_SKILL_SPEC,
] as const;
