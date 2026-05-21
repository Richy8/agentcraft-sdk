import type { AgentRunParams } from '../types.js';
import { AgentMemory } from './index.js';
import type { AgentMemoryStore, MemoryRetrievalOptions } from './types.js';

export async function applyMemoryContext(
  params: AgentRunParams,
  defaultMemory: AgentMemoryStore | undefined
): Promise<AgentRunParams> {
  const request = resolveMemoryRequest(params, defaultMemory);
  if (!request || request.includeContext === false) return params;
  const query = request.query ?? params.prompt ?? '';
  if (!query.trim()) return params;
  const results = await request.store.search(query, request);
  if (results.length === 0) return params;
  const context = request.store.summarize
    ? await request.store.summarize(query, request)
    : AgentMemory.formatContext(results, request);
  if (!context.trim()) return params;
  return {
    ...params,
    system: [params.system, context].filter(Boolean).join('\n\n'),
  };
}

export function resolveMemoryRequest(
  params: AgentRunParams,
  defaultMemory: AgentMemoryStore | undefined
):
  | (MemoryRetrievalOptions & {
      readonly store: AgentMemoryStore;
      readonly includeContext?: boolean;
    })
  | undefined {
  if (params.memory === false) return undefined;
  if (isAgentMemoryStore(params.memory)) {
    return { store: params.memory };
  }
  if (params.memory && typeof params.memory === 'object') {
    const store = params.memory.store ?? defaultMemory;
    if (!store) return undefined;
    return { ...params.memory, store };
  }
  if (!defaultMemory) return undefined;
  return { store: defaultMemory };
}

export function isAgentMemoryStore(value: unknown): value is AgentMemoryStore {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AgentMemoryStore>;
  return (
    typeof candidate.add === 'function' &&
    typeof candidate.search === 'function' &&
    typeof candidate.delete === 'function'
  );
}
