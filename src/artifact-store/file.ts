import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type {
  ArtifactFilter,
  ArtifactHistory,
  ArtifactLink,
  ArtifactRef,
  ArtifactStore,
} from './types.js';
import { applyArtifactFilter, asRecord, makeArtifactEntry } from './memory.js';
import { validateArtifactForStore } from './validation.js';

/** Options for the JSON-file artifact store. */
export interface FileArtifactStoreOptions {
  readonly root: string;
  readonly validateSchemas?: boolean;
}

/**
 * Create a file-backed ArtifactStore that writes one JSON file per artifact.
 *
 * This backend is intended for local development and human-readable artifacts.
 * It supports revision history and link traversal, but does not provide
 * transactional guarantees across multiple files.
 */
export function FileArtifactStore(options: FileArtifactStoreOptions): ArtifactStore {
  const root = path.resolve(options.root);

  function typeDir(type: string): string {
    return path.join(root, sanitize(type));
  }

  function artifactPath(type: string, id: string): string {
    return path.join(typeDir(type), `${sanitize(id)}.json`);
  }

  function historyDir(type: string, id: string): string {
    return path.join(typeDir(type), '.history', sanitize(id));
  }

  function linksPath(type: string, id: string): string {
    return path.join(typeDir(type), `${sanitize(id)}.links.json`);
  }

  async function ensureDir(dir: string): Promise<void> {
    await mkdir(dir, { recursive: true });
  }

  async function readArtifact(type: string, id: string): Promise<unknown | undefined> {
    try {
      return JSON.parse(await readFile(artifactPath(type, id), 'utf8')) as unknown;
    } catch {
      return undefined;
    }
  }

  async function writeArtifact(type: string, id: string, data: unknown): Promise<void> {
    validateArtifactForStore(type, data, options);
    await ensureDir(typeDir(type));
    await writeFile(artifactPath(type, id), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  async function recordHistory(type: string, id: string, snapshot: unknown): Promise<void> {
    const changedAt = new Date().toISOString();
    const dir = historyDir(type, id);
    await ensureDir(dir);
    await writeFile(
      path.join(dir, `${Date.now()}-${randomUUID()}.json`),
      `${JSON.stringify({ id, type, changedAt, snapshot }, null, 2)}\n`,
      'utf8',
    );
  }

  async function listArtifactTypes(): Promise<string[]> {
    try {
      const dirs = await readdir(root, { withFileTypes: true });
      return dirs.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
      return [];
    }
  }

  async function updateByType(type: string, id: string, patch: unknown): Promise<void> {
    const existing = await readArtifact(type, id);
    if (existing === undefined) throw new Error(`ArtifactStore: artifact '${type}:${id}' not found`);
    const updated = { ...asRecord(existing), ...asRecord(patch), id, type };
    await writeArtifact(type, id, updated);
    await recordHistory(type, id, updated);
  }

  return {
    async put(type: string, artifact: unknown): Promise<string> {
      const id = randomUUID();
      const entry = makeArtifactEntry(type, id, artifact);
      await writeArtifact(type, id, entry);
      await recordHistory(type, id, entry);
      return id;
    },

    async get(type: string, id: string): Promise<unknown | undefined> {
      return readArtifact(type, id);
    },

    async query(type: string, filter?: ArtifactFilter): Promise<unknown[]> {
      let files: string[];
      try {
        files = (await readdir(typeDir(type))).filter((file) => file.endsWith('.json') && !file.endsWith('.links.json'));
      } catch {
        return [];
      }

      const artifacts: unknown[] = [];
      for (const file of files) {
        try {
          artifacts.push(JSON.parse(await readFile(path.join(typeDir(type), file), 'utf8')) as unknown);
        } catch {
          // Skip corrupt files; a single broken artifact must not break queries.
        }
      }
      return applyArtifactFilter(artifacts, filter);
    },

    async update(id: string, patch: unknown): Promise<void> {
      const matches: string[] = [];
      for (const type of await listArtifactTypes()) {
        if ((await readArtifact(type, id)) !== undefined) matches.push(type);
      }
      if (matches.length > 1) {
        throw new Error(`ArtifactStore: artifact id '${id}' is ambiguous; use updateByType(type, id, patch)`);
      }
      if (matches.length === 1) return await updateByType(matches[0]!, id, patch);
      throw new Error(`ArtifactStore: artifact '${id}' not found`);
    },

    updateByType,

    async delete(type: string, id: string): Promise<boolean> {
      const existing = await readArtifact(type, id);
      if (existing === undefined) return false;
      await rm(artifactPath(type, id), { force: true });
      return true;
    },

    listTypes: listArtifactTypes,

    async history(type: string, id: string): Promise<ArtifactHistory[]> {
      let files: string[];
      try {
        files = (await readdir(historyDir(type, id))).filter((file) => file.endsWith('.json')).sort();
      } catch {
        return [];
      }
      const entries: ArtifactHistory[] = [];
      for (const file of files) {
        try {
          entries.push(JSON.parse(await readFile(path.join(historyDir(type, id), file), 'utf8')) as ArtifactHistory);
        } catch {
          // Skip corrupt history files without hiding the current artifact.
        }
      }
      return entries;
    },

    async link(source: ArtifactRef, target: ArtifactRef): Promise<void> {
      await ensureDir(typeDir(source.type));
      let existing: ArtifactLink[] = [];
      try {
        existing = JSON.parse(await readFile(linksPath(source.type, source.id), 'utf8')) as ArtifactLink[];
      } catch {
        // No existing link file yet.
      }
      existing.push({ source, target });
      await writeFile(linksPath(source.type, source.id), `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
    },

    async listLinks(source?: ArtifactRef): Promise<ArtifactLink[]> {
      if (source) {
        try {
          return JSON.parse(await readFile(linksPath(source.type, source.id), 'utf8')) as ArtifactLink[];
        } catch {
          return [];
        }
      }
      const all: ArtifactLink[] = [];
      for (const type of await listArtifactTypes()) {
        let files: string[];
        try {
          files = (await readdir(typeDir(type))).filter((file) => file.endsWith('.links.json'));
        } catch {
          continue;
        }
        for (const file of files) {
          try {
            all.push(...(JSON.parse(await readFile(path.join(typeDir(type), file), 'utf8')) as ArtifactLink[]));
          } catch {
            // Ignore corrupt link files.
          }
        }
      }
      return all;
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

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
