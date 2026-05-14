import { CohereClient, type Cohere } from 'cohere-ai';
import type { AgentCraftError } from '../errors/index.js';
import type { ProviderDefinition } from '../provider-registry/registry.js';
import type { CohereModelConfig, ModelConfig } from '../types/config.types.js';
import type { FinishReason, LLMCallParams, LLMResponse, StreamChunk, ToolCall } from '../types/provider.types.js';
import { mapCommonError } from './shared/map-error.js';
import type { ProviderProtocol, ToolDefinition, ToolResult } from './types.js';

type CohereResponse = {
  text?: string;
  finishReason?: string;
  meta?: { tokens?: { inputTokens?: number; outputTokens?: number } };
  toolCalls?: Array<{ name: string; parameters: unknown }>;
};

type CohereState = {
  chatHistory: Array<{ role: string; message: string }>;
  toolResults: Array<{ call: { name: string; parameters: unknown }; outputs: unknown[] }>;
};

type CohereV2State = {
  messages: Cohere.ChatMessageV2[];
};

type TaggedCohereRequest = { api: 'v2'; request: Cohere.V2ChatRequest };

function mapCohereFinishReason(reason: string | undefined): FinishReason {
  switch (reason) {
    case 'MAX_TOKENS':
      return 'length';
    case 'TOOL_CALL':
      return 'tool_calls';
    default:
      return 'stop';
  }
}

export class CohereProtocol implements ProviderProtocol {
  createClient(config: ModelConfig, _definition: ProviderDefinition): CohereClient {
    return new CohereClient({ token: (config as CohereModelConfig).apiKey });
  }

  formatRequest(params: LLMCallParams, config: ModelConfig): unknown {
    if (usesCohereV2(config.model)) {
      return { api: 'v2', request: this.formatV2Request(params, config) } satisfies TaggedCohereRequest;
    }

    const state = params._providerState as CohereState | undefined;
    return {
      model: config.model,
      message: params.prompt,
      preamble: params.systemMessage,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      p: params.topP,
      stopSequences: params.stopSequences,
      responseFormat: params.responseFormat?.type === 'json_object' ? { type: 'json_object' } : undefined,
      ...(state?.chatHistory && { chatHistory: state.chatHistory }),
      ...(state?.toolResults && { toolResults: state.toolResults }),
    };
  }

  private formatV2Request(params: LLMCallParams, config: ModelConfig): Cohere.V2ChatRequest {
    const state = params._providerState as CohereV2State | undefined;
    const messages: Cohere.ChatMessageV2[] = [
      ...(params.systemMessage ? [{ role: 'system' as const, content: params.systemMessage }] : []),
      ...(state?.messages ?? []),
      { role: 'user' as const, content: params.prompt },
    ];
    const request: Cohere.V2ChatRequest = {
      model: config.model,
      messages,
    };

    if (params.temperature !== undefined) request.temperature = params.temperature;
    if (params.maxTokens !== undefined) request.maxTokens = params.maxTokens;
    if (params.topP !== undefined) request.p = params.topP;
    if (params.frequencyPenalty !== undefined) request.frequencyPenalty = params.frequencyPenalty;
    if (params.presencePenalty !== undefined) request.presencePenalty = params.presencePenalty;
    if (params.stopSequences !== undefined) request.stopSequences = params.stopSequences;
    if (params.responseFormat?.type === 'json_object') request.responseFormat = { type: 'json_object' };
    if (usesCohereV2Reasoning(config.model)) request.thinking = { type: 'disabled' };

    return request;
  }

  formatRequestWithTools(params: LLMCallParams, config: ModelConfig, nativeTools: unknown): unknown {
    if (usesCohereV2(config.model)) {
      return {
        api: 'v2',
        request: {
          ...this.formatV2Request(params, config),
          tools: toCohereV2Tools(nativeTools as CohereV1Tool[]),
        },
      } satisfies TaggedCohereRequest;
    }

    return {
      ...(this.formatRequest(params, config) as object),
      tools: nativeTools,
    };
  }

