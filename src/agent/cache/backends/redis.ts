import { randomUUID } from "node:crypto";
import { distributedConfig, redactConnectionUrl, scopedKey } from "../key.js";
import type { CacheEnvelope, RedisCacheClientLike, RedisCacheOptions, StoredCacheRecord } from "../types.js";
import { delay, importOptional } from "../utils.js";
import { SerializedAgentCache } from "./serialized.js";

export class RedisAgentCache extends SerializedAgentCache {
  readonly config;
  private readonly client: RedisCacheClientLike | undefined;
  private readonly url: string | undefined;
  private clientPromise: Promise<RedisCacheClientLike> | undefined;

  constructor(options: RedisCacheOptions) {
    super();
    this.client = "client" in options ? options.client : undefined;
    this.url = "url" in options ? options.url : undefined;
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
