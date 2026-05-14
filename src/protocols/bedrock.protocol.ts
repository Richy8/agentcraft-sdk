import {
  AccessDeniedException,
  BedrockRuntimeClient,
  ConverseCommand,
  ConverseStreamCommand,
  InternalServerException,
  ModelTimeoutException,
  ResourceNotFoundException,
  ServiceQuotaExceededException,
  ServiceUnavailableException,
  ThrottlingException,
  ValidationException,
  type ConverseCommandInput,
  type ConverseCommandOutput,
  type Message,
} from '@aws-sdk/client-bedrock-runtime';
import {
  AuthenticationError,
  InternalServerError,
  InvalidRequestError,
  ModelNotFoundError,
  QuotaExceededError,
  RateLimitError,
  TimeoutError,
  wrapUnknown,
  type AgentCraftError,
} from '../errors/index.js';
import type { BedrockModelConfig, ModelConfig } from '../types/config.types.js';
import type { ProviderDefinition } from '../provider-registry/registry.js';
import type { FinishReason, LLMCallParams, LLMResponse, StreamChunk, ToolCall } from '../types/provider.types.js';
import type { ProviderProtocol, ToolDefinition, ToolResult } from './types.js';

type BedrockState = { messages: Message[] };

function mapBedrockStopReason(reason: string | undefined): FinishReason {
  switch (reason) {
    case 'max_tokens':
      return 'length';
    case 'tool_use':
      return 'tool_calls';
    case 'guardrail_intervened':
    case 'content_filtered':
      return 'content_filter';
    default:
      return 'stop';
  }
}

export class BedrockProtocol implements ProviderProtocol {
  createClient(config: ModelConfig, _definition: ProviderDefinition): BedrockRuntimeClient {
    const cfg = config as BedrockModelConfig;
    return new BedrockRuntimeClient({
      region: cfg.region,
      retryMode: 'adaptive',
      maxAttempts: 1,
      ...(cfg.accessKeyId && {
        credentials: {
          accessKeyId: cfg.accessKeyId,
          secretAccessKey: cfg.secretAccessKey!,
        },
      }),
    });
  }

  formatRequest(params: LLMCallParams, config: ModelConfig): ConverseCommandInput {
    const state = params._providerState as BedrockState | undefined;
    return {
      modelId: config.model,
      system: params.systemMessage ? [{ text: params.systemMessage }] : undefined,
      messages: [
        ...(state?.messages ?? []),
        { role: 'user', content: [{ text: params.prompt }] },
      ],
      inferenceConfig: {
        maxTokens: params.maxTokens,
        temperature: params.temperature,
        topP: params.topP,
        stopSequences: params.stopSequences,
      },
    };
  }

  formatRequestWithTools(params: LLMCallParams, config: ModelConfig, nativeTools: unknown): ConverseCommandInput {
    return {
      ...this.formatRequest(params, config),
      ...(nativeTools as object),
    };
  }

  async callRaw(client: unknown, nativeRequest: unknown): Promise<unknown> {
    return (client as BedrockRuntimeClient).send(new ConverseCommand(nativeRequest as ConverseCommandInput));
  }

  extractResponse(raw: unknown): LLMResponse {
    const response = raw as ConverseCommandOutput;
    const content = response.output?.message?.content
      ?.map((block) => ('text' in block ? block.text ?? '' : ''))
      .join('') ?? '';
    const prompt = response.usage?.inputTokens ?? 0;
    const completion = response.usage?.outputTokens ?? 0;

    return {
      success: true,
      content,
      tokensUsed: {
        prompt,
        completion,
        total: response.usage?.totalTokens ?? prompt + completion,
      },
      finishReason: mapBedrockStopReason(response.stopReason),
      toolCalls: this.extractToolCalls(raw),
      providerMetadata: { metrics: response.metrics },
      _raw: raw,
    };
  }

  formatTools(tools: ToolDefinition[]): unknown {
    return {
      toolConfig: {
        tools: tools.map((tool) => ({
          toolSpec: {
            name: tool.name,
            description: tool.description,
            inputSchema: {
              json: {
                type: 'object',
                properties: tool.parameters.properties,
                required: tool.parameters.required,
              },
            },
          },
        })),
        toolChoice: { auto: {} },
      },
    };
  }

  extractToolCalls(raw: unknown): ToolCall[] {
    const response = raw as ConverseCommandOutput;
    return (response.output?.message?.content ?? [])
      .filter((block) => 'toolUse' in block)
      .map((block) => ({
        id: block.toolUse!.toolUseId!,
        name: block.toolUse!.name!,
        arguments: JSON.stringify(block.toolUse!.input),
      }));
  }

  formatFollowUp(original: LLMCallParams, raw: unknown, results: ToolResult[]): LLMCallParams {
    const response = raw as ConverseCommandOutput;
    const state = (original._providerState ?? { messages: [] }) as BedrockState;
    const assistantTurn = response.output?.message;

    const userTurn = {
      role: 'user',
      content: results.map((result) => ({
        toolResult: {
          toolUseId: result.toolCallId,
          content: [{ json: JSON.parse(result.result) as unknown }],
          status: 'success',
        },
      })),
    } as Message;

    return {
      ...original,
      _providerState: {
        messages: [...state.messages, ...(assistantTurn ? [assistantTurn] : []), userTurn],
      } satisfies BedrockState,
    };
  }

  async *stream(client: unknown, nativeRequest: unknown): AsyncGenerator<StreamChunk> {
    const response = await (client as BedrockRuntimeClient).send(
      new ConverseStreamCommand(nativeRequest as ConverseCommandInput)
    );

    for await (const event of response.stream ?? []) {
      if (event.contentBlockDelta?.delta?.text) {
        yield { delta: event.contentBlockDelta.delta.text };
      }
      if (event.messageStop) {
        yield { delta: '', finishReason: mapBedrockStopReason(event.messageStop.stopReason) };
      }
      if (event.metadata?.usage) {
        const prompt = event.metadata.usage.inputTokens ?? 0;
        const completion = event.metadata.usage.outputTokens ?? 0;
        yield {
          delta: '',
          usage: {
            prompt,
            completion,
            total: event.metadata.usage.totalTokens ?? prompt + completion,
          },
        };
      }
    }
  }

  mapError(err: unknown, config: ModelConfig): AgentCraftError {
    const provider = config.provider;
    const model = config.model;

    const name = err && typeof err === 'object' ? (err as { name?: string }).name : undefined;
    if (err instanceof ThrottlingException || name === 'ThrottlingException') return new RateLimitError(60, { provider, model });
    if (err instanceof ServiceQuotaExceededException || name === 'ServiceQuotaExceededException') return new QuotaExceededError(provider, { model });
    if (err instanceof AccessDeniedException || name === 'AccessDeniedException') return new AuthenticationError(provider, { model });
    if (err instanceof ResourceNotFoundException || name === 'ResourceNotFoundException') return new ModelNotFoundError(model, provider);
    if (err instanceof ServiceUnavailableException || err instanceof InternalServerException || name === 'ServiceUnavailableException' || name === 'InternalServerException') {
      return new InternalServerError(provider, 500, { model });
    }
    if (err instanceof ModelTimeoutException || name === 'ModelTimeoutException') return new TimeoutError(config.timeout ?? 120_000, { provider, model });
    if (err instanceof ValidationException || name === 'ValidationException') return new InvalidRequestError((err as Error).message, { provider, model });

    return wrapUnknown(err, provider, model);
  }
}
