
import { YOUTUBE_CHAPTER_WRITER_SKILL_SPEC } from './youtube-chapter-writer.skill.js';
import { YOUTUBE_COMMUNITY_POST_WRITER_SKILL_SPEC } from './youtube-community-post-writer.skill.js';
import { YOUTUBE_DESCRIPTION_TAGS_WRITER_SKILL_SPEC } from './youtube-description-tags-writer.skill.js';
import { YOUTUBE_RETENTION_REVIEW_SKILL_SPEC } from './youtube-retention-review.skill.js';
import { YOUTUBE_SCRIPTWRITER_SKILL_SPEC } from './youtube-scriptwriter.skill.js';
import { YOUTUBE_THUMBNAIL_BRIEF_SKILL_SPEC } from './youtube-thumbnail-brief.skill.js';
import { YOUTUBE_TITLE_THUMBNAIL_BRIEF_SKILL_SPEC } from './youtube-title-thumbnail-brief.skill.js';
import { YOUTUBE_TOPIC_RESEARCH_SKILL_SPEC } from './youtube-topic-research.skill.js';

export const YOUTUBE_DOMAIN_SKILL_SPECS = [
  YOUTUBE_CHAPTER_WRITER_SKILL_SPEC,
  YOUTUBE_COMMUNITY_POST_WRITER_SKILL_SPEC,
  YOUTUBE_DESCRIPTION_TAGS_WRITER_SKILL_SPEC,
  YOUTUBE_RETENTION_REVIEW_SKILL_SPEC,
  YOUTUBE_SCRIPTWRITER_SKILL_SPEC,
  YOUTUBE_THUMBNAIL_BRIEF_SKILL_SPEC,
  YOUTUBE_TITLE_THUMBNAIL_BRIEF_SKILL_SPEC,
  YOUTUBE_TOPIC_RESEARCH_SKILL_SPEC,
] as const;
