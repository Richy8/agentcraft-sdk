import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import * as path from "node:path";
import type {
  AgentCacheConfig,
  AgentCacheController,
  AgentCacheLookup,
} from "./creator/types.js";

export type {
  AgentCacheConfig,
  AgentCacheController,
  AgentCacheLookup,
} from "./creator/types.js";

interface CacheEnvelope {
  readonly createdAt: number;
  readonly expiresAt?: number;
  readonly value: unknown;
}

export type FileCacheOptions = Omit<AgentCacheConfig, "type" | "root">;

export interface MemoryCacheOptions {
  readonly defaultTtlMs?: number;
  readonly maxEntryBytes?: number;
  readonly namespace?: string;
}

class FileAgentCache implements AgentCacheController {
  readonly config: AgentCacheConfig;
  private readonly root: string;

  constructor(root: string, options: FileCacheOptions = {}) {
    this.root = path.resolve(root);
    this.config = {
      type: "file",
      root: this.root,
      strategy: options.strategy ?? "auto",
      namespace: sanitizePathSegment(options.namespace ?? "default"),
      version: sanitizePathSegment(options.version ?? "v1"),
      ...(options.defaultTtlMs !== undefined && {
        defaultTtlMs: options.defaultTtlMs,
      }),
      ...(options.maxEntryBytes !== undefined && {
        maxEntryBytes: options.maxEntryBytes,
      }),
    };
  }

  async get(key: string): Promise<unknown | undefined> {
    const entry = await this.getEntry(key);
    return entry.status === "hit" ? entry.value : undefined;
  }

  async getEntry(key: string): Promise<AgentCacheLookup> {
    const filePath = this.pathForKey(key);
    let raw: string;
    try {
      const metadata = await stat(filePath);
      if (
        this.config.maxEntryBytes !== undefined &&
        metadata.size > this.config.maxEntryBytes
      ) {
        return { status: "oversize", bytes: metadata.size };
      }
      raw = await readFile(filePath, "utf8");
    } catch {
      return { status: "miss" };
    }

    try {
      const envelope = JSON.parse(raw) as CacheEnvelope;
      if (
        envelope.expiresAt !== undefined &&
        envelope.expiresAt <= Date.now()
      ) {
        await this.delete(key);
        return {
          status: "stale",
          bytes: Buffer.byteLength(raw, "utf8"),
          createdAt: envelope.createdAt,
          expiresAt: envelope.expiresAt,
        };
      }
      return {
        status: "hit",
        value: envelope.value,
        bytes: Buffer.byteLength(raw, "utf8"),
        createdAt: envelope.createdAt,
        ...(envelope.expiresAt !== undefined && {
          expiresAt: envelope.expiresAt,
        }),
      };
    } catch {
      return { status: "corrupt", bytes: Buffer.byteLength(raw, "utf8") };
    }
  }

  async set(
    key: string,
    value: unknown,
    options: { readonly ttlMs?: number } = {},
  ): Promise<void> {
    const filePath = this.pathForKey(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    const ttlMs = options.ttlMs ?? this.config.defaultTtlMs;
    const envelope: CacheEnvelope = {
      createdAt: Date.now(),
      ...(ttlMs !== undefined && { expiresAt: Date.now() + ttlMs }),
      value,
    };
    const payload = `${JSON.stringify(envelope, null, 2)}\n`;
    const bytes = Buffer.byteLength(payload, "utf8");
    if (
      this.config.maxEntryBytes !== undefined &&
      bytes > this.config.maxEntryBytes
    ) {
      throw new Error(
        `AgentCache entry exceeded maxEntryBytes (${bytes} > ${this.config.maxEntryBytes})`,
      );
    }

    const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    await writeFile(tempPath, payload, { encoding: "utf8", mode: 0o600 });
    await rename(tempPath, filePath);
  }

  async delete(key: string): Promise<boolean> {
    try {
      await rm(this.pathForKey(key), { force: true });
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    await rm(this.scopeRoot(), { recursive: true, force: true });
  }

  async pruneExpired(): Promise<number> {
    let pruned = 0;
    for (const filePath of await listJsonFiles(this.scopeRoot())) {
      try {
        const raw = await readFile(filePath, "utf8");
        const envelope = JSON.parse(raw) as CacheEnvelope;
        if (
          envelope.expiresAt !== undefined &&
          envelope.expiresAt <= Date.now()
        ) {
          await rm(filePath, { force: true });
          pruned += 1;
        }
      } catch {
        await rm(filePath, { force: true });
        pruned += 1;
      }
    }
    return pruned;
  }

  private pathForKey(key: string): string {
    const digest = createHash("sha256").update(key).digest("hex");
    return path.join(this.scopeRoot(), digest.slice(0, 2), `${digest}.json`);
  }

  private scopeRoot(): string {
    return path.join(
      this.root,
      this.config.namespace ?? "default",
      this.config.version ?? "v1",
    );
  }
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
    if (serialized === undefined) {
      throw new Error("AgentCache memory entries must be JSON-serializable.");
    }
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

  memory(options: MemoryCacheOptions = {}): AgentCacheController {
    return new MemoryAgentCache(options);
  },
} as const;

export function createCacheKey(parts: readonly unknown[]): string {
  return stableStringify(parts);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

function sanitizePathSegment(value: string): string {
  const sanitized = value
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "default";
}

async function listJsonFiles(root: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listJsonFiles(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }
  return files;
}
