import { CREATOR_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/creator.catalog.js';
import { BRAND_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/brand.catalog.js';
import { MARKETING_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/marketing.catalog.js';
import { BUSINESS_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/business.catalog.js';
import { SALES_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/sales.catalog.js';
import { FINANCE_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/finance.catalog.js';
import { PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/personal-productivity.catalog.js';
import { PRODUCT_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/product.catalog.js';
import { ENGINEERING_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/engineering.catalog.js';
import { SUPPORT_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/support.catalog.js';
import { LEGAL_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/legal.catalog.js';
import { HEALTHCARE_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/healthcare.catalog.js';
import { DATA_ANALYTICS_DOMAIN_SKILL_CATEGORY_PLANS } from './domains/data-analytics.catalog.js';
import type { DomainSkillCategoryPlan } from './types.js';

export type { DomainSkillCategoryPlan } from './types.js';

export const DOMAIN_SKILL_ARCHITECTURE_CATALOG = [
  ...CREATOR_DOMAIN_SKILL_CATEGORY_PLANS,
  ...BRAND_DOMAIN_SKILL_CATEGORY_PLANS,
  ...MARKETING_DOMAIN_SKILL_CATEGORY_PLANS,
  ...BUSINESS_DOMAIN_SKILL_CATEGORY_PLANS,
  ...SALES_DOMAIN_SKILL_CATEGORY_PLANS,
  ...FINANCE_DOMAIN_SKILL_CATEGORY_PLANS,
  ...PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_CATEGORY_PLANS,
  ...PRODUCT_DOMAIN_SKILL_CATEGORY_PLANS,
  ...ENGINEERING_DOMAIN_SKILL_CATEGORY_PLANS,
  ...SUPPORT_DOMAIN_SKILL_CATEGORY_PLANS,
  ...LEGAL_DOMAIN_SKILL_CATEGORY_PLANS,
  ...HEALTHCARE_DOMAIN_SKILL_CATEGORY_PLANS,
  ...DATA_ANALYTICS_DOMAIN_SKILL_CATEGORY_PLANS,
] as const satisfies readonly DomainSkillCategoryPlan[];

export function listPlannedDomainSkillCategories(domain?: string): readonly DomainSkillCategoryPlan[] {
  if (domain === undefined) return DOMAIN_SKILL_ARCHITECTURE_CATALOG;
  return DOMAIN_SKILL_ARCHITECTURE_CATALOG.filter((entry) => entry.domain === domain);
}
