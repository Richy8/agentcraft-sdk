import type { DomainSkillCategoryPlan } from '../types.js';

export const PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'personal-productivity',
    category: 'tasks',
    title: 'Personal Productivity And Life Admin',
    plannedSkills: ['task-prioritization', 'weekly-plan-writer', 'personal-backlog-triage', 'habit-review'],
  },
  {
    domain: 'personal-productivity',
    category: 'calendar',
    title: 'Personal Productivity And Life Admin',
    plannedSkills: ['calendar-audit', 'time-blocking-plan', 'meeting-prep-brief', 'schedule-conflict-resolution'],
  },
  {
    domain: 'personal-productivity',
    category: 'life-admin',
    title: 'Personal Productivity And Life Admin',
    plannedSkills: ['life-admin-checklist', 'personal-document-summary', 'home-project-plan', 'travel-prep-checklist'],
  },
  {
    domain: 'personal-productivity',
    category: 'communication',
    title: 'Personal Productivity And Life Admin',
    plannedSkills: ['personal-email-draft', 'difficult-conversation-planner', 'followup-message-writer', 'decision-journal-entry'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
