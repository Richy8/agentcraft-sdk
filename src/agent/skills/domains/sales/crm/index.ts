export { SALES_CRM_CRM_NOTE_SUMMARIZER_SKILL_SPEC } from "./crm-note-summarizer.skill.js";
export { SALES_CRM_CRM_NEXT_STEP_PLANNER_SKILL_SPEC } from "./crm-next-step-planner.skill.js";
export { SALES_CRM_PIPELINE_RISK_ANALYSIS_SKILL_SPEC } from "./pipeline-risk-analysis.skill.js";
export { SALES_CRM_DEAL_REVIEW_SKILL_SPEC } from "./deal-review.skill.js";
export { SALES_CRM_FORECAST_NARRATIVE_WRITER_SKILL_SPEC } from "./forecast-narrative-writer.skill.js";

import { SALES_CRM_CRM_NOTE_SUMMARIZER_SKILL_SPEC } from "./crm-note-summarizer.skill.js";
import { SALES_CRM_CRM_NEXT_STEP_PLANNER_SKILL_SPEC } from "./crm-next-step-planner.skill.js";
import { SALES_CRM_PIPELINE_RISK_ANALYSIS_SKILL_SPEC } from "./pipeline-risk-analysis.skill.js";
import { SALES_CRM_DEAL_REVIEW_SKILL_SPEC } from "./deal-review.skill.js";
import { SALES_CRM_FORECAST_NARRATIVE_WRITER_SKILL_SPEC } from "./forecast-narrative-writer.skill.js";

export const SALES_CRM_SKILL_SPECS = [
  SALES_CRM_CRM_NOTE_SUMMARIZER_SKILL_SPEC,
  SALES_CRM_CRM_NEXT_STEP_PLANNER_SKILL_SPEC,
  SALES_CRM_PIPELINE_RISK_ANALYSIS_SKILL_SPEC,
  SALES_CRM_DEAL_REVIEW_SKILL_SPEC,
  SALES_CRM_FORECAST_NARRATIVE_WRITER_SKILL_SPEC,
] as const;
