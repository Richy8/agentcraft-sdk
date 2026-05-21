import { BUSINESS_PROCESS_ANALYSIS_SKILL_SPEC } from './business-process-analysis.skill.js';
import { OPERATING_MODEL_DESIGN_SKILL_SPEC } from './operating-model-design.skill.js';
import { COST_OPTIMIZATION_BRIEF_SKILL_SPEC } from './cost-optimization-brief.skill.js';
import { BUSINESS_KPI_REVIEW_SKILL_SPEC } from './business-kpi-review.skill.js';
import { BUSINESS_RISK_REGISTER_SKILL_SPEC } from './business-risk-register.skill.js';

export const BUSINESS_OPERATIONS_SKILL_SPECS = [
  BUSINESS_PROCESS_ANALYSIS_SKILL_SPEC,
  OPERATING_MODEL_DESIGN_SKILL_SPEC,
  COST_OPTIMIZATION_BRIEF_SKILL_SPEC,
  BUSINESS_KPI_REVIEW_SKILL_SPEC,
  BUSINESS_RISK_REGISTER_SKILL_SPEC,
] as const;
