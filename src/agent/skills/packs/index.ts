import '../domains/index.js';
import { createSkillByName, requireSkillInspection } from '../registries/index.js';
import type { SkillInspection } from '../registries/index.js';
import { PackRegistry, createPackFromSpec, getPackSpec as getRegistryPackSpec, listPackSpecs as listRegistryPackSpecs } from '../../packs/registry.js';
import type { PackConfig, PackSpec, PackSpecFilter } from '../../packs/registry.js';

import { CREATOR_BLOG_PACK_SPEC } from './creator/blog.pack.js';
import { CREATOR_MEDIUM_PACK_SPEC } from './creator/medium.pack.js';
import { CREATOR_LINKEDIN_PACK_SPEC } from './creator/linkedin.pack.js';
import { CREATOR_X_TWITTER_PACK_SPEC } from './creator/x-twitter.pack.js';
import { CREATOR_FACEBOOK_PACK_SPEC } from './creator/facebook.pack.js';
import { CREATOR_PINTEREST_PACK_SPEC } from './creator/pinterest.pack.js';
import { CREATOR_INSTAGRAM_PACK_SPEC } from './creator/instagram.pack.js';
import { CREATOR_SNAPCHAT_PACK_SPEC } from './creator/snapchat.pack.js';
import { CREATOR_TIKTOK_PACK_SPEC } from './creator/tiktok.pack.js';
import { CREATOR_YOUTUBE_PACK_SPEC } from './creator/youtube.pack.js';
import { CREATOR_SHORT_VIDEO_PACK_SPEC } from './creator/short-video.pack.js';
import { CREATOR_PODCAST_PACK_SPEC } from './creator/podcast.pack.js';
import { CREATOR_NEWSLETTER_PACK_SPEC } from './creator/newsletter.pack.js';
import { CREATOR_SUBSTACK_PACK_SPEC } from './creator/substack.pack.js';
import { CREATOR_BOOK_PACK_SPEC } from './creator/book.pack.js';
import { CREATOR_COURSE_PACK_SPEC } from './creator/course.pack.js';
import { CREATOR_WEBINAR_PACK_SPEC } from './creator/webinar.pack.js';
import { CREATOR_RESUME_PACK_SPEC } from './creator/resume.pack.js';
import { BRAND_RESEARCH_PACK_SPEC } from './brand/research.pack.js';
import { BRAND_POSITIONING_PACK_SPEC } from './brand/positioning.pack.js';
import { BRAND_MESSAGING_PACK_SPEC } from './brand/messaging.pack.js';
import { BRAND_VOICE_PACK_SPEC } from './brand/voice.pack.js';
import { MARKETING_DIGITAL_MARKETING_PACK_SPEC } from './marketing/digital-marketing.pack.js';
import { MARKETING_SEO_PACK_SPEC } from './marketing/seo.pack.js';
import { MARKETING_ADS_PACK_SPEC } from './marketing/ads.pack.js';
import { MARKETING_CAMPAIGN_PACK_SPEC } from './marketing/campaign.pack.js';
import { MARKETING_EMAIL_MARKETING_PACK_SPEC } from './marketing/email-marketing.pack.js';
import { MARKETING_LANDING_PAGE_PACK_SPEC } from './marketing/landing-page.pack.js';
import { MARKETING_COMPETITOR_INTELLIGENCE_PACK_SPEC } from './marketing/competitor-intelligence.pack.js';
import { BUSINESS_INVESTMENTS_PACK_SPEC } from './business/investments.pack.js';
import { BUSINESS_STRATEGY_PACK_SPEC } from './business/strategy.pack.js';
import { BUSINESS_OPERATIONS_PACK_SPEC } from './business/operations.pack.js';
import { BUSINESS_PARTNERSHIPS_PACK_SPEC } from './business/partnerships.pack.js';
import { BUSINESS_BUSINESS_PLAN_PACK_SPEC } from './business/business-plan.pack.js';
import { BUSINESS_MARKET_EXPANSION_PACK_SPEC } from './business/market-expansion.pack.js';
import { SALES_PROSPECTING_PACK_SPEC } from './sales/prospecting.pack.js';
import { SALES_PROPOSAL_PACK_SPEC } from './sales/proposal.pack.js';
import { SALES_CRM_PACK_SPEC } from './sales/crm.pack.js';
import { SALES_OBJECTION_HANDLING_PACK_SPEC } from './sales/objection-handling.pack.js';
import { SALES_ACCOUNT_RESEARCH_PACK_SPEC } from './sales/account-research.pack.js';
import { FINANCE_STOCK_RESEARCH_PACK_SPEC } from './finance/stock-research.pack.js';
import { FINANCE_MARKET_RESEARCH_PACK_SPEC } from './finance/market-research.pack.js';
import { FINANCE_MARKET_UPDATE_PACK_SPEC } from './finance/market-update.pack.js';
import { FINANCE_PORTFOLIO_REVIEW_PACK_SPEC } from './finance/portfolio-review.pack.js';
import { FINANCE_INVESTMENT_OPPORTUNITY_PACK_SPEC } from './finance/investment-opportunity.pack.js';
import { FINANCE_FINANCIAL_REPORTING_PACK_SPEC } from './finance/financial-reporting.pack.js';
import { PERSONAL_PRODUCTIVITY_TASKS_PACK_SPEC } from './personal-productivity/tasks.pack.js';
import { PERSONAL_PRODUCTIVITY_CALENDAR_PACK_SPEC } from './personal-productivity/calendar.pack.js';
import { PERSONAL_PRODUCTIVITY_LIFE_ADMIN_PACK_SPEC } from './personal-productivity/life-admin.pack.js';
import { PERSONAL_PRODUCTIVITY_COMMUNICATION_PACK_SPEC } from './personal-productivity/communication.pack.js';
import { PERSONAL_PRODUCTIVITY_WEEKLY_PLANNING_PACK_SPEC } from './personal-productivity/weekly-planning.pack.js';
import { PRODUCT_PRODUCT_RESEARCH_PACK_SPEC } from './product/product-research.pack.js';
import { PRODUCT_PRD_PACK_SPEC } from './product/prd.pack.js';
import { PRODUCT_ROADMAP_PACK_SPEC } from './product/roadmap.pack.js';
import { PRODUCT_LAUNCH_PACK_SPEC } from './product/launch.pack.js';
import { PRODUCT_UX_RESEARCH_PACK_SPEC } from './product/ux-research.pack.js';
import { ENGINEERING_CODE_REVIEW_PACK_SPEC } from './engineering/code-review.pack.js';
import { ENGINEERING_ARCHITECTURE_PACK_SPEC } from './engineering/architecture.pack.js';
import { ENGINEERING_TESTING_PACK_SPEC } from './engineering/testing.pack.js';
import { ENGINEERING_DEBUGGING_PACK_SPEC } from './engineering/debugging.pack.js';
import { ENGINEERING_DEVOPS_PACK_SPEC } from './engineering/devops.pack.js';
import { SUPPORT_CUSTOMER_SUPPORT_PACK_SPEC } from './support/customer-support.pack.js';
import { SUPPORT_KNOWLEDGE_BASE_PACK_SPEC } from './support/knowledge-base.pack.js';
import { SUPPORT_CUSTOMER_SUCCESS_PACK_SPEC } from './support/customer-success.pack.js';
import { LEGAL_CONTRACT_REVIEW_PACK_SPEC } from './legal/contract-review.pack.js';
import { LEGAL_COMPLIANCE_PACK_SPEC } from './legal/compliance.pack.js';
import { LEGAL_POLICY_DRAFTING_PACK_SPEC } from './legal/policy-drafting.pack.js';
import { HEALTHCARE_PATIENT_EDUCATION_PACK_SPEC } from './healthcare/patient-education.pack.js';
import { HEALTHCARE_CLINICAL_ADMIN_PACK_SPEC } from './healthcare/clinical-admin.pack.js';
import { HEALTHCARE_MEDICAL_RESEARCH_PACK_SPEC } from './healthcare/medical-research.pack.js';
import { DATA_ANALYTICS_DASHBOARD_PACK_SPEC } from './data-analytics/dashboard.pack.js';
import { DATA_ANALYTICS_EXPERIMENT_ANALYSIS_PACK_SPEC } from './data-analytics/experiment-analysis.pack.js';
import { DATA_ANALYTICS_REPORTING_PACK_SPEC } from './data-analytics/reporting.pack.js';

