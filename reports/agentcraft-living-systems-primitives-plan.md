# AgentCraft Living Systems Primitives — Implementation Plan

**Date:** 2026-05-14  
**Status:** Phase 1-7 implemented locally; all final supervisor criteria pass  
**Scope:** Schema foundation, cache drivers, workspace, artifact store, workflow orchestration

---

## Overview

This plan extends AgentCraft with the primitives needed to build stateful, multi-run, multi-agent systems. Every feature is a standalone interface, class, or factory that users compose themselves. No fully-built apps are shipped. No existing APIs are broken.

**Architecture constraint:** All new exported APIs follow the static factory pattern already used throughout AgentCraft. No `new` keyword on any exported class. No constructors in public API surfaces.

**Dependency graph (each phase depends on the previous):**

```
Phase 1 — Schema Foundation (ArtifactRegistry, 5 new schemas, CachePolicy)
Phase 2 — Cache Driver Extraction (AgentCache.memory(), FileCacheDriver)
Phase 3 — AgentWorkspace + AgentEventEmitter + AgentTeam.rolePolicies
Phase 4 — ArtifactStore (Memory + File + SQLite)
Phase 5 — AgentWorkflow Phase 1 (In-Memory coordinator)
Phase 6 — AgentWorkflow Phase 2 (Store-Backed Resumability)
```

---

## Existing Patterns Reference

Before implementation, internalize these patterns — every new file must follow them exactly.

### Static factory pattern

```ts
// CORRECT — static factory, no new
export const AgentCache = {
  file(root: string, options: FileCacheOptions = {}): AgentCacheController { ... },
  disabled(): AgentCacheController { ... },
} as const;

// WRONG — never export a constructor
export class AgentCache { constructor(...) {} }
```

### Extending existing types — additive only

```ts
// CORRECT — add optional fields; existing code compiles unchanged
export interface RunBudget {
  maxRuns?: number;
  // ... existing fields ...
  cachePolicy?: CachePolicy; // new optional field
}

// WRONG — replacing or renaming existing fields
```

### Type and value with same name (TypeScript pattern used for workspace)

```ts
// Declare the shape as an interface
export interface AgentWorkspaceInstance { ... }

// Export the factory as a const with a different identifier
export const AgentWorkspace = {
  create(config: AgentWorkspaceConfig): AgentWorkspaceInstance { ... },
} as const;

// Export both — users type-annotate with AgentWorkspaceInstance,
// and call factory via AgentWorkspace.create()
```

### All exports must be registered

Every new type, interface, class, and factory must appear in the relevant entry point:

- `src/index.ts` for main-package exports
- `src/team.ts` for team-related exports
- New entry point files (e.g. `src/stores.ts`) for optional peer-dep features

---

## Phase 1 — Schema Foundation

**Goal:** Complete the artifact schema set, build the ArtifactRegistry, and add CachePolicy enforcement to RunBudget. No new dependencies. No breaking changes.

---

### Task 1.1 — Add 5 missing artifact schemas to `src/agent/creator/types.ts`

- [x] Implemented in `src/agent/creator/types.ts`.

**File to modify:** `src/agent/creator/types.ts`

Append the following five schema definitions **after** the `ExperimentPlanSchema` block and **before** the `CreatorArtifactUnionSchema`. All five extend `CreatorArtifactSchema` exactly as the 14 existing schemas do.

```ts
export const BrandVoiceProfileSchema = CreatorArtifactSchema.extend({
  type: z.literal("BrandVoiceProfile"),
  tone: z.array(z.string()).default([]),
  vocabulary: z.array(z.string()).default([]),
  avoidPhrases: z.array(z.string()).default([]),
  exampleSentences: z.array(z.string()).default([]),
  missionStatement: z.string().optional(),
});

export const ContentPillarsSchema = CreatorArtifactSchema.extend({
  type: z.literal("ContentPillars"),
  pillars: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        themes: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export const PersonaProfileSchema = CreatorArtifactSchema.extend({
  type: z.literal("PersonaProfile"),
  personaName: z.string().default(""),
  role: z.string().default(""),
  goals: z.array(z.string()).default([]),
  frustrations: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
  decisionDrivers: z.array(z.string()).default([]),
});

export const MediaBriefSchema = CreatorArtifactSchema.extend({
  type: z.literal("MediaBrief"),
  format: z
    .enum(["image", "video", "infographic", "podcast", "webinar", "other"])
    .default("other"),
  direction: z.string().default(""),
  dimensions: z.string().optional(),
  duration: z.string().optional(),
  brandElements: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
});

export const PublishingStatusSchema = CreatorArtifactSchema.extend({
  type: z.literal("PublishingStatus"),
  artifactRef: z.string().min(1),
  channel: z.string().min(1),
  stage: z
    .enum([
      "planned",
      "briefed",
      "drafted",
      "in_review",
      "approved",
      "scheduled",
      "published",
      "failed",
      "needs_revision",
      "archived",
    ])
    .default("planned"),
  scheduledAt: z.string().optional(),
  publishedAt: z.string().optional(),
  externalUrl: z.string().optional(),
  notes: z.string().optional(),
});
```

**Inferred TypeScript types** — add immediately after each schema:

```ts
export type BrandVoiceProfile = z.infer<typeof BrandVoiceProfileSchema>;
export type ContentPillars = z.infer<typeof ContentPillarsSchema>;
export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;
export type MediaBrief = z.infer<typeof MediaBriefSchema>;
export type PublishingStatus = z.infer<typeof PublishingStatusSchema>;
```

---

### Task 1.2 — Update `CreatorArtifactUnionSchema`

- [x] Implemented in `src/agent/creator/types.ts`.

**File to modify:** `src/agent/creator/types.ts`

Update the existing `CreatorArtifactUnionSchema` discriminated union to include all 5 new schemas. The union currently ends at `ExperimentPlanSchema`. Add all 5 new schemas to the array:

```ts
export const CreatorArtifactUnionSchema = z.discriminatedUnion("type", [
  AudienceProfileSchema,
  PositioningBriefSchema,
  ContentBriefSchema,
  SourceNoteSchema,
  ClaimMapSchema,
  DraftSchema,
  EditorialReviewSchema,
  SeoPlanSchema,
  SerpBriefSchema,
  RepurposingPackSchema,
  PublishPackageSchema,
  ContentCalendarSchema,
  PerformanceReportSchema,
  ExperimentPlanSchema,
  // NEW — 5 schemas added in Phase 1
  BrandVoiceProfileSchema,
  ContentPillarsSchema,
  PersonaProfileSchema,
  MediaBriefSchema,
  PublishingStatusSchema,
]);
```

---

### Task 1.3 — Build `ArtifactRegistry`

- [x] Implemented in `src/artifact-registry/registry.ts` and `src/artifact-registry/index.ts`.

**New file:** `src/artifact-registry/registry.ts`

The registry is a singleton module-level object — a typed `Map` wrapper with four operations. It pre-registers all built-in schemas on load.

```ts
import { z } from "zod";
import {
  AudienceProfileSchema,
  PositioningBriefSchema,
  ContentBriefSchema,
  SourceNoteSchema,
  ClaimMapSchema,
  DraftSchema,
  EditorialReviewSchema,
  SeoPlanSchema,
  SerpBriefSchema,
  RepurposingPackSchema,
  PublishPackageSchema,
  ContentCalendarSchema,
  PerformanceReportSchema,
  ExperimentPlanSchema,
  BrandVoiceProfileSchema,
  ContentPillarsSchema,
  PersonaProfileSchema,
  MediaBriefSchema,
  PublishingStatusSchema,
} from "../agent/creator/types.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyZodSchema = z.ZodTypeAny;

const registry = new Map<string, AnyZodSchema>();

// Pre-register all built-in artifact schemas
const BUILT_IN_SCHEMAS: Record<string, AnyZodSchema> = {
  AudienceProfile: AudienceProfileSchema,
  PositioningBrief: PositioningBriefSchema,
  ContentBrief: ContentBriefSchema,
  SourceNote: SourceNoteSchema,
  ClaimMap: ClaimMapSchema,
  Draft: DraftSchema,
  EditorialReview: EditorialReviewSchema,
  SeoPlan: SeoPlanSchema,
  SerpBrief: SerpBriefSchema,
  RepurposingPack: RepurposingPackSchema,
  PublishPackage: PublishPackageSchema,
  ContentCalendar: ContentCalendarSchema,
  PerformanceReport: PerformanceReportSchema,
  ExperimentPlan: ExperimentPlanSchema,
  BrandVoiceProfile: BrandVoiceProfileSchema,
  ContentPillars: ContentPillarsSchema,
  PersonaProfile: PersonaProfileSchema,
  MediaBrief: MediaBriefSchema,
  PublishingStatus: PublishingStatusSchema,
};

for (const [name, schema] of Object.entries(BUILT_IN_SCHEMAS)) {
  registry.set(name, schema);
}

export const ArtifactRegistry = {
  /**
   * Register a custom artifact schema. Built-in names cannot be overwritten.
   * Throws if the name is already registered.
   */
  register(name: string, schema: AnyZodSchema): void {
    if (registry.has(name)) {
      throw new Error(
        `ArtifactRegistry: schema '${name}' is already registered. ` +
          `Use a unique name for custom artifact types.`,
      );
    }
    registry.set(name, schema);
  },

  /**
   * Look up a registered schema by artifact type name.
   * Returns undefined if not found.
   */
  lookup(name: string): AnyZodSchema | undefined {
    return registry.get(name);
  },

  /**
   * Returns all registered artifact type names.
   */
  list(): string[] {
    return [...registry.keys()];
  },

  /**
   * Remove a custom-registered schema. Built-in schemas cannot be deregistered.
   * Returns true if removed, false if the name was not found or is built-in.
   */
  deregister(name: string): boolean {
    if (name in BUILT_IN_SCHEMAS) return false;
    return registry.delete(name);
  },
} as const;
```

**New file:** `src/artifact-registry/index.ts`

```ts
export { ArtifactRegistry } from "./registry.js";
```

---

### Task 1.4 — Add `CachePolicy` and extend `RunBudget`

- [x] Implemented in `src/agent/types.ts` and enforced in `src/agent/agent.ts`.

**File to modify:** `src/agent/types.ts`

Add `CachePolicy` interface and extend `RunBudget` with the `cachePolicy` field. Place `CachePolicy` immediately before `RunBudget`.

```ts
export interface CachePolicy {
  /**
   * Tool names that must have a cache hit before the run proceeds.
   * If any named tool has no cached result, the run throws a preflight error.
   * Use this to enforce that expensive tool calls (web search, API calls)
   * are served from cache in cost-sensitive flows.
   */
  requireCachedFor?: string[];
}

export interface RunBudget {
  maxRuns?: number;
  maxTokens?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  maxToolCalls?: number;
  maxCost?: number;
  costOptions?: CostOptions;
  cachePolicy?: CachePolicy; // NEW — enforce cache hits before run
}
```

**File to modify:** `src/agent/budgets.ts`

In the `enforcePreflight` function, add a check for `cachePolicy.requireCachedFor`. If the cache controller is disabled or not present, and `requireCachedFor` is set, throw a `ConfigurationError`. The actual per-tool cache hit check is enforced at tool-call time inside the agent's tool resolution loop — add a guard that checks the cache before executing any tool whose name is in `requireCachedFor`, and throws a `QuotaExceededError` if the result is a miss.

---

### Task 1.5 — Export new types from `src/index.ts`

- [x] Implemented in `src/index.ts`; `BrandVoiceProfile` is exported as `CreatorBrandVoiceProfile` at the root to avoid breaking the existing memory-store `BrandVoiceProfile` export.

**File to modify:** `src/index.ts`

Add the following exports:

```ts
export { ArtifactRegistry } from "./artifact-registry/index.js";
export type {
  BrandVoiceProfile,
  ContentPillars,
  PersonaProfile,
  MediaBrief,
  PublishingStatus,
} from "./agent/creator/types.js";
export type { CachePolicy } from "./agent/types.js";
```

---

### Phase 1 Completion Criteria

Run all of the following checks before marking Phase 1 complete:

- [x] `npm run typecheck` passes with zero errors
- [x] `npm test` passes — all existing tests still green
- [x] `ArtifactRegistry.list()` returns at least 19 entries (14 original + 5 new)
- [x] `ArtifactRegistry.register('MyCustom', mySchema)` works and `ArtifactRegistry.lookup('MyCustom')` returns the schema
- [x] `ArtifactRegistry.register('Draft', anySchema)` throws with a clear message about the name already being registered
- [x] `ArtifactRegistry.deregister('Draft')` returns `false` (built-in protection)
- [x] `ArtifactRegistry.deregister('MyCustom')` returns `true` after registering it
- [x] All 5 new schemas parse valid objects without error using `.parse()`
- [x] `CreatorArtifactUnionSchema` discriminates correctly on all 19 `type` values
- [x] `RunBudget` with `cachePolicy: { requireCachedFor: ['web_search'] }` passes TypeScript type check
- [x] New schemas and `ArtifactRegistry` are importable from `'agentcraft'`

**Unit test file to write:** `src/__tests__/artifact-registry.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { ArtifactRegistry } from "../artifact-registry/registry.js";
import { z } from "zod";

describe("ArtifactRegistry", () => {
  it("lists all 19 built-in schemas", () => {
    expect(ArtifactRegistry.list().length).toBeGreaterThanOrEqual(19);
  });

  it("looks up built-in schema by name", () => {
    expect(ArtifactRegistry.lookup("Draft")).toBeDefined();
  });

  it("registers and looks up a custom schema", () => {
    const TestSchema = z.object({
      type: z.literal("TestArtifact"),
      value: z.string(),
    });
    ArtifactRegistry.register("TestArtifact", TestSchema);
    expect(ArtifactRegistry.lookup("TestArtifact")).toBe(TestSchema);
    ArtifactRegistry.deregister("TestArtifact");
  });

  it("throws on duplicate registration", () => {
    expect(() => ArtifactRegistry.register("Draft", z.any())).toThrow();
  });

  it("protects built-in schemas from deregistration", () => {
    expect(ArtifactRegistry.deregister("Draft")).toBe(false);
  });
});
```

---

## Phase 2 — Cache Driver Extraction

**Goal:** Add `AgentCache.memory()` and update the `AgentCacheConfig` type to include `"memory"`. Existing `file` and `disabled` drivers are untouched.

---

### Task 2.1 — Update `AgentCacheConfig` type discriminant

- [x] Implemented in `src/agent/creator/types.ts`.

**File to modify:** `src/agent/creator/types.ts`

Update `AgentCacheConfig` to add `"memory"` as a valid type:

```ts
export interface AgentCacheConfig {
  readonly type: "disabled" | "file" | "memory"; // "memory" is new
  readonly root?: string;
  readonly strategy?: "conservative" | "auto" | "aggressive";
  readonly defaultTtlMs?: number;
  readonly namespace?: string;
  readonly version?: string;
  readonly maxEntryBytes?: number;
}
```

---

### Task 2.2 — Add `MemoryCacheOptions` type and `MemoryAgentCache` class

- [x] Implemented in `src/agent/cache.ts`.

**File to modify:** `src/agent/cache.ts`

Add the following, placed **before** `export const AgentCache`:

```ts
export interface MemoryCacheOptions {
  readonly defaultTtlMs?: number;
  readonly maxEntryBytes?: number;
  readonly namespace?: string;
}

interface MemoryCacheEntry {
  readonly value: unknown;
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly bytes: number;
}

class MemoryAgentCache implements AgentCacheController {
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
    const serialized = JSON.stringify(value);
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
```

---

### Task 2.3 — Add `AgentCache.memory()` to the factory

- [x] Implemented in `src/agent/cache.ts`.

**File to modify:** `src/agent/cache.ts`

Extend the `AgentCache` factory object to add the `memory` method. Do not alter existing methods:

```ts
export const AgentCache = {
  disabled(): AgentCacheController {
    return { config: { type: "disabled" } };
  },

  file(root: string, options: FileCacheOptions = {}): AgentCacheController {
    return new FileAgentCache(root, options);
  },

  placeholder(
    root: string,
    strategy: AgentCacheConfig["strategy"] = "auto",
  ): AgentCacheController {
    return this.file(root, { strategy });
  },

  // NEW — in-memory cache; no filesystem dependency; suitable for tests and short-lived runs
  memory(options: MemoryCacheOptions = {}): AgentCacheController {
    return new MemoryAgentCache(options);
  },
} as const;
```

---

### Task 2.4 — Export `MemoryCacheOptions` from `src/index.ts`

- [x] Implemented in `src/index.ts`.

**File to modify:** `src/index.ts`

Add to existing `AgentCache`-related exports:

```ts
export type { MemoryCacheOptions } from "./agent/cache.js";
```

---

### Phase 2 Completion Criteria

- [x] `npm run typecheck` passes with zero errors
- [x] `npm test` passes — all existing cache tests still green
- [x] `AgentCache.memory()` returns an `AgentCacheController` with `config.type === 'memory'`
- [x] `AgentCache.memory()` supports `set` / `get` / `delete` / `clear` / `pruneExpired`
- [x] TTL expiry: entry set with `ttlMs: 1` is a miss after 2ms
- [x] `maxEntryBytes` enforcement: `set` throws when entry exceeds the limit
- [x] `MemoryCacheOptions` is importable from `'agentcraft'`
- [x] `AgentCacheConfig.type` includes `"memory"` in TypeScript (no type error assigning `{ type: 'memory' }`)
- [x] Existing `AgentCache.file()` and `AgentCache.disabled()` behavior is unchanged

