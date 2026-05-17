import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import * as path from "node:path";
import type { Agent } from "./agent.js";
import type {
  AgentCacheConfig,
  AgentCacheController,
  AgentCacheLookup,
} from "./creator/types.js";
import type { AgentResponse, AgentRunParams, TokenUsage } from "./types.js";

export type {
  AgentCacheConfig,
  AgentCacheController,
  AgentCacheLookup,
} from "./creator/types.js";

interface CacheEnvelope {
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly value: unknown;
}

interface StoredCacheRecord {
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

class FileAgentCache implements AgentCacheController {
  readonly config: AgentCacheConfig;
  private readonly root: string;

  constructor(root: string, options: FileCacheOptions = {}) {
    this.root = path.resolve(root);
    this.config = {
      type: "file",
      root: this.root,
      strategy: options.strategy ?? "auto",
      namespace: sanitizePathSegment(options.namespace ?? "default"),
      version: sanitizePathSegment(options.version ?? "v1"),
      ...(options.defaultTtlMs !== undefined && {
        defaultTtlMs: options.defaultTtlMs,
      }),
      ...(options.maxEntryBytes !== undefined && {
        maxEntryBytes: options.maxEntryBytes,
      }),
    };
  }

  async get(key: string): Promise<unknown | undefined> {
    const entry = await this.getEntry(key);
    return entry.status === "hit" ? entry.value : undefined;
  }

  async getEntry(key: string): Promise<AgentCacheLookup> {
    const filePath = this.pathForKey(key);
    let raw: string;
    try {
      const metadata = await stat(filePath);
      if (
        this.config.maxEntryBytes !== undefined &&
        metadata.size > this.config.maxEntryBytes
      ) {
        return { status: "oversize", bytes: metadata.size };
      }
      raw = await readFile(filePath, "utf8");
    } catch {
      return { status: "miss" };
    }

    try {
      const envelope = JSON.parse(raw) as CacheEnvelope;
      if (
        envelope.expiresAt !== undefined &&
        envelope.expiresAt <= Date.now()
      ) {
        await this.delete(key);
        return {
          status: "stale",
          bytes: Buffer.byteLength(raw, "utf8"),
          createdAt: envelope.createdAt,
          expiresAt: envelope.expiresAt,
        };
      }
      return {
        status: "hit",
        value: envelope.value,
        bytes: Buffer.byteLength(raw, "utf8"),
        createdAt: envelope.createdAt,
        ...(envelope.expiresAt !== undefined && {
          expiresAt: envelope.expiresAt,
        }),
      };
    } catch {
      return { status: "corrupt", bytes: Buffer.byteLength(raw, "utf8") };
    }
  }

  async set(
    key: string,
    value: unknown,
    options: { readonly ttlMs?: number } = {},
  ): Promise<void> {
    assertJsonSerializable(value, "AgentCache file entry");
    const filePath = this.pathForKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    const ttlMs = options.ttlMs ?? this.config.defaultTtlMs;
    const envelope: CacheEnvelope = {
      createdAt: Date.now(),
      ...(ttlMs !== undefined && { expiresAt: Date.now() + ttlMs }),
      value,
    };
    const payload = `${JSON.stringify(envelope, null, 2)}\n`;
    const bytes = Buffer.byteLength(payload, "utf8");
    if (
      this.config.maxEntryBytes !== undefined &&
      bytes > this.config.maxEntryBytes
    ) {
      throw new Error(
        `AgentCache entry exceeded maxEntryBytes (${bytes} > ${this.config.maxEntryBytes})`,
      );
    }

    const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(tempPath, payload, { encoding: "utf8", mode: 0o600 });
    await rename(tempPath, filePath);
  }

