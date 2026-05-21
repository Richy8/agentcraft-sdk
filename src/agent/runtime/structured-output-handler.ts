import type { ToolDefinition } from '../../protocols/types.js';
import type { BaseLLMProvider } from '../../providers/base.provider.js';
import type { LLMCallParams, LLMResponse } from '../../types/provider.types.js';
import type { AgentRunParams } from '../types.js';
import type { RunTracer } from '../observability.js';
import {
  parseAndValidateStructuredOutput,
  type JsonSchema,
} from '../structured-output.js';

export interface StructuredOutputToolState {
  tool: ToolDefinition;
  value?: unknown;
}

export const STRUCTURED_TOOL_FALLBACK_INSTRUCTION = [
  'Use the submit_structured_response tool to provide the final structured response.',
  'Do not treat the tool result as user-visible content; it is the schema delivery channel.',
].join('\n');

export async function callModelWithStructuredOutput(input: {
  readonly provider: BaseLLMProvider;
  readonly llmParams: LLMCallParams;
  readonly tools: readonly ToolDefinition[];
  readonly params: AgentRunParams;
  readonly structuredTool?: StructuredOutputToolState;
  readonly tracer?: RunTracer;
  readonly parentSpanId?: string;
}): Promise<{ raw: LLMResponse; structuredResponse?: unknown }> {
  const attempts = Math.max(1, (input.params.structuredOutput?.retries ?? 0) + 1);
  let currentParams = input.llmParams;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const raw =
      input.tools.length > 0
        ? await input.provider.callWithTools(currentParams, [...input.tools])
        : await input.provider.call(currentParams);
    if (!input.params.responseSchema) return { raw };
    try {
      const parsed = parseAndValidateStructuredOutput(raw.content, input.params.responseSchema);
      return { raw, structuredResponse: parsed.value };
    } catch (error) {
      if (input.structuredTool?.value !== undefined) {
        return { raw, structuredResponse: input.structuredTool.value };
      }
      lastError = error;
      if (input.tracer && input.parentSpanId && attempt < attempts) {
        const retrySpan = input.tracer.start(
          'retry',
          'structured-output.retry',
          { attempt, reason: error instanceof Error ? error.message : String(error) },
          input.parentSpanId
        );
        input.tracer.end(retrySpan);
      }
      currentParams = {
        ...currentParams,
        systemMessage: [
          currentParams.systemMessage,
          `Previous response failed structured-output validation: ${
            error instanceof Error ? error.message : String(error)
          }. Return corrected JSON only.`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      };
    }
  }
  throw lastError;
}

export function createStructuredOutputTool(
  params: AgentRunParams
): StructuredOutputToolState | undefined {
  if (!params.responseSchema) return undefined;
  const state: StructuredOutputToolState = {
    tool: {
      name: 'submit_structured_response',
      description: 'Submit the final answer as structured data matching the requested response schema.',
      parameters: toStructuredToolParameters(params.responseSchema),
      security: { sideEffect: 'none' },
      execute: async (args) => {
        const payload =
          isPlainJsonSchema(params.responseSchema!) && params.responseSchema.type !== 'object'
            ? args.value
            : args;
        const parsed = parseAndValidateStructuredOutput(
          JSON.stringify(payload),
          params.responseSchema!
        );
        state.value = parsed.value;
        return { accepted: true };
      },
    },
  };
  return state;
}

function toStructuredToolParameters(
  schema: AgentRunParams['responseSchema']
): ToolDefinition['parameters'] {
  if (schema && isPlainJsonSchema(schema) && (schema.type === 'object' || schema.properties)) {
    return {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([key, child]) => [
          key,
          {
            type: toToolParamType(child.type),
            description: `Structured response field '${key}'`,
            ...(child.enum !== undefined && { enum: child.enum.map(String) }),
          },
        ])
      ),
      required: schema.required ?? [],
    };
  }
  return {
    type: 'object',
    properties: {
      value: { type: 'object', description: 'Structured response value' },
    },
    required: ['value'],
  };
}

function isPlainJsonSchema(
  schema: NonNullable<AgentRunParams['responseSchema']>
): schema is JsonSchema {
  return typeof (schema as { safeParse?: unknown }).safeParse !== 'function';
}

function toToolParamType(type: JsonSchema['type'] | undefined): string {
  if (
    type === 'array' ||
    type === 'object' ||
    type === 'number' ||
    type === 'boolean' ||
    type === 'string'
  ) {
    return type;
  }
  return 'string';
}