**Unit test file to write:** `src/__tests__/cache-memory.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { AgentCache } from "../agent/cache.js";

describe("AgentCache.memory()", () => {
  it("returns a cache controller with type memory", () => {
    const cache = AgentCache.memory();
    expect(cache.config.type).toBe("memory");
  });

  it("stores and retrieves values", async () => {
    const cache = AgentCache.memory();
    await cache.set!("key1", { data: "hello" });
    const result = await cache.get!("key1");
    expect(result).toEqual({ data: "hello" });
  });

  it("returns miss for unknown key", async () => {
    const cache = AgentCache.memory();
    const entry = await cache.getEntry!("nonexistent");
    expect(entry.status).toBe("miss");
  });

  it("expires entries after TTL", async () => {
    const cache = AgentCache.memory();
    await cache.set!("exp", "value", { ttlMs: 1 });
    await new Promise((r) => setTimeout(r, 10));
    const entry = await cache.getEntry!("exp");
    expect(entry.status).toBe("stale");
  });

  it("throws when entry exceeds maxEntryBytes", async () => {
    const cache = AgentCache.memory({ maxEntryBytes: 10 });
    await expect(cache.set!("big", "a".repeat(100))).rejects.toThrow(
      "maxEntryBytes",
    );
  });

  it("clears all entries", async () => {
    const cache = AgentCache.memory();
    await cache.set!("a", 1);
    await cache.clear!();
    expect(await cache.get!("a")).toBeUndefined();
  });

  it("prunes expired entries and returns count", async () => {
    const cache = AgentCache.memory();
    await cache.set!("x", 1, { ttlMs: 1 });
    await new Promise((r) => setTimeout(r, 10));
    const pruned = await cache.pruneExpired!();
    expect(pruned).toBe(1);
  });
});
```

---

## Phase 3 — AgentWorkspace + AgentEventEmitter + AgentTeam.rolePolicies

**Goal:** Single shared runtime context for agent ecosystems. Lightweight event subscription layer. Per-role tool policies on teams.

---

### Task 3.1 — Build `AgentEventEmitter`

**New file:** `src/agent/events.ts`

The event emitter is a minimal typed `on/off/emit` surface. It is created internally by `AgentWorkspace` and exposed on the workspace instance. Users never instantiate it directly.

```ts
import type { TokenUsage } from "./types.js";

export interface AgentEventMap {
  "cache.hit": {
    toolName: string;
    key: string;
    estimatedSavedTokens?: number;
  };
  "cache.miss": {
    toolName: string;
    key: string;
  };
  "cost.updated": {
    model: string;
    provider: string;
    cost: number;
    tokensUsed: TokenUsage;
  };
  "tool.called": {
    toolName: string;
    sideEffectLevel?: "none" | "read" | "write" | "external";
  };
  "approval.requested": {
    toolName: string;
    sideEffect?: string;
  };
  "approval.granted": {
    toolName: string;
  };
  "approval.denied": {
    toolName: string;
  };
  // Phase 5 adds: "workflow.step.started", "workflow.step.completed"
  // Phase 6 adds: "artifact.read", "artifact.write"
}

export type AgentEventType = keyof AgentEventMap;

export interface AgentEventEmitter {
  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends AgentEventType>(
    event: K,
    handler: (data: AgentEventMap[K]) => void,
  ): () => void;

  /**
   * Remove a specific handler from an event.
   */
  off<K extends AgentEventType>(
    event: K,
    handler: (data: AgentEventMap[K]) => void,
  ): void;

  /**
   * Emit an event. Called internally by the SDK; not intended for user code.
   */
  emit<K extends AgentEventType>(event: K, data: AgentEventMap[K]): void;
}

export function createAgentEventEmitter(): AgentEventEmitter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlers = new Map<string, Set<(data: any) => void>>();

  return {
    on<K extends AgentEventType>(
      event: K,
      handler: (data: AgentEventMap[K]) => void,
    ) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
      return () => this.off(event, handler);
    },

    off<K extends AgentEventType>(
      event: K,
      handler: (data: AgentEventMap[K]) => void,
    ) {
      handlers.get(event)?.delete(handler);
    },

    emit<K extends AgentEventType>(event: K, data: AgentEventMap[K]) {
      for (const handler of handlers.get(event) ?? []) {
        try {
          handler(data);
        } catch {
          // Event handler errors must not crash the agent run
        }
      }
    },
  };
}
```

---

### Task 3.2 — Build `AgentWorkspace`

**New file:** `src/agent/workspace.ts`

```ts
import type { AgentAdapter } from "./adapters/types.js";
import type { ToolPolicy } from "./adapters/tool-policy.js";
import type { AgentCacheController } from "./creator/types.js";
import type { TraceSink } from "./observability.js";
import type { RunBudget } from "./types.js";
import type { Logger } from "../types/logger.js";
import { createAgentEventEmitter, type AgentEventEmitter } from "./events.js";

export interface AgentWorkspaceConfig {
  /**
   * Shared cache controller applied to all agents provisioned from this workspace.
   */
  cache?: AgentCacheController;

  /**
   * Shared adapters attached to every agent created from this workspace.
   * Includes native adapters (FileSystemAdapter, TavilySearchAdapter, etc.).
   */
  adapters?: AgentAdapter[];

  /**
   * Shared MCP adapters (MCPAdapter instances). Kept separate from adapters
   * for semantic clarity — MCPs are initialized once and shared.
   */
  mcps?: AgentAdapter[];

  /**
   * Workspace-level default ToolPolicy applied to all agents provisioned from
   * the workspace. Per-agent or per-run ToolPolicy overrides are merged on top
   * using mergeToolPolicies (arrays concatenated, scalar fields overridden).
   */
  toolPolicy?: ToolPolicy;

  /**
   * Workspace-level default RunBudget applied to all agents unless overridden.
   */
  budget?: RunBudget;

  /**
   * Shared TraceSink for unified observability across all agents in the workspace.
   */
  traceSink?: TraceSink;

  /**
   * Shared logger instance. Defaults to ConsoleLogger if not provided.
   */
  logger?: Logger;

  /**
   * Optional ArtifactStore reference. Populated automatically in Phase 4.
   * Workspace does not own the store — it holds a reference.
   */
  store?: unknown; // typed as ArtifactStore in Phase 4
}

export interface AgentWorkspaceInstance {
  readonly cache?: AgentCacheController;
  readonly store?: unknown; // typed as ArtifactStore in Phase 4
  readonly adapters: readonly AgentAdapter[];
  readonly mcps: readonly AgentAdapter[];
  readonly toolPolicy?: ToolPolicy;
  readonly budget?: RunBudget;
  readonly traceSink?: TraceSink;
  readonly logger?: Logger;
  /**
   * Workspace-level event emitter. Subscribe to cache, cost, tool, and
   * approval events without configuring a full OTel trace pipeline.
   */
  readonly events: AgentEventEmitter;
}

class WorkspaceImpl implements AgentWorkspaceInstance {
  readonly cache?: AgentCacheController;
  readonly store?: unknown;
  readonly adapters: readonly AgentAdapter[];
  readonly mcps: readonly AgentAdapter[];
  readonly toolPolicy?: ToolPolicy;
  readonly budget?: RunBudget;
  readonly traceSink?: TraceSink;
  readonly logger?: Logger;
  readonly events: AgentEventEmitter;

  constructor(config: AgentWorkspaceConfig) {
    this.cache = config.cache;
    this.store = config.store;
    this.adapters = config.adapters ?? [];
    this.mcps = config.mcps ?? [];
    this.toolPolicy = config.toolPolicy;
    this.budget = config.budget;
    this.traceSink = config.traceSink;
    this.logger = config.logger;
    this.events = createAgentEventEmitter();
  }
}

export interface LocalWorkspaceOptions {
  /** Directory for the file-based cache. Defaults to '.agentcraft-cache'. */
  cacheRoot?: string;
}

export const AgentWorkspace = {
  /**
   * Create a workspace from explicit config. All fields are optional.
   *
   * @example
   * const workspace = AgentWorkspace.create({
   *   cache: AgentCache.file('.cache'),
   *   adapters: [FileSystemAdapter.connect({ root: './content' })],
   *   toolPolicy: { readOnly: true },
   *   budget: { maxCost: 5 },
   *   traceSink: createOpenTelemetryTraceSink(myTracer),
   * });
   */
  create(config: AgentWorkspaceConfig = {}): AgentWorkspaceInstance {
    return new WorkspaceImpl(config);
  },

  /**
   * In-memory workspace with no filesystem access and no adapters.
   * Suitable for tests, demos, and ephemeral scripts.
   *
   * @example
   * const workspace = AgentWorkspace.memory();
   */
  memory(): AgentWorkspaceInstance {
    return new WorkspaceImpl({ cache: undefined });
  },

  /**
   * Local workspace backed by a file cache at `cacheRoot`.
   * Good default for local development and CLI tooling.
   *
   * @example
   * const workspace = AgentWorkspace.local('./workspace');
   */
  local(
    root: string,
    options: LocalWorkspaceOptions = {},
  ): AgentWorkspaceInstance {
    // import is inline to avoid circular — cache.ts does not import workspace.ts
    const { AgentCache } = require("./cache.js") as typeof import("./cache.js");
    return new WorkspaceImpl({
      cache: AgentCache.file(options.cacheRoot ?? `${root}/.agentcraft-cache`),
    });
  },
} as const;
```

> **Implementation note on the inline require:** To avoid a circular import between `workspace.ts` and `cache.ts`, use a dynamic `await import()` inside the `local()` factory, or restructure so `local()` accepts the cache root and creates it lazily. The cleanest alternative is to make `local()` an `async` factory: `AgentWorkspace.local(root)` returns `Promise<AgentWorkspaceInstance>`. If synchronous is required, move `AgentCache.file()` call inline and import `FileAgentCache` class directly. Pick one approach and stay consistent.

---

### Task 3.3 — Add `workspace` and `rolePolicies` to `AgentTeamConfig`

**File to modify:** `src/agent/types.ts`

Add two new optional fields to `AgentTeamConfig`. Mark `sharedAdapters` and `memory` as deprecated:

```ts
export interface AgentTeamConfig {
  readonly orchestrator: Agent;
  readonly members: TeamMember[];
  readonly supervisor?: Agent;

  /**
   * Shared workspace. When provided, the team propagates workspace.cache,
   * workspace.adapters, workspace.mcps, workspace.toolPolicy, and
   * workspace.budget to all member agents and the orchestrator.
   * Workspace takes precedence over sharedAdapters when both are present.
   */
  readonly workspace?: AgentWorkspaceInstance;

  /**
   * Per-role ToolPolicy overrides. The role string must match the `role`
   * field on a TeamMember. The role policy is merged on top of the workspace
   * toolPolicy (if present) and the agent's own toolPolicy.
   *
   * @example
   * rolePolicies: {
   *   reviewer: { readOnly: true },
   *   publisher: { allowSideEffects: true },
   * }
   */
  readonly rolePolicies?: Record<string, ToolPolicy>;

  /**
   * @deprecated Use workspace.adapters instead. Will be removed in a future
   * major version. When workspace is provided, workspace.adapters takes
   * precedence and sharedAdapters is ignored with a warning.
   */
  readonly sharedAdapters?: AgentAdapter[];

  readonly sharedSkills?: AgentSkill[];

  /**
   * @deprecated Include a memory MCP in workspace.mcps instead.
   */
  readonly memory?: AgentAdapter;

  readonly executionHint?: "parallel" | "sequential" | "pipeline" | "auto";
  readonly maxRounds?: number;
  readonly maxRevisions?: number;
  readonly maxSupervisorReviews?: number;
  readonly onMemberError?: "retry" | "skip" | "fail";
  readonly mode?: "orchestrator" | "planner-executor-reviewer";
  readonly supervisorRubric?: string;
  readonly roleBudgets?: Record<string, RunBudget>;
}
```

Import `AgentWorkspaceInstance` at the top of `src/agent/types.ts`:

```ts
import type { AgentWorkspaceInstance } from "./workspace.js";
```

---

### Task 3.4 — Wire workspace into `AgentTeam.create()`

**File to modify:** `src/agent/agent-team.ts`

In the `AgentTeam.create(config)` static method, add workspace propagation logic **before** the existing `sharedAdapters` loop. The workspace block runs first; the deprecated `sharedAdapters` path runs only when `workspace` is absent:

```ts
static create(config: AgentTeamConfig): AgentTeam {
  if (config.members.length === 0) {
    throw new ConfigurationError('AgentTeam requires at least one member');
  }

  const allAgents = [config.orchestrator, ...config.members.map((m) => m.agent)];
  if (config.supervisor) allAgents.push(config.supervisor);

  // Workspace propagation — takes precedence over sharedAdapters
  if (config.workspace) {
    for (const agent of allAgents) {
      if (config.workspace.cache) agent.setCache(config.workspace.cache);
      for (const adapter of config.workspace.adapters) agent.use(adapter);
      for (const mcp of config.workspace.mcps) agent.use(mcp);
    }

    if (config.sharedAdapters && config.sharedAdapters.length > 0) {
      console.warn(
        '[AgentCraft] AgentTeam: workspace is present; sharedAdapters is deprecated ' +
          'and has been ignored. Move adapters to workspace.adapters.',
      );
    }
    if (config.memory) {
      console.warn(
        '[AgentCraft] AgentTeam: workspace is present; memory is deprecated. ' +
          'Add memory MCP to workspace.mcps instead.',
      );
    }
  } else {
    // Legacy path — kept for backwards compatibility
    for (const member of config.members) {
      for (const adapter of config.sharedAdapters ?? []) member.agent.use(adapter);
      for (const skill of config.sharedSkills ?? []) member.agent.use(skill);
    }
    for (const adapter of config.sharedAdapters ?? []) config.orchestrator.use(adapter);
    for (const skill of config.sharedSkills ?? []) config.orchestrator.use(skill);
    if (config.memory) config.orchestrator.use(config.memory);
  }

  // Apply rolePolicies to members by matching role name
  if (config.rolePolicies) {
    for (const member of config.members) {
      const rolePolicy = config.rolePolicies[member.role];
      if (rolePolicy) {
        // mergeToolPolicies is already imported in agent-team.ts
        const merged = mergeToolPolicies(
          config.workspace?.toolPolicy,
          rolePolicy,
        );
        if (merged) member.agent.setToolPolicy(merged);
      }
    }
  }

  return new AgentTeam(normalizeCreateConfig(config));
}
```

> **Implementation note:** `agent.setCache()` and `agent.setToolPolicy()` must be added to the `Agent` class as internal-only methods (not exported in `AgentCreateConfig`). They accept a controller/policy and override the agent's internal field. These are not public API — only `AgentTeam` and `AgentWorkflow` call them. Add them as package-internal methods (not `private`, but not re-exported from `src/index.ts`).

---

### Task 3.5 — Export workspace and events from entry points

**File to modify:** `src/index.ts`

```ts
export { AgentWorkspace } from "./agent/workspace.js";
export type {
  AgentWorkspaceConfig,
  AgentWorkspaceInstance,
  LocalWorkspaceOptions,
} from "./agent/workspace.js";
export type {
  AgentEventEmitter,
  AgentEventMap,
  AgentEventType,
} from "./agent/events.js";
```

**File to modify:** `src/team.ts`

```ts
export type { AgentWorkspaceInstance } from "./agent/workspace.js";
// AgentTeamConfig already re-exported; AgentWorkspaceInstance is needed
// for consumers who type the workspace field
```

---

### Phase 3 Completion Criteria

- [x] `npm run typecheck` passes with zero errors
- [x] `npm test` passes — all existing AgentTeam tests still green
- [x] `AgentWorkspace.create({})` returns an object with `.events` emitter
- [x] `AgentWorkspace.memory()` returns a workspace with no cache or adapters
- [x] `AgentWorkspace.local('./test-ws')` returns a workspace with a file cache
- [x] `workspace.events.on('cache.hit', handler)` returns an unsubscribe function
- [x] Unsubscribe function correctly removes handler
- [x] `emit('cache.hit', { toolName: 'x', key: 'y' })` calls registered handler with typed data
- [x] Handler errors do not throw — they are swallowed silently
- [x] `AgentTeam.create({ workspace, orchestrator, members })` attaches workspace adapters to all member agents
- [x] `AgentTeam.create({ workspace, sharedAdapters })` logs a deprecation warning
- [x] `rolePolicies: { reviewer: { readOnly: true } }` applies the policy to the agent with role `'reviewer'`
- [x] `AgentWorkspaceInstance` and `AgentEventEmitter` importable from `'agentcraft'`

**Unit test file to write:** `src/__tests__/workspace.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import { AgentWorkspace } from "../agent/workspace.js";
import { AgentCache } from "../agent/cache.js";

describe("AgentWorkspace", () => {
  it("create() returns workspace with events emitter", () => {
    const ws = AgentWorkspace.create({});
    expect(ws.events).toBeDefined();
    expect(typeof ws.events.on).toBe("function");
  });

  it("memory() has no cache by default", () => {
    const ws = AgentWorkspace.memory();
    expect(ws.cache).toBeUndefined();
  });

  it("create() propagates cache", () => {
    const cache = AgentCache.memory();
    const ws = AgentWorkspace.create({ cache });
    expect(ws.cache).toBe(cache);
  });

  it("events.on returns unsubscribe", () => {
    const ws = AgentWorkspace.create({});
    const handler = vi.fn();
    const unsub = ws.events.on("cache.hit", handler);
    ws.events.emit("cache.hit", { toolName: "x", key: "y" });
    expect(handler).toHaveBeenCalledOnce();
    unsub();
    ws.events.emit("cache.hit", { toolName: "x", key: "y" });
    expect(handler).toHaveBeenCalledOnce(); // still once — not called again
  });

  it("handler errors do not propagate", () => {
    const ws = AgentWorkspace.create({});
    ws.events.on("cache.miss", () => {
      throw new Error("boom");
    });
    expect(() =>
      ws.events.emit("cache.miss", { toolName: "x", key: "y" }),
    ).not.toThrow();
  });
});
```

---

## Phase 4 — ArtifactStore

**Goal:** Durable artifact persistence interface with three first-party implementations. No breaking changes. Platform stores (Airtable, Notion, Supabase) deferred to `agentcraft/stores` after core is stable.

---

### Task 4.1 — Define `ArtifactStore` interface

**New file:** `src/artifact-store/types.ts`