  async delete(key: string): Promise<boolean> {
    try {
      await rm(this.pathForKey(key), { force: true });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await rm(this.scopeRoot(), { recursive: true, force: true });
  }

  async pruneExpired(): Promise<number> {
    let pruned = 0;
    for (const filePath of await listJsonFiles(this.scopeRoot())) {
      try {
        const raw = await readFile(filePath, "utf8");
        const envelope = JSON.parse(raw) as CacheEnvelope;
        if (
          envelope.expiresAt !== undefined &&
          envelope.expiresAt <= Date.now()
        ) {
          await rm(filePath, { force: true });
          pruned += 1;
        }
      } catch {
        await rm(filePath, { force: true });
        pruned += 1;
      }
    }
    return pruned;
  }

  private pathForKey(key: string): string {
    const digest = createHash("sha256").update(key).digest("hex");
    return path.join(this.scopeRoot(), digest.slice(0, 2), `${digest}.json`);
  }

  private scopeRoot(): string {
    return path.join(
      this.root,
      this.config.namespace ?? "default",
      this.config.version ?? "v1",
    );
  }
}

interface MemoryCacheEntry {
  readonly value: unknown;
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly bytes: number;
}

class MemoryAgentCache implements AgentCacheController {
  readonly config: AgentCacheConfig;
  private readonly store = new Map<string, MemoryCacheEntry>();

  constructor(options: MemoryCacheOptions = {}) {
    this.config = {
      type: "memory",
      ...(options.defaultTtlMs !== undefined && {
        defaultTtlMs: options.defaultTtlMs,
      }),
      ...(options.maxEntryBytes !== undefined && {
        maxEntryBytes: options.maxEntryBytes,
      }),
      namespace: options.namespace ?? "default",
      strategy: options.strategy ?? "auto",
    };
  }

  async get(key: string): Promise<unknown | undefined> {
    const entry = await this.getEntry(key);
    return entry.status === "hit" ? entry.value : undefined;
  }

  async getEntry(key: string): Promise<AgentCacheLookup> {
    const entry = this.store.get(key);
    if (!entry) return { status: "miss" };

    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return {
        status: "stale",
        bytes: entry.bytes,
        createdAt: entry.createdAt,
        expiresAt: entry.expiresAt,
      };
    }

    if (
      this.config.maxEntryBytes !== undefined &&
      entry.bytes > this.config.maxEntryBytes
    ) {
      return { status: "oversize", bytes: entry.bytes };
    }

    return {
      status: "hit",
      value: entry.value,
      bytes: entry.bytes,
      createdAt: entry.createdAt,
      ...(entry.expiresAt !== undefined && { expiresAt: entry.expiresAt }),
    };
  }

  async set(
    key: string,
    value: unknown,
    options: { readonly ttlMs?: number } = {},
  ): Promise<void> {
    const serialized = assertJsonSerializable(value, "AgentCache memory entry");
    const bytes = Buffer.byteLength(serialized, "utf8");

    if (
      this.config.maxEntryBytes !== undefined &&
      bytes > this.config.maxEntryBytes
    ) {
      throw new Error(
        `AgentCache entry exceeded maxEntryBytes (${bytes} > ${this.config.maxEntryBytes})`,
      );
    }

    const ttlMs = options.ttlMs ?? this.config.defaultTtlMs;
    this.store.set(key, {
      value,
      createdAt: Date.now(),
      bytes,
      ...(ttlMs !== undefined && { expiresAt: Date.now() + ttlMs }),
    });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async pruneExpired(): Promise<number> {
    let pruned = 0;
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
        this.store.delete(key);
        pruned += 1;
      }
    }
    return pruned;
  }
}

abstract class SerializedAgentCache implements AgentCacheController {
  abstract readonly config: AgentCacheConfig;

  async get(key: string): Promise<unknown | undefined> {
    const entry = await this.getEntry(key);
    return entry.status === "hit" ? entry.value : undefined;
  }

  async getEntry(key: string): Promise<AgentCacheLookup> {
    const record = await this.readRecord(key);
    if (!record) return { status: "miss" };

    if (record.expiresAt !== undefined && record.expiresAt <= Date.now()) {
      await this.delete(key);
      return {
        status: "stale",
        bytes: record.bytes,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
      };
    }

    if (
      this.config.maxEntryBytes !== undefined &&
      record.bytes > this.config.maxEntryBytes
    ) {
      return { status: "oversize", bytes: record.bytes };
    }

    try {
      const envelope = JSON.parse(record.payload) as CacheEnvelope;
      return {
        status: "hit",
        value: envelope.value,
        bytes: record.bytes,
        createdAt: record.createdAt,
        ...(record.expiresAt !== undefined && { expiresAt: record.expiresAt }),
      };
    } catch {
      return { status: "corrupt", bytes: record.bytes };
    }
  }

