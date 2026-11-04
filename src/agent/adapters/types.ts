import type { StreamChunk } from '../../types/provider.types.js';
import { validateToolArguments } from '../../tools/validation.js';
import type { AgentResponse, AgentRunParams } from '../types.js';
export type {
  ToolPolicy,
  ToolGuardrail,
  ToolGuardrailContext,
  ToolGuardrailResult,
  ToolAuditEvent,
} from './tool-policy.js';

export interface ToolParam {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
  options?: string[];
  default?: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required: string[];
  };
  security?: {
    sideEffect: 'none' | 'read' | 'write' | 'external';
    requiresConfirmation?: boolean;
    scopes?: string[];
    cache?: {
      /**
       * Marks the tool result safe to cache under conservative strategy.
       * Use only for deterministic, non-sensitive read results.
       */
      safe?: boolean;
      /** Result is deterministic for stable arguments. */
      deterministic?: boolean;
      /** Result may contain private/user-specific data and should not be cached by default. */
      sensitive?: boolean;
      /** Optional per-result TTL override in milliseconds. */
      ttlMs?: number;
    };
  };
  execute(args: Record<string, unknown>): Promise<unknown>;
}

export type InferParamType<T extends ToolParam> = T['type'] extends 'string'
  ? string
  : T['type'] extends 'number'
    ? number
    : T['type'] extends 'boolean'
      ? boolean
      : T['type'] extends 'array'
        ? unknown[]
        : Record<string, unknown>;

export interface AgentAdapter {
  readonly name: string;
  readonly requires: Array<'tools' | 'vision' | 'audio' | 'video' | 'files'>;
  readonly declaredToolNames?: string[];
  readonly dependsOn?: readonly unknown[];
  readonly metadata?: {
    kind?: 'placeholder' | 'mcp-backed' | 'native-sdk' | 'custom' | 'native-provider' | 'skill';
    nativeToolType?: 'web_search' | 'file_search';
    nativeToolConfig?: Record<string, unknown>;
    auth?: 'none' | 'api-key' | 'oauth' | 'aws' | 'connection-string' | 'custom';
    trustLevel?: 'trusted' | 'review-required' | 'untrusted';
    sideEffects?: Array<'none' | 'read' | 'write' | 'external'>;
    scopes?: string[];
    requiredSecrets?: string[];
    readOnly?: boolean;
  };

  init?(): Promise<void>;
  cleanup?(): Promise<void>;
  getTools?(): ToolDefinition[] | Promise<ToolDefinition[]>;
  onBeforeRun?(params: AgentRunParams): AgentRunParams | Promise<AgentRunParams>;
  onAfterRun?(response: AgentResponse): AgentResponse | Promise<AgentResponse>;
  onAfterStream?(
    chunks: StreamChunk[],
    response: AgentResponse
  ): AgentResponse | Promise<AgentResponse>;
}

export interface ToolSpec<P extends Record<string, ToolParam> = Record<string, ToolParam>> {
  description: string;
  params: P;
  sideEffect?: 'none' | 'read' | 'write' | 'external';
  requiresConfirmation?: boolean;
  scopes?: string[];
  cache?: NonNullable<ToolDefinition['security']>['cache'];
  run: (args: { [K in keyof P]: InferParamType<P[K]> }) => Promise<unknown>;
}

export function tool<T extends Record<string, ToolParam>>(name: string, spec: ToolSpec<T>): ToolDefinition {
  const required = Object.entries(spec.params)
    .filter(([, param]) => param.required !== false)
    .map(([key]) => key);

  const properties = Object.fromEntries(
    Object.entries(spec.params).map(([key, param]) => [
      key,
      {
        type: param.type,
        description: param.description,
        ...(param.options && { enum: param.options }),
      },
    ])
  );

  const security: ToolDefinition['security'] | undefined =
    spec.sideEffect !== undefined || spec.requiresConfirmation !== undefined || spec.scopes !== undefined || spec.cache !== undefined
      ? {
          sideEffect: spec.sideEffect ?? 'none',
          ...(spec.requiresConfirmation !== undefined && { requiresConfirmation: spec.requiresConfirmation }),
          ...(spec.scopes !== undefined && { scopes: spec.scopes }),
          ...(spec.cache !== undefined && { cache: spec.cache }),
        }
      : undefined;

  const definition: ToolDefinition = {
    name,
    description: spec.description,
    parameters: { type: 'object', properties, required },
    ...(security !== undefined && { security }),
    execute: async (args: Record<string, unknown>) => {
      validateToolArguments(definition, args);
      return spec.run(args as { [K in keyof T]: InferParamType<T[K]> });
    },
  };
  return definition;
}

export type AdapterTrustLevel = 'trusted' | 'review-required' | 'untrusted';
export type AdapterSideEffect = 'none' | 'read' | 'write' | 'external';

export interface DefineAdapterOptions {
  auth?: 'none' | 'custom';
  trustLevel?: AdapterTrustLevel;
  scopes?: string[];
}

export function defineAdapter(
  name: string,
  tools: Record<string, ToolSpec>,
  options?: DefineAdapterOptions
): AgentAdapter {
  const toolDefs = Object.entries(tools).map(([toolName, spec]) => tool(toolName, spec));
  const sideEffects = [...new Set(toolDefs.map((t) => t.security?.sideEffect ?? 'none'))] as AdapterSideEffect[];
  return createAdapter({
    name,
    tools: toolDefs,
    metadata: {
      kind: 'custom',
      auth: options?.auth ?? 'none',
      trustLevel: options?.trustLevel ?? 'trusted',
      sideEffects,
      scopes: options?.scopes ?? [],
    },
  });
}

export function createAdapter(config: {
  name: string;
  requires?: AgentAdapter['requires'];
  tools?: ToolDefinition[];
  getTools?: () => ToolDefinition[] | Promise<ToolDefinition[]>;
  dependsOn?: readonly unknown[];
  metadata?: AgentAdapter['metadata'];
  init?: () => Promise<void>;
  cleanup?: () => Promise<void>;
  onBeforeRun?: (params: AgentRunParams) => AgentRunParams | Promise<AgentRunParams>;
  onAfterRun?: (response: AgentResponse) => AgentResponse | Promise<AgentResponse>;
  onAfterStream?: (
    chunks: StreamChunk[],
    response: AgentResponse
  ) => AgentResponse | Promise<AgentResponse>;
}): AgentAdapter {
  return {
    name: config.name,
    requires: config.requires ?? ['tools'],
    ...(config.metadata !== undefined && { metadata: config.metadata }),
    ...(config.dependsOn !== undefined && { dependsOn: config.dependsOn }),
    ...(config.tools !== undefined && {
      declaredToolNames: config.tools.map((item) => item.name),
      getTools: () => config.tools!,
    }),
    ...(config.tools === undefined &&
      config.getTools !== undefined && { getTools: config.getTools }),
    ...(config.init !== undefined && { init: config.init }),
    ...(config.cleanup !== undefined && { cleanup: config.cleanup }),
    ...(config.onBeforeRun !== undefined && { onBeforeRun: config.onBeforeRun }),
    ...(config.onAfterRun !== undefined && { onAfterRun: config.onAfterRun }),
    ...(config.onAfterStream !== undefined && { onAfterStream: config.onAfterStream }),
  };
}
