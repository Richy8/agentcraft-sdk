import { mkdtemp } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AgentCache } from "../index.js";
import type { PostgresPoolLike, RedisCacheClientLike } from "../index.js";

async function tempRoot(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "agentcraft-cache-backends-"));
}

describe("AgentCache backends", () => {
  it("persists file cache entries and prunes expired records", async () => {
    const cache = AgentCache.file(await tempRoot(), { namespace: "tests" });

    await cache.set!("stable", { value: 1 });
    await cache.set!("short", { value: 2 }, { ttlMs: 1 });
    await new Promise((resolve) => setTimeout(resolve, 10));

    await expect(cache.getEntry!("stable")).resolves.toMatchObject({
      status: "hit",
      value: { value: 1 },
    });
    await expect(cache.pruneExpired!()).resolves.toBe(1);
    await expect(cache.getEntry!("short")).resolves.toMatchObject({ status: "miss" });
  });

  it("supports Redis-compatible clients without requiring the redis package", async () => {
    const store = new Map<string, string>();
    const client: RedisCacheClientLike = {
      get: vi.fn(async (key) => store.get(key) ?? null),
      set: vi.fn(async (key, value) => {
        store.set(key, value);
        return "OK";
      }),
      del: vi.fn(async (key) => (store.delete(key) ? 1 : 0)),
      keys: vi.fn(async () => [...store.keys()]),
    };
    const cache = AgentCache.redis({ client, namespace: "redis-test" });

    await cache.set!("redis-key", { ok: true });

    await expect(cache.getEntry!("redis-key")).resolves.toMatchObject({
      status: "hit",
      value: { ok: true },
    });
    expect(client.set).toHaveBeenCalled();
  });

  it("supports Postgres-compatible pools and namespaces rows by digest", async () => {
    const rows = new Map<string, Record<string, unknown>>();
    const pool: PostgresPoolLike = {
      query: vi.fn(async (sql, params = []) => {
        if (sql.includes("CREATE TABLE")) return { rows: [], rowCount: 0 };
        if (sql.startsWith("INSERT")) {
          const key = `${params[0]}:${params[1]}:${params[2]}`;
          rows.set(key, {
            created_at: params[3],
            expires_at: params[4],
            bytes: params[5],
            value_json: params[6],
          });
          return { rows: [], rowCount: 1 };
        }
        if (sql.startsWith("SELECT")) {
          const key = `${params[0]}:${params[1]}:${params[2]}`;
          const row = rows.get(key);
          return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
        }
        if (sql.startsWith("DELETE FROM") && sql.includes("cache_key")) {
          const key = `${params[0]}:${params[1]}:${params[2]}`;
          const existed = rows.delete(key);
          return { rows: [], rowCount: existed ? 1 : 0 };
        }
        return { rows: [], rowCount: 0 };
      }),
    };
    const cache = AgentCache.postgres({ pool, namespace: "pg-test" });

    await cache.set!("pg-key", { ok: "pg" });

    await expect(cache.getEntry!("pg-key")).resolves.toMatchObject({
      status: "hit",
      value: { ok: "pg" },
    });
    expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("CREATE TABLE"));
  });
});