  async set(
    key: string,
    value: unknown,
    options: { readonly ttlMs?: number } = {},
  ): Promise<void> {
    const ttlMs = options.ttlMs ?? this.config.defaultTtlMs;
    const envelope: CacheEnvelope = {
      createdAt: Date.now(),
      ...(ttlMs !== undefined && { expiresAt: Date.now() + ttlMs }),
      value,
    };
    const payload = assertJsonSerializable(envelope, "AgentCache entry");
    const bytes = Buffer.byteLength(payload, "utf8");
    if (
      this.config.maxEntryBytes !== undefined &&
      bytes > this.config.maxEntryBytes
    ) {
      throw new Error(
        `AgentCache entry exceeded maxEntryBytes (${bytes} > ${this.config.maxEntryBytes})`,
      );
    }
    await this.writeRecord(key, {
      createdAt: envelope.createdAt,
      ...(envelope.expiresAt !== undefined && { expiresAt: envelope.expiresAt }),
      bytes,
      payload,
    });
  }

  abstract delete(key: string): Promise<boolean>;
  abstract clear(): Promise<void>;
  abstract pruneExpired(): Promise<number>;
  protected abstract readRecord(key: string): Promise<StoredCacheRecord | undefined>;
  protected abstract writeRecord(key: string, record: StoredCacheRecord): Promise<void>;
}

class RedisAgentCache extends SerializedAgentCache {
  readonly config: AgentCacheConfig;
  private readonly client: RedisCacheClientLike | undefined;
  private readonly url: string | undefined;
  private readonly ownsClient: boolean;
  private clientPromise: Promise<RedisCacheClientLike> | undefined;

  constructor(options: RedisCacheOptions) {
    super();
    this.client = "client" in options ? options.client : undefined;
    this.url = "url" in options ? options.url : undefined;
    this.ownsClient = this.client === undefined;
    this.config = distributedConfig("redis", options, {
      connection: this.url ? redactConnectionUrl(this.url) : "client",
    });
  }

  async delete(key: string): Promise<boolean> {
    return (await (await this.getClient()).del(this.key(key))) > 0;
  }

  async clear(): Promise<void> {
    const client = await this.getClient();
    for (const key of await this.keys()) await client.del(key);
  }

  async pruneExpired(): Promise<number> {
    let pruned = 0;
    for (const redisKey of await this.keys()) {
      const raw = await (await this.getClient()).get(redisKey);
      if (!raw) continue;
      try {
        const envelope = JSON.parse(raw) as CacheEnvelope;
        if (envelope.expiresAt !== undefined && envelope.expiresAt <= Date.now()) {
          await (await this.getClient()).del(redisKey);
          pruned += 1;
        }
      } catch {
        await (await this.getClient()).del(redisKey);
        pruned += 1;
      }
    }
    return pruned;
  }

  async withLock<T>(key: string, run: () => Promise<T>): Promise<T> {
    if (this.config.locking?.enabled !== true) return run();
    const client = await this.getClient();
    const lockKey = `${this.key(key)}:lock`;
    const token = randomUUID();
    const ttlMs = this.config.locking.ttlMs ?? 30_000;
    const waitMs = this.config.locking.waitMs ?? 0;
    const pollMs = this.config.locking.pollIntervalMs ?? 50;
    const deadline = Date.now() + waitMs;
    while (true) {
      const acquired = await client.set(lockKey, token, { NX: true, PX: ttlMs });
      if (acquired) break;
      if (Date.now() >= deadline) return run();
      await delay(pollMs);
    }
    try {
      return await run();
    } finally {
      await client.del(lockKey);
    }
  }

