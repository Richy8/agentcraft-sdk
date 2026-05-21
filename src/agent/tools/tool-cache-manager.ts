import type { ToolDefinition } from '../../protocols/types.js';
import { ConfigurationError, QuotaExceededError } from '../../errors/index.js';
import { createCacheKey, type AgentCacheLookup, type CacheStatsLike } from '../cache/index.js';
import { getCacheEligibility } from '../cache-eligibility.js';
import type { ValidatedAgentConfig } from '../config.js';
import type { AgentEventEmitter } from '../events.js';
import type { AgentRunParams } from '../types.js';
import { executeToolWithBudget, type ToolExecutionBudget } from './tool-budget.js';

export interface ToolCacheExecutionContext {
  readonly provider: string;
  readonly model: string;
  readonly cache: ValidatedAgentConfig['cache'];
  readonly events?: AgentEventEmitter;
  readonly cacheStats: MutableCacheStats;
  readonly cacheInflight: Map<string, Promise<unknown>>;
}

export type MutableCacheStats = {
  -readonly [K in keyof CacheStatsLike]: CacheStatsLike[K];
};

export async function executeToolWithCache(input: {
  readonly context: ToolCacheExecutionContext;
  readonly tool: ToolDefinition;
  readonly args: Record<string, unknown>;
  readonly execute: (args: Record<string, unknown>) => Promise<unknown>;
  readonly params: AgentRunParams;
  readonly budget: ToolExecutionBudget;
}): Promise<unknown> {
  const { context, tool, args, execute, params, budget } = input;
  const cache = context.cache;
  const sideEffect = tool.security?.sideEffect ?? 'external';
  context.events?.emit('tool.called', {
    toolName: tool.name,
    sideEffectLevel: sideEffect as 'none' | 'read' | 'write' | 'external',
  });
  const requireCached = isCacheRequiredForTool(params, tool.name);
  if (
    (!cache?.get && !cache?.getEntry) ||
    !cache.set ||
    cache.config.type === 'disabled' ||
    isCacheBypassed(params, context.cache)
  ) {
    if (requireCached) throwRequiredCacheMiss(context.provider, tool.name, 'unavailable');
    return await executeToolWithBudget({ provider: context.provider, tool, args, execute, budget });
  }
  const cacheEligibility = getCacheEligibility(tool, cache.config.strategy ?? 'auto');
  if (!cacheEligibility.allowed) {
    context.cacheStats.skippedUnsafe++;
    if (requireCached) throwRequiredCacheMiss(context.provider, tool.name, cacheEligibility.reason);
    return await executeToolWithBudget({ provider: context.provider, tool, args, execute, budget });
  }

  const key = createToolCacheKey({
    provider: context.provider,
    model: context.model,
    tool,
    sideEffect,
    args,
    cache,
  });
  const entry = await readCacheEntry(cache, key);
  if (entry.status === 'hit') {
    context.cacheStats.hits++;
    context.cacheStats.toolCallsAvoided++;
    context.cacheStats.estimatedSavedTokens +=
      (entry.bytes ?? JSON.stringify(entry.value).length) / 4;
    context.events?.emit('cache.hit', {
      toolName: tool.name,
      key,
      estimatedSavedTokens: context.cacheStats.estimatedSavedTokens,
    });
    return entry.value;
  }
  if (entry.status === 'stale') context.cacheStats.stale++;
  if (entry.status === 'corrupt') context.cacheStats.corrupt++;
  if (entry.status === 'oversize') context.cacheStats.oversized++;
  context.cacheStats.misses++;
  context.events?.emit('cache.miss', { toolName: tool.name, key });
  if (requireCached) throwRequiredCacheMiss(context.provider, tool.name, entry.status);

  const existing = context.cacheInflight.get(key);
  if (existing) {
    context.cacheStats.toolCallsAvoided++;
    return await existing;
  }

  const runAndWrite = async () => {
    const result = await executeToolWithBudget({
      provider: context.provider,
      tool,
      args,
      execute,
      budget,
    });
    await cache.set!(
      key,
      result,
      cacheEligibility.ttlMs !== undefined ? { ttlMs: cacheEligibility.ttlMs } : {}
    );
    context.cacheStats.writes++;
    context.events?.emit('cache.write', { toolName: tool.name, key });
    return result;
  };
  const pending = cache.withLock
    ? cache.withLock(key, async () => {
        const lockedEntry = await readCacheEntry(cache, key);
        if (lockedEntry.status === 'hit') {
          context.cacheStats.hits++;
          context.cacheStats.toolCallsAvoided++;
          return lockedEntry.value;
        }
        return runAndWrite();
      })
    : runAndWrite();
  context.cacheInflight.set(key, pending);
  try {
    return await pending;
  } finally {
    context.cacheInflight.delete(key);
  }
}

export function validateCachePolicy(
  params: AgentRunParams,
  cache: ValidatedAgentConfig['cache']
): void {
  const required = params.budget?.cachePolicy?.requireCachedFor ?? [];
  if (required.length === 0) return;
  if (
    !cache ||
    cache.config.type === 'disabled' ||
    (!cache.get && !cache.getEntry) ||
    isCacheBypassed(params, cache)
  ) {
    throw new ConfigurationError(
      'RunBudget cachePolicy.requireCachedFor requires an enabled cache controller.',
      { requireCachedFor: required }
    );
  }
}

async function readCacheEntry(
  cache: NonNullable<ValidatedAgentConfig['cache']>,
  key: string
): Promise<AgentCacheLookup> {
  if (cache.getEntry) return await cache.getEntry(key);
  const value = await cache.get?.(key);
  return value === undefined ? { status: 'miss' } : { status: 'hit', value };
}

function createToolCacheKey(input: {
  readonly provider: string;
  readonly model: string;
  readonly tool: ToolDefinition;
  readonly sideEffect: string;
  readonly args: Record<string, unknown>;
  readonly cache: NonNullable<ValidatedAgentConfig['cache']>;
}): string {
  return createCacheKey([
    'tool',
    input.provider,
    input.model,
    input.tool.name,
    input.sideEffect,
    input.args,
    input.cache.config.strategy,
    input.cache.config.namespace,
    input.cache.config.version,
  ]);
}

function isCacheRequiredForTool(params: AgentRunParams, toolName: string): boolean {
  return params.budget?.cachePolicy?.requireCachedFor?.includes(toolName) ?? false;
}

function throwRequiredCacheMiss(provider: string, toolName: string, status: string): never {
  throw new QuotaExceededError(provider, {
    budget: 'cachePolicy.requireCachedFor',
    toolName,
    cacheStatus: status,
  });
}

function isCacheBypassed(params: AgentRunParams, cache: ValidatedAgentConfig['cache']): boolean {
  return cache?.config.type === 'disabled' || params.cache === false || params.cache?.bypass === true;
}