export type { PackConfig, PackSpec, PackSpecFilter } from '../../packs/registry.js';

export interface SkillPackInspection {
  readonly name: string;
  readonly description: string;
  readonly domain: string;
  readonly category: string;
  readonly skillIds: readonly string[];
  readonly skills: readonly SkillInspection[];
  readonly defaultConfig?: PackConfig;
  readonly docsPath?: string;
  readonly examples: readonly string[];
  readonly humanReviewRequired: boolean;
  readonly sideEffectRisk?: PackSpec['sideEffectRisk'];
}

export const SKILL_PACK_SPECS = [
  CREATOR_BLOG_PACK_SPEC,
  CREATOR_MEDIUM_PACK_SPEC,
  CREATOR_LINKEDIN_PACK_SPEC,
  CREATOR_X_TWITTER_PACK_SPEC,
  CREATOR_FACEBOOK_PACK_SPEC,
  CREATOR_PINTEREST_PACK_SPEC,
  CREATOR_INSTAGRAM_PACK_SPEC,
  CREATOR_SNAPCHAT_PACK_SPEC,
  CREATOR_TIKTOK_PACK_SPEC,
  CREATOR_YOUTUBE_PACK_SPEC,
  CREATOR_SHORT_VIDEO_PACK_SPEC,
  CREATOR_PODCAST_PACK_SPEC,
  CREATOR_NEWSLETTER_PACK_SPEC,
  CREATOR_SUBSTACK_PACK_SPEC,
  CREATOR_BOOK_PACK_SPEC,
  CREATOR_COURSE_PACK_SPEC,
  CREATOR_WEBINAR_PACK_SPEC,
  CREATOR_RESUME_PACK_SPEC,
  BRAND_RESEARCH_PACK_SPEC,
  BRAND_POSITIONING_PACK_SPEC,
  BRAND_MESSAGING_PACK_SPEC,
  BRAND_VOICE_PACK_SPEC,
  MARKETING_DIGITAL_MARKETING_PACK_SPEC,
  MARKETING_SEO_PACK_SPEC,
  MARKETING_ADS_PACK_SPEC,
  MARKETING_CAMPAIGN_PACK_SPEC,
  MARKETING_EMAIL_MARKETING_PACK_SPEC,
  MARKETING_LANDING_PAGE_PACK_SPEC,
  MARKETING_COMPETITOR_INTELLIGENCE_PACK_SPEC,
  BUSINESS_INVESTMENTS_PACK_SPEC,
  BUSINESS_STRATEGY_PACK_SPEC,
  BUSINESS_OPERATIONS_PACK_SPEC,
  BUSINESS_PARTNERSHIPS_PACK_SPEC,
  BUSINESS_BUSINESS_PLAN_PACK_SPEC,
  BUSINESS_MARKET_EXPANSION_PACK_SPEC,
  SALES_PROSPECTING_PACK_SPEC,
  SALES_PROPOSAL_PACK_SPEC,
  SALES_CRM_PACK_SPEC,
  SALES_OBJECTION_HANDLING_PACK_SPEC,
  SALES_ACCOUNT_RESEARCH_PACK_SPEC,
  FINANCE_STOCK_RESEARCH_PACK_SPEC,
  FINANCE_MARKET_RESEARCH_PACK_SPEC,
  FINANCE_MARKET_UPDATE_PACK_SPEC,
  FINANCE_PORTFOLIO_REVIEW_PACK_SPEC,
  FINANCE_INVESTMENT_OPPORTUNITY_PACK_SPEC,
  FINANCE_FINANCIAL_REPORTING_PACK_SPEC,
  PERSONAL_PRODUCTIVITY_TASKS_PACK_SPEC,
  PERSONAL_PRODUCTIVITY_CALENDAR_PACK_SPEC,
  PERSONAL_PRODUCTIVITY_LIFE_ADMIN_PACK_SPEC,
  PERSONAL_PRODUCTIVITY_COMMUNICATION_PACK_SPEC,
  PERSONAL_PRODUCTIVITY_WEEKLY_PLANNING_PACK_SPEC,
  PRODUCT_PRODUCT_RESEARCH_PACK_SPEC,
  PRODUCT_PRD_PACK_SPEC,
  PRODUCT_ROADMAP_PACK_SPEC,
  PRODUCT_LAUNCH_PACK_SPEC,
  PRODUCT_UX_RESEARCH_PACK_SPEC,
  ENGINEERING_CODE_REVIEW_PACK_SPEC,
  ENGINEERING_ARCHITECTURE_PACK_SPEC,
  ENGINEERING_TESTING_PACK_SPEC,
  ENGINEERING_DEBUGGING_PACK_SPEC,
  ENGINEERING_DEVOPS_PACK_SPEC,
  SUPPORT_CUSTOMER_SUPPORT_PACK_SPEC,
  SUPPORT_KNOWLEDGE_BASE_PACK_SPEC,
  SUPPORT_CUSTOMER_SUCCESS_PACK_SPEC,
  LEGAL_CONTRACT_REVIEW_PACK_SPEC,
  LEGAL_COMPLIANCE_PACK_SPEC,
  LEGAL_POLICY_DRAFTING_PACK_SPEC,
  HEALTHCARE_PATIENT_EDUCATION_PACK_SPEC,
  HEALTHCARE_CLINICAL_ADMIN_PACK_SPEC,
  HEALTHCARE_MEDICAL_RESEARCH_PACK_SPEC,
  DATA_ANALYTICS_DASHBOARD_PACK_SPEC,
  DATA_ANALYTICS_EXPERIMENT_ANALYSIS_PACK_SPEC,
  DATA_ANALYTICS_REPORTING_PACK_SPEC,
] as const satisfies readonly PackSpec[];

