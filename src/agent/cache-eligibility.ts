import type { ToolDefinition } from '../protocols/types.js';
import type { AgentCacheConfig } from './creator/types.js';

export interface CacheEligibility {
  readonly allowed: boolean;
  readonly reason: string;
  readonly ttlMs?: number;
}

export function getCacheEligibility(
  tool: ToolDefinition,
  strategy: NonNullable<AgentCacheConfig['strategy']>
): CacheEligibility {
  const sideEffect = tool.security?.sideEffect ?? 'external';
  const cacheMetadata = tool.security?.cache;
  const ttlMs = cacheMetadata?.ttlMs;

  if (cacheMetadata?.sensitive) return { allowed: false, reason: 'sensitive' };
  if (sideEffect === 'write') return { allowed: false, reason: 'unsafe' };
  if (tool.security?.requiresConfirmation) {
    return { allowed: false, reason: 'approval-required' };
  }

  if (strategy === 'conservative') {
    const explicitSafe = cacheMetadata?.safe === true || cacheMetadata?.deterministic === true;
    if (sideEffect === 'none' || (sideEffect === 'read' && explicitSafe)) {
      return { allowed: true, reason: 'eligible', ...(ttlMs !== undefined && { ttlMs }) };
    }
    return { allowed: false, reason: 'not-cache-safe' };
  }

  if (strategy === 'aggressive') {
    if (sideEffect === 'none' || sideEffect === 'read' || sideEffect === 'external') {
      return { allowed: true, reason: 'eligible', ...(ttlMs !== undefined && { ttlMs }) };
    }
    return { allowed: false, reason: 'unsafe' };
  }

  if (sideEffect === 'none' || sideEffect === 'read') {
    return { allowed: true, reason: 'eligible', ...(ttlMs !== undefined && { ttlMs }) };
  }
  return { allowed: false, reason: 'unsafe' };
}
