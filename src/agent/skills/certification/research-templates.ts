import type { PromptResearchTemplate } from './types.js';

export const PROMPT_RESEARCH_TEMPLATES: readonly PromptResearchTemplate[] = [
  {
    skillFamily: 'creator',
    requiredSources: ['platform docs', 'publishing workflow references', 'provider prompt guidance'],
    notes: ['Separate platform convention from formulaic mimicry.', 'Capture proof, voice, claim, and audience risks.'],
    outputArtifact: 'CreatorPromptResearchNote',
  },
  {
    skillFamily: 'business-finance',
    requiredSources: ['official filings or data sources', 'regulatory context', 'provider prompt guidance'],
    notes: ['Separate facts, assumptions, model inference, and advice boundaries.', 'Require human review for money decisions.'],
    outputArtifact: 'BusinessFinancePromptResearchNote',
  },
  {
    skillFamily: 'technical',
    requiredSources: ['official docs', 'source code', 'test output', 'security guidance'],
    notes: ['Prioritize failure path, blast radius, reproducibility, and testability.'],
    outputArtifact: 'TechnicalPromptResearchNote',
  },
] as const;

export const COMPETITOR_OSS_SKILL_REVIEW_NOTES = [
  'Review skill descriptions for clear activation boundaries, not just impressive names.',
  'Prefer concise instructions with domain-specific artifacts and failure modes over long generic prompts.',
  'Check whether examples teach structure or merely add context weight.',
] as const;

export const PROVIDER_PROMPT_BEST_PRACTICE_CHECKLIST = [
  'Use concrete task instructions and output contracts.',
  'State what evidence is sufficient and when to stop.',
  'Use positive instructions where possible and explicit prohibitions for known failure modes.',
  'Include self-checks for high-variance generation and review tasks.',
] as const;

export const PROMPT_FAILURE_MODE_CHECKLIST = [
  'Generic role line that can be swapped into another domain.',
  'Label-only output format without success criteria.',
  'Advice with no evidence path, metric, artifact, or decision impact.',
  'Tool policy that never explains when not to use tools.',
] as const;

export const DOMAIN_INTELLIGENCE_CHECKLIST = [
  'domain vocabulary',
  'domain artifacts',
  'metrics and signals',
  'tools and data sources',
  'risk boundaries',
  'minimum inputs',
  'freshness rules where relevant',
] as const;