```ts
export interface ArtifactFilter {
  /** Filter by artifact status field if the stored artifact has one */
  status?: string;
  /** ISO date string — return artifacts created at or after this date */
  createdAfter?: string;
  /** ISO date string — return artifacts created at or before this date */
  createdBefore?: string;
  /** Maximum number of results to return */
  limit?: number;
}

export interface ArtifactRef {
  type: string;
  id: string;
}

export interface ArtifactHistory {
  id: string;
  type: string;
  changedAt: string;
  snapshot: unknown;
}

export interface ArtifactStore {
  /**
   * Persist an artifact. Returns the generated ID.
   * The artifact must be a plain object; it is serialized by the store.
   */
  put(type: string, artifact: unknown): Promise<string>;

  /**
   * Retrieve an artifact by type and ID.
   * Returns undefined if not found.
   */
  get(type: string, id: string): Promise<unknown | undefined>;

  /**
   * Query artifacts of a given type with optional filters.
   */
  query(type: string, filter?: ArtifactFilter): Promise<unknown[]>;

  /**
   * Partially update an artifact. The patch is shallow-merged onto the stored value.
   */
  update(id: string, patch: unknown): Promise<void>;

  /**
   * Delete an artifact by type and ID. Returns true if deleted, false if not found.
   * Requires explicit call — nothing deletes automatically.
   */
  delete(type: string, id: string): Promise<boolean>;

  /**
   * List all artifact type names that have at least one stored artifact.
   */
  listTypes(): Promise<string[]>;

  /**
   * Retrieve the full revision history of an artifact.
   * Phase 1: MemoryArtifactStore tracks history; FileArtifactStore does not.
   * Phase 4 SQLiteArtifactStore tracks full history.
   */
  history(type: string, id: string): Promise<ArtifactHistory[]>;

  /**
   * Create a directed link between two artifacts (e.g. Draft → SourceNote).
   * Phase 1: stored in metadata alongside the artifact.
   */
  link(source: ArtifactRef, target: ArtifactRef): Promise<void>;
}
```

---

### Task 4.2 — Build `MemoryArtifactStore`

**New file:** `src/artifact-store/memory.ts`

```ts
import { randomUUID } from "node:crypto";
import type {
  ArtifactFilter,
  ArtifactHistory,
  ArtifactRef,
  ArtifactStore,
} from "./types.js";

export function MemoryArtifactStore(): ArtifactStore {
  const store = new Map<string, Map<string, unknown>>();
  const history = new Map<string, ArtifactHistory[]>();
  const links = new Map<string, ArtifactRef[]>();

  function getTypeMap(type: string): Map<string, unknown> {
    if (!store.has(type)) store.set(type, new Map());
    return store.get(type)!;
  }

  function recordHistory(type: string, id: string, snapshot: unknown): void {
    const key = `${type}:${id}`;
    if (!history.has(key)) history.set(key, []);
    history.get(key)!.push({
      id,
      type,
      changedAt: new Date().toISOString(),
      snapshot: JSON.parse(JSON.stringify(snapshot)),
    });
  }

  return {
    async put(type: string, artifact: unknown): Promise<string> {
      const id = randomUUID();
      const entry = {
        ...(artifact as object),
        id,
        type,
        createdAt: new Date().toISOString(),
      };
      getTypeMap(type).set(id, entry);
      recordHistory(type, id, entry);
      return id;
    },

    async get(type: string, id: string): Promise<unknown | undefined> {
      return getTypeMap(type).get(id);
    },

    async query(type: string, filter?: ArtifactFilter): Promise<unknown[]> {
      let results = [...getTypeMap(type).values()];
      if (filter?.status) {
        results = results.filter(
          (r) => (r as Record<string, unknown>).status === filter.status,
        );
      }
      if (filter?.createdAfter) {
        const after = new Date(filter.createdAfter).getTime();
        results = results.filter(
          (r) =>
            new Date(
              (r as Record<string, unknown>).createdAt as string,
            ).getTime() >= after,
        );
      }
      if (filter?.createdBefore) {
        const before = new Date(filter.createdBefore).getTime();
        results = results.filter(
          (r) =>
            new Date(
              (r as Record<string, unknown>).createdAt as string,
            ).getTime() <= before,
        );
      }
      if (filter?.limit) results = results.slice(0, filter.limit);
      return results;
    },

    async update(id: string, patch: unknown): Promise<void> {
      for (const typeMap of store.values()) {
        if (typeMap.has(id)) {
          const existing = typeMap.get(id) as Record<string, unknown>;
          const updated = { ...existing, ...(patch as object) };
          typeMap.set(id, updated);
          recordHistory(existing.type as string, id, updated);
          return;
        }
      }
      throw new Error(`ArtifactStore: artifact '${id}' not found`);
    },

    async delete(type: string, id: string): Promise<boolean> {
      return getTypeMap(type).delete(id);
    },

    async listTypes(): Promise<string[]> {
      return [...store.entries()].filter(([, m]) => m.size > 0).map(([t]) => t);
    },

    async history(type: string, id: string): Promise<ArtifactHistory[]> {
      return history.get(`${type}:${id}`) ?? [];
    },

    async link(source: ArtifactRef, target: ArtifactRef): Promise<void> {
      const key = `${source.type}:${source.id}`;
      if (!links.has(key)) links.set(key, []);
      links.get(key)!.push(target);
    },
  };
}
```

---

### Task 4.3 — Build `FileArtifactStore`

**New file:** `src/artifact-store/file.ts`

Artifacts are stored as individual JSON files at `{root}/{type}/{id}.json`. Each file contains the full artifact object. History is not tracked (Phase 1 constraint — SQLite tracks history). `link()` appends to a `{root}/{type}/{id}.links.json` file.

```ts
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type {
  ArtifactFilter,
  ArtifactHistory,
  ArtifactRef,
  ArtifactStore,
} from "./types.js";

export interface FileArtifactStoreOptions {
  /** Root directory for artifact storage. Created if it does not exist. */
  root: string;
}

export function FileArtifactStore(
  options: FileArtifactStoreOptions,
): ArtifactStore {
  const root = path.resolve(options.root);

  async function ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
  }

  function typeDir(type: string): string {
    return path.join(root, sanitize(type));
  }

  function artifactPath(type: string, id: string): string {
    return path.join(typeDir(type), `${sanitize(id)}.json`);
  }

  async function readArtifact(
    type: string,
    id: string,
  ): Promise<unknown | undefined> {
    try {
      const raw = await readFile(artifactPath(type, id), "utf8");
      return JSON.parse(raw) as unknown;
    } catch {
      return undefined;
    }
  }

  async function writeArtifact(
    type: string,
    id: string,
    data: unknown,
  ): Promise<void> {
    await ensureDir(typeDir(type));
    await writeFile(
      artifactPath(type, id),
      JSON.stringify(data, null, 2) + "\n",
      "utf8",
    );
  }

  return {
    async put(type: string, artifact: unknown): Promise<string> {
      const id = randomUUID();
      const entry = {
        ...(artifact as object),
        id,
        type,
        createdAt: new Date().toISOString(),
      };
      await writeArtifact(type, id, entry);
      return id;
    },

    async get(type: string, id: string): Promise<unknown | undefined> {
      return readArtifact(type, id);
    },

    async query(type: string, filter?: ArtifactFilter): Promise<unknown[]> {
      let files: string[];
      try {
        files = (await readdir(typeDir(type))).filter(
          (f) => f.endsWith(".json") && !f.endsWith(".links.json"),
        );
      } catch {
        return [];
      }

      const results: unknown[] = [];
      for (const file of files) {
        try {
          const raw = await readFile(path.join(typeDir(type), file), "utf8");
          const artifact = JSON.parse(raw) as Record<string, unknown>;
          if (filter?.status && artifact.status !== filter.status) continue;
          if (filter?.createdAfter) {
            if (
              new Date(artifact.createdAt as string).getTime() <
              new Date(filter.createdAfter).getTime()
            )
              continue;
          }
          if (filter?.createdBefore) {
            if (
              new Date(artifact.createdAt as string).getTime() >
              new Date(filter.createdBefore).getTime()
            )
              continue;
          }
          results.push(artifact);
        } catch {
          // skip corrupt files
        }
      }

      return filter?.limit ? results.slice(0, filter.limit) : results;
    },

    async update(id: string, patch: unknown): Promise<void> {
      // scan all types to find the artifact
      let dirs: string[];
      try {
        dirs = await readdir(root);
      } catch {
        throw new Error(`ArtifactStore: artifact '${id}' not found`);
      }

      for (const dir of dirs) {
        const filePath = path.join(root, dir, `${sanitize(id)}.json`);
        try {
          const raw = await readFile(filePath, "utf8");
          const existing = JSON.parse(raw) as Record<string, unknown>;
          const updated = { ...existing, ...(patch as object) };
          await writeFile(
            filePath,
            JSON.stringify(updated, null, 2) + "\n",
            "utf8",
          );
          return;
        } catch {
          // not in this dir
        }
      }
      throw new Error(`ArtifactStore: artifact '${id}' not found`);
    },

    async delete(type: string, id: string): Promise<boolean> {
      try {
        await rm(artifactPath(type, id), { force: true });
        return true;
      } catch {
        return false;
      }
    },

    async listTypes(): Promise<string[]> {
      try {
        return await readdir(root);
      } catch {
        return [];
      }
    },

    async history(_type: string, _id: string): Promise<ArtifactHistory[]> {
      // File store does not track history in Phase 4.
      // Use SQLiteArtifactStore for full history support.
      return [];
    },

    async link(source: ArtifactRef, target: ArtifactRef): Promise<void> {
      await ensureDir(typeDir(source.type));
      const linksPath = path.join(
        typeDir(source.type),
        `${sanitize(source.id)}.links.json`,
      );
      let existing: ArtifactRef[] = [];
      try {
        existing = JSON.parse(
          await readFile(linksPath, "utf8"),
        ) as ArtifactRef[];
      } catch {
        // no existing links
      }
      existing.push(target);
      await writeFile(
        linksPath,
        JSON.stringify(existing, null, 2) + "\n",
        "utf8",
      );
    },
  };
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}
```

---

### Task 4.4 — Build `SQLiteArtifactStore`

**New file:** `src/artifact-store/sqlite.ts`

Requires `better-sqlite3` as a peer dependency. Declare in `package.json` under `peerDependencies` (optional):

```json
"peerDependencies": {
  "better-sqlite3": ">=9.0.0"
},
"peerDependenciesMeta": {
  "better-sqlite3": { "optional": true }
}
```

The store creates three tables: `artifacts`, `artifact_history`, and `artifact_links`. All writes use transactions. History is written on every `put` and `update`.

```ts
import type {
  ArtifactFilter,
  ArtifactHistory,
  ArtifactRef,
  ArtifactStore,
} from "./types.js";

export interface SQLiteArtifactStoreOptions {
  /** Absolute or relative path to the SQLite database file. */
  dbPath: string;
}

export function SQLiteArtifactStore(
  options: SQLiteArtifactStoreOptions,
): ArtifactStore {
  // Dynamic require — only loads if better-sqlite3 is installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let Database: typeof import("better-sqlite3");
  try {
    Database = require("better-sqlite3");
  } catch {
    throw new Error(
      "SQLiteArtifactStore requires 'better-sqlite3' to be installed. " +
        "Run: npm install better-sqlite3",
    );
  }

  const db = new Database(options.dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT NOT NULL,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (type, id)
    );

    CREATE TABLE IF NOT EXISTS artifact_history (
      rowid INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_type TEXT NOT NULL,
      artifact_id TEXT NOT NULL,
      changed_at TEXT NOT NULL,
      snapshot TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artifact_links (
      source_type TEXT NOT NULL,
      source_id TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL
    );
  `);

  const stmts = {
    insert: db.prepare(
      "INSERT INTO artifacts (id, type, data, created_at) VALUES (?, ?, ?, ?)",
    ),
    get: db.prepare("SELECT data FROM artifacts WHERE type = ? AND id = ?"),
    query: db.prepare("SELECT data FROM artifacts WHERE type = ?"),
    queryWithStatus: db.prepare(
      "SELECT data FROM artifacts WHERE type = ? AND json_extract(data, '$.status') = ?",
    ),
    update: db.prepare("UPDATE artifacts SET data = ? WHERE id = ?"),
    findById: db.prepare("SELECT type, data FROM artifacts WHERE id = ?"),
    delete: db.prepare("DELETE FROM artifacts WHERE type = ? AND id = ?"),
    listTypes: db.prepare("SELECT DISTINCT type FROM artifacts"),
    insertHistory: db.prepare(
      "INSERT INTO artifact_history (artifact_type, artifact_id, changed_at, snapshot) VALUES (?, ?, ?, ?)",
    ),
    history: db.prepare(
      "SELECT artifact_id, artifact_type, changed_at, snapshot FROM artifact_history WHERE artifact_type = ? AND artifact_id = ? ORDER BY rowid ASC",
    ),
    insertLink: db.prepare(
      "INSERT INTO artifact_links (source_type, source_id, target_type, target_id) VALUES (?, ?, ?, ?)",
    ),
  };

  return {
    async put(type: string, artifact: unknown): Promise<string> {
      const { randomUUID } = await import("node:crypto");
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const entry = { ...(artifact as object), id, type, createdAt };
      const data = JSON.stringify(entry);
      db.transaction(() => {
        stmts.insert.run(id, type, data, createdAt);
        stmts.insertHistory.run(type, id, createdAt, data);
      })();
      return id;
    },

    async get(type: string, id: string): Promise<unknown | undefined> {
      const row = stmts.get.get(type, id) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as unknown) : undefined;
    },

    async query(type: string, filter?: ArtifactFilter): Promise<unknown[]> {
      let rows: { data: string }[];
      if (filter?.status) {
        rows = stmts.queryWithStatus.all(type, filter.status) as {
          data: string;
        }[];
      } else {
        rows = stmts.query.all(type) as { data: string }[];
      }

      let results = rows.map(
        (r) => JSON.parse(r.data) as Record<string, unknown>,
      );

      if (filter?.createdAfter) {
        const after = new Date(filter.createdAfter).getTime();
        results = results.filter(
          (r) => new Date(r.createdAt as string).getTime() >= after,
        );
      }
      if (filter?.createdBefore) {
        const before = new Date(filter.createdBefore).getTime();
        results = results.filter(
          (r) => new Date(r.createdAt as string).getTime() <= before,
        );
      }
      if (filter?.limit) results = results.slice(0, filter.limit);
      return results;
    },

    async update(id: string, patch: unknown): Promise<void> {
      const row = stmts.findById.get(id) as
        | { type: string; data: string }
        | undefined;
      if (!row) throw new Error(`ArtifactStore: artifact '${id}' not found`);
      const existing = JSON.parse(row.data) as Record<string, unknown>;
      const updated = { ...existing, ...(patch as object) };
      const data = JSON.stringify(updated);
      db.transaction(() => {
        stmts.update.run(data, id);
        stmts.insertHistory.run(row.type, id, new Date().toISOString(), data);
      })();
    },

    async delete(type: string, id: string): Promise<boolean> {
      const result = stmts.delete.run(type, id);
      return result.changes > 0;
    },

    async listTypes(): Promise<string[]> {
      const rows = stmts.listTypes.all() as { type: string }[];
      return rows.map((r) => r.type);
    },

    async history(type: string, id: string): Promise<ArtifactHistory[]> {
      const rows = stmts.history.all(type, id) as {
        artifact_id: string;
        artifact_type: string;
        changed_at: string;
        snapshot: string;
      }[];
      return rows.map((r) => ({
        id: r.artifact_id,
        type: r.artifact_type,
        changedAt: r.changed_at,
        snapshot: JSON.parse(r.snapshot) as unknown,
      }));
    },

    async link(source: ArtifactRef, target: ArtifactRef): Promise<void> {
      stmts.insertLink.run(source.type, source.id, target.type, target.id);
    },
  };
}
```

---

### Task 4.5 — Create artifact-store index

**New file:** `src/artifact-store/index.ts`

```ts
export { MemoryArtifactStore } from "./memory.js";
export { FileArtifactStore } from "./file.js";
export type { FileArtifactStoreOptions } from "./file.js";
export { SQLiteArtifactStore } from "./sqlite.js";
export type { SQLiteArtifactStoreOptions } from "./sqlite.js";
export type {
  ArtifactStore,
  ArtifactFilter,
  ArtifactRef,
  ArtifactHistory,
} from "./types.js";
```

---

### Task 4.6 — Add `store` typing to `AgentWorkspaceConfig`

**File to modify:** `src/agent/workspace.ts`

Replace the `store?: unknown` placeholder with the real type:

```ts
import type { ArtifactStore } from "../artifact-store/types.js";

export interface AgentWorkspaceConfig {
  // ... existing fields ...
  store?: ArtifactStore;
}

