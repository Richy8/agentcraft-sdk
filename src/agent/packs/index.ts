import { createSkillByName, requireSkillInspection } from '../skills/registries/index.js';
import type { SkillInspection } from '../skills/registries/index.js';
import { createSkillPackByName, requireSkillPackInspection } from '../skills/packs/index.js';
import type { SkillPackInspection } from '../skills/packs/index.js';
import type { AgentSkill } from '../skills/types.js';
import type { PackConfig } from './registry.js';

export type { CreatorPackConfig } from '../creator/types.js';
export {
  PackRegistry,
  createPackFromSpec,
  definePackSpec,
  defaultPackRegistry,
  getPackSpec,
  listPackSpecs,
  registerPackSpecs,
} from './registry.js';
export type { PackConfig, PackSkillOverride, PackSkillResolver, PackSpec, PackSpecFilter } from './registry.js';
export {
  SKILL_PACK_SPECS,
  createSkillPackByName,
  getSkillPackSpec,
  inspectSkillPackByName,
  inspectSkillPackSpec,
  listSkillPackInspections,
  listSkillPackSpecs,
  requireSkillPackInspection,
  skillPackRegistry,
} from '../skills/packs/index.js';

export interface SkillAccessor {
  create(): AgentSkill;
  inspect(): SkillInspection;
}

export type DerivedSkillAccessors = Readonly<Record<string, SkillAccessor>>;

export interface DomainPackControls {
  readonly inspect: () => SkillPackInspection;
  readonly listSkills: () => readonly SkillInspection[];
  readonly getSkill: (skillIdOrAccessor: string) => SkillAccessor;
}

export type DomainPackResult = ReturnType<typeof createSkillPackByName> &
  DerivedSkillAccessors &
  DomainPackControls;

function domainPack(packName: string): (config?: PackConfig) => DomainPackResult {
  return (config) => {
    const pack = createSkillPackByName(packName, config);
    const inspectPack = () => requireSkillPackInspection(packName);
    const skillAccessors = Object.fromEntries(
      inspectPack().skillIds.flatMap((skillId) => {
        const accessor = skillAccessor(skillId);
        const derived = skillAccessorName(skillId);
        return derived === skillId
          ? [[derived, accessor]]
          : [
              [derived, accessor],
              [skillId, accessor],
            ];
      }),
    ) as DerivedSkillAccessors;
    return Object.assign(pack, {
      inspect: inspectPack,
      listSkills: () => inspectPack().skills,
      getSkill: (skillIdOrAccessor: string) => {
        const accessor = skillAccessors[skillIdOrAccessor] ?? skillAccessors[skillAccessorName(skillIdOrAccessor)];
        if (!accessor) {
          throw new Error(`Pack '${packName}' does not include skill '${skillIdOrAccessor}'`);
        }
        return accessor;
      },
    }, skillAccessors) as DomainPackResult;
  };
}

function skillAccessor(skillId: string): SkillAccessor {
  return {
    create: () => createSkillByName(skillId),
    inspect: () => requireSkillInspection(skillId),
  };
}

function skillAccessorName(skillId: string): string {
  return skillId.replace(/-([a-z0-9])/g, (_match, value: string) => value.toUpperCase());
}

export const CreatorPack = {
  blog: domainPack('creator-blog-skills'),
  medium: domainPack('creator-medium-skills'),
  linkedin: domainPack('creator-linkedin-skills'),
  xTwitter: domainPack('creator-x-twitter-skills'),
  facebook: domainPack('creator-facebook-skills'),
  pinterest: domainPack('creator-pinterest-skills'),
  instagram: domainPack('creator-instagram-skills'),
  snapchat: domainPack('creator-snapchat-skills'),
  tiktok: domainPack('creator-tiktok-skills'),
  youtube: domainPack('creator-youtube-skills'),
  shortVideo: domainPack('creator-short-video-skills'),
  podcast: domainPack('creator-podcast-skills'),
  newsletter: domainPack('creator-newsletter-skills'),
  substack: domainPack('creator-substack-skills'),
  book: domainPack('creator-book-skills'),
  course: domainPack('creator-course-skills'),
  webinar: domainPack('creator-webinar-skills'),
  resume: domainPack('creator-resume-skills'),
  seo: domainPack('marketing-seo-skills'),
  social: domainPack('creator-x-twitter-skills'),
  video: domainPack('creator-youtube-skills'),
  copy: domainPack('marketing-landing-page-skills'),
  publishing: domainPack('creator-newsletter-skills'),
  analytics: domainPack('marketing-digital-marketing-skills'),
} as const;

