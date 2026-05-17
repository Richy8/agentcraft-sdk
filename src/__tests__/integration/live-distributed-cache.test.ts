import { describe, expect, it } from "vitest";
import { AgentCache } from "../../agent/cache.js";

const integrationEnabled = process.env.INTEGRATION_TESTS === "true";
const redisUrl = process.env.AGENTCRAFT_LIVE_REDIS_URL;
const postgresUrl =
  process.env.AGENTCRAFT_LIVE_POSTGRES_URL ??
  process.env.AGENTCRAFT_LIVE_SUPABASE_DB_URL;

describe("live distributed cache", () => {
  const redisIt = integrationEnabled && redisUrl ? it : it.skip;
  const postgresIt = integrationEnabled && postgresUrl ? it : it.skip;

  redisIt("reads and writes through Redis URL mode", async () => {
    const cache = AgentCache.redis({
      url: redisUrl!,
      namespace: "agentcraft-live-test",
      defaultTtlMs: 60_000,
    });
    await cache.set!("redis-live", { ok: true });
    await expect(cache.get!("redis-live")).resolves.toEqual({ ok: true });
    await cache.delete!("redis-live");
  });

  postgresIt("reads and writes through Postgres URL mode", async () => {
    const cache = AgentCache.postgres({
      url: postgresUrl!,
      tableName: "agentcraft_cache_live_test",
      namespace: "agentcraft-live-test",
      defaultTtlMs: 60_000,
    });
    await cache.set!("postgres-live", { ok: true });
    await expect(cache.get!("postgres-live")).resolves.toEqual({ ok: true });
    await cache.delete!("postgres-live");
  });
});