export interface AgentWorkspaceInstance {
  // ... existing fields ...
  readonly store?: ArtifactStore;
}
```

---

### Task 4.7 — Export from `src/index.ts`

```ts
export {
  MemoryArtifactStore,
  FileArtifactStore,
  SQLiteArtifactStore,
} from "./artifact-store/index.js";
export type {
  ArtifactStore,
  ArtifactFilter,
  ArtifactRef,
  ArtifactHistory,
  FileArtifactStoreOptions,
  SQLiteArtifactStoreOptions,
} from "./artifact-store/index.js";
```

---

### Phase 4 Completion Criteria

- [x] `npm run typecheck` passes with zero errors
- [x] `npm test` passes — all existing tests still green
- [x] `MemoryArtifactStore()` — `put`, `get`, `query`, `update`, `delete`, `history`, `link` all work
- [x] `FileArtifactStore({ root: '.test-artifacts' })` creates JSON files at the expected paths
- [x] `FileArtifactStore.update()` finds artifact by ID across type directories
- [x] `FileArtifactStore.query()` correctly filters by `status`
- [x] `SQLiteArtifactStore({ dbPath: ':memory:' })` works when `better-sqlite3` is installed
- [x] `SQLiteArtifactStore.history()` returns all revisions in insertion order
- [x] `SQLiteArtifactStore()` throws a clear error when `better-sqlite3` is not installed
- [x] `AgentWorkspace.create({ store: MemoryArtifactStore() })` works — `workspace.store` is typed as `ArtifactStore`
- [x] All store types importable from `'agentcraft'`

**Unit test file to write:** `src/__tests__/artifact-store.test.ts`

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { MemoryArtifactStore } from "../artifact-store/memory.js";

describe("MemoryArtifactStore", () => {
  let store: ReturnType<typeof MemoryArtifactStore>;
  beforeEach(() => {
    store = MemoryArtifactStore();
  });

  it("put returns an id", async () => {
    const id = await store.put("Draft", { body: "hello" });
    expect(typeof id).toBe("string");
  });

  it("get retrieves stored artifact", async () => {
    const id = await store.put("Draft", { body: "hello" });
    const result = (await store.get("Draft", id)) as Record<string, unknown>;
    expect(result?.body).toBe("hello");
  });

  it("query filters by status", async () => {
    await store.put("Draft", { body: "a", status: "draft" });
    await store.put("Draft", { body: "b", status: "published" });
    const drafts = await store.query("Draft", { status: "draft" });
    expect(drafts.length).toBe(1);
  });

  it("update patches an artifact", async () => {
    const id = await store.put("Draft", { body: "old" });
    await store.update(id, { body: "new" });
    const result = (await store.get("Draft", id)) as Record<string, unknown>;
    expect(result?.body).toBe("new");
  });

  it("delete removes artifact", async () => {
    const id = await store.put("Draft", { body: "x" });
    await store.delete("Draft", id);
    expect(await store.get("Draft", id)).toBeUndefined();
  });

  it("history tracks revisions", async () => {
    const id = await store.put("Draft", { body: "v1" });
    await store.update(id, { body: "v2" });
    const hist = await store.history("Draft", id);
    expect(hist.length).toBe(2);
  });

  it("listTypes returns active types", async () => {
    await store.put("Draft", {});
    await store.put("SeoPlan", {});
    const types = await store.listTypes();
    expect(types).toContain("Draft");
    expect(types).toContain("SeoPlan");
  });
});
```

---

## Phase 5 — AgentWorkflow Phase 1 (In-Memory)

**Goal:** A composable, repeatable multi-step agent coordinator. All state is in-memory. No store required. Steps are factory functions — no `new` keyword.

---

### Task 5.1 — Define workflow types

**New file:** `src/agent/workflow/types.ts`

```ts
import type { z } from "zod";
import type { AgentAdapter } from "../adapters/types.js";
import type { ToolPolicy } from "../adapters/tool-policy.js";
import type { Agent } from "../agent.js";
import type { AgentTeam } from "../agent-team.js";
import type { AgentWorkspaceInstance } from "../workspace.js";
import type { ArtifactStore } from "../../artifact-store/types.js";
import type { TokenUsage } from "../types.js";

export type WorkflowStepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "awaiting_approval";

export interface WorkflowStepResult {
  stepId: string;
  status: WorkflowStepStatus;
  output?: unknown;
  error?: string;
  durationMs: number;
  cost?: number;
  tokensUsed?: TokenUsage;
}

export interface WorkflowResult<TInput = unknown> {
  runId: string;
  status: "completed" | "failed" | "partial";
  input: TInput;
  steps: WorkflowStepResult[];
  totalCost: number;
  durationMs: number;
}

export interface WorkflowContext<TInput = unknown> {
  /** The validated input passed to workflow.run() */
  input: TInput;
  /** Results of completed steps, keyed by stepId */
  steps: Record<string, WorkflowStepResult>;
  /** The workspace attached to this workflow */
  workspace: AgentWorkspaceInstance;
  /** The artifact store from workspace.store, if available */
  store: ArtifactStore | undefined;
  /** The current run ID */
  runId: string;
}

export interface WorkflowStep {
  readonly stepId: string;
  readonly type: string;
  execute(ctx: WorkflowContext): Promise<unknown>;
}

// ─── Step config interfaces ───────────────────────────────────────────────────

export interface AgentStepConfig {
  /** Unique ID used to reference this step's output in ctx.steps. Defaults to auto-generated. */
  id?: string;
  /** Agent to use for this step. If omitted, workspace must provide a default agent. */
  agent?: Agent;
  /** Prompt string or factory function receiving the workflow context. */
  prompt: string | ((ctx: WorkflowContext) => string | Promise<string>);
  /** Optional response schema for structured output from this step. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  responseSchema?: z.ZodTypeAny;
  /** Per-step ToolPolicy override, merged on top of workspace and agent policy. */
  toolPolicy?: ToolPolicy;
  /** Retry config for this step. */
  retry?: { attempts: number; delayMs?: number };
  /** What to do when this step errors. Defaults to 'fail'. */
  onError?: "fail" | "skip";
}

export interface ApprovalStepConfig {
  id?: string;
  /** Human-readable description of what requires approval. */
  description: string;
  /**
   * Called when approval is granted. Receives ctx including previous step outputs.
   * Use ctx.store to update artifact status if needed.
   */
  onApproved?: (ctx: WorkflowContext) => void | Promise<void>;
  /**
   * Called when approval is rejected. Use ctx.store to update artifact status.
   */
  onRejected?: (ctx: WorkflowContext, reason?: string) => void | Promise<void>;
  /**
   * The approval callback. Receives the context and returns true to approve.
   * If absent, the step auto-approves (useful in automated testing).
   */
  approve?: (ctx: WorkflowContext) => boolean | Promise<boolean>;
  /** Optional timeout in milliseconds. Step fails if approval is not received in time. */
  timeoutMs?: number;
}

export interface ConditionStepConfig {
  id?: string;
  /** Predicate that determines which branch runs. */
  condition: (ctx: WorkflowContext) => boolean | Promise<boolean>;
  /** Steps to run when condition is true. */
  ifTrue?: WorkflowStep | WorkflowStep[];
  /** Steps to run when condition is false. */
  ifFalse?: WorkflowStep | WorkflowStep[];
}

export interface ParallelStepConfig {
  id?: string;
  /** Steps to run concurrently. All must complete before the workflow continues. */
  steps: WorkflowStep[];
  /** If true, fail the parallel group if any step fails. Defaults to true. */
  failFast?: boolean;
}

export interface ToolStepConfig {
  id?: string;
  /**
   * The adapter that exposes the tool. Can be a static adapter reference
   * or a factory function that receives ctx.
   */
  adapter: AgentAdapter | ((ctx: WorkflowContext) => AgentAdapter);
  /**
   * The tool name as declared in adapter.getTools(). Must be a valid tool
   * name — check the adapter's declared tool names.
   */
  toolName: string;
  /**
   * Arguments for the tool call. Can be a static object or a factory
   * function that receives ctx (to pull from previous step outputs).
   */
  args:
    | Record<string, unknown>
    | ((
        ctx: WorkflowContext,
      ) => Record<string, unknown> | Promise<Record<string, unknown>>);
  /** Retry config for this tool call. */
  retry?: { attempts: number; delayMs?: number };
}

export interface TeamStepConfig {
  id?: string;
  /** AgentTeam to run for this step. */
  team: AgentTeam;
  /** Prompt factory or string for the team run. */
  prompt: string | ((ctx: WorkflowContext) => string | Promise<string>);
  retry?: { attempts: number; delayMs?: number };
}

export interface CustomStepConfig {
  id?: string;
  /**
   * Arbitrary async function. Return value becomes the step output in ctx.steps.
   * Use this for non-agent steps: data transformation, external API calls, etc.
   */
  run: (ctx: WorkflowContext) => unknown | Promise<unknown>;
  retry?: { attempts: number; delayMs?: number };
}

export interface AgentWorkflowConfig<TInput = unknown> {
  /** Optional workflow ID for logging and tracing. */
  id?: string;
  /**
   * Zod schema for validating workflow input. When provided, workflow.run()
   * validates input before any step runs. ctx.input is typed from this schema.
   */
  input?: z.ZodType<TInput>;
  /** Workspace providing shared resources to all steps. */
  workspace?: AgentWorkspaceInstance;
  /** Ordered list of steps. Run sequentially unless wrapped in ParallelStep. */
  steps: WorkflowStep[];
  /** Called after each step completes successfully. */
  onStepComplete?: (
    stepId: string,
    output: unknown,
    ctx: WorkflowContext<TInput>,
  ) => void | Promise<void>;
  /** Called after each step fails. */
  onStepError?: (
    stepId: string,
    error: Error,
    ctx: WorkflowContext<TInput>,
  ) => void | Promise<void>;
}

export interface WorkflowInspection {
  workflowId: string;
  steps: Array<{
    stepId: string;
    type: string;
  }>;
}

export interface WorkflowRunOptions<TInput> {
  input: TInput;
}

export interface WorkflowInstance<TInput = unknown> {
  /** Execute the workflow with the given input. */
  run(options: WorkflowRunOptions<TInput>): Promise<WorkflowResult<TInput>>;
  /** Returns the static step graph — IDs and types. */
  inspect(): WorkflowInspection;
}
```

---

### Task 5.2 — Build step factory functions

**New file:** `src/agent/workflow/steps.ts`

```ts
import { randomUUID } from "node:crypto";
import type {
  AgentStepConfig,
  ApprovalStepConfig,
  ConditionStepConfig,
  CustomStepConfig,
  ParallelStepConfig,
  TeamStepConfig,
  ToolStepConfig,
  WorkflowContext,
  WorkflowStep,
} from "./types.js";

function makeId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function AgentStep(config: AgentStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId("agent");
  return {
    stepId,
    type: "agent",
    async execute(ctx: WorkflowContext): Promise<unknown> {
      const agent = config.agent;
      if (!agent) {
        throw new Error(`AgentStep '${stepId}': no agent provided`);
      }
      const prompt =
        typeof config.prompt === "function"
          ? await config.prompt(ctx)
          : config.prompt;

      const response = await agent.run({
        prompt,
        ...(config.toolPolicy && { toolPolicy: config.toolPolicy }),
        ...(config.responseSchema && { responseSchema: config.responseSchema }),
      });
      return response.structuredResponse ?? response.content;
    },
  };
}

export function ApprovalStep(config: ApprovalStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId("approval");
  return {
    stepId,
    type: "approval",
    async execute(ctx: WorkflowContext): Promise<unknown> {
      const approved = config.approve ? await config.approve(ctx) : true;

      if (approved) {
        await config.onApproved?.(ctx);
        return { approved: true, description: config.description };
      } else {
        await config.onRejected?.(ctx, "Rejected by approval callback");
        throw new Error(
          `ApprovalStep '${stepId}': rejected — ${config.description}`,
        );
      }
    },
  };
}

export function ConditionStep(config: ConditionStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId("condition");
  return {
    stepId,
    type: "condition",
    async execute(ctx: WorkflowContext): Promise<unknown> {
      const result = await config.condition(ctx);
      const branch = result ? config.ifTrue : config.ifFalse;
      if (!branch) return { conditionResult: result, branchExecuted: false };

      const steps = Array.isArray(branch) ? branch : [branch];
      const outputs: unknown[] = [];
      for (const step of steps) {
        const out = await step.execute(ctx);
        ctx.steps[step.stepId] = {
          stepId: step.stepId,
          status: "completed",
          output: out,
          durationMs: 0,
        };
        outputs.push(out);
      }
      return { conditionResult: result, branchExecuted: true, outputs };
    },
  };
}

export function ParallelStep(config: ParallelStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId("parallel");
  const failFast = config.failFast ?? true;
  return {
    stepId,
    type: "parallel",
    async execute(ctx: WorkflowContext): Promise<unknown> {
      const results = await Promise.allSettled(
        config.steps.map((step) => step.execute(ctx)),
      );

      const outputs: Record<string, unknown> = {};
      const errors: string[] = [];

      for (let i = 0; i < config.steps.length; i++) {
        const step = config.steps[i]!;
        const result = results[i]!;
        if (result.status === "fulfilled") {
          outputs[step.stepId] = result.value;
          ctx.steps[step.stepId] = {
            stepId: step.stepId,
            status: "completed",
            output: result.value,
            durationMs: 0,
          };
        } else {
          errors.push(`${step.stepId}: ${result.reason}`);
          ctx.steps[step.stepId] = {
            stepId: step.stepId,
            status: "failed",
            error: String(result.reason),
            durationMs: 0,
          };
        }
      }

      if (failFast && errors.length > 0) {
        throw new Error(
          `ParallelStep '${stepId}' had failures:\n${errors.join("\n")}`,
        );
      }

      return outputs;
    },
  };
}

export function ToolStep(config: ToolStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId("tool");
  return {
    stepId,
    type: "tool",
    async execute(ctx: WorkflowContext): Promise<unknown> {
      const adapter =
        typeof config.adapter === "function"
          ? config.adapter(ctx)
          : config.adapter;

      const args =
        typeof config.args === "function"
          ? await config.args(ctx)
          : config.args;

      // Find the named tool from the adapter's declared tools
      const tools = (await adapter.getTools?.()) ?? [];
      const tool = tools.find((t) => t.name === config.toolName);
      if (!tool) {
        throw new Error(
          `ToolStep '${stepId}': tool '${config.toolName}' not found in adapter '${adapter.name}'. ` +
            `Available tools: ${tools.map((t) => t.name).join(", ")}`,
        );
      }

      const maxAttempts = config.retry?.attempts ?? 1;
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await tool.execute(args);
        } catch (err) {
          lastError = err;
          if (attempt < maxAttempts && config.retry?.delayMs) {
            await new Promise((r) => setTimeout(r, config.retry!.delayMs));
          }
        }
      }
      throw lastError;
    },
  };
}

export function TeamStep(config: TeamStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId("team");
  return {
    stepId,
    type: "team",
    async execute(ctx: WorkflowContext): Promise<unknown> {
      const prompt =
        typeof config.prompt === "function"
          ? await config.prompt(ctx)
          : config.prompt;

      const maxAttempts = config.retry?.attempts ?? 1;
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const response = await config.team.run({ prompt });
          return response.content;
        } catch (err) {
          lastError = err;
          if (attempt < maxAttempts && config.retry?.delayMs) {
            await new Promise((r) => setTimeout(r, config.retry!.delayMs));
          }
        }
      }
      throw lastError;
    },
  };
}

export function CustomStep(config: CustomStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId("custom");
  return {
    stepId,
    type: "custom",
    async execute(ctx: WorkflowContext): Promise<unknown> {
      const maxAttempts = config.retry?.attempts ?? 1;
      let lastError: unknown;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await config.run(ctx);
        } catch (err) {
          lastError = err;
          if (attempt < maxAttempts && config.retry?.delayMs) {
            await new Promise((r) => setTimeout(r, config.retry!.delayMs));
          }
        }
      }
      throw lastError;
    },
  };
}
```

---

### Task 5.3 — Build `AgentWorkflow` factory

**New file:** `src/agent/workflow/workflow.ts`

```ts
import { randomUUID } from "node:crypto";
import { AgentWorkspace } from "../workspace.js";
import type {
  AgentWorkflowConfig,
  WorkflowContext,
  WorkflowInstance,
  WorkflowInspection,
  WorkflowResult,
  WorkflowRunOptions,
  WorkflowStepResult,
} from "./types.js";

export const AgentWorkflow = {
  /**
   * Define a workflow from a config. Returns a WorkflowInstance with
   * run() and inspect() methods.
   *
   * @example
   * const myWorkflow = AgentWorkflow.create({
   *   workspace,
   *   steps: [
   *     AgentStep({ id: 'research', agent: researchAgent, prompt: 'Research AI agents' }),
   *     AgentStep({ id: 'write', agent: writerAgent, prompt: (ctx) =>
   *       `Write an article using: ${ctx.steps.research?.output}` }),
   *   ],
   * });
   *
   * const result = await myWorkflow.run({ input: {} });
   */
  create<TInput = unknown>(
    config: AgentWorkflowConfig<TInput>,
  ): WorkflowInstance<TInput> {
    const workflowId = config.id ?? `workflow-${randomUUID().slice(0, 8)}`;
    const workspace = config.workspace ?? AgentWorkspace.memory();

    return {
      inspect(): WorkflowInspection {
        return {
          workflowId,
          steps: config.steps.map((s) => ({ stepId: s.stepId, type: s.type })),
        };
      },

      async run(
        options: WorkflowRunOptions<TInput>,
      ): Promise<WorkflowResult<TInput>> {
        const runId = randomUUID();
        const startTime = Date.now();

        // Validate input if schema is provided
        let validatedInput = options.input;
        if (config.input) {
          const result = config.input.safeParse(options.input);
          if (!result.success) {
            throw new Error(
              `AgentWorkflow '${workflowId}': invalid input — ${result.error.message}`,
            );
          }
          validatedInput = result.data;
        }

        const ctx: WorkflowContext<TInput> = {
          input: validatedInput,
          steps: {},
          workspace,
          store: (workspace as { store?: unknown }).store as
            | import("../../artifact-store/types.js").ArtifactStore
            | undefined,
          runId,
        };

        const stepResults: WorkflowStepResult[] = [];
        let workflowStatus: "completed" | "failed" | "partial" = "completed";

        for (const step of config.steps) {
          const stepStart = Date.now();
          let stepResult: WorkflowStepResult;

          // Emit workflow.step.started event if workspace has events
          workspace.events.emit(
            "workflow.step.started" as never,
            {
              stepId: step.stepId,
              type: step.type,
            } as never,
          );

          try {
            const output = await step.execute(ctx);
            const durationMs = Date.now() - stepStart;

            stepResult = {
              stepId: step.stepId,
              status: "completed",
              output,
              durationMs,
            };

            ctx.steps[step.stepId] = stepResult;
            stepResults.push(stepResult);

            await config.onStepComplete?.(step.stepId, output, ctx);

            workspace.events.emit(
              "workflow.step.completed" as never,
              {
                stepId: step.stepId,
                status: "completed",
              } as never,
            );
          } catch (err) {
            const durationMs = Date.now() - stepStart;
            const error = err instanceof Error ? err.message : String(err);

            stepResult = {
              stepId: step.stepId,
              status: "failed",
              error,
              durationMs,
            };

            ctx.steps[step.stepId] = stepResult;
            stepResults.push(stepResult);

            await config.onStepError?.(
              step.stepId,
              err instanceof Error ? err : new Error(error),
              ctx,
            );

            workspace.events.emit(
              "workflow.step.completed" as never,
              {
                stepId: step.stepId,
                status: "failed",
              } as never,
            );

            workflowStatus = "failed";
            break;
          }
        }

        return {
          runId,
          status: workflowStatus,
          input: validatedInput,
          steps: stepResults,
          totalCost: 0, // Phase 5: cost aggregation added when agent response costs are summed
          durationMs: Date.now() - startTime,
        };
      },
    };
  },
} as const;
```

