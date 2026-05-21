import type { Agent } from "../agent.js";
import type { AgentCacheConfig, AgentCacheController } from "./types.js";
import type {
  AgentCacheWarmOptions,
  AgentCacheWarmResult,
  CacheEfficiencyOptions,
  CacheEfficiencySummary,
  CacheStatsLike,
  DistributedCacheBaseOptions,
  FileCacheOptions,
  MemoryCacheOptions,
  PostgresCacheOptions,
  RedisCacheOptions,
  SQLiteCacheOptions,
} from "./types.js";
import { FileAgentCache } from "./backends/file.js";
import { MemoryAgentCache } from "./backends/memory.js";
import { PostgresAgentCache } from "./backends/postgres.js";
import { RedisAgentCache } from "./backends/redis.js";
import { SQLiteAgentCache } from "./backends/sqlite.js";
import { summarizeCacheStats } from "./stats.js";
import { warmAgentCache } from "./warm.js";
import type { AgentRunParams } from "../types.js";

export const AgentCache = {
  disabled(): AgentCacheController {
    return { config: { type: "disabled" } };
  },

  file(root: string, options: FileCacheOptions = {}): AgentCacheController {
    return new FileAgentCache(root, options);
  },

  placeholder(
    root: string,
    strategy: AgentCacheConfig["strategy"] = "auto",
  ): AgentCacheController {
    return this.file(root, { strategy });
  },

  memory(options: MemoryCacheOptions = {}): AgentCacheController {
    return new MemoryAgentCache(options);
  },

  redis(options: RedisCacheOptions): AgentCacheController {
    return new RedisAgentCache(options);
  },

  postgres(options: PostgresCacheOptions): AgentCacheController {
    return new PostgresAgentCache(options);
  },

  sqlite(options: SQLiteCacheOptions): AgentCacheController {
    return new SQLiteAgentCache(options);
  },

  custom(controller: AgentCacheController): AgentCacheController {
    return controller;
  },

  fromUrl(
    url: string,
    options: Omit<DistributedCacheBaseOptions, "redactConnectionUrl"> & {
      readonly tableName?: string;
      readonly filePath?: string;
    } = {},
  ): AgentCacheController {
    const parsed = new URL(url);
    if (parsed.protocol === "redis:" || parsed.protocol === "rediss:") {
      return new RedisAgentCache({ ...options, url });
    }
    if (parsed.protocol === "postgres:" || parsed.protocol === "postgresql:") {
      return new PostgresAgentCache({
        ...options,
        url,
        ...(options.tableName !== undefined && { tableName: options.tableName }),
      });
    }
    if (parsed.protocol === "file:") {
      return new SQLiteAgentCache({
        ...options,
        filePath: options.filePath ?? parsed.pathname,
        ...(options.tableName !== undefined && { tableName: options.tableName }),
      });
    }
    throw new Error(
      `AgentCache.fromUrl does not support URL scheme '${parsed.protocol}'. Supported schemes: redis, rediss, postgres, postgresql, file.`,
    );
  },

  async warm(
    agent: Pick<Agent, "run">,
    prompts: readonly (string | AgentRunParams)[],
    options: AgentCacheWarmOptions = {},
  ): Promise<AgentCacheWarmResult> {
    return warmAgentCache(agent, prompts, options);
  },

  summarize(
    stats: CacheStatsLike,
    options: CacheEfficiencyOptions = {},
  ): CacheEfficiencySummary {
    return summarizeCacheStats(stats, options);
  },
} as const;