  protected async readRecord(key: string): Promise<StoredCacheRecord | undefined> {
    const payload = await (await this.getClient()).get(this.key(key));
    if (!payload) return undefined;
    const bytes = Buffer.byteLength(payload, "utf8");
    try {
      const envelope = JSON.parse(payload) as CacheEnvelope;
      return {
        createdAt: envelope.createdAt,
        ...(envelope.expiresAt !== undefined && { expiresAt: envelope.expiresAt }),
        bytes,
        payload,
      };
    } catch {
      return { createdAt: Date.now(), bytes, payload };
    }
  }

  protected async writeRecord(key: string, record: StoredCacheRecord): Promise<void> {
    const ttlMs = record.expiresAt === undefined ? undefined : Math.max(1, record.expiresAt - Date.now());
    const redisKey = this.key(key);
    if (ttlMs !== undefined) {
      await (await this.getClient()).set(redisKey, record.payload, { PX: ttlMs });
      return;
    }
    await (await this.getClient()).set(redisKey, record.payload);
  }

  private async getClient(): Promise<RedisCacheClientLike> {
    if (this.client) return this.client;
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const module = await importOptional<{ createClient: (options: { url: string }) => RedisCacheClientLike }>("redis", "AgentCache.redis");
        const client = module.createClient({ url: this.url! });
        await client.connect?.();
        return client;
      })();
    }
    return this.clientPromise;
  }

  private key(key: string): string {
    return scopedKey(this.config, key);
  }

  private async keys(): Promise<string[]> {
    const client = await this.getClient();
    const pattern = scopedKey(this.config, "*", false);
    if (client.keys) return client.keys(pattern);
    if (client.scanIterator) {
      const found: string[] = [];
      for await (const key of client.scanIterator({ MATCH: pattern })) found.push(key);
      return found;
    }
    return [];
  }
}

class PostgresAgentCache extends SerializedAgentCache {
  readonly config: AgentCacheConfig;
  private readonly pool: PostgresPoolLike | undefined;
  private readonly url: string | undefined;
  private poolPromise: Promise<PostgresPoolLike> | undefined;
  private initialized = false;
  private readonly tableName: string;

  constructor(options: PostgresCacheOptions) {
    super();
    this.pool = "pool" in options ? options.pool : undefined;
    this.url = "url" in options ? options.url : undefined;
    this.tableName = sanitizeSqlIdentifier(options.tableName ?? "agentcraft_cache");
    this.config = distributedConfig("postgres", options, {
      tableName: this.tableName,
      connection: this.url ? redactConnectionUrl(this.url) : "pool",
    });
  }