---

### Task 5.4 — Add workflow event types to `AgentEventMap`

**File to modify:** `src/agent/events.ts`

Add the workflow events to `AgentEventMap`:

```ts
export interface AgentEventMap {
  // ... existing events ...
  "workflow.step.started": {
    stepId: string;
    type: string;
  };
  "workflow.step.completed": {
    stepId: string;
    status: "completed" | "failed" | "skipped";
  };
}
```

---

### Task 5.5 — Create workflow index and entry point

**New file:** `src/agent/workflow/index.ts`

```ts
export { AgentWorkflow } from "./workflow.js";
export {
  AgentStep,
  ApprovalStep,
  ConditionStep,
  ParallelStep,
  ToolStep,
  TeamStep,
  CustomStep,
} from "./steps.js";
export type {
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  WorkflowInstance,
  WorkflowInspection,
  WorkflowRunOptions,
  WorkflowStepStatus,
  WorkflowStepResult,
  AgentStepConfig,
  ApprovalStepConfig,
  ConditionStepConfig,
  ParallelStepConfig,
  ToolStepConfig,
  TeamStepConfig,
  CustomStepConfig,
  AgentWorkflowConfig,
} from "./types.js";
```

**File to modify:** `src/index.ts`

```ts
export { AgentWorkflow } from "./agent/workflow/index.js";
export {
  AgentStep,
  ApprovalStep,
  ConditionStep,
  ParallelStep,
  ToolStep,
  TeamStep,
  CustomStep,
} from "./agent/workflow/index.js";
export type {
  WorkflowStep,
  WorkflowContext,
  WorkflowResult,
  WorkflowInstance,
  WorkflowInspection,
  WorkflowRunOptions,
  WorkflowStepStatus,
  WorkflowStepResult,
  AgentStepConfig,
  ApprovalStepConfig,
  ConditionStepConfig,
  ParallelStepConfig,
  ToolStepConfig,
  TeamStepConfig,
  CustomStepConfig,
  AgentWorkflowConfig,
} from "./agent/workflow/index.js";
```

---

### Phase 5 Completion Criteria

- [x] `npm run typecheck` passes with zero errors
- [x] `npm test` passes — all existing tests still green
- [x] `AgentWorkflow.create({ steps: [] }).inspect()` returns `{ workflowId, steps: [] }`
- [x] `AgentWorkflow.create({ steps: [...] }).run({ input: {} })` runs all steps in order
- [x] A failed step sets workflow `status: 'failed'` and stops execution
- [x] `AgentStep({ id: 'x', ... })` — `step.stepId === 'x'` and `step.type === 'agent'`
- [x] `ApprovalStep` with `approve: () => false` causes workflow to fail with rejection error
- [x] `ApprovalStep` with `approve: () => true` calls `onApproved` and completes
- [x] `ConditionStep` with `condition: () => true` runs `ifTrue` branch only
- [x] `ParallelStep` runs all steps concurrently (check order of resolution)
- [x] `ToolStep` with invalid `toolName` throws a clear error listing available tools
- [x] `CustomStep` output is accessible at `ctx.steps[stepId].output`
- [x] Zod input schema validation: invalid input throws before any step runs
- [x] `workflow.step.started` and `workflow.step.completed` events fire on workspace emitter
- [x] `ctx.store` is `undefined` when workspace has no store; is the store instance when workspace.store is set
- [x] `ctx.workspace` is the workspace instance passed at workflow creation
- [x] All step factories and `AgentWorkflow` importable from `'agentcraft'` with no `new` keyword

**Unit test file to write:** `src/__tests__/workflow.test.ts`

```ts
import { describe, it, expect, vi } from "vitest";
import {
  AgentWorkflow,
  AgentStep,
  ApprovalStep,
  ConditionStep,
  ParallelStep,
  CustomStep,
} from "../agent/workflow/index.js";
import { AgentWorkspace } from "../agent/workspace.js";
import { z } from "zod";

describe("AgentWorkflow", () => {
  it("inspect returns step graph", () => {
    const wf = AgentWorkflow.create({
      steps: [CustomStep({ id: "step1", run: async () => "hello" })],
    });
    const inspection = wf.inspect();
    expect(inspection.steps[0]?.stepId).toBe("step1");
    expect(inspection.steps[0]?.type).toBe("custom");
  });

  it("runs custom steps in order", async () => {
    const order: number[] = [];
    const wf = AgentWorkflow.create({
      steps: [
        CustomStep({
          id: "s1",
          run: async () => {
            order.push(1);
            return "a";
          },
        }),
        CustomStep({
          id: "s2",
          run: async () => {
            order.push(2);
            return "b";
          },
        }),
      ],
    });
    const result = await wf.run({ input: {} });
    expect(result.status).toBe("completed");
    expect(order).toEqual([1, 2]);
    expect(result.steps[0]?.output).toBe("a");
  });

  it("stops on failed step", async () => {
    const step2 = vi.fn();
    const wf = AgentWorkflow.create({
      steps: [
        CustomStep({
          id: "s1",
          run: async () => {
            throw new Error("boom");
          },
        }),
        CustomStep({ id: "s2", run: step2 }),
      ],
    });
    const result = await wf.run({ input: {} });
    expect(result.status).toBe("failed");
    expect(step2).not.toHaveBeenCalled();
  });

  it("validates input schema", async () => {
    const wf = AgentWorkflow.create({
      input: z.object({ topic: z.string() }),
      steps: [],
    });
    await expect(wf.run({ input: { topic: 123 } as never })).rejects.toThrow();
  });

  it("passes ctx.input to steps", async () => {
    let received: unknown;
    const wf = AgentWorkflow.create({
      input: z.object({ value: z.number() }),
      steps: [
        CustomStep({
          id: "s1",
          run: async (ctx) => {
            received = ctx.input;
            return null;
          },
        }),
      ],
    });
    await wf.run({ input: { value: 42 } });
    expect((received as { value: number }).value).toBe(42);
  });

  it("approval step approves and calls onApproved", async () => {
    const onApproved = vi.fn();
    const wf = AgentWorkflow.create({
      steps: [
        ApprovalStep({
          description: "test",
          approve: async () => true,
          onApproved,
        }),
      ],
    });
    const result = await wf.run({ input: {} });
    expect(result.status).toBe("completed");
    expect(onApproved).toHaveBeenCalledOnce();
  });

  it("condition step runs correct branch", async () => {
    const trueBranch = vi.fn().mockResolvedValue("true-output");
    const wf = AgentWorkflow.create({
      steps: [
        ConditionStep({
          condition: () => true,
          ifTrue: CustomStep({ id: "branch-true", run: trueBranch }),
          ifFalse: CustomStep({
            id: "branch-false",
            run: async () => "false-output",
          }),
        }),
      ],
    });
    await wf.run({ input: {} });
    expect(trueBranch).toHaveBeenCalled();
  });

  it("emits workflow events on workspace emitter", async () => {
    const workspace = AgentWorkspace.create({});
    const started = vi.fn();
    workspace.events.on("workflow.step.started" as never, started);

    const wf = AgentWorkflow.create({
      workspace,
      steps: [CustomStep({ id: "s1", run: async () => "x" })],
    });
    await wf.run({ input: {} });
    expect(started).toHaveBeenCalled();
  });
});
```

---

## Phase 6 — AgentWorkflow Phase 2 (Store-Backed Resumability)

**Goal:** Persist step state and outputs to `ArtifactStore`. Enable resuming a failed workflow from its last successful step. Adds `artifact.read` and `artifact.write` events.

---

### Task 6.1 — Add `artifact` events to `AgentEventMap`

**File to modify:** `src/agent/events.ts`

```ts
export interface AgentEventMap {
  // ... existing events ...
  "artifact.read": {
    type: string;
    id: string;
  };
  "artifact.write": {
    type: string;
    id: string;
    operation: "put" | "update" | "delete";
  };
}
```

---

### Task 6.2 — Add `WorkflowRunArtifact` type

**File to modify:** `src/agent/workflow/types.ts`

Add a persisted artifact type for workflow run state:

```ts
/**
 * Stored in ArtifactStore under type 'WorkflowRun'.
 * Captures per-step results and workflow metadata for resumability.
 */
export interface WorkflowRunArtifact {
  id: string;
  workflowId: string;
  type: "WorkflowRun";
  status: "running" | "completed" | "failed" | "partial";
  input: unknown;
  steps: WorkflowStepResult[];
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}
```

---

### Task 6.3 — Extend `AgentWorkflow.create()` with store persistence

**File to modify:** `src/agent/workflow/workflow.ts`

Update the `run()` method to persist workflow state when `workspace.store` is present. Key behavior:

1. Before running, create a `WorkflowRun` artifact in the store — returns a `runArtifactId`.
2. After each step completes or fails, update the `WorkflowRun` artifact with step results.
3. On completion or failure, update the artifact status.

```ts
// In the run() method, after validating input and before the step loop:
let runArtifactId: string | undefined;
if (ctx.store) {
  const runArtifact = {
    workflowId,
    type: "WorkflowRun",
    status: "running",
    input: validatedInput,
    steps: [],
    startedAt: new Date().toISOString(),
  };
  runArtifactId = await ctx.store.put("WorkflowRun", runArtifact);
  workspace.events.emit(
    "artifact.write" as never,
    {
      type: "WorkflowRun",
      id: runArtifactId,
      operation: "put",
    } as never,
  );
}

// After each step result (inside the loop):
if (ctx.store && runArtifactId) {
  await ctx.store.update(runArtifactId, {
    steps: stepResults,
    status: workflowStatus === "failed" ? "failed" : "running",
  });
  workspace.events.emit(
    "artifact.write" as never,
    {
      type: "WorkflowRun",
      id: runArtifactId,
      operation: "update",
    } as never,
  );
}

// After the loop completes:
if (ctx.store && runArtifactId) {
  await ctx.store.update(runArtifactId, {
    status: workflowStatus,
    steps: stepResults,
    completedAt: new Date().toISOString(),
  });
}
```

---

### Task 6.4 — Add `resume()` to `WorkflowInstance`

**File to modify:** `src/agent/workflow/types.ts` and `src/agent/workflow/workflow.ts`

Add the `resume` method to `WorkflowInstance`:

```ts
export interface WorkflowInstance<TInput = unknown> {
  run(options: WorkflowRunOptions<TInput>): Promise<WorkflowResult<TInput>>;
  inspect(): WorkflowInspection;
  /**
   * Resume a previously failed workflow run from the last successful step.
   * Requires workspace.store to be set.
   *
   * @param runArtifactId - The ID returned from a previous run's WorkflowRun artifact.
   *   Retrieve this from the store: store.query('WorkflowRun', { status: 'failed' })
   */
  resume(runArtifactId: string): Promise<WorkflowResult<TInput>>;
}
```

**Implementation in `workflow.ts`:**

```ts
async resume(runArtifactId: string): Promise<WorkflowResult<TInput>> {
  if (!workspace.store) {
    throw new Error(
      `AgentWorkflow '${workflowId}': resume() requires workspace.store. ` +
        `Add an ArtifactStore to the workspace to enable resumability.`,
    );
  }

  const stored = await workspace.store.get("WorkflowRun", runArtifactId) as WorkflowRunArtifact | undefined;
  if (!stored) {
    throw new Error(`AgentWorkflow: WorkflowRun '${runArtifactId}' not found in store`);
  }

  const completedStepIds = new Set(
    stored.steps.filter((s) => s.status === "completed").map((s) => s.stepId),
  );

  const remainingSteps = config.steps.filter((s) => !completedStepIds.has(s.stepId));

  return this.run({
    input: stored.input as TInput,
    _resumeFrom: { completedSteps: stored.steps, runArtifactId },
  } as WorkflowRunOptions<TInput>);
}
```

> **Implementation note:** Pass `_resumeFrom` as an internal option in `WorkflowRunOptions` so the `run()` method can pre-populate `ctx.steps` with previously completed results and skip those steps. Mark the internal field with a leading underscore to signal it is not part of the public API surface.

---

### Task 6.5 — Extended status vocabulary for `PublishingStatus`

The full stage vocabulary was already added to `PublishingStatusSchema` in Phase 1:

```
planned | briefed | drafted | in_review | approved | scheduled | published | failed | needs_revision | archived
```

Workflows can update `PublishingStatus` artifacts through these stages using `ctx.store.update()` in step callbacks. No additional runtime work is needed for this.

---

### Phase 6 Completion Criteria

- [x] `npm run typecheck` passes with zero errors
- [x] `npm test` passes — all existing tests still green
- [x] `WorkflowRunArtifact` stored in `ArtifactStore` when workspace has a store
- [x] `store.query('WorkflowRun', { status: 'failed' })` returns failed runs
- [x] `store.query('WorkflowRun', { status: 'completed' })` returns completed runs
- [x] `workflow.resume(runArtifactId)` skips already-completed steps and re-runs from first failed step
- [x] `resume()` without `workspace.store` throws a clear error message
- [x] `artifact.write` event fires on `workspace.events` after each store write
- [x] `artifact.read` event fires when workflow loads a `WorkflowRun` artifact on resume
- [x] All new types and methods importable from `'agentcraft'`

---

## Phase 7 — Documentation

**Goal:** Document every new primitive introduced in Phases 1–6 using the established VitePress docs pattern. Create new pages where features warrant their own page, update existing pages where new options extend them, register all new pages in the sidebar, and add runnable example files that follow the existing `examples/` style.

---

### Docs Conventions (read before writing any page)

Every documentation page in this project follows this structure — match it exactly:

````
# Feature Name

One-sentence purpose statement (no headers before it).

## Purpose

| Column | Column | Column | Column |
...

## Usage

