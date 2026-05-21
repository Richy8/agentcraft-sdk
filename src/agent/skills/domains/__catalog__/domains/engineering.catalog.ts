import type { DomainSkillCategoryPlan } from '../types.js';

export const ENGINEERING_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'engineering',
    category: 'code-review',
    title: 'Engineering',
    plannedSkills: ['code-review', 'security-code-review', 'performance-code-review', 'api-contract-review', 'migration-risk-review'],
  },
  {
    domain: 'engineering',
    category: 'architecture',
    title: 'Engineering',
    plannedSkills: ['architecture-review', 'design-doc-writer', 'dependency-risk-analysis', 'system-boundary-review', 'scalability-review'],
  },
  {
    domain: 'engineering',
    category: 'testing',
    title: 'Engineering',
    plannedSkills: ['test-plan-writer', 'unit-test-generator', 'integration-test-planner', 'edge-case-analysis', 'regression-risk-review'],
  },
  {
    domain: 'engineering',
    category: 'debugging',
    title: 'Engineering',
    plannedSkills: ['bug-reproduction-planner', 'log-analysis', 'root-cause-analysis', 'incident-fix-review'],
  },
  {
    domain: 'engineering',
    category: 'devops',
    title: 'Engineering',
    plannedSkills: ['deployment-risk-review', 'ci-failure-analysis', 'infrastructure-change-review', 'runbook-writer'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