  async callRaw(client: unknown, nativeRequest: unknown): Promise<unknown> {
    if (isTaggedCohereRequest(nativeRequest)) {
      return (client as CohereClient).v2.chat(nativeRequest.request);
    }

    return (client as CohereClient).chat(nativeRequest as never);
  }

  extractResponse(raw: unknown): LLMResponse {
    if (isCohereV2Response(raw)) return this.extractV2Response(raw);

    const response = raw as CohereResponse;
    const prompt = response.meta?.tokens?.inputTokens ?? 0;
    const completion = response.meta?.tokens?.outputTokens ?? 0;

    return {
      success: true,
      content: response.text ?? '',
      tokensUsed: {
        prompt,
        completion,
        total: prompt + completion,
      },
      finishReason: mapCohereFinishReason(response.finishReason),
      toolCalls: this.extractToolCalls(raw),
      _raw: raw,
    };
  }

  private extractV2Response(response: Cohere.V2ChatResponse): LLMResponse {
    const prompt = response.usage?.tokens?.inputTokens ?? 0;
    const completion = response.usage?.tokens?.outputTokens ?? 0;

    return {
      success: response.finishReason !== 'ERROR',
      content: getV2Text(response.message),
      tokensUsed: {
        prompt,
        completion,
        total: prompt + completion,
      },
      finishReason: mapCohereFinishReason(response.finishReason),
      toolCalls: this.extractToolCalls(response),
      _raw: response,
    };
  }

  formatTools(tools: ToolDefinition[]): unknown {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameterDefinitions: Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([name, value]) => [
          name,
          {
            description: value.description,
            type: value.type,
            required: tool.parameters.required.includes(name),
          },
        ])
      ),
    }));
  }

  extractToolCalls(raw: unknown): ToolCall[] {
    if (isCohereV2Response(raw)) {
      return (raw.message.toolCalls ?? []).map((toolCall: Cohere.ToolCallV2) => ({
        id: toolCall.id,
        name: toolCall.function?.name ?? '',
        arguments: toolCall.function?.arguments ?? '{}',
      }));
    }

    const response = raw as CohereResponse;
    return (response.toolCalls ?? []).map((toolCall, index) => ({
      id: `cohere-${Date.now()}-${index}`,
      name: toolCall.name,
      arguments: JSON.stringify(toolCall.parameters),
    }));
  }

  formatFollowUp(original: LLMCallParams, raw: unknown, results: ToolResult[]): LLMCallParams {
    if (isCohereV2Response(raw)) {
      const state = (original._providerState ?? { messages: [] }) as CohereV2State;
      const toolMessages: Cohere.ChatMessageV2[] = results.map((result) => ({
        role: 'tool',
        toolCallId: result.toolCallId,
        content: result.result,
      }));

      return {
        ...original,
        _providerState: {
          messages: [...state.messages, raw.message as Cohere.ChatMessageV2, ...toolMessages],
        } satisfies CohereV2State,
      };
    }

    const response = raw as CohereResponse;
    const state = (original._providerState ?? { chatHistory: [], toolResults: [] }) as CohereState;
    const assistantEntry = { role: 'CHATBOT', message: response.text ?? '' };

    const toolResults = results.map((result) => ({
      call: { name: result.toolName, parameters: JSON.parse(result.arguments) as unknown },
      outputs: [JSON.parse(result.result) as unknown],
    }));

    return {
      ...original,
      _providerState: {
        chatHistory: [...state.chatHistory, assistantEntry],
        toolResults,
      } satisfies CohereState,
    };
  }

  async *stream(client: unknown, nativeRequest: unknown): AsyncGenerator<StreamChunk> {
    if (isTaggedCohereRequest(nativeRequest)) {
      const stream = await (client as CohereClient).v2.chatStream(nativeRequest.request as Cohere.V2ChatStreamRequest);

      for await (const event of stream as unknown as AsyncIterable<Record<string, unknown>>) {
        if (event.type === 'content-delta') {
          const text = (((event.delta as Record<string, unknown> | undefined)?.message as Record<string, unknown> | undefined)?.content as Record<string, unknown> | undefined)?.text;
          if (typeof text === 'string') yield { delta: text };
        }
        if (event.type === 'tool-call-start') {
          const toolCall = (((event.delta as Record<string, unknown> | undefined)?.message as Record<string, unknown> | undefined)?.toolCalls as Cohere.ToolCallV2 | undefined);
          if (toolCall) {
            yield {
              delta: '',
              toolCall: {
                id: toolCall.id,
                name: toolCall.function?.name ?? '',
                arguments: toolCall.function?.arguments ?? '',
              },
            };
          }
        }
        if (event.type === 'tool-call-delta') {
          const toolCall = (((event.delta as Record<string, unknown> | undefined)?.message as Record<string, unknown> | undefined)?.toolCalls as { function?: { arguments?: string } } | undefined);
          if (toolCall?.function?.arguments) {
            yield {
              delta: '',
              toolCall: {
                id: `cohere-v2-tool-${event.index ?? 0}`,
                name: '',
                arguments: toolCall.function.arguments,
              },
            };
          }
        }
        if (event.type === 'message-end') {
          const delta = event.delta as { finishReason?: string; usage?: { tokens?: { inputTokens?: number; outputTokens?: number } } } | undefined;
          yield { delta: '', finishReason: mapCohereFinishReason(delta?.finishReason) };
          if (delta?.usage?.tokens) {
            const prompt = delta.usage.tokens.inputTokens ?? 0;
            const completion = delta.usage.tokens.outputTokens ?? 0;
            yield { delta: '', usage: { prompt, completion, total: prompt + completion } };
          }
        }
      }
      return;
    }

    const stream = await (client as CohereClient).chatStream(nativeRequest as never);

    for await (const event of stream as unknown as AsyncIterable<Record<string, unknown>>) {
      if (event.eventType === 'text-generation' && typeof event.text === 'string') {
        yield { delta: event.text };
      }
      if (event.eventType === 'stream-end') {
        const response = event.response as CohereResponse | undefined;
        yield { delta: '', finishReason: mapCohereFinishReason(response?.finishReason) };
        if (response?.meta?.tokens) {
          const prompt = response.meta.tokens.inputTokens ?? 0;
          const completion = response.meta.tokens.outputTokens ?? 0;
          yield { delta: '', usage: { prompt, completion, total: prompt + completion } };
        }
      }
    }
  }

  mapError(err: unknown, config: ModelConfig): AgentCraftError {
    return mapCommonError(err, config);
  }
}