\```ts
// minimal working snippet
\```

## Configuration

| Field | Required | Default | Purpose |
...

## Local Examples

\```ts
// 1–3 focused variant snippets
\```

More variants: [link to cookbook].
````

Rules:

- Tables before prose where a comparison table exists.
- Code blocks use `ts` not `typescript`.
- Config tables always have four columns: `Field / Option`, `Required`, `Default`, `Purpose`.
- "Local Examples" is the final section; it ends with a "More variants" link to the cookbook or a related page.
- No marketing language. No exclamation marks. Terse, factual, scannable.

Example files follow this style:

- One concept per file.
- Named `examples/feature-name.ts`.
- Inline comments explain **why** a value was chosen, not **what** the line does.
- Imports are real package import paths (`'agentcraft'`, `'agentcraft/team'`, etc.).
- `process.env.XYZ!` for all secrets.
- No `console.log` on raw objects — destructure what is useful.

---

### Task 7.1 — New page: `docs/persistence/artifact-store.md`

The existing `docs/persistence/artifact-store.md` covers the old `FileSystemAdapter`-based artifact pattern. **Replace its full content** with the `ArtifactStore` interface documentation.

````md
# ArtifactStore

`ArtifactStore` is the durable persistence interface for structured workflow outputs. It gives runs a place to write typed artifacts that later runs, tools, and workflows can read, update, and query.

## Purpose

| Implementation        | Dependency       | Best for                                   | Related page                                             |
| --------------------- | ---------------- | ------------------------------------------ | -------------------------------------------------------- |
| `MemoryArtifactStore` | None             | Tests, demos, ephemeral scripts            | [AgentWorkflow](../orchestration/agent-workflow)         |
| `FileArtifactStore`   | None             | Local dev, Git-friendly JSON per artifact  | [AgentWorkspace](../orchestration/agent-workspace)       |
| `SQLiteArtifactStore` | `better-sqlite3` | Local production, history, queryable state | [AgentWorkflow Phase 2](../orchestration/agent-workflow) |

## Usage

\```ts
import { FileArtifactStore, AgentWorkspace } from 'agentcraft';

const store = FileArtifactStore({ root: './.artifacts' });

const workspace = AgentWorkspace.create({ store });

// Put an artifact — returns generated ID
const id = await store.put('Draft', {
title: 'My Article',
body: 'Content here...',
status: 'draft',
});

// Retrieve it
const draft = await store.get('Draft', id);

// Query by status
const drafts = await store.query('Draft', { status: 'draft' });

// Patch a field without overwriting the rest
await store.update(id, { status: 'in_review' });

// Link two artifacts
await store.link(
{ type: 'Draft', id },
{ type: 'EditorialReview', id: reviewId },
);
\```

## Configuration

### `FileArtifactStore(options)`

| Option | Required | Default | Purpose                                                              |
| ------ | -------- | ------- | -------------------------------------------------------------------- |
| `root` | Yes      | None    | Directory where artifact JSON files are written. Created if missing. |

### `SQLiteArtifactStore(options)`

| Option   | Required | Default | Purpose                                                             |
| -------- | -------- | ------- | ------------------------------------------------------------------- |
| `dbPath` | Yes      | None    | Path to the SQLite database file (`:memory:` for in-process tests). |

`SQLiteArtifactStore` requires `better-sqlite3` as a peer dependency:

\```sh
npm install better-sqlite3
\```

### `ArtifactStore` Interface

| Method                       | Returns                      | Purpose                                        |
| ---------------------------- | ---------------------------- | ---------------------------------------------- |
| `put(type, artifact)`        | `Promise<string>`            | Persist an artifact. Returns the generated ID. |
| `get(type, id)`              | `Promise<unknown>`           | Retrieve by type and ID.                       |
| `query(type, filter?)`       | `Promise<unknown[]>`         | List artifacts with optional filter.           |
| `update(id, patch)`          | `Promise<void>`              | Shallow-merge patch onto stored artifact.      |
| `delete(type, id)`           | `Promise<boolean>`           | Remove artifact. Returns true if deleted.      |
| `listTypes()`                | `Promise<string[]>`          | All types with at least one artifact.          |
| `history(type, id)`          | `Promise<ArtifactHistory[]>` | All revisions (SQLite only in Phase 1).        |
| `link(sourceRef, targetRef)` | `Promise<void>`              | Create a directed link between two artifacts.  |

### `ArtifactFilter`

| Field           | Type     | Purpose                                           |
| --------------- | -------- | ------------------------------------------------- |
| `status`        | `string` | Match artifacts with this status value.           |
| `createdAfter`  | `string` | ISO date — return artifacts created on or after.  |
| `createdBefore` | `string` | ISO date — return artifacts created on or before. |
| `limit`         | `number` | Maximum results to return.                        |

## Local Examples

Use `MemoryArtifactStore` in tests:

\```ts
import { MemoryArtifactStore } from 'agentcraft';

const store = MemoryArtifactStore();
const id = await store.put('Draft', { body: 'hello', status: 'draft' });
const draft = await store.get('Draft', id);
\```

Use `SQLiteArtifactStore` for production local workflows with full history:

\```ts
import { SQLiteArtifactStore } from 'agentcraft';

const store = SQLiteArtifactStore({ dbPath: './.agentcraft/artifacts.db' });
const id = await store.put('Draft', { body: 'v1', status: 'draft' });
await store.update(id, { body: 'v2', status: 'in_review' });
const history = await store.history('Draft', id);
// history[0] is the original; history[1] is after the update
\```

More variants: [persistence examples](../examples-cookbook/production.md) and [AgentWorkflow](../orchestration/agent-workflow.md).
````

---

### Task 7.2 — New page: `docs/persistence/artifact-registry.md`

**New file:** `docs/persistence/artifact-registry.md`

````md
# ArtifactRegistry

`ArtifactRegistry` is a runtime `Map` of named Zod schemas. It lets you look up schemas by artifact type name, register custom types, and use registered schemas as `responseSchema` sources.

## Purpose

| Use case                                | How registry helps                                     | Related page                                      |
| --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Validate structured output by type name | `ArtifactRegistry.lookup('Draft')` as `responseSchema` | [Structured Output](../core/structured-output.md) |
| Extend artifact vocabulary              | Register custom schemas without forking the package    | [ArtifactStore](./artifact-store.md)              |
| Store-level validation before write     | Validate artifact shape before calling `store.put()`   | [ArtifactStore](./artifact-store.md)              |

## Usage

\```ts
import { ArtifactRegistry } from 'agentcraft';
import { z } from 'zod';

// Look up a built-in schema and use it as a response schema
const schema = ArtifactRegistry.lookup('Draft');
const response = await agent.run({
prompt: 'Draft an article on AI agents.',
responseSchema: schema,
});

// Register a custom artifact type
const ResumeDraftSchema = z.object({
type: z.literal('ResumeDraft'),
name: z.string(),
summary: z.string(),
experience: z.array(z.object({ role: z.string(), company: z.string() })).default([]),
});

ArtifactRegistry.register('ResumeDraft', ResumeDraftSchema);

// List all registered type names (19 built-in + your customs)
const allTypes = ArtifactRegistry.list();
\```

## API

| Method                   | Returns                  | Purpose                                                              |
| ------------------------ | ------------------------ | -------------------------------------------------------------------- |
| `register(name, schema)` | `void`                   | Register a custom Zod schema. Throws if name already exists.         |
| `lookup(name)`           | `ZodSchema \| undefined` | Return the schema for a type name. Returns `undefined` if not found. |
| `list()`                 | `string[]`               | All registered type names (built-in and custom).                     |
| `deregister(name)`       | `boolean`                | Remove a custom schema. Returns false for built-in names.            |

## Built-In Schemas

All 19 built-in creator artifact schemas are pre-registered:

`AudienceProfile`, `PositioningBrief`, `ContentBrief`, `SourceNote`, `ClaimMap`, `Draft`, `EditorialReview`, `SeoPlan`, `SerpBrief`, `RepurposingPack`, `PublishPackage`, `ContentCalendar`, `PerformanceReport`, `ExperimentPlan`, `BrandVoiceProfile`, `ContentPillars`, `PersonaProfile`, `MediaBrief`, `PublishingStatus`

## Extending Built-In Schemas

Registered schemas can be extended using Zod's `.extend()`. Register the extended version under a custom name:

\```ts
import { BrandVoiceProfileSchema, ArtifactRegistry } from 'agentcraft';
import { z } from 'zod';

const ExtendedBrandVoice = BrandVoiceProfileSchema.extend({
colorPalette: z.array(z.string()).default([]),
logoUrl: z.string().url().optional(),
});

ArtifactRegistry.register('ExtendedBrandVoice', ExtendedBrandVoice);
\```

## Local Examples

Validate before writing to a store:

\```ts
import { ArtifactRegistry, MemoryArtifactStore } from 'agentcraft';

const store = MemoryArtifactStore();
const schema = ArtifactRegistry.lookup('Draft');

const raw = { type: 'Draft', body: 'Content...', status: 'draft' };
const validated = schema?.parse(raw); // throws if schema mismatch
if (validated) await store.put('Draft', validated);
\```

More variants: [persistence examples](../examples-cookbook/production.md).
````

---

### Task 7.3 — New page: `docs/orchestration/agent-workspace.md`

**New file:** `docs/orchestration/agent-workspace.md`

````md
# AgentWorkspace

`AgentWorkspace` is the shared runtime context for an agent ecosystem. It wires cache, adapters, MCPs, tool policy, budget, trace sink, and logger once — then propagates them to every agent, team, and workflow created from it.

## Purpose

| Problem it solves                         | What workspace provides       | Related page                                      |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------- |
| Repeated manual wiring of cache per agent | Shared `AgentCacheController` | [AgentCache](../persistence/agent-cache.md)       |
| Adapter attached to every team member     | Shared `adapters` and `mcps`  | [Adapters](../adapters/overview.md)               |
| Per-run tool policy duplication           | Workspace-level `toolPolicy`  | [Tool Policy](../tools/tool-policy.md)            |
| No single event subscription surface      | Built-in `AgentEventEmitter`  | [Observability](../core/observability-replay.md)  |
| Store wired separately from agents        | Optional `store` reference    | [ArtifactStore](../persistence/artifact-store.md) |

## Usage

\```ts
import {
AgentWorkspace,
AgentCache,
FileArtifactStore,
createOpenTelemetryTraceSink,
} from 'agentcraft';
import { FileSystemAdapter, TavilySearchAdapter } from 'agentcraft/adapters';
import { AgentTeam } from 'agentcraft/team';

const workspace = AgentWorkspace.create({
cache: AgentCache.file('.cache', { strategy: 'auto', namespace: 'acme' }),
store: FileArtifactStore({ root: '.artifacts' }),
adapters: [
FileSystemAdapter.connect({ rootPath: './content' }),
TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }),
],
toolPolicy: { readOnly: true, redactSecrets: true },
budget: { maxCost: 5, maxToolCalls: 20 },
traceSink: createOpenTelemetryTraceSink(myTracer),
});

// All member agents inherit the workspace resources automatically
const team = AgentTeam.create({ workspace, orchestrator, members });
\```

## Configuration

| Field        | Required | Default         | Purpose                                                             |
| ------------ | -------- | --------------- | ------------------------------------------------------------------- |
| `cache`      | No       | None            | Shared cache controller for all agents in the workspace.            |
| `store`      | No       | None            | Shared `ArtifactStore` reference — passed into workflow context.    |
| `adapters`   | No       | `[]`            | Adapters attached to every agent provisioned from this workspace.   |
| `mcps`       | No       | `[]`            | MCP adapters initialized once and shared across agents.             |
| `toolPolicy` | No       | None            | Workspace-level default `ToolPolicy`. Merged before per-run policy. |
| `budget`     | No       | None            | Default `RunBudget` applied to all agents unless overridden.        |
| `traceSink`  | No       | None            | Shared trace sink for unified OTel-compatible observability.        |
| `logger`     | No       | `ConsoleLogger` | Shared logger used across all agents in the workspace.              |

## Factory Variants

| Factory                         | Cache        | Adapters | Best for                          |
| ------------------------------- | ------------ | -------- | --------------------------------- |
| `AgentWorkspace.create(config)` | As specified | As given | Full production configuration     |
| `AgentWorkspace.memory()`       | None         | None     | Tests, demos, ephemeral scripts   |
| `AgentWorkspace.local(root)`    | File cache   | None     | Local development and CLI tooling |

## AgentEventEmitter

Every workspace exposes an `events` emitter. Subscribe without configuring a full trace pipeline:

\```ts
workspace.events.on('cache.hit', ({ toolName, estimatedSavedTokens }) => {
  console.log(`Cache hit on ${toolName} — saved ~${estimatedSavedTokens} tokens`);
});

workspace.events.on('cost.updated', ({ model, cost }) => {
console.log(`${model} cost so far: $${cost.toFixed(4)}`);
});

workspace.events.on('approval.requested', ({ toolName }) => {
console.log(`Approval needed for: ${toolName}`);
});
\```

Available events:

| Event                     | Payload fields                             |
| ------------------------- | ------------------------------------------ |
| `cache.hit`               | `toolName`, `key`, `estimatedSavedTokens?` |
| `cache.miss`              | `toolName`, `key`                          |
| `cost.updated`            | `model`, `provider`, `cost`, `tokensUsed`  |
| `tool.called`             | `toolName`, `sideEffectLevel?`             |
| `approval.requested`      | `toolName`, `sideEffect?`                  |
| `approval.granted`        | `toolName`                                 |
| `approval.denied`         | `toolName`                                 |
| `workflow.step.started`   | `stepId`, `type` (Phase 5+)                |
| `workflow.step.completed` | `stepId`, `status` (Phase 5+)              |
| `artifact.read`           | `type`, `id` (Phase 6+)                    |
| `artifact.write`          | `type`, `id`, `operation` (Phase 6+)       |

## Local Examples

Workspace with memory cache (test-friendly):

\```ts
const workspace = AgentWorkspace.memory();
const unsubscribe = workspace.events.on('cache.miss', ({ toolName }) => {
// track misses during test assertion
});
\```

Workspace with file cache and store:

\```ts
const workspace = AgentWorkspace.local('./workspace');
// workspace.cache is AgentCache.file('./workspace/.agentcraft-cache')
// workspace.store is undefined — add a store explicitly if needed
\```

More variants: [orchestration cookbook](../examples-cookbook/orchestration.md).
````

---

### Task 7.4 — New page: `docs/orchestration/agent-workflow.md`

**New file:** `docs/orchestration/agent-workflow.md`

````md
# AgentWorkflow

`AgentWorkflow` is the repeatable, stateful process layer. It coordinates agents, teams, stores, artifacts, approvals, retries, and status transitions across multiple runs.

## Purpose

| Pattern                         | Step type(s)                            | Related page                                      |
| ------------------------------- | --------------------------------------- | ------------------------------------------------- |
| Multi-agent content pipeline    | `AgentStep`, `TeamStep`, `ApprovalStep` | [AgentTeam](./agent-team.md)                      |
| Conditional branching           | `ConditionStep`                         | —                                                 |
| Parallel research + merge       | `ParallelStep`, `AgentStep`             | [AgentPool](./agent-pool.md)                      |
| Human-in-the-loop approval gate | `ApprovalStep`                          | [Approvals](../tools/approvals.md)                |
| External API call in a pipeline | `ToolStep`                              | [Adapters](../adapters/overview.md)               |
| Store-backed resumability       | Any step + `store` on workspace         | [ArtifactStore](../persistence/artifact-store.md) |

## Usage

\```ts
import {
AgentWorkflow,
AgentStep,
ApprovalStep,
ParallelStep,
ToolStep,
AgentWorkspace,
FileArtifactStore,
} from 'agentcraft';
import { z } from 'zod';

const workspace = AgentWorkspace.create({
store: FileArtifactStore({ root: '.artifacts' }),
});

const workflow = AgentWorkflow.create({
workspace,
input: z.object({ topic: z.string(), audience: z.string() }),
steps: [
AgentStep({
id: 'research',
agent: researchAgent,
prompt: (ctx) => `Research "${ctx.input.topic}" for ${ctx.input.audience}.`,
}),
ApprovalStep({
id: 'review-gate',
description: 'Approve research before writing',
approve: async (ctx) => {
// auto-approve in automated runs; attach a real UI callback in production
return true;
},
onApproved: async (ctx) => {
await ctx.store?.update(ctx.steps.research!.output!.id, { status: 'approved' });
},
}),
AgentStep({
id: 'write',
agent: writerAgent,
prompt: (ctx) => `Write a 1200-word article using:\n${ctx.steps.research?.output}`,
}),
],
});

const result = await workflow.run({ input: { topic: 'AI agents', audience: 'developers' } });
console.log(result.status); // 'completed' | 'failed' | 'partial'
\```

## Step Types

| Step factory    | Purpose                                                                 |
| --------------- | ----------------------------------------------------------------------- |
| `AgentStep`     | Run an agent with a prompt. Output is `response.content` or structured. |
| `TeamStep`      | Run an `AgentTeam` with a prompt.                                       |
| `ToolStep`      | Call a specific tool on an adapter without an agent.                    |
| `ApprovalStep`  | Pause execution and invoke an approval callback.                        |
| `ConditionStep` | Branch to different steps based on a predicate.                         |
| `ParallelStep`  | Run multiple steps concurrently.                                        |
| `CustomStep`    | Run arbitrary async logic. Output is the return value.                  |

## Configuration

### `AgentWorkflow.create(config)`

| Field            | Required | Default                   | Purpose                                                           |
| ---------------- | -------- | ------------------------- | ----------------------------------------------------------------- |
| `steps`          | Yes      | None                      | Ordered list of step objects.                                     |
| `workspace`      | No       | `AgentWorkspace.memory()` | Shared resources for all steps.                                   |
| `input`          | No       | None                      | Zod schema for typed, validated workflow input.                   |
| `id`             | No       | Auto-generated            | Workflow ID for logging and tracing.                              |
| `onStepComplete` | No       | None                      | Called after each successful step with `stepId`, `output`, `ctx`. |
| `onStepError`    | No       | None                      | Called after each failed step with `stepId`, `error`, `ctx`.      |

### `AgentStep(config)`

| Field            | Required | Default  | Purpose                                                            |
| ---------------- | -------- | -------- | ------------------------------------------------------------------ |
| `agent`          | Yes      | None     | Agent to run for this step.                                        |
| `prompt`         | Yes      | None     | String or `(ctx) => string` factory.                               |
| `id`             | No       | Auto     | Step ID used to reference this output in `ctx.steps`.              |
| `responseSchema` | No       | None     | Zod schema for structured output from this step.                   |
| `toolPolicy`     | No       | None     | Per-step tool policy, merged on top of agent and workspace policy. |
| `retry`          | No       | None     | `{ attempts: number; delayMs?: number }`.                          |
| `onError`        | No       | `'fail'` | `'fail'` stops the workflow; `'skip'` continues.                   |

### `ApprovalStep(config)`

| Field         | Required | Default      | Purpose                                                          |
| ------------- | -------- | ------------ | ---------------------------------------------------------------- |
| `description` | Yes      | None         | Human-readable description of what requires approval.            |
| `approve`     | No       | Auto-approve | `(ctx) => boolean` callback. Absent means auto-approve.          |
| `onApproved`  | No       | None         | Called when approved. Use `ctx.store` to update artifact status. |
| `onRejected`  | No       | None         | Called when rejected. Use `ctx.store` to record rejection.       |
| `id`          | No       | Auto         | Step ID.                                                         |

### `ToolStep(config)`

| Field      | Required | Default | Purpose                                                      |
| ---------- | -------- | ------- | ------------------------------------------------------------ |
| `adapter`  | Yes      | None    | Adapter instance or `(ctx) => adapter` factory.              |
| `toolName` | Yes      | None    | Name of the tool as declared in `adapter.getTools()`.        |
| `args`     | Yes      | None    | Static object or `(ctx) => Record<string, unknown>` factory. |
| `retry`    | No       | None    | `{ attempts: number; delayMs?: number }`.                    |

### `ConditionStep(config)`

| Field       | Required | Default | Purpose                                       |
| ----------- | -------- | ------- | --------------------------------------------- |
| `condition` | Yes      | None    | `(ctx) => boolean` predicate.                 |
| `ifTrue`    | No       | None    | Step or steps to run when condition is true.  |
| `ifFalse`   | No       | None    | Step or steps to run when condition is false. |

### `ParallelStep(config)`

| Field      | Required | Default | Purpose                                      |
| ---------- | -------- | ------- | -------------------------------------------- |
| `steps`    | Yes      | None    | Steps to run concurrently.                   |
| `failFast` | No       | `true`  | If true, fail the group when any step fails. |

### Workflow Context (`ctx`)

| Field       | Type                         | Purpose                                               |
| ----------- | ---------------------------- | ----------------------------------------------------- |
| `input`     | `TInput`                     | Validated workflow input (typed from `input` schema). |
| `steps`     | `Record<string, StepResult>` | Results of all completed steps keyed by step ID.      |
| `workspace` | `AgentWorkspaceInstance`     | The shared workspace.                                 |
| `store`     | `ArtifactStore \| undefined` | `workspace.store` shortcut — may be undefined.        |
| `runId`     | `string`                     | Unique ID for this workflow execution.                |

## Resumability (Phase 6)

When `workspace.store` is set, every workflow run persists state as a `WorkflowRun` artifact. A failed run can be resumed from its last successful step:

\```ts
// Find failed runs
const failed = await store.query('WorkflowRun', { status: 'failed' });
const runId = failed[0].id;

// Resume — skips completed steps
const result = await workflow.resume(runId);
\```

## Local Examples

Condition-branched workflow:

\```ts
const workflow = AgentWorkflow.create({
steps: [
ConditionStep({
condition: (ctx) => ctx.input.audience === 'technical',
ifTrue: AgentStep({ id: 'tech-draft', agent, prompt: 'Write technical docs.' }),
ifFalse: AgentStep({ id: 'plain-draft', agent, prompt: 'Write plain-language summary.' }),
}),
],
});
\```

Parallel research:

\```ts
ParallelStep({
  steps: [
    AgentStep({ id: 'serp', agent, prompt: (ctx) => `SERP analysis for ${ctx.input.topic}`}),
    AgentStep({ id: 'competitor', agent, prompt: (ctx) =>`Competitor analysis for ${ctx.input.topic}` }),
],
})
\```

More variants: [orchestration cookbook](../examples-cookbook/orchestration.md).
````

---

### Task 7.5 — New page: `docs/configuration/workspace-config.md`

**New file:** `docs/configuration/workspace-config.md`

````md
# Workspace Config

`AgentWorkspace` config is the shared runtime configuration applied to all agents, teams, and workflows created from the workspace.

## Fields

| Option       | Required | Default         | Purpose                                                  |
| ------------ | -------- | --------------- | -------------------------------------------------------- |
| `cache`      | No       | None            | `AgentCacheController` — shared cache for all agents.    |
| `store`      | No       | None            | `ArtifactStore` — shared store for workflow persistence. |
| `adapters`   | No       | `[]`            | Adapters propagated to every agent in the workspace.     |
| `mcps`       | No       | `[]`            | MCP adapters shared across agents.                       |
| `toolPolicy` | No       | None            | Base `ToolPolicy` — merged before per-agent and per-run. |
| `budget`     | No       | None            | Default `RunBudget` for all agents.                      |
| `traceSink`  | No       | None            | Shared `TraceSink` for span-level observability.         |
| `logger`     | No       | `ConsoleLogger` | Shared logger for all agents.                            |

## Usage

\```ts
import { AgentWorkspace, AgentCache, FileArtifactStore } from 'agentcraft';
import { FileSystemAdapter } from 'agentcraft/adapters';

const workspace = AgentWorkspace.create({
cache: AgentCache.file('.cache', { strategy: 'auto' }),
store: FileArtifactStore({ root: '.artifacts' }),
adapters: [FileSystemAdapter.connect({ rootPath: './content' })],
toolPolicy: { readOnly: true },
budget: { maxCost: 5 },
});
\```

## Factory Shorthand

\```ts
// No config — suitable for tests
const workspace = AgentWorkspace.memory();

// File cache at root — suitable for local dev
const workspace = AgentWorkspace.local('./workspace');
\```

## Related

- [AgentWorkspace](../orchestration/agent-workspace.md)
- [Cache Config](./cache-config.md)
- [Tool Policy Config](./tool-policy-config.md)
- [Run Config](./run-config.md)
````

---

### Task 7.6 — New page: `docs/configuration/workflow-config.md`

**New file:** `docs/configuration/workflow-config.md`

````md
# Workflow Config

`AgentWorkflow.create(config)` config shapes the workflow definition. `workflow.run(options)` config shapes one execution.

## Workflow Definition Fields

| Option           | Required | Default                   | Purpose                                                  |
| ---------------- | -------- | ------------------------- | -------------------------------------------------------- |
| `steps`          | Yes      | None                      | Ordered `WorkflowStep[]`.                                |
| `workspace`      | No       | `AgentWorkspace.memory()` | Shared runtime context for all steps.                    |
| `input`          | No       | None                      | Zod schema — validates `run({ input })` before any step. |
| `id`             | No       | Auto-generated            | Workflow identifier for logging and trace correlation.   |
| `onStepComplete` | No       | None                      | Callback after each successful step.                     |
| `onStepError`    | No       | None                      | Callback after each failed step.                         |

## Run Options

| Option  | Required | Default | Purpose                                                       |
| ------- | -------- | ------- | ------------------------------------------------------------- |
| `input` | Yes      | None    | Workflow input. Validated against `input` schema if provided. |

## Step Common Fields

Every step factory accepts:

| Field   | Required | Default | Purpose                                                 |
| ------- | -------- | ------- | ------------------------------------------------------- |
| `id`    | No       | Auto    | Step ID. Referenced in `ctx.steps[id]`.                 |
| `retry` | No       | None    | `{ attempts: number; delayMs?: number }` for this step. |

## Usage

\```ts
import { AgentWorkflow, AgentStep, CustomStep } from 'agentcraft';
import { z } from 'zod';

const workflow = AgentWorkflow.create({
id: 'content-pipeline',
input: z.object({ topic: z.string() }),
steps: [
AgentStep({
id: 'draft',
agent,
prompt: (ctx) => `Write about ${ctx.input.topic}`,
retry: { attempts: 2, delayMs: 500 },
}),
CustomStep({
id: 'save',
run: async (ctx) => {
await ctx.store?.put('Draft', { body: ctx.steps.draft?.output });
},
}),
],
onStepComplete: (stepId, output) => {
console.log(`Step ${stepId} done`);
},
});

const result = await workflow.run({ input: { topic: 'AI caching strategies' } });
\```

## Related

- [AgentWorkflow](../orchestration/agent-workflow.md)
- [Workspace Config](./workspace-config.md)
- [ArtifactStore](../persistence/artifact-store.md)
````

---

### Task 7.7 — Update existing pages

#### `docs/persistence/agent-cache.md` — Add `memory()` driver

After the existing `## Configuration` table, add a new section:

