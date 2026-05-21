
import { PINTEREST_BOARD_PLANNER_SKILL_SPEC } from './pinterest-board-planner.skill.js';
import { PINTEREST_KEYWORD_RESEARCH_SKILL_SPEC } from './pinterest-keyword-research.skill.js';
import { PINTEREST_PIN_TITLE_DESCRIPTION_WRITER_SKILL_SPEC } from './pinterest-pin-title-description-writer.skill.js';
import { PINTEREST_SEASONALITY_REVIEW_SKILL_SPEC } from './pinterest-seasonality-review.skill.js';
import { PINTEREST_VISUAL_BRIEF_SKILL_SPEC } from './pinterest-visual-brief.skill.js';

export const PINTEREST_DOMAIN_SKILL_SPECS = [
  PINTEREST_BOARD_PLANNER_SKILL_SPEC,
  PINTEREST_KEYWORD_RESEARCH_SKILL_SPEC,
  PINTEREST_PIN_TITLE_DESCRIPTION_WRITER_SKILL_SPEC,
  PINTEREST_SEASONALITY_REVIEW_SKILL_SPEC,
  PINTEREST_VISUAL_BRIEF_SKILL_SPEC,
] as const;
