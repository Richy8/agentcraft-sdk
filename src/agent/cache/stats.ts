import type {
  CacheEfficiencyOptions,
  CacheEfficiencySummary,
  CacheStatsLike,
} from "./types.js";

export function summarizeCacheStats(
  stats: CacheStatsLike,
  options: CacheEfficiencyOptions = {},
): CacheEfficiencySummary {
  const lookups = stats.hits + stats.misses;
  const avoidedCallRate =
    stats.toolCallsAvoided + stats.misses === 0
      ? 0
      : stats.toolCallsAvoided / (stats.toolCallsAvoided + stats.misses);
  const estimatedCostSaved =
    stats.estimatedSavedTokens * (options.estimatedCostPerToken ?? 0) +
    stats.toolCallsAvoided * (options.estimatedToolCallCost ?? 0);
  return {
    lookups,
    hitRate: lookups === 0 ? 0 : stats.hits / lookups,
    missRate: lookups === 0 ? 0 : stats.misses / lookups,
    avoidedCallRate,
    estimatedSavedTokens: stats.estimatedSavedTokens,
    estimatedCostSaved,
  };
}