export const BrandPack = {
  research: domainPack('brand-research-skills'),
  positioning: domainPack('brand-positioning-skills'),
  messaging: domainPack('brand-messaging-skills'),
  voice: domainPack('brand-voice-skills'),
} as const;

export const MarketingPack = {
  digitalMarketing: domainPack('marketing-digital-marketing-skills'),
  seo: domainPack('marketing-seo-skills'),
  ads: domainPack('marketing-ads-skills'),
  campaign: domainPack('marketing-campaign-skills'),
  emailMarketing: domainPack('marketing-email-marketing-skills'),
  landingPage: domainPack('marketing-landing-page-skills'),
  competitorIntelligence: domainPack('marketing-competitor-intelligence-skills'),
} as const;

export const BusinessPack = {
  investments: domainPack('business-investments-skills'),
  strategy: domainPack('business-strategy-skills'),
  operations: domainPack('business-operations-skills'),
  partnerships: domainPack('business-partnerships-skills'),
  businessPlan: domainPack('business-business-plan-skills'),
  marketExpansion: domainPack('business-market-expansion-skills'),
} as const;

export const SalesPack = {
  prospecting: domainPack('sales-prospecting-skills'),
  proposal: domainPack('sales-proposal-skills'),
  crm: domainPack('sales-crm-skills'),
  objectionHandling: domainPack('sales-objection-handling-skills'),
  accountResearch: domainPack('sales-account-research-skills'),
} as const;

export const FinancePack = {
  stockResearch: domainPack('finance-stock-research-skills'),
  marketResearch: domainPack('finance-market-research-skills'),
  portfolioReview: domainPack('finance-portfolio-review-skills'),
  investmentOpportunity: domainPack('finance-investment-opportunity-skills'),
  financialReporting: domainPack('finance-financial-reporting-skills'),
  marketUpdate: domainPack('finance-market-research-skills'),
} as const;

export const PersonalProductivityPack = {
  tasks: domainPack('personal-productivity-tasks-skills'),
  calendar: domainPack('personal-productivity-calendar-skills'),
  lifeAdmin: domainPack('personal-productivity-life-admin-skills'),
  communication: domainPack('personal-productivity-communication-skills'),
  weeklyPlanning: domainPack('personal-productivity-tasks-skills'),
} as const;

export const ProductPack = {
  productResearch: domainPack('product-product-research-skills'),
  prd: domainPack('product-prd-skills'),
  roadmap: domainPack('product-roadmap-skills'),
  launch: domainPack('product-launch-skills'),
  uxResearch: domainPack('product-ux-research-skills'),
} as const;

export const EngineeringPack = {
  codeReview: domainPack('engineering-code-review-skills'),
  architecture: domainPack('engineering-architecture-skills'),
  testing: domainPack('engineering-testing-skills'),
  debugging: domainPack('engineering-debugging-skills'),
  devops: domainPack('engineering-devops-skills'),
} as const;

export const SupportPack = {
  customerSupport: domainPack('support-customer-support-skills'),
  knowledgeBase: domainPack('support-knowledge-base-skills'),
  customerSuccess: domainPack('support-customer-success-skills'),
} as const;

export const LegalPack = {
  contractReview: domainPack('legal-contract-review-skills'),
  compliance: domainPack('legal-compliance-skills'),
  policyDrafting: domainPack('legal-policy-drafting-skills'),
} as const;

export const HealthcarePack = {
  patientEducation: domainPack('healthcare-patient-education-skills'),
  clinicalAdmin: domainPack('healthcare-clinical-admin-skills'),
  medicalResearch: domainPack('healthcare-medical-research-skills'),
} as const;

export const DataAnalyticsPack = {
  dashboard: domainPack('data-analytics-dashboard-skills'),
  experimentAnalysis: domainPack('data-analytics-experiment-analysis-skills'),
  reporting: domainPack('data-analytics-reporting-skills'),
} as const;

export const CreatorPacks = CreatorPack;
export const BrandPacks = BrandPack;
export const MarketingPacks = MarketingPack;
export const BusinessPacks = BusinessPack;
export const SalesPacks = SalesPack;
export const FinancePacks = FinancePack;
export const PersonalProductivityPacks = PersonalProductivityPack;
export const ProductPacks = ProductPack;
export const EngineeringPacks = EngineeringPack;
export const SupportPacks = SupportPack;
export const LegalPacks = LegalPack;
export const HealthcarePacks = HealthcarePack;
export const DataAnalyticsPacks = DataAnalyticsPack;

export { createSkillPackByName as createPackByName } from '../skills/packs/index.js';
