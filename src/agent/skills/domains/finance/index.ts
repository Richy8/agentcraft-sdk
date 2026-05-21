import { registerSkillSpecs } from '../../registries/index.js';
import { FINANCE_STOCK_RESEARCH_SKILL_SPECS } from './stock-research/index.js';
import { FINANCE_MARKET_RESEARCH_SKILL_SPECS } from './market-research/index.js';
import { FINANCE_PORTFOLIO_REVIEW_SKILL_SPECS } from './portfolio-review/index.js';
import { FINANCE_INVESTMENT_OPPORTUNITY_SKILL_SPECS } from './investment-opportunity/index.js';
import { FINANCE_FINANCIAL_REPORTING_SKILL_SPECS } from './financial-reporting/index.js';

export { defineFinanceSkillSpec } from './finance-skill-utils.js';
export type { FinanceSkillDefinition } from './finance-skill-utils.js';

export const FINANCE_DOMAIN_SKILL_SPECS = [
  ...FINANCE_STOCK_RESEARCH_SKILL_SPECS,
  ...FINANCE_MARKET_RESEARCH_SKILL_SPECS,
  ...FINANCE_PORTFOLIO_REVIEW_SKILL_SPECS,
  ...FINANCE_INVESTMENT_OPPORTUNITY_SKILL_SPECS,
  ...FINANCE_FINANCIAL_REPORTING_SKILL_SPECS,
] as const;

registerSkillSpecs(FINANCE_DOMAIN_SKILL_SPECS);
