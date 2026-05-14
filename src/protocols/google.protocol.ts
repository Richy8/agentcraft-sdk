import { GoogleGenAI } from '@google/genai';
import type { AgentCraftError } from '../errors/index.js';
import type { ProviderDefinition } from '../provider-registry/registry.js';
import type { GeminiModelConfig, ModelConfig, VertexAIModelConfig } from '../types/config.types.js';
import type { FinishReason, LLMCallParams, LLMResponse, StreamChunk, ToolCall } from '../types/provider.types.js';
import { mapCommonError } from './shared/map-error.js';
import type { ProviderProtocol, ToolDefinition, ToolResult } from './types.js';

type GoogleContent = { role: 'user' | 'model'; parts: Array<Record<string, unknown>> };
type GoogleState = { contents: GoogleContent[] };
type GoogleResponse = {
  text?: string;
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<Record<string, unknown>> } }>;
  functionCalls?: Array<{ name: string; args: unknown }>;
};

const RELAXED_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
];

function mapGoogleFinishReason(reason?: string): FinishReason {
  switch (reason) {
    case 'STOP':
      return 'stop';
    case 'MAX_TOKENS':
      return 'length';
    case 'SAFETY':
    case 'RECITATION':
      return 'content_filter';
    default:
      return 'stop';
  }
}

function estimateTokens(params: LLMCallParams): number {
  const systemLen = params.systemMessage?.length ?? 0;
  const promptLen = params.prompt.length;
  return Math.ceil((systemLen + promptLen) / 4);
}

export class GoogleProtocol implements ProviderProtocol {
  createClient(config: ModelConfig, _definition: ProviderDefinition): GoogleGenAI {
    if (config.provider === 'vertexai') {
      const cfg = config as VertexAIModelConfig;
      return new GoogleGenAI({
        vertexai: true,
        project: cfg.project,
        location: cfg.location ?? 'us-central1',
      });
    }

    return new GoogleGenAI({ apiKey: (config as GeminiModelConfig).apiKey });
  }

  formatRequest(params: LLMCallParams, config: ModelConfig): unknown {
    const state = params._providerState as GoogleState | undefined;
    return {
      model: config.model,
      contents: [...(state?.contents ?? []), { role: 'user', parts: [{ text: params.prompt }] }],
      config: {
        systemInstruction: params.systemMessage,
        temperature: params.temperature,
        maxOutputTokens: params.maxTokens,
        topP: params.topP,
        stopSequences: params.stopSequences,
        responseMimeType: params.responseFormat?.type === 'json_object' ? 'application/json' : undefined,
        safetySettings: RELAXED_SAFETY_SETTINGS,
      },
    };
  }

  formatRequestWithTools(params: LLMCallParams, config: ModelConfig, nativeTools: unknown): unknown {
    const request = this.formatRequest(params, config) as { config?: Record<string, unknown> };
    return {
      ...request,
      config: {
        ...(request.config ?? {}),
        tools: nativeTools,
      },
    };
  }

  async callRaw(client: unknown, nativeRequest: unknown): Promise<unknown> {
    return (client as GoogleGenAI).models.generateContent(nativeRequest as never);
  }

  extractResponse(raw: unknown, params: LLMCallParams): LLMResponse {
    const response = raw as GoogleResponse;
    const usage = response.usageMetadata;
    const prompt = usage?.promptTokenCount ?? estimateTokens(params);
    const completion = usage?.candidatesTokenCount ?? 0;

    return {
      success: true,
      content: response.text ?? '',
      tokensUsed: {
        prompt,
        completion,
        total: usage?.totalTokenCount ?? prompt + completion,
      },
      finishReason: mapGoogleFinishReason(response.candidates?.[0]?.finishReason),
      toolCalls: this.extractToolCalls(raw),
      _raw: raw,
    };
  }

  formatTools(tools: ToolDefinition[]): unknown {
    return [
      {
        functionDeclarations: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: {
            type: 'OBJECT',
            properties: tool.parameters.properties,
            required: tool.parameters.required,
          },
        })),
      },
    ];
  }

  extractToolCalls(raw: unknown): ToolCall[] {
    const response = raw as GoogleResponse;
    return (response.functionCalls ?? []).map((functionCall, index) => ({
      id: `gemini-${Date.now()}-${index}`,
      name: functionCall.name,
      arguments: JSON.stringify(functionCall.args),
    }));
  }

  formatFollowUp(original: LLMCallParams, raw: unknown, results: ToolResult[]): LLMCallParams {
    const response = raw as GoogleResponse;
    const state = (original._providerState ?? { contents: [] }) as GoogleState;

    const modelTurn: GoogleContent = {
      role: 'model',
      parts: response.candidates?.[0]?.content?.parts ?? [],
    };

    const userTurn: GoogleContent = {
      role: 'user',
      parts: results.map((result) => ({
        functionResponse: {
          name: result.toolName,
          response: JSON.parse(result.result) as unknown,
        },
      })),
    };

    return {
      ...original,
      _providerState: {
        contents: [...state.contents, modelTurn, userTurn],
      } satisfies GoogleState,
    };
  }

  async *stream(client: unknown, nativeRequest: unknown): AsyncGenerator<StreamChunk> {
    const stream = await (client as GoogleGenAI).models.generateContentStream(nativeRequest as never);

    for await (const chunk of stream as AsyncIterable<GoogleResponse>) {
      if (chunk.text) yield { delta: chunk.text };
      for (const [index, part] of (chunk.candidates?.[0]?.content?.parts ?? []).entries()) {
        const functionCall = part.functionCall as { name?: string; args?: unknown } | undefined;
        if (functionCall) {
          yield {
            delta: '',
            toolCall: {
              id: `gemini-stream-${index}`,
              name: functionCall.name ?? '',
              arguments: JSON.stringify(functionCall.args ?? {}),
            },
          };
        }
      }
      const finishReason = chunk.candidates?.[0]?.finishReason;
      if (finishReason) yield { delta: '', finishReason: mapGoogleFinishReason(finishReason) };
      if (chunk.usageMetadata) {
        const prompt = chunk.usageMetadata.promptTokenCount ?? 0;
        const completion = chunk.usageMetadata.candidatesTokenCount ?? 0;
        yield {
          delta: '',
          usage: {
            prompt,
            completion,
            total: chunk.usageMetadata.totalTokenCount ?? prompt + completion,
          },
        };
      }
    }
  }

  mapError(err: unknown, config: ModelConfig): AgentCraftError {
    return mapCommonError(err, config);
  }
}
