import { registerSkillSpecs } from '../../registries/skill-registry.js';
import { MARKETING_DIGITAL_MARKETING_SKILL_SPECS } from './digital-marketing/index.js';
import { MARKETING_SEO_SKILL_SPECS } from './seo/index.js';
import { MARKETING_ADS_SKILL_SPECS } from './ads/index.js';
import { MARKETING_CAMPAIGN_SKILL_SPECS } from './campaign/index.js';
import { MARKETING_EMAIL_MARKETING_SKILL_SPECS } from './email-marketing/index.js';
import { MARKETING_LANDING_PAGE_SKILL_SPECS } from './landing-page/index.js';
import { MARKETING_COMPETITOR_INTELLIGENCE_SKILL_SPECS } from './competitor-intelligence/index.js';

export { defineMarketingSkillSpec } from './marketing-skill-utils.js';
export type { MarketingSkillDefinition } from './marketing-skill-utils.js';
export { MARKETING_DIGITAL_MARKETING_SKILL_SPECS } from './digital-marketing/index.js';
export { MARKETING_SEO_SKILL_SPECS } from './seo/index.js';
export { MARKETING_ADS_SKILL_SPECS } from './ads/index.js';
export { MARKETING_CAMPAIGN_SKILL_SPECS } from './campaign/index.js';
export { MARKETING_EMAIL_MARKETING_SKILL_SPECS } from './email-marketing/index.js';
export { MARKETING_LANDING_PAGE_SKILL_SPECS } from './landing-page/index.js';
export { MARKETING_COMPETITOR_INTELLIGENCE_SKILL_SPECS } from './competitor-intelligence/index.js';

export const MARKETING_DOMAIN_SKILL_SPECS = [
  ...MARKETING_DIGITAL_MARKETING_SKILL_SPECS,
  ...MARKETING_SEO_SKILL_SPECS,
  ...MARKETING_ADS_SKILL_SPECS,
  ...MARKETING_CAMPAIGN_SKILL_SPECS,
  ...MARKETING_EMAIL_MARKETING_SKILL_SPECS,
  ...MARKETING_LANDING_PAGE_SKILL_SPECS,
  ...MARKETING_COMPETITOR_INTELLIGENCE_SKILL_SPECS,
] as const;

registerSkillSpecs(MARKETING_DOMAIN_SKILL_SPECS);
