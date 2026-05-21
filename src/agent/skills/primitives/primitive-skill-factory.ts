import type { AgentAdapter } from '../../adapters/types.js';
import type { AgentSkill, AdapterRef } from '../types.js';
import { defineSkill } from '../types.js';
import type { SkillMetadata, SkillPromptExample, SkillPromptTemplate } from '../types.js';

export const PRIMITIVE_SKILL_PROMPT_VERSION = '2026-05-18';

export interface BuiltInSkillSpec {
  name: string;
  version?: string;
  description: string;
  directive: string;
  requires?: AgentAdapter['requires'];
  requiredAdapters?: string[];
  optionalAdapters?: string[];
  consumesArtifacts?: string[];
  producesArtifacts?: string[];
  examples?: SkillPromptExample[];
  stateful?: boolean;
  sideEffectRisk?: SkillMetadata['sideEffectRisk'];
  prompt: SkillPromptTemplate;
}

export function computePrimitiveSideEffectRisk(
  spec: Pick<BuiltInSkillSpec, 'requiredAdapters' | 'optionalAdapters' | 'sideEffectRisk'>,
): SkillMetadata['sideEffectRisk'] {
  if (spec.sideEffectRisk !== undefined) return spec.sideEffectRisk;
  const allAdapters = [...(spec.requiredAdapters ?? []), ...(spec.optionalAdapters ?? [])];
  const externalAdapters = new Set(['fetch', 'tavily', 'firecrawl', 'browser', 'email', 'calendar', 'github', 'sheets']);
  for (const adapter of allAdapters) {
    if (externalAdapters.has(adapter)) return 'external';
  }
  return 'read';
}

export function skillMetadata(spec: BuiltInSkillSpec): SkillMetadata {
  return {
    requiredCapabilities: spec.requires ?? ['tools'],
    requiredAdapters: spec.requiredAdapters ?? [],
    optionalAdapters: spec.optionalAdapters ?? [],
    stateful: spec.stateful ?? false,
    sideEffectRisk: computePrimitiveSideEffectRisk(spec),
    promptVersion: spec.version ?? PRIMITIVE_SKILL_PROMPT_VERSION,
  };
}

export function createBuiltInSkill(
  spec: BuiltInSkillSpec,
  options: {
    dependsOn?: (AdapterRef | AdapterRef[])[];
    overrides?: Partial<BuiltInSkillSpec>;
  } = {},
): AgentSkill {
  const effective = { ...spec, ...(options.overrides ?? {}) };
  return defineSkill({
    name: effective.name,
    description: effective.description,
    directive: effective.directive,
    ...(effective.requires !== undefined && { requires: effective.requires }),
    ...(options.dependsOn !== undefined && { dependsOn: options.dependsOn }),
    ...(effective.consumesArtifacts !== undefined && { consumesArtifacts: effective.consumesArtifacts }),
    ...(effective.producesArtifacts !== undefined && { producesArtifacts: effective.producesArtifacts }),
    metadata: skillMetadata(effective),
    prompt: effective.prompt,
    ...(effective.examples !== undefined && { examples: effective.examples }),
  });
}
