import { registerSkillSpecs } from '../../registries/index.js';
import { HEALTHCARE_PATIENT_EDUCATION_SKILL_SPECS } from './patient-education/index.js';
import { HEALTHCARE_CLINICAL_ADMIN_SKILL_SPECS } from './clinical-admin/index.js';
import { HEALTHCARE_MEDICAL_RESEARCH_SKILL_SPECS } from './medical-research/index.js';

export { defineHealthcareSkillSpec } from './healthcare-skill-utils.js';
export type { HealthcareSkillDefinition } from './healthcare-skill-utils.js';

export const HEALTHCARE_DOMAIN_SKILL_SPECS = [
  ...HEALTHCARE_PATIENT_EDUCATION_SKILL_SPECS,
  ...HEALTHCARE_CLINICAL_ADMIN_SKILL_SPECS,
  ...HEALTHCARE_MEDICAL_RESEARCH_SKILL_SPECS,
] as const;

registerSkillSpecs(HEALTHCARE_DOMAIN_SKILL_SPECS);
