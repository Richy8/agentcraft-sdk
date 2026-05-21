import { describe, expect, it } from 'vitest';
import { scoreSkillSpecQuality } from '../certification/scoring.js';
import {
  PERSONAL_PRODUCTIVITY_CALENDAR_SKILL_SPECS,
  PERSONAL_PRODUCTIVITY_COMMUNICATION_SKILL_SPECS,
  PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_SPECS,
  PERSONAL_PRODUCTIVITY_LIFE_ADMIN_SKILL_SPECS,
  PERSONAL_PRODUCTIVITY_TASKS_SKILL_SPECS,
} from '../domains/personal-productivity/index.js';
import { createSkillByName, listSkillSpecs } from '../registries/skill-registry.js';

const expectedPersonalProductivitySkillNames = [
  'task-prioritization',
  'weekly-plan-writer',
  'personal-backlog-triage',
  'habit-review',
  'calendar-audit',
  'time-blocking-plan',
  'meeting-prep-brief',
  'schedule-conflict-resolution',
  'life-admin-checklist',
  'personal-document-summary',
  'home-project-plan',
  'travel-prep-checklist',
  'personal-email-draft',
  'difficult-conversation-planner',
  'followup-message-writer',
  'decision-journal-entry',
] as const;

describe('personal productivity domain skills', () => {
  it('exports one concrete skill spec for every planned personal productivity skill', () => {
    expect(PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_SPECS.map((spec) => spec.name).sort()).toEqual(
      [...expectedPersonalProductivitySkillNames].sort(),
    );
    expect(PERSONAL_PRODUCTIVITY_TASKS_SKILL_SPECS).toHaveLength(4);
    expect(PERSONAL_PRODUCTIVITY_CALENDAR_SKILL_SPECS).toHaveLength(4);
    expect(PERSONAL_PRODUCTIVITY_LIFE_ADMIN_SKILL_SPECS).toHaveLength(4);
    expect(PERSONAL_PRODUCTIVITY_COMMUNICATION_SKILL_SPECS).toHaveLength(4);
  });

  it('registers personal productivity specs with domain intelligence and production prompt sections', () => {
    const registered = listSkillSpecs({ domain: 'personal-productivity' }).filter((spec) =>
      expectedPersonalProductivitySkillNames.includes(
        spec.name as (typeof expectedPersonalProductivitySkillNames)[number],
      ),
    );

    expect(registered).toHaveLength(expectedPersonalProductivitySkillNames.length);
    for (const spec of PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_SPECS) {
      expect(spec.domain).toBe('personal-productivity');
      expect(spec.domainIntelligence?.vocabulary?.length).toBeGreaterThanOrEqual(8);
      expect(spec.domainIntelligence?.metricsAndSignals?.length).toBeGreaterThanOrEqual(5);
      expect([
        ...(spec.domainIntelligence?.antiStuffingNotes ?? []),
        ...(spec.prompt?.qualityChecklist ?? []),
      ].join(' ')).toMatch(/stuff|jargon|vocabulary/i);
      expect(spec.prompt?.toolUsePolicy.join(' ')).toMatch(/approval|untrusted/i);
      expect(spec.prompt?.safetyNotes.join(' ')).toContain('Failure mode to avoid');
      expect(spec.examples?.[0]?.output.split(/\s+/).length).toBeGreaterThan(25);
    }
  });

  it('keeps every personal productivity skill above the 9.5 production quality threshold', () => {
    for (const spec of PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_SPECS) {
      const score = scoreSkillSpecQuality(spec);

      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(', ')}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });

  it('creates direct skills through the registry without requiring a pack', () => {
    const skill = createSkillByName('weekly-plan-writer');
    const prompt =
      typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : skill.systemPromptExtension;

    expect(skill.name).toBe('weekly-plan-writer');
    expect(skill.skillMetadata?.promptVersion).toBe('2026-05-18');
    expect(prompt).toContain('Tool Use Policy');
    expect(prompt).toContain('Output Format');
    expect(prompt).toMatch(/recovery|capacity|Do not invent/i);
  });
});
