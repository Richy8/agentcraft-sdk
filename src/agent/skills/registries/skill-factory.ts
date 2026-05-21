import type { AgentAdapter } from '../../adapters/types.js';
import type { AgentSkill, SkillMetadata } from '../types.js';
import { defineSkill } from '../types.js';
import { DEFAULT_SKILL_SPEC_PROMPT_VERSION } from './skill-spec.js';
import type { SkillSpec } from './skill-spec.js';
import { validateSkillSpec } from './skill-validation.js';

export function createSkillFromSpec(spec: SkillSpec): AgentSkill {
  validateSkillSpec(spec);
  const requires = spec.requires ?? spec.requiredCapabilities ?? ['tools'];
  return defineSkill({
    name: spec.name,
    description: spec.description,
    ...(spec.directive !== undefined && { directive: spec.directive }),
    requires,
    ...(spec.dependsOn !== undefined && { dependsOn: spec.dependsOn }),
    ...(spec.consumesArtifacts !== undefined && { consumesArtifacts: [...spec.consumesArtifacts] }),
    ...(spec.producesArtifacts !== undefined && { producesArtifacts: [...spec.producesArtifacts] }),
    metadata: skillSpecMetadata(spec, requires),
    ...(spec.prompt !== undefined && { prompt: spec.prompt }),
    ...(spec.examples !== undefined && { examples: spec.examples }),
    ...(spec.systemPromptExtension !== undefined && { systemPromptExtension: spec.systemPromptExtension }),
    ...(spec.tools !== undefined && { tools: [...spec.tools] }),
    ...(spec.init !== undefined && { init: spec.init }),
    ...(spec.cleanup !== undefined && { cleanup: spec.cleanup }),
    ...(spec.onBeforeRun !== undefined && { onBeforeRun: spec.onBeforeRun }),
    ...(spec.onAfterRun !== undefined && { onAfterRun: spec.onAfterRun }),
    ...(spec.onAfterStream !== undefined && { onAfterStream: spec.onAfterStream }),
  });
}

export function skillSpecMetadata(
  spec: SkillSpec,
  requires: AgentAdapter['requires'] = spec.requires ?? spec.requiredCapabilities ?? ['tools'],
): SkillMetadata {
  return {
    requiredCapabilities: requires,
    requiredAdapters: [...(spec.requiredAdapters ?? [])],
    optionalAdapters: [...(spec.optionalAdapters ?? [])],
    stateful: spec.stateful ?? false,
    sideEffectRisk: spec.sideEffectRisk ?? 'read',
    ...(spec.sideEffectIntents !== undefined && { sideEffectIntents: [...spec.sideEffectIntents] }),
    promptVersion: spec.promptVersion ?? DEFAULT_SKILL_SPEC_PROMPT_VERSION,
    ...(spec.domain !== undefined && { domain: spec.domain }),
    ...(spec.category !== undefined && { category: spec.category }),
    ...(spec.stage !== undefined && { stage: spec.stage }),
    ...(spec.priority !== undefined && { priority: spec.priority }),
    ...(spec.consumesArtifacts !== undefined && { consumesArtifacts: [...spec.consumesArtifacts] }),
    ...(spec.producesArtifacts !== undefined && { producesArtifacts: [...spec.producesArtifacts] }),
    ...(spec.domainIntelligence !== undefined && { domainIntelligence: spec.domainIntelligence }),
  };
}