  async delete(key: string): Promise<boolean> {
    await this.ensureTable();
    const result = await (await this.getPool()).query(
      `DELETE FROM ${this.tableName} WHERE cache_key = $1 AND namespace = $2 AND version = $3`,
      [digestKey(key), this.config.namespace ?? "default", this.config.version ?? "v1"],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async clear(): Promise<void> {
    await this.ensureTable();
    await (await this.getPool()).query(
      `DELETE FROM ${this.tableName} WHERE namespace = $1 AND version = $2`,
      [this.config.namespace ?? "default", this.config.version ?? "v1"],
    );
  }

  async pruneExpired(): Promise<number> {
    await this.ensureTable();
    const result = await (await this.getPool()).query(
      `DELETE FROM ${this.tableName} WHERE expires_at IS NOT NULL AND expires_at <= $1`,
      [Date.now()],
    );
    return result.rowCount ?? 0;
  }

  async withLock<T>(key: string, run: () => Promise<T>): Promise<T> {
    if (this.config.locking?.enabled !== true) return run();
    const pool = await this.getPool();
    const lockId = advisoryLockId(key);
    const waitMs = this.config.locking.waitMs ?? 0;
    const pollMs = this.config.locking.pollIntervalMs ?? 50;
    const deadline = Date.now() + waitMs;
    while (true) {
      const result = await pool.query("SELECT pg_try_advisory_lock($1) AS locked", [lockId]);
      if (Boolean((result.rows[0] as { locked?: boolean } | undefined)?.locked)) break;
      if (Date.now() >= deadline) return run();
      await delay(pollMs);
    }
    try {
      return await run();
    } finally {
      await pool.query("SELECT pg_advisory_unlock($1)", [lockId]);
    }
  }

  protected async readRecord(key: string): Promise<StoredCacheRecord | undefined> {
    await this.ensureTable();
    const result = await (await this.getPool()).query(
      `SELECT created_at, expires_at, bytes, value_json FROM ${this.tableName} WHERE cache_key = $1 AND namespace = $2 AND version = $3`,
      [digestKey(key), this.config.namespace ?? "default", this.config.version ?? "v1"],
    );
    const row = result.rows[0] as
      | { created_at: number | string; expires_at?: number | string | null; bytes: number | string; value_json: string }
      | undefined;
    if (!row) return undefined;
    return {
      createdAt: Number(row.created_at),
      ...(row.expires_at !== undefined && row.expires_at !== null && { expiresAt: Number(row.expires_at) }),
      bytes: Number(row.bytes),
      payload: row.value_json,
    };
  }

  protected async writeRecord(key: string, record: StoredCacheRecord): Promise<void> {
    await this.ensureTable();
    await (await this.getPool()).query(
      `INSERT INTO ${this.tableName} (cache_key, namespace, version, created_at, expires_at, bytes, value_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (cache_key, namespace, version)
       DO UPDATE SET created_at = EXCLUDED.created_at, expires_at = EXCLUDED.expires_at, bytes = EXCLUDED.bytes, value_json = EXCLUDED.value_json`,
      [
        digestKey(key),
        this.config.namespace ?? "default",
        this.config.version ?? "v1",
        record.createdAt,
        record.expiresAt ?? null,
        record.bytes,
        record.payload,
      ],
    );
  }

  private async ensureTable(): Promise<void> {
    if (this.initialized) return;
    await (await this.getPool()).query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        cache_key TEXT NOT NULL,
        namespace TEXT NOT NULL,
        version TEXT NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT,
        bytes INTEGER NOT NULL,
        value_json TEXT NOT NULL,
        PRIMARY KEY (cache_key, namespace, version)
      )
    `);
    this.initialized = true;
  }

  private async getPool(): Promise<PostgresPoolLike> {
    if (this.pool) return this.pool;
    if (!this.poolPromise) {
      this.poolPromise = (async () => {
        const module = await importOptional<{ Pool: new (options: { connectionString: string }) => PostgresPoolLike }>("pg", "AgentCache.postgres");
        return new module.Pool({ connectionString: this.url! });
      })();
    }
    return this.poolPromise;
  }
}

class SQLiteAgentCache extends SerializedAgentCache {
  readonly config: AgentCacheConfig;
  private readonly db: SQLiteDatabase;
  private readonly tableName: string;

  constructor(options: SQLiteCacheOptions) {
    super();
    const require = createRequire(import.meta.url);
    let Database: DatabaseFactory;
    try {
      Database = require("better-sqlite3") as DatabaseFactory;
    } catch {
      throw new Error(
        "AgentCache.sqlite requires optional peer dependency 'better-sqlite3'. Install it with: npm install better-sqlite3",
      );
    }
    this.tableName = sanitizeSqlIdentifier(options.tableName ?? "agentcraft_cache");
    this.config = distributedConfig("sqlite", options, {
      root: path.resolve(options.filePath),
      tableName: this.tableName,
      connection: "file",
    });
    this.db = new Database(options.filePath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        cache_key TEXT NOT NULL,
        namespace TEXT NOT NULL,
        version TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER,
        bytes INTEGER NOT NULL,
        value_json TEXT NOT NULL,
        PRIMARY KEY (cache_key, namespace, version)
      )
    `);
  }

  async delete(key: string): Promise<boolean> {
    return this.statement("DELETE FROM", "WHERE cache_key = ? AND namespace = ? AND version = ?")
      .run(digestKey(key), this.config.namespace ?? "default", this.config.version ?? "v1").changes > 0;
  }

  async clear(): Promise<void> {
    this.statement("DELETE FROM", "WHERE namespace = ? AND version = ?")
      .run(this.config.namespace ?? "default", this.config.version ?? "v1");
  }