export const skillPackRegistry = new PackRegistry(SKILL_PACK_SPECS);

export function listSkillPackSpecs(filter: PackSpecFilter = {}): PackSpec[] {
  return listRegistryPackSpecs(filter, skillPackRegistry);
}

export function getSkillPackSpec(name: string): PackSpec | undefined {
  return getRegistryPackSpec(name, skillPackRegistry);
}

export function inspectSkillPackSpec(spec: PackSpec): SkillPackInspection {
  return {
    name: spec.name,
    description: spec.description,
    domain: spec.domain,
    category: spec.category,
    skillIds: spec.skillIds,
    skills: spec.skillIds.map((skillId) => requireSkillInspection(skillId)),
    ...(spec.defaultConfig !== undefined && { defaultConfig: spec.defaultConfig }),
    ...(spec.docsPath !== undefined && { docsPath: spec.docsPath }),
    examples: spec.examples ?? [],
    humanReviewRequired: spec.humanReviewRequired ?? false,
    ...(spec.sideEffectRisk !== undefined && { sideEffectRisk: spec.sideEffectRisk }),
  };
}

export function inspectSkillPackByName(name: string): SkillPackInspection | undefined {
  const spec = getSkillPackSpec(name);
  return spec ? inspectSkillPackSpec(spec) : undefined;
}

export function requireSkillPackInspection(name: string): SkillPackInspection {
  const inspection = inspectSkillPackByName(name);
  if (!inspection) throw new Error(`Unknown skill pack spec '${name}'`);
  return inspection;
}

export function listSkillPackInspections(filter: PackSpecFilter = {}): SkillPackInspection[] {
  return listSkillPackSpecs(filter).map(inspectSkillPackSpec);
}

export function createSkillPackByName(name: string, config?: PackConfig) {
  const spec = getSkillPackSpec(name);
  if (!spec) throw new Error(`Unknown skill pack spec '${name}'`);
  return createPackFromSpec(spec, createSkillByName, config);
}

export * from './brand/index.js';
export * from './business/index.js';
export * from './creator/index.js';
export * from './data-analytics/index.js';
export * from './engineering/index.js';
export * from './finance/index.js';
export * from './healthcare/index.js';
export * from './legal/index.js';
export * from './marketing/index.js';
export * from './personal-productivity/index.js';
export * from './product/index.js';
export * from './sales/index.js';
export * from './support/index.js';