type CohereV1Tool = {
  name: string;
  description?: string;
  parameterDefinitions?: Record<string, { type?: string; description?: string; required?: boolean }>;
};

function usesCohereV2(model: string): boolean {
  return model.startsWith('command-a-');
}

function usesCohereV2Reasoning(model: string): boolean {
  return model.startsWith('command-a-reasoning-');
}

function isTaggedCohereRequest(value: unknown): value is TaggedCohereRequest {
  return typeof value === 'object' && value !== null && (value as { api?: unknown }).api === 'v2';
}

function isCohereV2Response(value: unknown): value is Cohere.V2ChatResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { finishReason?: unknown }).finishReason === 'string' &&
    typeof (value as { message?: unknown }).message === 'object'
  );
}

function getV2Text(message: Cohere.AssistantMessageResponse): string {
  return (message.content ?? [])
    .filter((item): item is Cohere.AssistantMessageResponseContentItem.Text => item.type === 'text')
    .map((item) => item.text)
    .join('');
}

function toCohereV2Tools(tools: CohereV1Tool[]): Cohere.ToolV2[] {
  return tools.map((tool) => {
    const properties = Object.fromEntries(
      Object.entries(tool.parameterDefinitions ?? {}).map(([name, value]) => [
        name,
        {
          type: value.type,
          description: value.description,
        },
      ])
    );
    const required = Object.entries(tool.parameterDefinitions ?? {})
      .filter(([, value]) => value.required)
      .map(([name]) => name);

    const fn: Cohere.ToolV2Function = {
      name: tool.name,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    };
    if (tool.description !== undefined) fn.description = tool.description;

    return {
      type: 'function',
      function: fn,
    };
  });
}
