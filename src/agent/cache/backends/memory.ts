import type { AgentCacheConfig, AgentCacheController, AgentCacheLookup, MemoryCacheOptions } from "../types.js";
import { assertJsonSerializable } from "../validation.js";

interface MemoryCacheEntry {
  readonly value: unknown;
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly bytes: number;
}

export class MemoryAgentCache implements AgentCacheController {
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
