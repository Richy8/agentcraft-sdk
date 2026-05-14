import { describe, expect, it } from "vitest";
import { AgentCache } from "../agent/cache.js";

describe("AgentCache.memory()", () => {
  it("returns a cache controller with type memory", () => {
    const cache = AgentCache.memory();
    expect(cache.config.type).toBe("memory");
  });

  it("stores and retrieves values", async () => {
    const cache = AgentCache.memory();
    await cache.set!("key1", { data: "hello" });
    await expect(cache.get!("key1")).resolves.toEqual({ data: "hello" });
  });

  it("returns miss for unknown key", async () => {
    const cache = AgentCache.memory();
    await expect(cache.getEntry!("nonexistent")).resolves.toMatchObject({
      status: "miss",
    });
  });

  it("expires entries after TTL", async () => {
    const cache = AgentCache.memory();
    await cache.set!("exp", "value", { ttlMs: 1 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await expect(cache.getEntry!("exp")).resolves.toMatchObject({
      status: "stale",
    });
    await expect(cache.get!("exp")).resolves.toBeUndefined();
  });

  it("throws when entry exceeds maxEntryBytes", async () => {
    const cache = AgentCache.memory({ maxEntryBytes: 10 });
    await expect(cache.set!("big", "a".repeat(100))).rejects.toThrow(
      "maxEntryBytes",
    );
  });

  it("rejects top-level non-serializable values", async () => {
    const cache = AgentCache.memory();
    await expect(cache.set!("fn", () => "nope")).rejects.toThrow(
      "JSON-serializable",
    );
  });

  it("deletes and clears entries", async () => {
    const cache = AgentCache.memory();
    await cache.set!("a", 1);
    await expect(cache.delete!("a")).resolves.toBe(true);
    await expect(cache.get!("a")).resolves.toBeUndefined();
    await cache.set!("b", 2);
    await cache.clear!();
    await expect(cache.get!("b")).resolves.toBeUndefined();
  });

  it("creates independent cache instances", async () => {
    const first = AgentCache.memory();
    const second = AgentCache.memory();

    await first.set!("shared-key", "first");

    await expect(first.get!("shared-key")).resolves.toBe("first");
    await expect(second.get!("shared-key")).resolves.toBeUndefined();
  });

  it("prunes expired entries and returns count", async () => {
    const cache = AgentCache.memory();
    await cache.set!("x", 1, { ttlMs: 1 });
    await cache.set!("y", 2);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await expect(cache.pruneExpired!()).resolves.toBe(1);
    await expect(cache.get!("y")).resolves.toBe(2);
  });
});
