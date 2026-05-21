/**
 * Agent cache public barrel.
 *
 * The cache package keeps the stable `AgentCache` facade while backend
 * implementations live in focused modules under `backends/`.
 */
export { AgentCache } from "./facade.js";
export { createCacheKey, stableStringify } from "./key.js";
export { summarizeCacheStats } from "./stats.js";
export type {
  AgentCacheConfig,
  AgentCacheController,
  AgentCacheLookup,
  AgentCacheWarmOptions,
  AgentCacheWarmResult,
  CacheEfficiencyOptions,
  CacheEfficiencySummary,
  CacheStatsLike,
  DistributedCacheBaseOptions,
  DistributedCacheLockOptions,
  FileCacheOptions,
  MemoryCacheOptions,
  PostgresCacheOptions,
  PostgresPoolLike,
  RedisCacheClientLike,
  RedisCacheOptions,
  SQLiteCacheOptions,
} from "./types.js";
