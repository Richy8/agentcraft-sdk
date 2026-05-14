import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { AgentCache, createCacheKey } from "../cache.js";
import { Agent } from "../agent.js";
import { Provider } from "../provider-catalog.js";
import { createAdapter, tool } from "../adapters/index.js";

describe("AgentCache", () => {
  it("reads, writes, expires, and isolates keys", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "agentcraft-cache-"));
    const cache = AgentCache.file(root, { defaultTtlMs: 1_000 });

    await cache.set!("a", { value: 1 });
    await cache.set!("b", { value: 2 }, { ttlMs: 10 });
    expect(await cache.get!("a")).toEqual({ value: 1 });
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(await cache.get!("b")).toBeUndefined();
    expect(await cache.get!("missing")).toBeUndefined();
    await rm(root, { recursive: true, force: true });
  });

  it("uses deterministic keys, namespaces, versions, invalidation, and pruning", async () => {
    const root = await mkdtemp(
      path.join(tmpdir(), "agentcraft-cache-namespace-"),
    );
    const v1 = AgentCache.file(root, {
      namespace: "tenant/a",
      version: "skills:v1",
    });
    const v2 = AgentCache.file(root, {
      namespace: "tenant/a",
      version: "skills:v2",
    });
    const keyA = createCacheKey([{ b: 2, a: 1 }]);
    const keyB = createCacheKey([{ a: 1, b: 2 }]);

    expect(keyA).toBe(keyB);
    await v1.set!(keyA, { value: "v1" });
    await v2.set!(keyA, { value: "v2" });
    expect(await v1.get!(keyA)).toEqual({ value: "v1" });
    expect(await v2.get!(keyA)).toEqual({ value: "v2" });

    expect(await v1.delete!(keyA)).toBe(true);
    expect(await v1.get!(keyA)).toBeUndefined();
    expect(await v2.get!(keyA)).toEqual({ value: "v2" });

    const expiring = AgentCache.file(root, {
      namespace: "tenant/a",
      version: "short",
      defaultTtlMs: 1,
    });
    await expiring.set!("stale", { value: true });
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(await expiring.pruneExpired!()).toBe(1);
    expect(await expiring.get!("stale")).toBeUndefined();

    await v2.clear!();
    expect(await v2.get!(keyA)).toBeUndefined();
    await rm(root, { recursive: true, force: true });
  });

  it("reports corrupt and oversize cache entries without replaying them", async () => {
    const root = await mkdtemp(
      path.join(tmpdir(), "agentcraft-cache-corrupt-"),
    );
    const cache = AgentCache.file(root, { maxEntryBytes: 20 });
    await expect(
      cache.set!("too-big", { value: "this value is too large" }),
    ).rejects.toThrow(/maxEntryBytes/);

    const normal = AgentCache.file(root);
    await normal.set!("corrupt-me", { ok: true });
    const filePath = path.join(
      root,
      "default",
      "v1",
      createHashPathSegment("corrupt-me"),
      `${createHashDigest("corrupt-me")}.json`,
    );
    await writeFile(filePath, "{not-json", "utf8");
    await expect(normal.getEntry!("corrupt-me")).resolves.toMatchObject({
      status: "corrupt",
    });
    await rm(root, { recursive: true, force: true });
  });

  it("caches safe read tools but never replays write side effects", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "agentcraft-cache-tools-"));
    let readCalls = 0;
    let writeCalls = 0;
    const adapter = createAdapter({
      name: "cache-fixture",
      tools: [
        tool({
          name: "read_fixture",
          description: "Read fixture.",
          security: { sideEffect: "read" },
          params: {},
          run: async () => ({ calls: ++readCalls }),
        }),
        tool({
          name: "write_fixture",
          description: "Write fixture.",
          security: { sideEffect: "write" },
          params: {},
          run: async () => ({ calls: ++writeCalls }),
        }),
      ],
    });
    const agent = Agent.create({
      model: Provider.ollama["llama3.2"],
      cache: AgentCache.file(root),
    }).use(adapter);
    const tools = await (
      agent as unknown as {
        collectTools: (params: { prompt: string }) => Promise<
          Array<{
            name: string;
            execute: (args: Record<string, unknown>) => Promise<unknown>;
          }>
        >;
      }
    ).collectTools({ prompt: "cache" });
    const readTool = tools.find((item) => item.name === "read_fixture")!;
    const writeTool = tools.find((item) => item.name === "write_fixture")!;

    await readTool.execute({});
    await readTool.execute({});
    await writeTool.execute({});
    await writeTool.execute({});

    expect(readCalls).toBe(1);
    expect(writeCalls).toBe(2);
    await rm(root, { recursive: true, force: true });
  });

  it("deduplicates concurrent cache misses for the same safe tool call", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "agentcraft-cache-dedupe-"));
    let calls = 0;
    const adapter = createAdapter({
      name: "dedupe-fixture",
      tools: [
        tool({
          name: "read_dedupe_fixture",
          description: "Read fixture.",
          security: { sideEffect: "read" },
          params: {},
          run: async () => {
            calls += 1;
            await new Promise((resolve) => setTimeout(resolve, 10));
            return { calls };
          },
        }),
      ],
    });
    const agent = Agent.create({
      model: Provider.ollama["llama3.2"],
      cache: AgentCache.file(root),
    }).use(adapter);
    const [readTool] = await (
      agent as unknown as {
        collectTools: (params: { prompt: string }) => Promise<
          Array<{
            execute: (args: Record<string, unknown>) => Promise<unknown>;
          }>
        >;
      }
    ).collectTools({ prompt: "cache" });

    const [first, second] = await Promise.all([
      readTool!.execute({}),
      readTool!.execute({}),
    ]);

    expect(first).toEqual({ calls: 1 });
    expect(second).toEqual({ calls: 1 });
    expect(calls).toBe(1);
    await rm(root, { recursive: true, force: true });
  });

  it("supports per-run cache bypass", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "agentcraft-cache-bypass-"));
    let calls = 0;
    const adapter = createAdapter({
      name: "bypass-fixture",
      tools: [
        tool({
          name: "read_bypass_fixture",
          description: "Read fixture.",
          security: { sideEffect: "read" },
          params: {},
          run: async () => ({ calls: ++calls }),
        }),
      ],
    });
    const agent = Agent.create({
      model: Provider.ollama["llama3.2"],
      cache: AgentCache.file(root),
    }).use(adapter);
    const collect = (params: {
      prompt: string;
      cache?: false | { bypass?: boolean };
    }) =>
      (
        agent as unknown as {
          collectTools: (params: typeof params) => Promise<
            Array<{
              execute: (args: Record<string, unknown>) => Promise<unknown>;
            }>
          >;
        }
      ).collectTools(params);

    await (await collect({ prompt: "cache" }))[0]!.execute({});
    await (
      await collect({ prompt: "cache", cache: { bypass: true } })
    )[0]!.execute({});
    expect(calls).toBe(2);
    await rm(root, { recursive: true, force: true });
  });

  it("enforces required cache hits for configured tools", async () => {
    let calls = 0;
    const adapter = createAdapter({
      name: "required-cache-fixture",
      tools: [
        tool({
          name: "read_required_cache_fixture",
          description: "Read fixture.",
          security: { sideEffect: "read" },
          params: {
            value: { type: "string", description: "Cache key value." },
          },
          run: async (args) => ({ value: args.value, calls: ++calls }),
        }),
      ],
    });
    const agent = Agent.create({
      model: Provider.ollama["llama3.2"],
      cache: AgentCache.memory(),
    }).use(adapter);
    const collect = (value: string) =>
      (
        agent as unknown as {
          collectTools: (params: {
            prompt: string;
            budget?: { cachePolicy?: { requireCachedFor?: string[] } };
          }) => Promise<
            Array<{
              execute: (args: Record<string, unknown>) => Promise<unknown>;
            }>
          >;
        }
      ).collectTools({
        prompt: "cache",
        budget: {
          cachePolicy: {
            requireCachedFor: ["read_required_cache_fixture"],
          },
        },
      });

    const [primingTool] = await (
      agent as unknown as {
        collectTools: (params: { prompt: string }) => Promise<
          Array<{
            execute: (args: Record<string, unknown>) => Promise<unknown>;
          }>
        >;
      }
    ).collectTools({ prompt: "cache" });
    await primingTool!.execute({ value: "cached" });

    await expect(
      (await collect("cached"))[0]!.execute({ value: "cached" }),
    ).resolves.toEqual({
      value: "cached",
      calls: 1,
    });
    await expect(
      (await collect("uncached"))[0]!.execute({ value: "uncached" }),
    ).rejects.toMatchObject({
      code: "QUOTA_EXCEEDED",
      context: {
        budget: "cachePolicy.requireCachedFor",
        toolName: "read_required_cache_fixture",
      },
    });
    expect(calls).toBe(1);
  });
});

function createHashDigest(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function createHashPathSegment(key: string): string {
  return createHashDigest(key).slice(0, 2);
}
