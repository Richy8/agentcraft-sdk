import { createHash } from "node:crypto";
import type { AgentCacheConfig } from "./types.js";
import type { DistributedCacheBaseOptions } from "./types.js";

export function createCacheKey(parts: readonly unknown[]): string {
  return stableStringify(parts);
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "function" || typeof value === "symbol") {
      throw new Error("AgentCache keys must be JSON-serializable.");
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(",")}}`;
}

export function distributedConfig(
  type: AgentCacheConfig["type"],
  options: DistributedCacheBaseOptions,
  extra: Pick<AgentCacheConfig, "root" | "tableName" | "connection"> = {},
): AgentCacheConfig {
  return {
    type,
    strategy: options.strategy ?? "auto",
    namespace: sanitizePathSegment(options.namespace ?? "default"),
    version: sanitizePathSegment(options.version ?? "v1"),
    ...(options.defaultTtlMs !== undefined && {
      defaultTtlMs: options.defaultTtlMs,
    }),
    ...(options.maxEntryBytes !== undefined && {
      maxEntryBytes: options.maxEntryBytes,
    }),
    ...(options.keyPrefix !== undefined && { keyPrefix: sanitizePathSegment(options.keyPrefix) }),
    ...(options.locking !== undefined && { locking: options.locking }),
    ...extra,
  };
}

export function scopedKey(config: AgentCacheConfig, key: string, digest = true): string {
  const prefix = config.keyPrefix ?? "agentcraft-cache";
  const namespace = sanitizePathSegment(config.namespace ?? "default");
  const version = sanitizePathSegment(config.version ?? "v1");
  const suffix = digest ? digestKey(key) : key;
  return `${prefix}:${namespace}:${version}:${suffix}`;
}

export function digestKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function redactConnectionUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.username) url.username = "[REDACTED]";
    if (url.password) url.password = "[REDACTED]";
    for (const key of [...url.searchParams.keys()]) {
      if (/key|token|secret|password|signature/i.test(key)) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return url.toString();
  } catch {
    return "[REDACTED_URL]";
  }
}

export function sanitizeSqlIdentifier(value: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier '${value}'. Use letters, numbers, and underscores only.`);
  }
  return value;
}

export function advisoryLockId(value: string): number {
  const digest = createHash("sha256").update(value).digest();
  return digest.readInt32BE(0);
}

export function sanitizePathSegment(value: string): string {
  const sanitized = value
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "");
  return sanitized.length > 0 ? sanitized : "default";
}
