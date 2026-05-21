import type { AgentAdapter, ToolDefinition } from '../../adapters/types.js';
import type { AgentResponse, AgentRunParams } from '../../types.js';
import type { StreamChunk } from '../../../types/provider.types.js';
import type { AdapterRef, SkillMetadata, SkillPromptTemplate } from '../types.js';

export const DEFAULT_SKILL_SPEC_PROMPT_VERSION = '2026-05-18';

export interface SkillSpecExample {
  readonly label: string;
  readonly input: string;
  readonly output: string;
  readonly note?: string;
}

export interface SkillDomainIntelligence {
  readonly vocabulary?: readonly string[];
  readonly artifacts?: {
    readonly consumes?: readonly string[];
    readonly produces?: readonly string[];
  };
  readonly metricsAndSignals?: readonly string[];
  readonly toolsAndDataSources?: readonly string[];
  readonly riskBoundaries?: readonly string[];
  readonly minimumInput?: readonly string[];
  readonly freshnessRules?: readonly string[];
  readonly humanReviewTriggers?: readonly string[];
  readonly antiStuffingNotes?: readonly string[];
}

export type SkillSideEffectIntent =
  | 'read-only'
  | 'writes-artifact'
  | 'writes-store'
  | 'external-write'
  | 'publishes'
  | 'approval-required';

export interface SkillSpec {
  readonly name: string;
  readonly displayName?: string;
  readonly description: string;
  readonly directive?: string;
  readonly version?: string;
  readonly examples?: readonly SkillSpecExample[];
  readonly domain?: string;
  readonly category?: string;
  readonly stage?: string;
  readonly priority?: number;
  readonly requires?: AgentAdapter['requires'];
  readonly requiredCapabilities?: AgentAdapter['requires'];
  readonly dependsOn?: (AdapterRef | AdapterRef[])[];
  readonly requiredAdapters?: readonly string[];
  readonly optionalAdapters?: readonly string[];
  readonly stateful?: boolean;
  readonly sideEffectRisk?: SkillMetadata['sideEffectRisk'];
  readonly sideEffectIntents?: readonly SkillSideEffectIntent[];
  readonly promptVersion?: string;
  readonly consumesArtifacts?: readonly string[];
  readonly producesArtifacts?: readonly string[];
  readonly domainIntelligence?: SkillDomainIntelligence;
  readonly prompt?: SkillPromptTemplate;
  readonly systemPromptExtension?: string | (() => string);
  readonly tools?: readonly ToolDefinition[];
  readonly init?: () => Promise<void>;
  readonly cleanup?: () => Promise<void>;
  readonly onBeforeRun?: (params: AgentRunParams) => AgentRunParams | Promise<AgentRunParams>;
  readonly onAfterRun?: (response: AgentResponse) => AgentResponse | Promise<AgentResponse>;
  readonly onAfterStream?: (chunks: StreamChunk[], response: AgentResponse) => AgentResponse | Promise<AgentResponse>;
}

export interface SkillSpecFilter {
  readonly domain?: string;
  readonly category?: string;
  readonly stage?: string;
}