  async pruneExpired(): Promise<number> {
    return this.statement("DELETE FROM", "WHERE expires_at IS NOT NULL AND expires_at <= ?")
      .run(Date.now()).changes;
  }

  async withLock<T>(_key: string, run: () => Promise<T>): Promise<T> {
    return run();
  }

  protected async readRecord(key: string): Promise<StoredCacheRecord | undefined> {
    const row = this.statement("SELECT created_at, expires_at, bytes, value_json FROM", "WHERE cache_key = ? AND namespace = ? AND version = ?")
      .get(digestKey(key), this.config.namespace ?? "default", this.config.version ?? "v1") as
      | { created_at: number; expires_at?: number | null; bytes: number; value_json: string }
      | undefined;
    if (!row) return undefined;
    return {
      createdAt: row.created_at,
      ...(row.expires_at !== undefined && row.expires_at !== null && { expiresAt: row.expires_at }),
      bytes: row.bytes,
      payload: row.value_json,
    };
  }

  protected async writeRecord(key: string, record: StoredCacheRecord): Promise<void> {
    this.statement(
      `INSERT INTO`,
      `(cache_key, namespace, version, created_at, expires_at, bytes, value_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(cache_key, namespace, version)
       DO UPDATE SET created_at = excluded.created_at, expires_at = excluded.expires_at, bytes = excluded.bytes, value_json = excluded.value_json`,
    ).run(
      digestKey(key),
      this.config.namespace ?? "default",
      this.config.version ?? "v1",
      record.createdAt,
      record.expiresAt ?? null,
      record.bytes,
      record.payload,
    );
  }

  private statement(prefix: string, suffix: string): SQLiteStatement {
    return this.db.prepare(`${prefix} ${this.tableName} ${suffix}`);
  }
}

type SQLiteStatement = {
  run: (...args: unknown[]) => { changes: number };
  get: (...args: unknown[]) => unknown;
  all: (...args: unknown[]) => unknown[];
};

type SQLiteDatabase = {
  exec: (sql: string) => void;
  pragma: (sql: string) => void;
  prepare: (sql: string) => SQLiteStatement;
};

type DatabaseFactory = new (path: string) => SQLiteDatabase;

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

async function warmAgentCache(
  agent: Pick<Agent, "run">,
  prompts: readonly (string | AgentRunParams)[],
  options: AgentCacheWarmOptions,
): Promise<AgentCacheWarmResult> {
  const dryRun = options.dryRun === true;
  const concurrency = Math.max(1, options.concurrency ?? 2);
  const errors: string[] = [];
  let cursor = 0;
  let succeeded = 0;
  let failed = 0;
  let cost = 0;
  let tokensUsed: TokenUsage = { prompt: 0, completion: 0, total: 0 };
  let cache = { hits: 0, misses: 0, writes: 0 };

  if (dryRun) {
    return {
      dryRun,
      attempted: prompts.length,
      succeeded: prompts.length,
      failed: 0,
      cost: 0,
      tokensUsed: prompts.reduce<TokenUsage>(
        (sum, prompt) => {
          const text = typeof prompt === "string" ? prompt : prompt.prompt ?? "";
          const estimate = Math.ceil(text.length / 4);
          return {
            prompt: sum.prompt + estimate,
            completion: sum.completion,
            total: sum.total + estimate,
          };
        },
        { prompt: 0, completion: 0, total: 0 },
      ),
      cache,
      errors,
    };
  }

  async function worker(): Promise<void> {
    while (cursor < prompts.length) {
      const index = cursor++;
      const prompt = prompts[index]!;
      try {
        const response = await agent.run(
          typeof prompt === "string" ? { prompt } : prompt,
        );
        succeeded++;
        cost += response.cost;
        tokensUsed = addTokens(tokensUsed, response.tokensUsed);
        cache = {
          hits: cache.hits + (response.cache?.hits ?? 0),
          misses: cache.misses + (response.cache?.misses ?? 0),
          writes: cache.writes + (response.cache?.writes ?? 0),
        };
      } catch (error) {
        failed++;
        errors.push(error instanceof Error ? error.message : String(error));
        if (options.stopOnError !== false) break;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, prompts.length) }, () => worker()));
  return {
    dryRun,
    attempted: prompts.length,
    succeeded,
    failed,
    cost,
    tokensUsed,
    cache,
    errors,
  };
}

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

