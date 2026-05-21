import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { sanitizePathSegment } from "../key.js";
import type { AgentCacheConfig, AgentCacheController, AgentCacheLookup, CacheEnvelope, FileCacheOptions } from "../types.js";
import { assertJsonSerializable } from "../validation.js";

export class FileAgentCache implements AgentCacheController {
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
    assertJsonSerializable(value, "AgentCache file entry");
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
