import { createRequire } from "node:module";
import * as path from "node:path";
import { digestKey, distributedConfig, sanitizeSqlIdentifier } from "../key.js";
import type { SQLiteCacheOptions, StoredCacheRecord } from "../types.js";
import { SerializedAgentCache } from "./serialized.js";

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

export class SQLiteAgentCache extends SerializedAgentCache {
  readonly config;
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
