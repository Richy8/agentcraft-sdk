import OpenAI, { AzureOpenAI } from 'openai';
import type {
  ChatCompletion,
  ChatCompletionCreateParams,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions.js';
import type {
  FunctionTool,
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseFunctionToolCall,
} from 'openai/resources/responses/responses.js';
import type { AgentCraftError } from '../errors/index.js';
import type { ProviderDefinition } from '../provider-registry/registry.js';
import type { AzureModelConfig, ModelConfig } from '../types/config.types.js';
import type { FinishReason, LLMCallParams, LLMResponse, StreamChunk, ToolCall } from '../types/provider.types.js';
import { mapCommonError } from './shared/map-error.js';
import type { ProviderProtocol, ToolDefinition, ToolResult } from './types.js';

type OAIState = { messages: ChatCompletionMessageParam[] };
type ResponsesState = { input: unknown[] };
type TaggedOpenAIRequest =
  | { api: 'chat'; request: ChatCompletionCreateParamsNonStreaming }
  | { api: 'responses'; request: ResponseCreateParamsNonStreaming };

function mapOpenAIFinishReason(reason: string | null | undefined): FinishReason {
  if (reason === 'length' || reason === 'tool_calls' || reason === 'content_filter') return reason;
  return 'stop';
}

export class OpenAICompatProtocol implements ProviderProtocol {
  createClient(config: ModelConfig, definition: ProviderDefinition): OpenAI {
    const baseURL = 'baseUrl' in config ? config.baseUrl ?? definition.defaultBaseUrl : definition.defaultBaseUrl;
    const apiKey = definition.noAuth ? 'no-key' : 'apiKey' in config ? config.apiKey : 'no-key';
    const headers = { ...definition.defaultHeaders };

    if (definition.useAzureClient) {
      const azCfg = config as AzureModelConfig;
      return new AzureOpenAI({
        endpoint: azCfg.endpoint,
        apiKey,
        deployment: azCfg.deployment,
        apiVersion: azCfg.apiVersion ?? '2024-08-01-preview',
        defaultHeaders: headers,
      });
    }

    return new OpenAI({ apiKey, baseURL, defaultHeaders: headers });
  }

  formatRequest(params: LLMCallParams, config: ModelConfig): ChatCompletionCreateParamsNonStreaming | TaggedOpenAIRequest {
    if (usesResponsesApi(config)) {
      return { api: 'responses', request: this.formatResponsesRequest(params, config) };
    }

    return this.formatChatRequest(params, config);
  }

  private formatChatRequest(params: LLMCallParams, config: ModelConfig): ChatCompletionCreateParamsNonStreaming {
    const state = params._providerState as OAIState | undefined;
    const messages: ChatCompletionMessageParam[] = [
      ...(params.systemMessage ? [{ role: 'system' as const, content: params.systemMessage }] : []),
      ...(state?.messages ?? []),
      { role: 'user' as const, content: params.prompt },
    ];

    const request: ChatCompletionCreateParamsNonStreaming = {
      model: config.provider === 'azure' ? config.deployment : config.model,
      messages,
    };

    if (params.temperature !== undefined) request.temperature = params.temperature;
    if (params.maxTokens !== undefined) request.max_tokens = params.maxTokens;
    if (params.topP !== undefined) request.top_p = params.topP;
    if (params.frequencyPenalty !== undefined) request.frequency_penalty = params.frequencyPenalty;
    if (params.presencePenalty !== undefined) request.presence_penalty = params.presencePenalty;
    if (params.stopSequences !== undefined) request.stop = params.stopSequences;
    if (params.responseFormat?.type === 'json_object') request.response_format = { type: 'json_object' };

    return request;
  }

  private formatResponsesRequest(params: LLMCallParams, config: ModelConfig): ResponseCreateParamsNonStreaming {
    const state = params._providerState as ResponsesState | undefined;
    const request: ResponseCreateParamsNonStreaming = {
      model: config.model,
      input: [
        ...(state?.input ?? []),
        { role: 'user', content: params.prompt },
      ] as ResponseCreateParamsNonStreaming['input'],
      stream: false,
      store: false,
    };

    if (params.systemMessage !== undefined) request.instructions = params.systemMessage;
    if (params.maxTokens !== undefined) request.max_output_tokens = params.maxTokens;
    if (params.topP !== undefined) request.top_p = params.topP;
    if (!isGpt5Model(config.model) && params.temperature !== undefined) {
      request.temperature = params.temperature;
    }
    if (params.responseFormat?.type === 'json_object') request.text = { format: { type: 'json_object' } };

    return request;
  }

  formatRequestWithTools(params: LLMCallParams, config: ModelConfig, nativeTools: unknown): ChatCompletionCreateParamsNonStreaming | TaggedOpenAIRequest {
    if (usesResponsesApi(config)) {
      return {
        api: 'responses',
        request: {
          ...this.formatResponsesRequest(params, config),
          tools: toResponsesTools(nativeTools as ChatCompletionTool[]),
        },
      };
    }

    return {
      ...this.formatChatRequest(params, config),
      tools: nativeTools as ChatCompletionTool[],
    };
  }

  async callRaw(client: unknown, nativeRequest: unknown): Promise<unknown> {
    if (isTaggedRequest(nativeRequest)) {
      if (nativeRequest.api === 'responses') {
        return (client as OpenAI).responses.create(nativeRequest.request);
      }
      return (client as OpenAI).chat.completions.create(nativeRequest.request);
    }

    return (client as OpenAI).chat.completions.create(nativeRequest as ChatCompletionCreateParamsNonStreaming);
  }

  extractResponse(raw: unknown): LLMResponse {
    if (isResponsesResponse(raw)) return this.extractResponsesResponse(raw);

    const response = raw as ChatCompletion;
    const choice = response.choices[0];
    return {
      success: true,
      content: choice?.message.content ?? '',
      tokensUsed: {
        prompt: response.usage?.prompt_tokens ?? 0,
        completion: response.usage?.completion_tokens ?? 0,
        total: response.usage?.total_tokens ?? 0,
      },
      finishReason: mapOpenAIFinishReason(choice?.finish_reason),
      toolCalls: this.extractToolCalls(raw),
      _raw: raw,
    };
  }

  private extractResponsesResponse(response: Response): LLMResponse {
    const prompt = response.usage?.input_tokens ?? 0;
    const completion = response.usage?.output_tokens ?? 0;
    return {
      success: response.status !== 'failed',
      content: response.output_text ?? '',
      tokensUsed: {
        prompt,
        completion,
        total: response.usage?.total_tokens ?? prompt + completion,
      },
      finishReason: mapResponsesFinishReason(response),
      toolCalls: this.extractToolCalls(response),
      _raw: response,
    };
  }

  formatTools(tools: ToolDefinition[]): ChatCompletionTool[] | FunctionTool[] {
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: tool.parameters.properties,
          required: tool.parameters.required,
        },
      },
    })) as ChatCompletionTool[];
  }

  extractToolCalls(raw: unknown): ToolCall[] {
    if (isResponsesResponse(raw)) {
      return raw.output
        .filter((item): item is ResponseFunctionToolCall => item.type === 'function_call')
        .map((toolCall) => ({
          id: toolCall.call_id,
          name: toolCall.name,
          arguments: toolCall.arguments,
        }));
    }

    const response = raw as ChatCompletion;
    return (response.choices[0]?.message.tool_calls ?? []).map((toolCall) => ({
      id: toolCall.id,
      name: toolCall.function.name,
      arguments: toolCall.function.arguments,
    }));
  }

  formatFollowUp(original: LLMCallParams, raw: unknown, results: ToolResult[]): LLMCallParams {
    if (isResponsesResponse(raw)) {
      const state = (original._providerState ?? { input: [] }) as ResponsesState;
      const toolOutputs = results.map((result) => ({
        type: 'function_call_output',
        call_id: result.toolCallId,
        output: result.result,
      }));

      return {
        ...original,
        _providerState: {
          input: [...state.input, ...raw.output, ...toolOutputs],
        } satisfies ResponsesState,
      };
    }

    const response = raw as ChatCompletion;
    const state = (original._providerState ?? { messages: [] }) as OAIState;
    const assistantMsg = response.choices[0]?.message;

    const toolMsgs: ChatCompletionMessageParam[] = results.map((result) => ({
      role: 'tool',
      tool_call_id: result.toolCallId,
      content: result.result,
    }));

    return {
      ...original,
      _providerState: {
        messages: [...state.messages, ...(assistantMsg ? [assistantMsg] : []), ...toolMsgs],
      } satisfies OAIState,
    };
  }

  async *stream(client: unknown, nativeRequest: unknown): AsyncGenerator<StreamChunk> {
    if (isTaggedRequest(nativeRequest) && nativeRequest.api === 'responses') {
      const stream = await (client as OpenAI).responses.create({
        ...nativeRequest.request,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'response.output_text.delta') yield { delta: event.delta };
        if (event.type === 'response.completed') {
          yield { delta: '', finishReason: mapResponsesFinishReason(event.response) };
          const usage = event.response.usage;
          if (usage) {
            yield {
              delta: '',
              usage: {
                prompt: usage.input_tokens,
                completion: usage.output_tokens,
                total: usage.total_tokens,
              },
            };
          }
        }
      }
      return;
    }

    const request = isTaggedRequest(nativeRequest) ? nativeRequest.request : nativeRequest;
    const stream = await (client as OpenAI).chat.completions.create({
      ...(request as ChatCompletionCreateParams),
      stream: true,
      stream_options: { include_usage: true },
    });

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (choice?.delta.content) {
        yield { delta: choice.delta.content };
      }
      for (const toolCall of choice?.delta.tool_calls ?? []) {
        yield {
          delta: '',
          toolCall: {
            id: toolCall.id ?? `tool-${toolCall.index}`,
            name: toolCall.function?.name ?? '',
            arguments: toolCall.function?.arguments ?? '',
          },
        };
      }
      if (choice?.finish_reason) {
        yield { delta: '', finishReason: mapOpenAIFinishReason(choice.finish_reason) };
      }
      if (chunk.usage) {
        yield {
          delta: '',
          usage: {
            prompt: chunk.usage.prompt_tokens,
            completion: chunk.usage.completion_tokens,
            total: chunk.usage.total_tokens,
          },
        };
      }
    }
  }

  mapError(err: unknown, config: ModelConfig): AgentCraftError {
    return mapCommonError(err, config);
  }
}

function usesResponsesApi(config: ModelConfig): boolean {
  return config.provider === 'openai' && isGpt5Model(config.model);
}

function isGpt5Model(model: string): boolean {
  return model.startsWith('gpt-5');
}

function isTaggedRequest(value: unknown): value is TaggedOpenAIRequest {
  return (
    typeof value === 'object' &&
    value !== null &&
    'api' in value &&
    ((value as { api?: unknown }).api === 'chat' || (value as { api?: unknown }).api === 'responses')
  );
}

function isResponsesResponse(value: unknown): value is Response {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { object?: unknown }).object === 'response' &&
    Array.isArray((value as { output?: unknown }).output)
  );
}

function mapResponsesFinishReason(response: Response): FinishReason {
  if (response.incomplete_details?.reason === 'max_output_tokens') return 'length';
  if (response.incomplete_details?.reason === 'content_filter') return 'content_filter';
  if (response.status === 'incomplete') return 'length';
  return 'stop';
}

function toResponsesTools(tools: ChatCompletionTool[]): FunctionTool[] {
  return tools.map((tool) => ({
    type: 'function',
    name: tool.function.name,
    description: tool.function.description ?? null,
    parameters: tool.function.parameters ?? null,
    strict: null,
  }));
}
