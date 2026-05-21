import type { SkillQualityRubric } from './types.js';

export const SKILL_QUALITY_RUBRICS: readonly SkillQualityRubric[] = [
  {
    name: 'domain-intelligence',
    description: 'Skill uses real domain vocabulary, artifacts, metrics, risks, tools, and workflow knowledge.',
    requiredSignals: ['vocabulary', 'artifacts', 'metricsAndSignals', 'toolsAndDataSources', 'riskBoundaries'],
    maxScore: 30,
  },
  {
    name: 'anti-stuffing',
    description: 'Skill rejects keyword stuffing, decorative jargon, artificial platform terminology, and forced vocabulary.',
    requiredSignals: ['antiStuffingNotes', 'stuffing'],
    maxScore: 20,
  },
  {
    name: 'ai-slop',
    description: 'Skill rejects hollow openings, padded transitions, generic conclusions, vague expertise, and repetitive cadence.',
    requiredSignals: ['Failure mode to avoid', 'specific'],
    maxScore: 20,
  },
  {
    name: 'tool-discipline',
    description: 'Skill says when to use tools, when to stop, and when write-capable tools require approval.',
    requiredSignals: ['tool', 'Do not'],
    maxScore: 15,
  },
  {
    name: 'evidence-boundaries',
    description: 'Skill separates source-backed facts, assumptions, user context, and model inference.',
    requiredSignals: ['evidence', 'assumption', 'Do not invent'],
    maxScore: 15,
  },
] as const;