export function createCacheKey(parts: readonly unknown[]): string {
  return stableStringify(parts);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "function" || typeof value === "symbol")
      throw new Error("AgentCache keys must be JSON-serializable.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value))
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

function distributedConfig(
  type: AgentCacheConfig["type"],
  options: DistributedCacheBaseOptions,
  extra: Pick<AgentCacheConfig, "root" | "tableName" | "connection"> = {},
): AgentCacheConfig {
  return {
    type,
    strategy: options.strategy ?? "auto",
    namespace: sanitizePathSegment(options.namespace ?? "default"),
    version: sanitizePathSegment(options.version ?? "v1"),
    ...(options.defaultTtlMs !== undefined && {
      defaultTtlMs: options.defaultTtlMs,
    }),
    ...(options.maxEntryBytes !== undefined && {
      maxEntryBytes: options.maxEntryBytes,
    }),
    ...(options.keyPrefix !== undefined && { keyPrefix: sanitizePathSegment(options.keyPrefix) }),
    ...(options.locking !== undefined && { locking: options.locking }),
    ...extra,
  };
}

function scopedKey(config: AgentCacheConfig, key: string, digest = true): string {
  const prefix = config.keyPrefix ?? "agentcraft-cache";
  const namespace = sanitizePathSegment(config.namespace ?? "default");
  const version = sanitizePathSegment(config.version ?? "v1");
  const suffix = digest ? digestKey(key) : key;
  return `${prefix}:${namespace}:${version}:${suffix}`;
}

function digestKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function redactConnectionUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.username) url.username = "[REDACTED]";
    if (url.password) url.password = "[REDACTED]";
    for (const key of [...url.searchParams.keys()]) {
      if (/key|token|secret|password|signature/i.test(key)) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return url.toString();
  } catch {
    return "[REDACTED_URL]";
  }
}

async function importOptional<T>(packageName: string, feature: string): Promise<T> {
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)") as (
      specifier: string,
    ) => Promise<T>;
    return await dynamicImport(packageName);
  } catch {
    throw new Error(
      `${feature} requires optional dependency '${packageName}'. Install it with: npm install ${packageName}`,
    );
  }
}

function sanitizeSqlIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier '${value}'. Use letters, numbers, and underscores only.`);
  }
  return value;
}

function advisoryLockId(value: string): number {
  const digest = createHash("sha256").update(value).digest();
  return digest.readInt32BE(0);
}

function addTokens(left: TokenUsage, right: TokenUsage): TokenUsage {
  return {
    prompt: left.prompt + right.prompt,
    completion: left.completion + right.completion,
    total: left.total + right.total,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizePathSegment(value: string): string {
  const sanitized = value
    .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "default";
}

function assertJsonSerializable(value: unknown, label: string): string {
  const seen = new WeakSet<object>();
  validateJsonValue(value, label, seen);
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new Error(`${label} must be JSON-serializable.`);
  }
  return serialized;
}

function validateJsonValue(
  value: unknown,
  label: string,
  seen: WeakSet<object>,
): void {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    if (typeof value === "number" && !Number.isFinite(value)) {
      throw new Error(`${label} contains a non-finite number.`);
    }
    return;
  }
  if (typeof value === "bigint") {
    throw new Error(`${label} contains a bigint value.`);
  }
  if (typeof value === "function" || typeof value === "symbol") {
    throw new Error(
      `${label} must be JSON-serializable; found a non-serializable ${typeof value}.`,
    );
  }
  if (value === undefined) {
    throw new Error(`${label} contains undefined.`);
  }
  if (typeof value !== "object") return;
  if (seen.has(value)) throw new Error(`${label} contains a circular value.`);
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateJsonValue(item, `${label}[${index}]`, seen),
    );
    seen.delete(value);
    return;
  }
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    validateJsonValue(item, `${label}.${key}`, seen);
  }
  seen.delete(value);
}

async function listJsonFiles(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }
  return files;
}
