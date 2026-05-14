import type { StreamChunk } from '../../types/provider.types.js';
import type { AgentAdapter, ToolDefinition } from '../adapters/types.js';
import type { CreatorSkillManifest } from '../creator/types.js';
import type { AgentResponse, AgentRunParams } from '../types.js';

export type AdapterRef =
  | (new (...args: never[]) => AgentAdapter)
  | AgentAdapter
  | { readonly adapterName?: string; readonly skillName?: string; connect?: (...args: never[]) => AgentAdapter };

export interface AgentSkill extends AgentAdapter {
  readonly type: 'skill';
  readonly description: string;
  readonly directive?: string;
  readonly dependsOn?: (AdapterRef | AdapterRef[])[];
  readonly skillMetadata?: SkillMetadata;
  systemPromptExtension?: string | (() => string);
}

export interface SkillPromptTemplate {
  role: string;
  goal: string;
  constraints: string[];
  toolUsePolicy: string[];
  outputFormat: string[];
  qualityChecklist: string[];
  failureBehavior: string[];
  safetyNotes: string[];
}

export interface SkillMetadata {
  requiredCapabilities: AgentAdapter['requires'];
  requiredAdapters: string[];
  optionalAdapters: string[];
  stateful: boolean;
  sideEffectRisk: 'none' | 'read' | 'write' | 'external';
  promptVersion: string;
  creator?: CreatorSkillManifest;
}

export interface DefineSkillConfig {
  name: string;
  description: string;
  directive?: string;
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
  const systemPromptExtension = config.systemPromptExtension ?? (config.prompt ? buildSkillPrompt(config.name, config.prompt) : undefined);
  return {
    type: 'skill',
    name: config.name,
    description: config.description,
    requires: config.requires ?? ['tools'],
    ...(config.directive !== undefined && { directive: config.directive }),
    ...(config.dependsOn !== undefined && { dependsOn: config.dependsOn }),
    ...(config.metadata !== undefined && { skillMetadata: config.metadata }),
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

export function buildSkillPrompt(name: string, prompt: SkillPromptTemplate): string {
  validateSkillPromptTemplate(name, prompt);
  return [
    `# Skill: ${name}`,
    '',
    '## Role',
    prompt.role,
    '',
    '## Goal',
    prompt.goal,
    '',
    '## Constraints',
    formatList(prompt.constraints),
    '',
    '## Tool Use Policy',
    formatList(prompt.toolUsePolicy),
    '',
    '## Output Format',
    formatList(prompt.outputFormat),
    '',
    '## Quality Checklist',
    formatList(prompt.qualityChecklist),
    '',
    '## Failure Behavior',
    formatList(prompt.failureBehavior),
    '',
    '## Safety Notes',
    formatList(prompt.safetyNotes),
  ].join('\n');
}

export function validateSkillPromptTemplate(name: string, prompt: SkillPromptTemplate): void {
  const sections: Array<[keyof SkillPromptTemplate, string]> = [
    ['role', 'Role'],
    ['goal', 'Goal'],
    ['constraints', 'Constraints'],
    ['toolUsePolicy', 'Tool Use Policy'],
    ['outputFormat', 'Output Format'],
    ['qualityChecklist', 'Quality Checklist'],
    ['failureBehavior', 'Failure Behavior'],
    ['safetyNotes', 'Safety Notes'],
  ];

  for (const [key, label] of sections) {
    const value = prompt[key];
    if (typeof value === 'string') {
      if (value.trim().length === 0) {
        throw new Error(`Skill '${name}' is missing required prompt section '${label}'`);
      }
      continue;
    }
    if (value.length === 0 || value.some((item) => item.trim().length === 0)) {
      throw new Error(`Skill '${name}' is missing required prompt section '${label}'`);
    }
  }
}

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}
