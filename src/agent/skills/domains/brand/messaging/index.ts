import { MESSAGING_FRAMEWORK_WRITER_SKILL_SPEC } from "./messaging-framework-writer.skill.js";
import { TAGLINE_OPTIONS_WRITER_SKILL_SPEC } from "./tagline-options-writer.skill.js";
import { VALUE_PROPOSITION_WRITER_SKILL_SPEC } from "./value-proposition-writer.skill.js";
import { BRAND_STORY_WRITER_SKILL_SPEC } from "./brand-story-writer.skill.js";
import { PROOF_POINT_MAPPER_SKILL_SPEC } from "./proof-point-mapper.skill.js";

export const BRAND_MESSAGING_SKILL_SPECS = [
  MESSAGING_FRAMEWORK_WRITER_SKILL_SPEC,
  TAGLINE_OPTIONS_WRITER_SKILL_SPEC,
  VALUE_PROPOSITION_WRITER_SKILL_SPEC,
  BRAND_STORY_WRITER_SKILL_SPEC,
  PROOF_POINT_MAPPER_SKILL_SPEC,
] as const;