````md
## Cache Drivers

| Driver                  | Dependency | Best for                                         |
| ----------------------- | ---------- | ------------------------------------------------ |
| `AgentCache.file(root)` | None       | Local and single-process production deployments. |
| `AgentCache.memory()`   | None       | Tests, demos, and ephemeral short-lived scripts. |
| `AgentCache.disabled()` | None       | Explicitly disabling cache while keeping config. |

\```ts
// In-memory cache — no filesystem, fast, isolated per instance
const cache = AgentCache.memory({
defaultTtlMs: 60_000,
maxEntryBytes: 100_000,
});
\```
````

#### `docs/configuration/cache-config.md` — Add `memory` type and `CachePolicy`

Update the `type` row in the Fields table:

```md
| `type` | Yes | None | `file`, `memory`, or `disabled`. |
```

Add `AgentCache.memory(options)` config table and a new `## CachePolicy` section:

````md
## CachePolicy

`cachePolicy` on `RunBudget` enforces cache hits before a run proceeds. Use this to guarantee that expensive tool calls are served from cache in cost-sensitive flows.

| Field              | Required | Default | Purpose                                                                     |
| ------------------ | -------- | ------- | --------------------------------------------------------------------------- |
| `requireCachedFor` | No       | None    | Tool names that must have a cache hit before the run is allowed to proceed. |

\```ts
await agent.run({
prompt: 'Summarize the research.',
budget: {
maxCost: 0.10,
cachePolicy: {
// Fail before execution if web_search has no cached result.
// Prevents accidental live API calls in replay and cost-controlled flows.
requireCachedFor: ['web_search', 'fetch_url'],
},
},
});
\```
````

#### `docs/core/budgets-cost.md` — Add `cachePolicy` row

Add one row to the Configuration table:

```md
| `budget.cachePolicy.requireCachedFor` | No | None | Tool names that must have a cache hit before the run proceeds. |
```

#### `docs/orchestration/agent-team.md` — Add workspace and rolePolicies

Add to the Configuration table:

```md
| `workspace` | No | None | `AgentWorkspaceInstance` — propagates cache, adapters, policy to all members. |
| `rolePolicies` | No | None | `Record<string, ToolPolicy>` — per-role tool policy overrides. |
```

Add a new "## Workspace Integration" section showing the workspace + rolePolicies pattern.

Add a deprecation note to the `sharedAdapters` and `memory` rows.

#### `docs/start/feature-map.md` — Add new feature rows

Append four rows to the Feature Map table:

```md
| AgentWorkspace | Shared cache, adapters, policy, and events for agent ecosystems. | [AgentWorkspace](../orchestration/agent-workspace.md) | [Orchestration cookbook](../examples-cookbook/orchestration.md) |
| AgentWorkflow | Repeatable multi-step agent pipelines with approval and retry. | [AgentWorkflow](../orchestration/agent-workflow.md) | [Orchestration cookbook](../examples-cookbook/orchestration.md) |
| ArtifactStore | Durable typed persistence for workflow outputs. | [ArtifactStore](../persistence/artifact-store.md) | [Persistence examples](../examples-cookbook/production.md) |
| ArtifactRegistry| Named schema registry for artifact validation and extension. | [ArtifactRegistry](../persistence/artifact-registry.md)| [Persistence examples](../examples-cookbook/production.md) |
```

#### `docs/index.md` — Add Core Workflows rows

Add two rows to the Core Workflows table:

```md
| Build repeatable pipelines | [AgentWorkflow](./orchestration/agent-workflow.md) | [Orchestration cookbook](./examples-cookbook/orchestration.md) |
| Persist agent outputs | [ArtifactStore](./persistence/artifact-store.md) | [Persistence examples](./examples-cookbook/production.md) |
```

#### `docs/examples-cookbook/orchestration.md` — Add workspace and workflow examples

Append two new example sections:

````md
## Workspace With Team

\```ts
const workspace = AgentWorkspace.create({
cache: AgentCache.file('.cache'),
adapters: [TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! })],
toolPolicy: { readOnly: true },
});

workspace.events.on('cost.updated', ({ cost }) => {
if (cost > 3) console.warn('Approaching budget limit');
});

const team = AgentTeam.create({
workspace,
orchestrator,
members: [
{ role: 'researcher', agent: researcher },
{ role: 'writer', agent: writer },
],
rolePolicies: {
researcher: { allowSideEffects: false },
writer: { readOnly: false },
},
});
\```

## Multi-Step Workflow

\```ts
const workflow = AgentWorkflow.create({
  workspace,
  steps: [
    AgentStep({ id: 'research', agent: researcher, prompt: 'Research AI caching.' }),
    ApprovalStep({
      id: 'gate',
      description: 'Approve research before writing',
      approve: async () => true,
    }),
    AgentStep({ id: 'write', agent: writer, prompt: (ctx) =>
      `Write an article using: ${ctx.steps.research?.output}` }),
],
});

const result = await workflow.run({ input: {} });
\```
````

---

### Task 7.8 — New runnable example files

Each file follows the existing `examples/` style: one concept, descriptive inline comments, real import paths.

#### `examples/agent-workspace.ts`

```ts
import {
  Agent,
  AgentWorkspace,
  AgentCache,
  FileArtifactStore,
  Provider,
} from "agentcraft";
import { AgentTeam } from "agentcraft/team";
import { TavilySearchAdapter, FileSystemAdapter } from "agentcraft/adapters";

// Workspace wires all shared config once. Every agent and team created from it
// inherits cache, adapters, policy, and budget without manual repetition.
const workspace = AgentWorkspace.create({
  cache: AgentCache.file(".cache", {
    strategy: "auto",
    namespace: "acme-research",
    version: "v1",
  }),
  store: FileArtifactStore({ root: ".artifacts" }),
  adapters: [
    TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }),
    FileSystemAdapter.connect({ rootPath: "./content", readOnly: false }),
  ],
  // Base policy applied to all agents. Per-agent or per-run policy adds on top.
  toolPolicy: { redactSecrets: true, maxResultBytes: 200_000 },
  budget: { maxCost: 8, maxToolCalls: 30 },
});

// Subscribe to lightweight events without a full OTel trace pipeline.
workspace.events.on("cache.hit", ({ toolName, estimatedSavedTokens }) => {
  console.log(
    `Cache hit: ${toolName} saved ~${estimatedSavedTokens ?? 0} tokens`,
  );
});

workspace.events.on("approval.requested", ({ toolName }) => {
  console.warn(
    `Approval needed for ${toolName} — check toolPolicy.approvedTools`,
  );
});

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const writer = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const team = AgentTeam.create({
  workspace,
  orchestrator: researcher,
  members: [
    { role: "researcher", agent: researcher },
    { role: "writer", agent: writer },
  ],
  // researcher stays read-only; writer can write output files.
  rolePolicies: {
    researcher: { readOnly: true },
    writer: { allowSideEffects: true },
  },
});

const response = await team.run({
  prompt: "Research and write a 1200-word article on AI caching strategies.",
});

console.log(response.content);
console.log("Cache stats:", response.cache);
```

#### `examples/artifact-store.ts`

```ts
import {
  Agent,
  AgentWorkspace,
  FileArtifactStore,
  SQLiteArtifactStore,
  MemoryArtifactStore,
  ArtifactRegistry,
  Provider,
} from "agentcraft";

// FileArtifactStore writes one JSON file per artifact.
// Good for Git-friendly outputs and human inspection.
const fileStore = FileArtifactStore({ root: "./.artifacts" });

// SQLiteArtifactStore stores all artifacts in one DB with full revision history.
// Good for production local workflows with query and history needs.
// Requires: npm install better-sqlite3
const sqliteStore = SQLiteArtifactStore({
  dbPath: "./.agentcraft/artifacts.db",
});

// MemoryArtifactStore holds everything in memory — no files, no DB.
// Good for tests and demo scripts.
const memStore = MemoryArtifactStore();

const workspace = AgentWorkspace.create({
  store: sqliteStore,
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Use the registry to get the Draft schema for structured output validation.
const DraftSchema = ArtifactRegistry.lookup("Draft");

const response = await agent.run({
  prompt: "Draft a short article on AI agent memory patterns.",
  responseSchema: DraftSchema,
});

// Persist the draft artifact.
const id = await workspace.store!.put("Draft", {
  ...response.structuredResponse,
  status: "draft",
});

console.log("Draft stored with ID:", id);

// Query all drafts awaiting review.
const pending = await workspace.store!.query("Draft", { status: "draft" });
console.log("Pending drafts:", pending.length);

// Patch status after editorial review.
await workspace.store!.update(id, { status: "in_review" });

// Retrieve full revision history (SQLiteArtifactStore tracks all updates).
const history = await workspace.store!.history("Draft", id);
console.log("Revisions:", history.length);
```

#### `examples/artifact-registry.ts`

```ts
import { ArtifactRegistry, MemoryArtifactStore } from "agentcraft";
import { z } from "zod";

// All 19 built-in artifact types are pre-registered.
console.log("Built-in types:", ArtifactRegistry.list().length); // 19

// Register a domain-specific custom type.
// AgentCraft core does not ship resume or sales schemas
// to avoid committing to every possible domain. Register your own.
const ResumeDraftSchema = z.object({
  type: z.literal("ResumeDraft"),
  name: z.string(),
  summary: z.string(),
  experience: z
    .array(
      z.object({
        role: z.string(),
        company: z.string(),
        years: z.number(),
      }),
    )
    .default([]),
  status: z.enum(["draft", "reviewed", "final"]).default("draft"),
  createdAt: z.string().default(() => new Date().toISOString()),
});

ArtifactRegistry.register("ResumeDraft", ResumeDraftSchema);

// Use the registered schema as a responseSchema for structured output.
const schema = ArtifactRegistry.lookup("ResumeDraft");
console.log("ResumeDraft schema found:", schema !== undefined);

// Use for store-level validation before writing.
const store = MemoryArtifactStore();
const raw = {
  type: "ResumeDraft",
  name: "Alex Chen",
  summary: "5 years building distributed systems.",
};

const validated = schema?.parse(raw);
if (validated) {
  const id = await store.put("ResumeDraft", validated);
  console.log("Stored resume draft:", id);
}

// Extend a built-in schema without forking the package.
import { BrandVoiceProfileSchema } from "agentcraft";

const ExtendedBrandVoice = BrandVoiceProfileSchema.extend({
  colorPalette: z.array(z.string()).default([]),
  fontFamily: z.string().optional(),
});

ArtifactRegistry.register("ExtendedBrandVoice", ExtendedBrandVoice);
console.log(
  "Extended type registered:",
  ArtifactRegistry.lookup("ExtendedBrandVoice") !== undefined,
);
```

#### `examples/agent-workflow.ts`

```ts
import {
  Agent,
  AgentWorkflow,
  AgentStep,
  ApprovalStep,
  ConditionStep,
  ParallelStep,
  ToolStep,
  CustomStep,
  AgentWorkspace,
  FileArtifactStore,
  Provider,
} from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";
import { z } from "zod";

const tavilyAdapter = TavilySearchAdapter.connect({
  apiKey: process.env.TAVILY_API_KEY!,
});

const workspace = AgentWorkspace.create({
  store: FileArtifactStore({ root: ".artifacts" }),
  adapters: [tavilyAdapter],
});

// Emit workflow progress events — no OTel setup required.
workspace.events.on("workflow.step.started", ({ stepId }) => {
  console.log(`→ Step starting: ${stepId}`);
});
workspace.events.on("workflow.step.completed", ({ stepId, status }) => {
  console.log(`✓ Step done: ${stepId} [${status}]`);
});

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});
const writer = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const contentWorkflow = AgentWorkflow.create({
  id: "content-pipeline",
  workspace,
  // Zod schema validates input before any step runs. ctx.input is fully typed.
  input: z.object({
    topic: z.string(),
    audience: z.enum(["developers", "executives", "general"]),
    targetLength: z.number().int().min(500).default(1200),
  }),
  steps: [
    // Parallel research — serp and competitor run at the same time.
    ParallelStep({
      id: "research",
      steps: [
        AgentStep({
          id: "serp",
          agent: researcher,
          prompt: (ctx) =>
            `SERP analysis for "${ctx.input.topic}" targeting ${ctx.input.audience}.`,
        }),
        AgentStep({
          id: "competitor",
          agent: researcher,
          prompt: (ctx) => `Competitor content gaps for "${ctx.input.topic}".`,
        }),
      ],
    }),

    // Conditional: long-form or executive summary based on audience.
    ConditionStep({
      id: "format-branch",
      condition: (ctx) => ctx.input.audience === "executives",
      ifTrue: AgentStep({
        id: "exec-brief",
        agent: writer,
        prompt: (ctx) =>
          `Write a 300-word executive brief on "${ctx.input.topic}". ` +
          `Research: ${JSON.stringify(ctx.steps.research?.output)}`,
      }),
      ifFalse: AgentStep({
        id: "full-draft",
        agent: writer,
        prompt: (ctx) =>
          `Write a ${ctx.input.targetLength}-word article for ${ctx.input.audience} on "${ctx.input.topic}". ` +
          `SERP: ${JSON.stringify(ctx.steps.serp?.output)}. ` +
          `Competitor gaps: ${JSON.stringify(ctx.steps.competitor?.output)}`,
        retry: { attempts: 2, delayMs: 1000 },
      }),
    }),

    // Human gate before publishing — auto-approved here; attach a real UI callback in production.
    ApprovalStep({
      id: "editorial-gate",
      description: "Editorial review before persisting the draft",
      approve: async (ctx) => {
        // In production: send a Slack message, wait for a webhook, return true/false.
        const output = ctx.steps["exec-brief"] ?? ctx.steps["full-draft"];
        return typeof output?.output === "string" && output.output.length > 100;
      },
      onApproved: async (ctx) => {
        // Store approved draft and update publishing status.
        const body =
          ctx.steps["exec-brief"]?.output ?? ctx.steps["full-draft"]?.output;
        const draftId = await ctx.store!.put("Draft", {
          body,
          topic: ctx.input.topic,
          status: "approved",
        });
        await ctx.store!.put("PublishingStatus", {
          artifactRef: draftId,
          channel: "blog",
          stage: "approved",
        });
      },
      onRejected: async (ctx, reason) => {
        console.warn("Draft rejected:", reason);
      },
    }),

    // Custom step for non-agent work — log metrics, call external APIs, etc.
    CustomStep({
      id: "metrics",
      run: async (ctx) => {
        const drafts = await ctx.store?.query("Draft", { status: "approved" });
        return { approvedCount: drafts?.length ?? 0, runId: ctx.runId };
      },
    }),
  ],
});

