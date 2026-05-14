import { randomUUID } from 'node:crypto';
import type { ArtifactFilter, ArtifactHistory, ArtifactRef, ArtifactStore } from './types.js';

/** Create an in-memory ArtifactStore with revision history for tests and short-lived runs. */
export function MemoryArtifactStore(): ArtifactStore {
  const store = new Map<string, Map<string, unknown>>();
  const history = new Map<string, ArtifactHistory[]>();
  const links = new Map<string, ArtifactRef[]>();

  function getTypeMap(type: string): Map<string, unknown> {
    const existing = store.get(type);
    if (existing) return existing;
    const created = new Map<string, unknown>();
    store.set(type, created);
    return created;
  }

  function recordHistory(type: string, id: string, snapshot: unknown): void {
    const key = artifactKey(type, id);
    const entries = history.get(key) ?? [];
    entries.push({
      id,
      type,
      changedAt: new Date().toISOString(),
      snapshot: cloneJson(snapshot),
    });
    history.set(key, entries);
  }

  return {
    async put(type: string, artifact: unknown): Promise<string> {
      const id = randomUUID();
      const entry = makeArtifactEntry(type, id, artifact);
      getTypeMap(type).set(id, entry);
      recordHistory(type, id, entry);
      return id;
    },

    async get(type: string, id: string): Promise<unknown | undefined> {
      return getTypeMap(type).get(id);
    },

    async query(type: string, filter?: ArtifactFilter): Promise<unknown[]> {
      return applyArtifactFilter([...getTypeMap(type).values()], filter);
    },

    async update(id: string, patch: unknown): Promise<void> {
      for (const typeMap of store.values()) {
        if (!typeMap.has(id)) continue;
        const existing = typeMap.get(id);
        const existingRecord = asRecord(existing);
        const type = String(existingRecord.type);
        const updated = { ...existingRecord, ...asRecord(patch) };
        typeMap.set(id, updated);
        recordHistory(type, id, updated);
        return;
      }
      throw new Error(`ArtifactStore: artifact '${id}' not found`);
    },

    async delete(type: string, id: string): Promise<boolean> {
      return getTypeMap(type).delete(id);
    },

    async listTypes(): Promise<string[]> {
      return [...store.entries()].filter(([, values]) => values.size > 0).map(([type]) => type);
    },

    async history(type: string, id: string): Promise<ArtifactHistory[]> {
      return history.get(artifactKey(type, id)) ?? [];
    },

    async link(source: ArtifactRef, target: ArtifactRef): Promise<void> {
      const key = artifactKey(source.type, source.id);
      const existing = links.get(key) ?? [];
      existing.push(target);
      links.set(key, existing);
    },
  };
}

/** Normalize a stored artifact with generated identity and creation metadata. */
export function makeArtifactEntry(type: string, id: string, artifact: unknown): Record<string, unknown> {
  return {
    ...asRecord(artifact),
    id,
    type,
    createdAt: new Date().toISOString(),
  };
}

/** Apply status, creation date, and limit filters to artifact values. */
export function applyArtifactFilter(values: unknown[], filter?: ArtifactFilter): unknown[] {
  let results = values;
  if (filter?.status) {
    results = results.filter((value) => asRecord(value).status === filter.status);
  }
  if (filter?.createdAfter) {
    const after = new Date(filter.createdAfter).getTime();
    results = results.filter((value) => getCreatedAt(value) >= after);
  }
  if (filter?.createdBefore) {
    const before = new Date(filter.createdBefore).getTime();
    results = results.filter((value) => getCreatedAt(value) <= before);
  }
  return filter?.limit ? results.slice(0, filter.limit) : results;
}

/** Convert object-like values to records and all other values to an empty record. */
export function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/** Clone JSON-safe values for immutable history snapshots. */
export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Build the internal type/id key used by memory store maps. */
export function artifactKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function getCreatedAt(value: unknown): number {
  const createdAt = asRecord(value).createdAt;
  return typeof createdAt === 'string' ? new Date(createdAt).getTime() : 0;
}
