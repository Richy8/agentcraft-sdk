
import { BOOK_CHAPTER_WRITER_SKILL_SPEC } from './book-chapter-writer.skill.js';
import { BOOK_CITATION_REVIEW_SKILL_SPEC } from './book-citation-review.skill.js';
import { BOOK_CONTINUITY_REVIEW_SKILL_SPEC } from './book-continuity-review.skill.js';
import { BOOK_DEVELOPMENTAL_EDIT_SKILL_SPEC } from './book-developmental-edit.skill.js';
import { BOOK_OUTLINE_WRITER_SKILL_SPEC } from './book-outline-writer.skill.js';
import { BOOK_POSITIONING_SKILL_SPEC } from './book-positioning.skill.js';

export const BOOK_DOMAIN_SKILL_SPECS = [
  BOOK_CHAPTER_WRITER_SKILL_SPEC,
  BOOK_CITATION_REVIEW_SKILL_SPEC,
  BOOK_CONTINUITY_REVIEW_SKILL_SPEC,
  BOOK_DEVELOPMENTAL_EDIT_SKILL_SPEC,
  BOOK_OUTLINE_WRITER_SKILL_SPEC,
  BOOK_POSITIONING_SKILL_SPEC,
] as const;
