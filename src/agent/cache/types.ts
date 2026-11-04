import type {
  AgentCacheConfig,
  AgentCacheController,
  AgentCacheLookup,
} from "../creator/types.js";
import type { TokenUsage } from "../types.js";

export type {
  AgentCacheConfig,
  AgentCacheController,
  AgentCacheLookup,
} from "../creator/types.js";

export interface CacheEnvelope {
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly value: unknown;
}

export interface StoredCacheRecord {
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly bytes: number;
  readonly payload: string;
}

export type FileCacheOptions = Omit<AgentCacheConfig, "type" | "root">;

export interface MemoryCacheOptions {
  readonly defaultTtlMs?: number;
  readonly maxEntryBytes?: number;
  readonly namespace?: string;
  readonly strategy?: AgentCacheConfig["strategy"];
}

export interface DistributedCacheLockOptions {
  readonly enabled?: boolean;
  readonly ttlMs?: number;
  readonly waitMs?: number;
  readonly pollIntervalMs?: number;
}

export interface DistributedCacheBaseOptions {
  readonly namespace?: string;
  readonly version?: string;
  readonly strategy?: AgentCacheConfig["strategy"];
  readonly defaultTtlMs?: number;
  readonly maxEntryBytes?: number;
  readonly keyPrefix?: string;
  readonly codec?: "json";
  readonly redactConnectionUrl?: boolean;
  readonly locking?: DistributedCacheLockOptions;
}

export interface RedisCacheClientLike {
  get(key: string): Promise<string | null> | string | null;
  set(
    key: string,
    value: string,
    options?: Record<string, unknown>,
  ): Promise<unknown> | unknown;
  del(key: string): Promise<number> | number;
  keys?(pattern: string): Promise<string[]> | string[];
  scanIterator?(options?: { readonly MATCH?: string }): AsyncIterable<string>;
  connect?(): Promise<void>;
  quit?(): Promise<void>;
}

export type RedisCacheOptions =
  | ({ readonly url: string; readonly client?: never } & DistributedCacheBaseOptions)
  | ({ readonly client: RedisCacheClientLike; readonly url?: never } & DistributedCacheBaseOptions);

export interface PostgresPoolLike {
  query(
    sql: string,
    params?: readonly unknown[],
  ): Promise<{ readonly rows: unknown[]; readonly rowCount?: number | null }>;
  end?(): Promise<void>;
}

export type PostgresCacheOptions =
  | ({ readonly url: string; readonly pool?: never; readonly tableName?: string } & DistributedCacheBaseOptions)
  | ({ readonly pool: PostgresPoolLike; readonly url?: never; readonly tableName?: string } & DistributedCacheBaseOptions);

export interface SQLiteCacheOptions extends DistributedCacheBaseOptions {
  readonly filePath: string;
  readonly tableName?: string;
}

export interface AgentCacheWarmOptions {
  readonly concurrency?: number;
  readonly dryRun?: boolean;
  readonly stopOnError?: boolean;
}

export interface AgentCacheWarmResult {
  readonly dryRun: boolean;
  readonly attempted: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly cost: number;
  readonly tokensUsed: TokenUsage;
  readonly cache: {
    readonly hits: number;
    readonly misses: number;
    readonly writes: number;
  };
  readonly errors: readonly string[];
}

export interface CacheStatsLike {
  readonly hits: number;
  readonly misses: number;
  readonly writes: number;
  readonly skippedUnsafe: number;
  readonly stale: number;
  readonly corrupt: number;
  readonly oversized: number;
  readonly toolCallsAvoided: number;
  readonly estimatedSavedTokens: number;
}

export interface CacheEfficiencySummary {
  readonly lookups: number;
  readonly hitRate: number;
  readonly missRate: number;
  readonly avoidedCallRate: number;
  readonly estimatedSavedTokens: number;
  readonly estimatedCostSaved: number;
}

export interface CacheEfficiencyOptions {
  readonly estimatedCostPerToken?: number;
  readonly estimatedToolCallCost?: number;
}
