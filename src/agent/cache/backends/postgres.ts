import {
  advisoryLockId,
  digestKey,
  distributedConfig,
  redactConnectionUrl,
  sanitizeSqlIdentifier,
} from "../key.js";
import type { PostgresCacheOptions, PostgresPoolLike, StoredCacheRecord } from "../types.js";
import { delay, importOptional } from "../utils.js";
import { SerializedAgentCache } from "./serialized.js";

export class PostgresAgentCache extends SerializedAgentCache {
  readonly config;
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
