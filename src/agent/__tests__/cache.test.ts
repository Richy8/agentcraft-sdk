import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AgentCache, createCacheKey, summarizeCacheStats } from "../cache.js";
import { Agent } from "../agent.js";
import { Provider } from "../provider-catalog.js";
import { createAdapter, tool } from "../adapters/index.js";
import { AgentWorkflow, AgentStep } from "../workflow/index.js";
import { AgentWorkspace } from "../workspace.js";
import type { LLMResponse } from "../../types/provider.types.js";

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

  it("applies cache strategy semantics to tool eligibility", async () => {
    let readCalls = 0;
    let externalCalls = 0;
    const adapter = createAdapter({
      name: "strategy-fixture",
      tools: [
        tool({
          name: "read_strategy_fixture",
          description: "Read fixture.",
          security: { sideEffect: "read" },
          params: {},
          run: async () => ({ calls: ++readCalls }),
        }),
        tool({
          name: "safe_read_strategy_fixture",
          description: "Safe deterministic read fixture.",
          security: {
            sideEffect: "read",
            cache: { safe: true, deterministic: true },
          },
          params: {},
          run: async () => ({ calls: ++readCalls }),
        }),
        tool({
          name: "external_strategy_fixture",
          description: "External fixture.",
          security: { sideEffect: "external" },
          params: {},
          run: async () => ({ calls: ++externalCalls }),
        }),
      ],
    });

    const conservative = Agent.create({
      model: Provider.ollama["llama3.2"],
      cache: AgentCache.memory({
        namespace: "conservative",
        strategy: "conservative",
      }),
    }).use(adapter);

    const conservativeTools = await (
      conservative as unknown as {
        collectTools: (params: { prompt: string }) => Promise<
          Array<{
            name: string;
            execute: (args: Record<string, unknown>) => Promise<unknown>;
          }>
        >;
      }
    ).collectTools({ prompt: "cache" });
    await conservativeTools.find((item) => item.name === "read_strategy_fixture")!.execute({});
    await conservativeTools.find((item) => item.name === "read_strategy_fixture")!.execute({});
    await conservativeTools.find((item) => item.name === "safe_read_strategy_fixture")!.execute({});
    await conservativeTools.find((item) => item.name === "safe_read_strategy_fixture")!.execute({});

    const aggressive = Agent.create({
      model: Provider.ollama["llama3.2"],
      cache: AgentCache.memory({ namespace: "aggressive", strategy: "aggressive" }),
    }).use(adapter);
    const aggressiveTools = await (
      aggressive as unknown as {
        collectTools: (params: { prompt: string }) => Promise<
          Array<{
            name: string;
            execute: (args: Record<string, unknown>) => Promise<unknown>;
          }>
        >;
      }
    ).collectTools({ prompt: "cache" });
    await aggressiveTools.find((item) => item.name === "external_strategy_fixture")!.execute({});
    await aggressiveTools.find((item) => item.name === "external_strategy_fixture")!.execute({});

    expect(readCalls).toBe(3);
    expect(externalCalls).toBe(1);
  });

  it("summarizes cache efficiency metrics", () => {
    const summary = summarizeCacheStats(
      {
        hits: 3,
        misses: 1,
        writes: 1,
        skippedUnsafe: 0,
        stale: 0,
        corrupt: 0,
        oversized: 0,
        toolCallsAvoided: 3,
        estimatedSavedTokens: 120,
      },
      { estimatedCostPerToken: 0.000001, estimatedToolCallCost: 0.002 },
    );

    expect(summary.hitRate).toBe(0.75);
    expect(summary.missRate).toBe(0.25);
    expect(summary.avoidedCallRate).toBe(0.75);
    expect(summary.estimatedCostSaved).toBeCloseTo(0.00612);
  });

  it("supports custom cache controllers", async () => {
    const backing = new Map<string, unknown>();
    const cache = AgentCache.custom({
      config: { type: "custom", namespace: "test" },
      get: async (key) => backing.get(key),
      set: async (key, value) => {
        backing.set(key, value);
      },
    });

    await cache.set!("a", { ok: true });
    await expect(cache.get!("a")).resolves.toEqual({ ok: true });
  });

  it("supports Redis client mode with a minimal mocked client", async () => {
    const store = new Map<string, string>();
    const client = {
      get: async (key: string) => store.get(key) ?? null,
      set: async (key: string, value: string) => {
        store.set(key, value);
        return "OK";
      },
      del: async (key: string) => (store.delete(key) ? 1 : 0),
      keys: async () => [...store.keys()],
    };
    const cache = AgentCache.redis({ client, namespace: "redis-test" });

    await cache.set!("hello", { value: 1 });
    await expect(cache.get!("hello")).resolves.toEqual({ value: 1 });
    await expect(cache.delete!("hello")).resolves.toBe(true);
  });

  it("supports Postgres pool mode with a minimal mocked pool", async () => {
    const rows = new Map<string, Record<string, unknown>>();
    const pool = {
      query: async (sql: string, params: readonly unknown[] = []) => {
        if (sql.startsWith("CREATE TABLE")) return { rows: [], rowCount: 0 };
        if (sql.startsWith("INSERT INTO")) {
          rows.set(String(params[0]), {
            created_at: params[3],
            expires_at: params[4],
            bytes: params[5],
            value_json: params[6],
          });
          return { rows: [], rowCount: 1 };
        }
        if (sql.startsWith("SELECT created_at")) {
          const row = rows.get(String(params[0]));
          return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
        }
        if (sql.startsWith("DELETE FROM")) {
          const deleted = rows.delete(String(params[0]));
          return { rows: [], rowCount: deleted ? 1 : 0 };
        }
        return { rows: [], rowCount: 0 };
      },
    };
    const cache = AgentCache.postgres({ pool, tableName: "agentcraft_cache_test" });

    await cache.set!("pg", { value: "ok" });
    await expect(cache.get!("pg")).resolves.toEqual({ value: "ok" });
  });

  it("parses cache URLs and redacts stored connection metadata", () => {
    const redis = AgentCache.fromUrl("redis://user:pass@example.com:6379/0");
    const postgres = AgentCache.fromUrl("postgres://user:pass@example.com/db");

    expect(redis.config.type).toBe("redis");
    expect(postgres.config.type).toBe("postgres");
    expect(redis.config.connection).not.toContain("pass");
    expect(postgres.config.connection).not.toContain("pass");
  });

  it("supports SQLite file mode when optional dependency is installed", async () => {
    const require = createRequire(import.meta.url);
    try {
      require.resolve("better-sqlite3");
    } catch {
      return;
    }
    const root = await mkdtemp(path.join(tmpdir(), "agentcraft-cache-sqlite-"));
    try {
      const cache = AgentCache.sqlite({
        filePath: path.join(root, "cache.sqlite"),
        namespace: "sqlite-test",
      });
      await cache.set!("sqlite", { ok: true });
      await expect(cache.get!("sqlite")).resolves.toEqual({ ok: true });
      await expect(cache.pruneExpired!()).resolves.toBe(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("reports a friendly missing dependency error for URL-created Redis clients", async () => {
    const cache = AgentCache.redis({ url: "redis://localhost:6379" });
    await expect(cache.get!("x")).rejects.toThrow(/AgentCache\.redis requires optional dependency 'redis'/);
  });

  it("warms cache by running prompts with bounded summaries", async () => {
    const result = await AgentCache.warm(
      {
        run: async (params) => ({
          content: `ok:${params.prompt}`,
          tokensUsed: { prompt: 2, completion: 1, total: 3 },
          cost: 0.001,
          finishReason: "stop",
          model: "mock",
          provider: "mock",
          cache: {
            hits: 1,
            misses: 0,
            writes: 0,
            bypassed: false,
            skippedUnsafe: 0,
            stale: 0,
            corrupt: 0,
            oversized: 0,
            toolCallsAvoided: 1,
            estimatedSavedTokens: 10,
          },
        }),
      },
      ["a", "b"],
      { concurrency: 1 },
    );

    expect(result.succeeded).toBe(2);
    expect(result.tokensUsed.total).toBe(6);
    expect(result.cache.hits).toBe(2);
  });

  it("rejects nested non-JSON cache values instead of silently dropping them", async () => {
    const cache = AgentCache.memory();
    await expect(
      cache.set!("bad", { nested: { fn: () => "lost" } }),
    ).rejects.toThrow(/non-serializable function/);
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

  it("invalidates runtime tool cache when args, namespace, version, provider, or model changes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "agentcraft-cache-key-"));
    let calls = 0;
    const adapter = createAdapter({
      name: "cache-key-fixture",
      tools: [
        tool({
          name: "read_cache_key_fixture",
          description: "Read fixture.",
          security: {
            sideEffect: "read",
            cache: { safe: true, deterministic: true },
          },
          params: {
            value: { type: "string", description: "Cache key value." },
          },
          run: async (args) => ({ value: args.value, calls: ++calls }),
        }),
      ],
    });
    const collect = async (
      agent: Agent,
    ): Promise<(args: Record<string, unknown>) => Promise<unknown>> => {
      const [readTool] = await (
        agent as unknown as {
          collectTools: (params: { prompt: string }) => Promise<
            Array<{
              execute: (args: Record<string, unknown>) => Promise<unknown>;
            }>
          >;
        }
      ).collectTools({ prompt: "cache" });
      return readTool!.execute;
    };

    const cacheV1 = AgentCache.file(root, {
      namespace: "tenant-a",
      version: "v1",
      strategy: "conservative",
    });
    const agentA = Agent.create({ model: "ollama:model-a", cache: cacheV1 }).use(adapter);
    await (await collect(agentA))({ value: "same" });
    await (await collect(agentA))({ value: "same" });
    await (await collect(agentA))({ value: "different-args" });

    const agentModelB = Agent.create({ model: "ollama:model-b", cache: cacheV1 }).use(adapter);
    await (await collect(agentModelB))({ value: "same" });

    const agentProviderB = Agent.create({ model: "lmstudio:model-a", cache: cacheV1 }).use(adapter);
    await (await collect(agentProviderB))({ value: "same" });

    const agentNamespaceB = Agent.create({
      model: "ollama:model-a",
      cache: AgentCache.file(root, {
        namespace: "tenant-b",
        version: "v1",
        strategy: "conservative",
      }),
    }).use(adapter);
    await (await collect(agentNamespaceB))({ value: "same" });

    const agentVersionB = Agent.create({
      model: "ollama:model-a",
      cache: AgentCache.file(root, {
        namespace: "tenant-a",
        version: "v2",
        strategy: "conservative",
      }),
    }).use(adapter);
    await (await collect(agentVersionB))({ value: "same" });

    expect(calls).toBe(6);
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

  it("enforces required cache hits for run-scoped adapters", async () => {
    let calls = 0;
    let toolArg = "cached";
    const adapter = createAdapter({
      name: "run-scoped-cache-fixture",
      tools: [
        tool({
          name: "read_run_scoped_cache_fixture",
          description: "Read run-scoped fixture.",
          security: {
            sideEffect: "read",
            cache: { safe: true, deterministic: true },
          },
          params: {
            value: { type: "string", description: "Cache key value." },
          },
          run: async (args) => ({ value: args.value, calls: ++calls }),
        }),
      ],
    });
    const agent = Agent.create({
      model: Provider.ollama["llama3.2"],
      cache: AgentCache.memory({ strategy: "conservative" }),
    });
    const provider = (
      agent as unknown as {
        unifiedProvider: { callWithTools: ReturnType<typeof vi.fn> };
      }
    ).unifiedProvider;
    provider.callWithTools = vi.fn(async (_params, tools): Promise<LLMResponse> => {
      await tools[0]!.execute({ value: toolArg });
      return response();
    });

    await agent.run({ prompt: "prime", use: adapter });
    await agent.run({
      prompt: "cached",
      use: adapter,
      budget: {
        cachePolicy: {
          requireCachedFor: ["read_run_scoped_cache_fixture"],
        },
      },
    });
    toolArg = "uncached";
    await expect(
      agent.run({
        prompt: "uncached",
        use: adapter,
        budget: {
          cachePolicy: {
            requireCachedFor: ["read_run_scoped_cache_fixture"],
          },
        },
      }),
    ).rejects.toMatchObject({
      code: "QUOTA_EXCEEDED",
      context: {
        budget: "cachePolicy.requireCachedFor",
        toolName: "read_run_scoped_cache_fixture",
      },
    });

    expect(calls).toBe(1);
  });

  it("enforces required cache hits for workflow AgentStep agents", async () => {
    let calls = 0;
    const cache = AgentCache.memory({ strategy: "conservative" });
    const adapter = createAdapter({
      name: "workflow-cache-fixture",
      tools: [
        tool({
          name: "read_workflow_cache_fixture",
          description: "Read workflow fixture.",
          security: {
            sideEffect: "read",
            cache: { safe: true, deterministic: true },
          },
          params: {},
          run: async () => ({ calls: ++calls }),
        }),
      ],
    });
    const agent = Agent.create({
      model: Provider.ollama["llama3.2"],
      cache,
    }).use(adapter);
    const provider = (
      agent as unknown as {
        unifiedProvider: { callWithTools: ReturnType<typeof vi.fn> };
      }
    ).unifiedProvider;
    provider.callWithTools = vi.fn(async (_params, tools): Promise<LLMResponse> => {
      await tools[0]!.execute({});
      return response();
    });

    await agent.run({ prompt: "prime" });

    const workflow = AgentWorkflow.create({
      workspace: AgentWorkspace.create({
        cache,
        adapters: [adapter],
        budget: {
          cachePolicy: {
            requireCachedFor: ["read_workflow_cache_fixture"],
          },
        },
      }),
      steps: [AgentStep({ id: "agent", agent, prompt: "use cached tool" })],
    });

    await expect(workflow.run({ input: {} })).resolves.toMatchObject({
      status: "completed",
      metrics: { cache: { hits: 1 } },
    });
    expect(calls).toBe(1);
  });

  it("reports safe cache replay and unsafe write skips through agent.run responses", async () => {
    let readCalls = 0;
    let writeCalls = 0;
    const agent = Agent.create({
      model: Provider.ollama["llama3.2"],
      cache: AgentCache.memory(),
    });
    const provider = (
      agent as unknown as {
        unifiedProvider: { callWithTools: ReturnType<typeof vi.fn> };
      }
    ).unifiedProvider;
    const tools = [
      tool({
        name: "read_response_cache_fixture",
        description: "Read fixture.",
        security: { sideEffect: "read" },
        params: {},
        run: async () => ({ calls: ++readCalls }),
      }),
      tool({
        name: "write_response_cache_fixture",
        description: "Write fixture.",
        security: { sideEffect: "write" },
        params: {},
        run: async () => ({ calls: ++writeCalls }),
      }),
    ];
    provider.callWithTools = vi.fn(async (_params, exposedTools): Promise<LLMResponse> => {
      await exposedTools[0]!.execute({});
      await exposedTools[1]!.execute({});
      return response();
    });

    const first = await agent.run({ prompt: "first", tools });
    const second = await agent.run({ prompt: "second", tools });

    expect(readCalls).toBe(1);
    expect(writeCalls).toBe(2);
    expect(second.cache?.hits).toBeGreaterThanOrEqual(1);
    expect(second.cache?.toolCallsAvoided).toBeGreaterThanOrEqual(1);
    expect(second.cache?.skippedUnsafe).toBeGreaterThanOrEqual(1);
    expect(first.cache?.summary?.hitRate).toBe(0);
    expect(second.cache?.summary?.hitRate).toBeGreaterThan(0);
  });

  it("caches external tools only under aggressive strategy while writes remain uncached", async () => {
    let externalCalls = 0;
    let writeCalls = 0;
    const adapter = createAdapter({
      name: "external-write-policy-fixture",
      tools: [
        tool({
          name: "external_policy_fixture",
          description: "External fixture.",
          security: { sideEffect: "external" },
          params: {},
          run: async () => ({ calls: ++externalCalls }),
        }),
        tool({
          name: "write_policy_fixture",
          description: "Write fixture.",
          security: { sideEffect: "write" },
          params: {},
          run: async () => ({ calls: ++writeCalls }),
        }),
      ],
    });
    const collect = async (
      strategy: "auto" | "aggressive",
    ): Promise<Array<{ name: string; execute: (args: Record<string, unknown>) => Promise<unknown> }>> => {
      const agent = Agent.create({
        model: Provider.ollama["llama3.2"],
        cache: AgentCache.memory({ strategy, namespace: strategy }),
      }).use(adapter);
      return await (
        agent as unknown as {
          collectTools: (params: { prompt: string }) => Promise<
            Array<{
              name: string;
              execute: (args: Record<string, unknown>) => Promise<unknown>;
            }>
          >;
        }
      ).collectTools({ prompt: "cache" });
    };

    const autoTools = await collect("auto");
    await autoTools.find((item) => item.name === "external_policy_fixture")!.execute({});
    await autoTools.find((item) => item.name === "external_policy_fixture")!.execute({});

    const aggressiveTools = await collect("aggressive");
    await aggressiveTools.find((item) => item.name === "external_policy_fixture")!.execute({});
    await aggressiveTools.find((item) => item.name === "external_policy_fixture")!.execute({});
    await aggressiveTools.find((item) => item.name === "write_policy_fixture")!.execute({});
    await aggressiveTools.find((item) => item.name === "write_policy_fixture")!.execute({});

    expect(externalCalls).toBe(3);
    expect(writeCalls).toBe(2);
  });
});

function response(): LLMResponse {
  return {
    success: true,
    content: "ok",
    tokensUsed: { prompt: 1, completion: 1, total: 2 },
    finishReason: "stop",
  };
}

function createHashDigest(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function createHashPathSegment(key: string): string {
  return createHashDigest(key).slice(0, 2);
}
