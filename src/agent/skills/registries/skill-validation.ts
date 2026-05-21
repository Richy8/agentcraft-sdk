import { validateSkillPromptTemplate } from '../types.js';
import type { SkillSpec } from './skill-spec.js';

export function defineSkillSpec(spec: SkillSpec): SkillSpec {
  validateSkillSpec(spec);
  return spec;
}

export function validateSkillSpec(spec: SkillSpec): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(spec.name)) {
    throw new Error(`Skill spec '${spec.name}' must use lowercase kebab-case`);
  }
  if (spec.description.trim().length === 0) {
    throw new Error(`Skill spec '${spec.name}' is missing a description`);
  }
  if (spec.prompt === undefined && spec.systemPromptExtension === undefined) {
    throw new Error(`Skill spec '${spec.name}' must provide a prompt or systemPromptExtension`);
  }
  if (spec.prompt !== undefined) validateSkillPromptTemplate(spec.name, spec.prompt);
  validateNonEmptyArray(spec.name, 'domainIntelligence.vocabulary', spec.domainIntelligence?.vocabulary);
  validateNonEmptyArray(spec.name, 'domainIntelligence.metricsAndSignals', spec.domainIntelligence?.metricsAndSignals);
  validateNonEmptyArray(spec.name, 'domainIntelligence.toolsAndDataSources', spec.domainIntelligence?.toolsAndDataSources);
  validateNonEmptyArray(spec.name, 'domainIntelligence.riskBoundaries', spec.domainIntelligence?.riskBoundaries);
  validateSideEffectIntentConsistency(spec);
}

function validateNonEmptyArray(name: string, label: string, values: readonly string[] | undefined): void {
  if (values?.some((value) => value.trim().length === 0)) {
    throw new Error(`Skill spec '${name}' has an empty ${label} entry`);
  }
}

function validateSideEffectIntentConsistency(spec: SkillSpec): void {
  const intents = spec.sideEffectIntents ?? [];
  if (intents.length === 0 || spec.sideEffectRisk === undefined) return;

  const hasExternalWriteIntent = intents.some(
    (intent) => intent === 'external-write' || intent === 'publishes' || intent === 'approval-required',
  );
  if (hasExternalWriteIntent && spec.sideEffectRisk !== 'external' && spec.sideEffectRisk !== 'write') {
    throw new Error(
      `Skill spec '${spec.name}' declares external side-effect intent but sideEffectRisk is '${spec.sideEffectRisk}'`,
    );
  }

  const hasWriteIntent = intents.some((intent) => intent === 'writes-artifact' || intent === 'writes-store');
  if (hasWriteIntent && spec.sideEffectRisk !== 'write' && spec.sideEffectRisk !== 'external') {
    throw new Error(
      `Skill spec '${spec.name}' declares write side-effect intent but sideEffectRisk is '${spec.sideEffectRisk}'`,
    );
  }
}
