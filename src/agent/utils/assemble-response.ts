import type { AgentResponse } from '../types.js';
import type { FinishReason, StreamChunk } from '../../types/provider.types.js';

export function assembleResponse(chunks: StreamChunk[], meta: { model: string; provider: string }): AgentResponse {
  let content = '';
  let finishReason: FinishReason = 'stop';
  let usage = { prompt: 0, completion: 0, total: 0 };

  for (const chunk of chunks) {
    if (chunk.delta) content += chunk.delta;
    if (chunk.finishReason) finishReason = chunk.finishReason;
    if (chunk.usage) usage = chunk.usage;
  }

  return {
    content,
    tokensUsed: usage,
    cost: 0,
    finishReason,
    model: meta.model,
    provider: meta.provider,
  };
}

