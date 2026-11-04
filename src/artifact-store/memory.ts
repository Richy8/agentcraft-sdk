import { randomUUID } from 'node:crypto';
import type { ArtifactFilter, ArtifactHistory, ArtifactLink, ArtifactRef, ArtifactStore } from './types.js';
import type { ArtifactValidationOptions } from './validation.js';
import { validateArtifactForStore } from './validation.js';

/** Create an in-memory ArtifactStore with revision history for tests and short-lived runs. */
export function MemoryArtifactStore(options: ArtifactValidationOptions = {}): ArtifactStore {
  const store = new Map<string, Map<string, unknown>>();
  const history = new Map<string, ArtifactHistory[]>();
  const links = new Map<string, ArtifactLink[]>();

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
      validateArtifactForStore(type, entry, options);
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
      let matched = 0;
      let match: { type: string; typeMap: Map<string, unknown> } | undefined;
      for (const typeMap of store.values()) {
        if (!typeMap.has(id)) continue;
        matched += 1;
        const existingRecord = asRecord(typeMap.get(id));
        match = { type: String(existingRecord.type), typeMap };
      }
      if (matched > 1) throw new Error(`ArtifactStore: artifact id '${id}' is ambiguous; use updateByType(type, id, patch)`);
      if (match) return await this.updateByType(match.type, id, patch);
      throw new Error(`ArtifactStore: artifact '${id}' not found`);
    },

    async updateByType(type: string, id: string, patch: unknown): Promise<void> {
      const typeMap = getTypeMap(type);
      const existing = typeMap.get(id);
      if (existing === undefined) throw new Error(`ArtifactStore: artifact '${type}:${id}' not found`);
      const updated = { ...asRecord(existing), ...asRecord(patch), id, type };
      validateArtifactForStore(type, updated, options);
      typeMap.set(id, updated);
      recordHistory(type, id, updated);
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
      existing.push({ source, target });
      links.set(key, existing);
    },

    async listLinks(source?: ArtifactRef): Promise<ArtifactLink[]> {
      if (source) return links.get(artifactKey(source.type, source.id)) ?? [];
      return [...links.values()].flat();
    },

    capabilities() {
      return {
        history: true,
        links: true,
        transactions: false,
        schemaValidation: options.validateSchemas === true,
        concurrentWrites: true,
      };
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
