import type { StreamChunk } from '../../../types/provider.types.js';
import type { AgentAdapter, ToolDefinition } from '../../adapters/types.js';
import type { CreatorSkillManifest } from '../../creator/types.js';
import type { AgentResponse, AgentRunParams } from '../../types.js';
import type { SkillDomainIntelligence, SkillSideEffectIntent } from '../registries/skill-spec.js';
import { buildSkillPrompt } from './prompt-template.js';
import type { SkillPromptExample, SkillPromptTemplate } from './prompt-template.js';

export type AdapterRef =
  | (new (...args: never[]) => AgentAdapter)
  | AgentAdapter
  | { readonly adapterName?: string; readonly skillName?: string; connect?: (...args: never[]) => AgentAdapter };

export interface AgentSkill extends AgentAdapter {
  readonly type: 'skill';
  readonly description: string;
  readonly directive?: string;
  readonly consumesArtifacts?: readonly string[];
  readonly producesArtifacts?: readonly string[];
  readonly dependsOn?: (AdapterRef | AdapterRef[])[];
  readonly skillMetadata?: SkillMetadata;
  readonly promptTemplate?: SkillPromptTemplate;
  readonly promptExamples?: readonly SkillPromptExample[];
  systemPromptExtension?: string | (() => string);
}

export interface SkillMetadata {
  requiredCapabilities: AgentAdapter['requires'];
  requiredAdapters: string[];
  optionalAdapters: string[];
  stateful: boolean;
  sideEffectRisk: 'none' | 'read' | 'write' | 'external';
  sideEffectIntents?: readonly SkillSideEffectIntent[];
  promptVersion: string;
  domain?: string;
  category?: string;
  stage?: string;
  priority?: number;
  consumesArtifacts?: readonly string[];
  producesArtifacts?: readonly string[];
  domainIntelligence?: SkillDomainIntelligence;
  creator?: CreatorSkillManifest;
}

export interface DefineSkillConfig {
  name: string;
  description: string;
  directive?: string;
  examples?: readonly SkillPromptExample[];
  consumesArtifacts?: readonly string[];
  producesArtifacts?: readonly string[];
  requires?: AgentAdapter['requires'];
  dependsOn?: AgentSkill['dependsOn'];
  metadata?: SkillMetadata;
  prompt?: SkillPromptTemplate;
  systemPromptExtension?: string | (() => string);
  tools?: ToolDefinition[];
  init?: () => Promise<void>;
  cleanup?: () => Promise<void>;
  onBeforeRun?: (params: AgentRunParams) => AgentRunParams | Promise<AgentRunParams>;
  onAfterRun?: (response: AgentResponse) => AgentResponse | Promise<AgentResponse>;
  onAfterStream?: (chunks: StreamChunk[], response: AgentResponse) => AgentResponse | Promise<AgentResponse>;
}

export function defineSkill(config: DefineSkillConfig): AgentSkill {
  const systemPromptExtension =
    config.systemPromptExtension ?? (config.prompt ? buildSkillPrompt(config.name, config.prompt, config.examples) : undefined);
  return {
    type: 'skill',
    name: config.name,
    description: config.description,
    requires: config.requires ?? ['tools'],
    ...(config.directive !== undefined && { directive: config.directive }),
    ...(config.consumesArtifacts !== undefined && { consumesArtifacts: config.consumesArtifacts }),
    ...(config.producesArtifacts !== undefined && { producesArtifacts: config.producesArtifacts }),
    ...(config.dependsOn !== undefined && { dependsOn: config.dependsOn }),
    ...(config.metadata !== undefined && { skillMetadata: config.metadata }),
    ...(config.prompt !== undefined && { promptTemplate: config.prompt }),
    ...(config.examples !== undefined && { promptExamples: config.examples }),
    ...(systemPromptExtension !== undefined && { systemPromptExtension }),
    ...(config.tools !== undefined && {
      declaredToolNames: config.tools.map((item) => item.name),
      getTools: () => config.tools!,
    }),
    ...(config.init !== undefined && { init: config.init }),
    ...(config.cleanup !== undefined && { cleanup: config.cleanup }),
    ...(config.onBeforeRun !== undefined && { onBeforeRun: config.onBeforeRun }),
    ...(config.onAfterRun !== undefined && { onAfterRun: config.onAfterRun }),
    ...(config.onAfterStream !== undefined && { onAfterStream: config.onAfterStream }),
  };
}
