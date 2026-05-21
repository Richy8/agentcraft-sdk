import { BRAND_RESEARCH_SKILL_SPEC } from "./brand-research.skill.js";
import { AUDIENCE_INSIGHT_RESEARCH_SKILL_SPEC } from "./audience-insight-research.skill.js";
import { VOICE_OF_CUSTOMER_MINING_SKILL_SPEC } from "./voice-of-customer-mining.skill.js";
import { COMPETITOR_BRAND_SCAN_SKILL_SPEC } from "./competitor-brand-scan.skill.js";

export const BRAND_RESEARCH_SKILL_SPECS = [
  AUDIENCE_INSIGHT_RESEARCH_SKILL_SPEC,
  BRAND_RESEARCH_SKILL_SPEC,
  COMPETITOR_BRAND_SCAN_SKILL_SPEC,
  VOICE_OF_CUSTOMER_MINING_SKILL_SPEC,
] as const;
