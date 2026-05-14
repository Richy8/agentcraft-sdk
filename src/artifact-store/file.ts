import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { ArtifactFilter, ArtifactHistory, ArtifactRef, ArtifactStore } from './types.js';
import { applyArtifactFilter, makeArtifactEntry } from './memory.js';

/** Options for the JSON-file artifact store. */
export interface FileArtifactStoreOptions {
  readonly root: string;
}

/**
 * Create a file-backed ArtifactStore that writes one JSON file per artifact.
 *
 * This backend is intended for local development and human-readable artifacts.
 * `update(id, patch)` scans type directories because the interface accepts ID
 * without type; prefer SQLiteArtifactStore for large stores or frequent updates.
 */
export function FileArtifactStore(options: FileArtifactStoreOptions): ArtifactStore {
  const root = path.resolve(options.root);

  function typeDir(type: string): string {
    return path.join(root, sanitize(type));
  }

  function artifactPath(type: string, id: string): string {
    return path.join(typeDir(type), `${sanitize(id)}.json`);
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
    await ensureDir(typeDir(type));
    await writeFile(artifactPath(type, id), `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  }

  return {
    async put(type: string, artifact: unknown): Promise<string> {
      const id = randomUUID();
      await writeArtifact(type, id, makeArtifactEntry(type, id, artifact));
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
      let dirs: string[];
      try {
        dirs = await readdir(root);
      } catch {
        throw new Error(`ArtifactStore: artifact '${id}' not found`);
      }

      for (const dir of dirs) {
        const filePath = path.join(root, dir, `${sanitize(id)}.json`);
        try {
          const existing = JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>;
          const updated = { ...existing, ...(patch as object) };
          await writeFile(filePath, `${JSON.stringify(updated, null, 2)}\n`, 'utf8');
          return;
        } catch {
          // Continue scanning type directories until the ID is found.
        }
      }
      throw new Error(`ArtifactStore: artifact '${id}' not found`);
    },

    async delete(type: string, id: string): Promise<boolean> {
      const existing = await readArtifact(type, id);
      if (existing === undefined) return false;
      await rm(artifactPath(type, id), { force: true });
      return true;
    },

    async listTypes(): Promise<string[]> {
      try {
        const dirs = await readdir(root, { withFileTypes: true });
        return dirs.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
      } catch {
        return [];
      }
    },

    async history(_type: string, _id: string): Promise<ArtifactHistory[]> {
      return [];
    },

    async link(source: ArtifactRef, target: ArtifactRef): Promise<void> {
      await ensureDir(typeDir(source.type));
      const linksPath = path.join(typeDir(source.type), `${sanitize(source.id)}.links.json`);
      let existing: ArtifactRef[] = [];
      try {
        existing = JSON.parse(await readFile(linksPath, 'utf8')) as ArtifactRef[];
      } catch {
        // No existing link file yet.
      }
      existing.push(target);
      await writeFile(linksPath, `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
    },
  };
}

function sanitize(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}
