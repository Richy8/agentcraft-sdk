import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import type { ArtifactFilter, ArtifactHistory, ArtifactRef, ArtifactStore } from './types.js';
import { applyArtifactFilter, makeArtifactEntry } from './memory.js';

/** Options for the optional better-sqlite3 artifact store. */
export interface SQLiteArtifactStoreOptions {
  readonly dbPath: string;
}

type Statement = {
  run: (...args: unknown[]) => { changes: number };
  get: (...args: unknown[]) => unknown;
  all: (...args: unknown[]) => unknown[];
};

type SQLiteDatabase = {
  exec: (sql: string) => void;
  pragma: (sql: string) => void;
  prepare: (sql: string) => Statement;
  transaction: (fn: () => void) => () => void;
};

type DatabaseFactory = new (path: string) => SQLiteDatabase;

/** Create a SQLite ArtifactStore backed by optional peer dependency better-sqlite3. */
export function SQLiteArtifactStore(options: SQLiteArtifactStoreOptions): ArtifactStore {
  const require = createRequire(import.meta.url);
  let Database: DatabaseFactory;
  try {
    Database = require('better-sqlite3') as DatabaseFactory;
  } catch {
    throw new Error(
      "SQLiteArtifactStore requires optional peer dependency 'better-sqlite3'. Install it with: npm install better-sqlite3",
    );
  }

  const db = new Database(options.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
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

  const statements = {
    insert: db.prepare('INSERT INTO artifacts (id, type, data, created_at) VALUES (?, ?, ?, ?)'),
    get: db.prepare('SELECT data FROM artifacts WHERE type = ? AND id = ?'),
    query: db.prepare('SELECT data FROM artifacts WHERE type = ?'),
    update: db.prepare('UPDATE artifacts SET data = ? WHERE type = ? AND id = ?'),
    findById: db.prepare('SELECT type, data FROM artifacts WHERE id = ?'),
    delete: db.prepare('DELETE FROM artifacts WHERE type = ? AND id = ?'),
    listTypes: db.prepare('SELECT DISTINCT type FROM artifacts'),
    insertHistory: db.prepare(
      'INSERT INTO artifact_history (artifact_type, artifact_id, changed_at, snapshot) VALUES (?, ?, ?, ?)',
    ),
    history: db.prepare(
      'SELECT artifact_id, artifact_type, changed_at, snapshot FROM artifact_history WHERE artifact_type = ? AND artifact_id = ? ORDER BY rowid ASC',
    ),
    insertLink: db.prepare(
      'INSERT INTO artifact_links (source_type, source_id, target_type, target_id) VALUES (?, ?, ?, ?)',
    ),
  };

  return {
    async put(type: string, artifact: unknown): Promise<string> {
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const entry = makeArtifactEntry(type, id, artifact);
      const data = JSON.stringify(entry);
      db.transaction(() => {
        statements.insert.run(id, type, data, createdAt);
        statements.insertHistory.run(type, id, createdAt, data);
      })();
      return id;
    },

    async get(type: string, id: string): Promise<unknown | undefined> {
      const row = statements.get.get(type, id) as { data: string } | undefined;
      return row ? (JSON.parse(row.data) as unknown) : undefined;
    },

    async query(type: string, filter?: ArtifactFilter): Promise<unknown[]> {
      const rows = statements.query.all(type) as Array<{ data: string }>;
      const artifacts = rows.map((row) => JSON.parse(row.data) as unknown);
      return applyArtifactFilter(artifacts, filter);
    },

    async update(id: string, patch: unknown): Promise<void> {
      const row = statements.findById.get(id) as { type: string; data: string } | undefined;
      if (!row) throw new Error(`ArtifactStore: artifact '${id}' not found`);
      const existing = JSON.parse(row.data) as Record<string, unknown>;
      const data = JSON.stringify({ ...existing, ...(patch as object) });
      db.transaction(() => {
        statements.update.run(data, row.type, id);
        statements.insertHistory.run(row.type, id, new Date().toISOString(), data);
      })();
    },

    async delete(type: string, id: string): Promise<boolean> {
      return statements.delete.run(type, id).changes > 0;
    },

    async listTypes(): Promise<string[]> {
      return (statements.listTypes.all() as Array<{ type: string }>).map((row) => row.type);
    },

    async history(type: string, id: string): Promise<ArtifactHistory[]> {
      const rows = statements.history.all(type, id) as Array<{
        artifact_id: string;
        artifact_type: string;
        changed_at: string;
        snapshot: string;
      }>;
      return rows.map((row) => ({
        id: row.artifact_id,
        type: row.artifact_type,
        changedAt: row.changed_at,
        snapshot: JSON.parse(row.snapshot) as unknown,
      }));
    },

    async link(source: ArtifactRef, target: ArtifactRef): Promise<void> {
      statements.insertLink.run(source.type, source.id, target.type, target.id);
    },
  };
}
