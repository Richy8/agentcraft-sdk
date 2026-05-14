export interface ResponseFormat {
  type: 'text' | 'json_object';
}

export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter';

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  content: string;
  success: boolean;
}

export interface LLMCallParams {
  prompt: string;
  systemMessage?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  responseFormat?: ResponseFormat;
  signal?: AbortSignal;
  _providerState?: unknown;
}

export interface LLMResponse {
  success: boolean;
  content: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  finishReason: FinishReason;
  toolCalls?: ToolCall[];
  cost?: number;
  providerMetadata?: Record<string, unknown>;
  latency?: number;
  _raw?: unknown;
}

export interface StreamChunk {
  type?: 'model_delta' | 'tool_call' | 'tool_result' | 'final';
  runId?: string;
  spanId?: string;
  parentSpanId?: string;
  delta: string;
  finishReason?: FinishReason;
  usage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  toolCall?: ToolCall;
  toolResult?: ToolCallResult;
}

export type StreamEvent =
  | (StreamChunk & { type: 'model_delta'; delta: string })
  | (StreamChunk & { type: 'tool_call'; toolCall: ToolCall })
  | (StreamChunk & { type: 'tool_result'; toolResult: ToolCallResult })
  | (StreamChunk & { type: 'final'; finishReason: FinishReason });

export interface ModelCapabilities {
  maxContextLength: number;
  maxOutputTokens: number;

  supportsTools: boolean;
  supportsJsonMode: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsAudio: boolean;
  supportsVideo: boolean;
  supportsFiles: boolean;

  optimizedFor: ReadonlyArray<'reasoning' | 'code' | 'creative' | 'speed' | 'cost' | 'quality'>;
  qualityScore: number;
  speedScore: number;

  costPerMInputToken: number;
  costPerMOutputToken: number;
  cachedInputDiscount?: number;
  costPerRequest?: number;
  cacheWriteMultiplier?: number;
  cacheReadMultiplier?: number;
  batchDiscount?: number;
  priorityMultiplier?: number;
  flexDiscount?: number;
  toolCallCost?: number;
  searchCost?: number;
  pricingTiers?: Array<{
    minTokens: number;
    inputPerM: number;
    outputPerM: number;
  }>;
  regionPricing?: Record<string, {
    inputPerM?: number;
    outputPerM?: number;
  }>;
  pricingMetadata?: {
    currency: 'USD';
    unit: 'per_1m_tokens';
    sourceUrl: string;
    updatedAt: string;
    notes?: string;
  };
  deprecated?: boolean;
}
