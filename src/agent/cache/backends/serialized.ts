import type { AgentCacheConfig, AgentCacheController, AgentCacheLookup } from "../types.js";
import type { CacheEnvelope, StoredCacheRecord } from "../types.js";
import { assertJsonSerializable } from "../validation.js";

export abstract class SerializedAgentCache implements AgentCacheController {
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
