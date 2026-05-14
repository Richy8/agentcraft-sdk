import type { StreamChunk } from '../../types/provider.types.js';
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
    kind?: 'placeholder' | 'mcp-backed' | 'native-sdk' | 'custom';
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

export function tool<T extends Record<string, ToolParam>>(config: {
  name: string;
  description: string;
  params: T;
  security?: ToolDefinition['security'];
  run: (args: { [K in keyof T]: InferParamType<T[K]> }) => Promise<unknown>;
}): ToolDefinition {
  const required = Object.entries(config.params)
    .filter(([, param]) => param.required !== false)
    .map(([key]) => key);

  const properties = Object.fromEntries(
    Object.entries(config.params).map(([key, param]) => [
      key,
      {
        type: param.type,
        description: param.description,
        ...(param.options && { enum: param.options }),
      },
    ])
  );

  return {
    name: config.name,
    description: config.description,
    parameters: { type: 'object', properties, required },
    ...(config.security !== undefined && { security: config.security }),
    execute: async (args: Record<string, unknown>) => {
      validateToolArgs(config.name, config.params, args);
      return config.run(args as { [K in keyof T]: InferParamType<T[K]> });
    },
  };
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

function validateToolArgs<T extends Record<string, ToolParam>>(
  toolName: string,
  params: T,
  args: Record<string, unknown>
): void {
  for (const [name, param] of Object.entries(params)) {
    const value = args[name];
    if (param.required !== false && value === undefined) {
      throw new Error(`Tool '${toolName}' missing required argument '${name}'`);
    }
    if (value === undefined) continue;

    const valid =
      (param.type === 'array' && Array.isArray(value)) ||
      (param.type === 'object' &&
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value)) ||
      (param.type !== 'array' && param.type !== 'object' && typeof value === param.type);

    if (!valid) {
      throw new Error(`Tool '${toolName}' argument '${name}' must be ${param.type}`);
    }

    if (param.options && !param.options.includes(String(value))) {
      throw new Error(
        `Tool '${toolName}' argument '${name}' must be one of: ${param.options.join(', ')}`
      );
    }
  }
}