const result = await contentWorkflow.run({
  input: {
    topic: "AI agents in production",
    audience: "developers",
    targetLength: 1200,
  },
});

console.log("Workflow status:", result.status);
console.log(
  "Steps completed:",
  result.steps.filter((s) => s.status === "completed").length,
);
console.log("Total duration:", result.durationMs, "ms");

// If workflow fails, retrieve the run artifact and resume from last successful step.
if (result.status === "failed") {
  const failedRuns = await workspace.store!.query("WorkflowRun", {
    status: "failed",
  });
  if (failedRuns.length > 0) {
    const runArtifact = failedRuns[0] as { id: string };
    const resumed = await contentWorkflow.resume(runArtifact.id);
    console.log("Resumed workflow status:", resumed.status);
  }
}
```

---

### Task 7.9 — Update `.vitepress/config.ts` sidebar

**File to modify:** `docs/.vitepress/config.ts`

Add new entries to the sidebar. Each addition is listed below by section:

**Orchestration section** — add after `dynamic-team-spawning`:

```ts
{ text: 'Agent Workspace', link: '/orchestration/agent-workspace' },
{ text: 'Agent Workflow', link: '/orchestration/agent-workflow' },
```

**Persistence And Cache section** — add after `agent-cache`:

```ts
{ text: 'Artifact Registry', link: '/persistence/artifact-registry' },
```

(`artifact-store` already exists in the sidebar — its content is replaced in Task 7.1.)

**Configuration Reference section** — add after `cache-config`:

```ts
{ text: 'Workspace Config', link: '/configuration/workspace-config' },
{ text: 'Workflow Config', link: '/configuration/workflow-config' },
```

---

### Phase 7 Completion Criteria

- [x] `npm run docs:build` completes with no broken links and no build errors
- [x] `npm run docs:dev` serves the site locally — all new pages render correctly
- [x] All new sidebar items (`Agent Workspace`, `Agent Workflow`, `Artifact Registry`, `Workspace Config`, `Workflow Config`) appear in the nav and link to their respective pages
- [x] `docs/persistence/artifact-store.md` no longer references `FileSystemAdapter` as the artifact store — fully replaced with `ArtifactStore` interface content
- [x] `docs/persistence/artifact-registry.md` exists and documents all 4 API methods with correct signatures
- [x] `docs/orchestration/agent-workspace.md` documents all 3 factory variants, all config fields, and all event types
- [x] `docs/orchestration/agent-workflow.md` documents all 7 step types with config tables and shows `ctx` shape
- [x] `docs/configuration/workspace-config.md` and `docs/configuration/workflow-config.md` both exist and follow the config page pattern (Fields table, Usage, Related)
- [x] `docs/persistence/agent-cache.md` includes `AgentCache.memory()` and the cache driver comparison table
- [x] `docs/configuration/cache-config.md` has `memory` in the type field and includes the `CachePolicy` section
- [x] `docs/core/budgets-cost.md` includes `cachePolicy.requireCachedFor` in its config table
- [x] `docs/orchestration/agent-team.md` documents `workspace` and `rolePolicies` fields and marks `sharedAdapters`/`memory` as deprecated
- [x] `docs/start/feature-map.md` has rows for `AgentWorkspace`, `AgentWorkflow`, `ArtifactStore`, and `ArtifactRegistry`
- [x] `docs/index.md` Core Workflows table references `AgentWorkflow` and `ArtifactStore`
- [x] All four example files exist: `examples/agent-workspace.ts`, `examples/agent-workflow.ts`, `examples/artifact-store.ts`, `examples/artifact-registry.ts`
- [x] All example files use real import paths (`'agentcraft'`, `'agentcraft/team'`, `'agentcraft/adapters'`)
- [x] No example file uses `new` on any exported factory
- [x] `npm run examples:typecheck` passes for all four new example files (once implementation is done)
- [x] Every new doc page ends with a "More variants:" link pointing to the cookbook or a related page
- [x] No doc page uses the word "simple" or marketing-style exclamation marks

---

_All 7 phases complete. All supervisor criteria pass. Implementation is done._

---

## Final Supervisor Criteria

This is the full acceptance checklist. Run every item before declaring the implementation complete. Every item must pass.

### TypeScript Integrity

- [x] `npm run typecheck` exits with zero errors across the full codebase
- [x] `npm run build` completes successfully — `dist/` is generated
- [x] No use of `any` in new public interfaces — use `unknown` where the type is genuinely unknown
- [x] All new public types are exported from `src/index.ts` and accessible from `'agentcraft'`
- [x] `AgentWorkspaceInstance` is importable from both `'agentcraft'` and `'agentcraft/team'`
- [x] No `new` keyword appears in any example, test, or exported API surface for the following: `AgentWorkspace`, `ArtifactRegistry`, `MemoryArtifactStore`, `FileArtifactStore`, `SQLiteArtifactStore`, `AgentWorkflow`, `AgentStep`, `ApprovalStep`, `ConditionStep`, `ParallelStep`, `ToolStep`, `TeamStep`, `CustomStep`

### Existing Code Compatibility

- [x] `npm test` passes — zero regressions in the existing test suite
- [x] `AgentCache.file()`, `AgentCache.disabled()`, `AgentCache.placeholder()` are unchanged
- [x] `AgentTeam.create({ orchestrator, members })` without workspace still works — legacy path preserved
- [x] `AgentTeamConfig` fields `sharedAdapters` and `memory` still compile without errors
- [x] `RunBudget` with no `cachePolicy` still compiles and works — field is optional
- [x] All 14 existing artifact schemas still parse correctly
- [x] `CreatorArtifactUnionSchema` correctly discriminates all 19 schemas (14 original + 5 new)

### ArtifactRegistry

- [x] `ArtifactRegistry.list()` returns exactly 19 names before any custom registration
- [x] All 19 names correspond to valid Zod schemas via `ArtifactRegistry.lookup(name).parse({})`
- [x] Custom registration works; duplicate registration throws; built-in deregistration returns `false`
- [x] `ArtifactRegistry` can be used as `responseSchema` source: `ArtifactRegistry.lookup('Draft')` returned schema validates `Draft` artifact objects

### AgentCache.memory()

- [x] TTL expiry works: entry expires after configured `defaultTtlMs`
- [x] `pruneExpired()` returns the number of entries actually pruned
- [x] Two `AgentCache.memory()` calls return independent instances — no shared state

### AgentWorkspace

- [x] `AgentWorkspace.create({ cache: AgentCache.memory(), adapters: [] })` succeeds
- [x] `workspace.events` is not undefined on any factory variant
- [x] `AgentWorkspace.local(root)` creates a cache directory at the specified path
- [x] Multiple `on()` handlers for the same event all fire
- [x] Workspace propagation: when passed to `AgentTeam`, all member agents receive workspace adapters

### AgentTeam.rolePolicies

- [x] `rolePolicies: { reviewer: { readOnly: true } }` applies read-only policy to the agent with role `'reviewer'`
- [x] `rolePolicies` does not affect agents whose role is not listed
- [x] When `workspace` is present and `sharedAdapters` is also provided, a deprecation warning is logged to console

### ArtifactStore

- [x] All three stores implement all `ArtifactStore` interface methods
- [x] `FileArtifactStore.update()` correctly patches without overwriting unrelated fields
- [x] `SQLiteArtifactStore` runs `PRAGMA journal_mode = WAL` for write performance
- [x] `SQLiteArtifactStore.history()` returns revisions in chronological order
- [x] `SQLiteArtifactStore` without `better-sqlite3` throws a clear install instruction error
- [x] `store.put()` always returns a non-empty string ID
- [x] `store.get()` returns `undefined` (not `null`, not `{}`) when artifact is not found

### AgentWorkflow

- [x] `AgentWorkflow.create()` without `workspace` still works — uses `AgentWorkspace.memory()` internally
- [x] Steps without an explicit `id` still get unique auto-generated IDs
- [x] Two separate `AgentWorkflow.create()` calls produce independent workflow instances
- [x] `ctx.steps` correctly accumulates results from each completed step
- [x] `ctx.input` is the validated input when a Zod schema is provided
- [x] Step retry: a step that fails twice and succeeds on the third attempt records `status: 'completed'`
- [x] `ApprovalStep` with `approve: undefined` auto-approves (non-blocking in tests)
- [x] `ParallelStep` with `failFast: false` completes even when some steps fail
- [x] `ConditionStep` with no `ifFalse` branch does not throw when condition is false
- [x] `ToolStep` with a dynamic `adapter: (ctx) => ...` resolves the adapter at runtime
- [x] `workflow.resume()` without a store throws with message mentioning `workspace.store`
- [x] `WorkflowRun` artifacts are queryable by status after a workflow run completes

### Observability and Events

- [x] `workspace.events.on('cache.hit', ...)` fires when a cache hit occurs during an agent run inside a workflow
- [x] `workspace.events.on('workflow.step.started', ...)` fires before each step's `execute()` call
- [x] `workspace.events.on('workflow.step.completed', ...)` fires after each step (success or failure)
- [x] `workspace.events.on('artifact.write', ...)` fires after each store write in Phase 6
- [x] Event handler errors never crash a workflow or agent run

### Export Smoke Test

Run `npm run exports:smoke` and verify:

- [x] All new exports resolve from `'agentcraft'` without error
- [x] No circular imports introduced — `tsc --noEmit` passes in less time than before (no new circular chains)

### Documentation Gaps

- [x] Every new exported function and interface has a JSDoc comment (at minimum one line)
- [x] `AgentWorkspace.local()` documents the cacheRoot directory behavior
- [x] `ToolStep` documents that `toolName` must match a name declared in `adapter.getTools()`
- [x] `SQLiteArtifactStore` documents `better-sqlite3` as a required peer dependency
- [x] `resume()` documents that it requires `workspace.store` to be set

---

## Supervisor Implementation Report

**Reviewed by:** Claude Sonnet 4.6  
**Review date:** 2026-05-14  
**Scope:** All 7 phases of the living-systems primitives plan

---

### Gate Results

| Check                              | Result                                              |
| ---------------------------------- | --------------------------------------------------- |
| `npm run typecheck` (tsc --noEmit) | **PASSED** — zero errors                            |
| `npm test` (vitest)                | **PASSED** — 259/259 tests in 36 test files, 6.80 s |

Both gates pass clean. No regressions in existing tests. All new test files execute without setup errors.

---

### Positive Findings

**Architecture and patterns are consistent throughout.**  
Every new public API follows the established static-factory pattern: `AgentWorkflow.create()`, `MemoryArtifactStore()`, `AgentWorkspace.create()`, `AgentCache.memory()`. No `new` keyword appears on any exported surface. New step functions (`AgentStep`, `ToolStep`, `ParallelStep`, etc.) match the signature style of existing SDK APIs.

**DRY store helpers eliminate triplication.**  
`makeArtifactEntry`, `applyArtifactFilter`, `asRecord`, `cloneJson`, and `artifactKey` are exported from `memory.ts` and reused identically by `file.ts` and `sqlite.ts`. This means filtering and normalization logic is defined once and never diverges across backends. This was a non-obvious design choice — it required exporting helpers from what would typically be a closed module — and was executed cleanly.

**ESM-compatible peer dependency loading for SQLite.**  
Using `createRequire(import.meta.url)` from `node:module` is the correct ESM pattern for loading CJS-only packages like `better-sqlite3`. A naive `require()` call would fail at module evaluation in this ESM project. The implementation also provides a clear error message when `better-sqlite3` is not installed, and the test gracefully handles both the installed and not-installed paths.

**Resumability via `_resumeFrom` is clean.**  
The internal resume mechanism threads through `WorkflowRunOptions` without adding a second public method signature. `resume()` stores the prior completed steps, calls `run()` with the `_resumeFrom` filter, and skips already-completed steps transparently. This avoids overloading `run()` or exposing resume internals to callers.

**Event handler isolation is correctly implemented.**  
The `createAgentEventEmitter()` wraps each handler invocation in try/catch. This is verified by a dedicated workspace test (`handler errors do not propagate`) and is a critical correctness property — a failing metric callback must not take down an agent run.

**Workspace arrays are frozen.**  
`Object.freeze(config.adapters ?? [])` and `Object.freeze(config.mcps ?? [])` in `WorkspaceImpl` prevent callers from mutating the shared adapter list after workspace creation. This guards against a class of subtle shared-state bugs when the same workspace instance is used across multiple workflow runs or team members.

**Test coverage is comprehensive and specific.**  
All four new test files exercise the actual behavioral contracts rather than just the happy path. Notable examples: the `parallel step runs children concurrently enough to resolve out of declaration order` test uses actual timing (`setTimeout(resolve, 20)`) to verify true concurrency rather than just checking that both steps ran; the `resume from failed run` test verifies that `first` is called once but `second` is called twice (proving the skip logic works); the `cache.hit during an agent step inside a workflow` test mocks the provider layer rather than the agent, making it a meaningful integration test.

**Beyond-plan additions that improve the implementation.**  
Three features were implemented beyond what the plan specified:

- `withOptionalTimeout` in `ApprovalStep` — the plan described a `timeoutMs` field but left implementation details vague; the implementation correctly races the approval callback against a `setTimeout` and clears the timeout in a `finally` block to prevent leaks.
- Per-branch timing in `ConditionStep` — branch step results include `durationMs`, making workflow inspection more informative without any API surface change.
- `workspace.traceSink` propagation in `AgentTeam.run()` — the `traceSink` stored on the workspace is passed to each agent run, completing the observability chain without requiring callers to configure it separately.

---

### Loose Ends Closed

**1. `cachePolicy.requireCachedFor` now has runtime enforcement.**

The older review stated that `CachePolicy` was type-only. That is no longer true. Runtime enforcement lives in `src/agent/agent.ts`:

- `validateCachePolicy()` fails preflight when `requireCachedFor` is used without an enabled cache controller.
- `executeToolWithCache()` fails closed when a required cached tool misses, is stale, is corrupt, is oversized, is bypassed, or is unsafe to replay.
- `throwRequiredCacheMiss()` raises `QuotaExceededError` with `budget: "cachePolicy.requireCachedFor"`.
- `src/agent/__tests__/cache.test.ts` verifies both the primed-cache success path and the uncached failure path.

This closes the documentation hazard: `CachePolicy` is safe to expose as a real runtime feature.

**2. Repeated workspace application does not duplicate adapters, and policy merge is now idempotent.**

The older review correctly called out repeated `applyWorkspaceToAgent()` as a behavior worth proving. The underlying `Agent.use()` implementation already deduplicates adapters by `adapter.name`, so repeated workflow runs do not append duplicate workspace adapters.

Additional hardening was added:

- `src/__tests__/workflow.test.ts` now verifies that two workflow runs with the same workspace attach the workspace adapter only once.
- `mergeToolPolicies()` now deduplicates `approvedTools`, guardrail arrays, and `secretPatterns`, so repeated workspace policy application cannot grow policy arrays.
- `src/agent/__tests__/tool-policy.test.ts` covers repeated policy merges directly.

---

### Minor Concerns Closed

**3. ArtifactRegistry singleton state leakage between tests.**

`ArtifactRegistry` still intentionally uses a module-level map for runtime registry behavior. The test-ordering hazard is now closed with an `afterEach()` cleanup in `src/__tests__/artifact-registry.test.ts`, so custom schemas registered during a failing test are removed before the next test runs.

No public `_reset()` API was added because custom registry reset is a test concern, not an SDK feature.

**4. `FileArtifactStore.update()` has O(types × files) worst-case complexity.**

`update()` does not take a type argument, so it scans type directories and parses candidate files to find the artifact by ID. This is acceptable for local development and human-readable artifact folders, but not ideal for large stores.

This is now documented in the `FileArtifactStore()` JSDoc. Production workflows with large or frequently updated stores should use `SQLiteArtifactStore`.

**5. `JSON.stringify(value) ?? "undefined"` in `MemoryAgentCache.set()` is misleading.**

`MemoryAgentCache.set()` now uses direct `JSON.stringify(value)` and throws a clear `AgentCache memory entries must be JSON-serializable` error when the top-level value cannot be serialized. `src/__tests__/cache-memory.test.ts` covers this behavior.

---

### Summary

The implementation is production-quality for a v0.1.0 SDK release. The codebase is internally consistent, all tests pass, and the design decisions throughout reflect good judgment. The two earlier attention items are closed: `cachePolicy.requireCachedFor` is enforced at runtime, and repeated workspace application is verified not to duplicate adapters. The minor concerns have also been tightened through test cleanup, JSDoc clarification, safer cache serialization, and idempotent policy merging.

No phase was skipped. All 7 phases — Schema Foundation, Cache Driver Extraction, AgentWorkspace+Events+rolePolicies, ArtifactStore, AgentWorkflow Phase 1, AgentWorkflow Phase 2, and Documentation — produced working, tested code that integrates cleanly with the existing SDK.
