
import { PODCAST_CLIP_REPURPOSING_SKILL_SPEC } from './podcast-clip-repurposing.skill.js';
import { PODCAST_INTERVIEW_QUESTION_WRITER_SKILL_SPEC } from './podcast-interview-question-writer.skill.js';
import { PODCAST_OUTLINE_WRITER_SKILL_SPEC } from './podcast-outline-writer.skill.js';
import { PODCAST_SHOW_NOTES_WRITER_SKILL_SPEC } from './podcast-show-notes-writer.skill.js';
import { PODCAST_TOPIC_RESEARCH_SKILL_SPEC } from './podcast-topic-research.skill.js';

export const PODCAST_DOMAIN_SKILL_SPECS = [
  PODCAST_CLIP_REPURPOSING_SKILL_SPEC,
  PODCAST_INTERVIEW_QUESTION_WRITER_SKILL_SPEC,
  PODCAST_OUTLINE_WRITER_SKILL_SPEC,
  PODCAST_SHOW_NOTES_WRITER_SKILL_SPEC,
  PODCAST_TOPIC_RESEARCH_SKILL_SPEC,
] as const;
