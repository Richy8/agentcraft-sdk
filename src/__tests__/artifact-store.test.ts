import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, describe, expect, it } from 'vitest';
import { FileArtifactStore } from '../artifact-store/file.js';
import { MemoryArtifactStore } from '../artifact-store/memory.js';
import { SQLiteArtifactStore } from '../artifact-store/sqlite.js';
import { AgentWorkspace } from '../agent/workspace.js';

describe('MemoryArtifactStore', () => {
  let store: ReturnType<typeof MemoryArtifactStore>;

  beforeEach(() => {
    store = MemoryArtifactStore();
  });

  it('put returns an id', async () => {
    const id = await store.put('Draft', { body: 'hello' });
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('get returns undefined when not found', async () => {
    await expect(store.get('Draft', 'missing')).resolves.toBeUndefined();
  });

  it('get retrieves stored artifact', async () => {
    const id = await store.put('Draft', { body: 'hello' });
    const result = (await store.get('Draft', id)) as Record<string, unknown>;
    expect(result.body).toBe('hello');
  });

  it('query filters by status', async () => {
    await store.put('Draft', { body: 'a', status: 'draft' });
    await store.put('Draft', { body: 'b', status: 'published' });
    const drafts = await store.query('Draft', { status: 'draft' });
    expect(drafts).toHaveLength(1);
  });

  it('update patches an artifact and tracks history', async () => {
    const id = await store.put('Draft', { body: 'old' });
    await store.update(id, { body: 'new' });
    const result = (await store.get('Draft', id)) as Record<string, unknown>;
    const history = await store.history('Draft', id);

    expect(result.body).toBe('new');
    expect(history).toHaveLength(2);
  });

  it('delete removes artifact', async () => {
    const id = await store.put('Draft', { body: 'x' });
    expect(await store.delete('Draft', id)).toBe(true);
    expect(await store.get('Draft', id)).toBeUndefined();
  });

  it('listTypes returns active types', async () => {
    await store.put('Draft', {});
    await store.put('SeoPlan', {});
    const types = await store.listTypes();
    expect(types).toContain('Draft');
    expect(types).toContain('SeoPlan');
  });

  it('link records relationships without throwing', async () => {
    const draft = await store.put('Draft', {});
    const source = await store.put('SourceNote', {});
    await expect(
      store.link({ type: 'Draft', id: draft }, { type: 'SourceNote', id: source }),
    ).resolves.toBeUndefined();
  });
});

describe('FileArtifactStore', () => {
  it('writes JSON files, updates by ID across type directories, and filters by status', async () => {
    const root = await mkdtemp(join(tmpdir(), 'agentcraft-artifacts-'));
    const store = FileArtifactStore({ root });

    try {
      const draftId = await store.put('Draft', { body: 'a', status: 'draft' });
      await store.put('Draft', { body: 'b', status: 'published' });
      await store.update(draftId, { body: 'updated' });

      const raw = await readFile(join(root, 'Draft', `${draftId}.json`), 'utf8');
      const stored = JSON.parse(raw) as Record<string, unknown>;
      const drafts = await store.query('Draft', { status: 'draft' });

      expect(stored.body).toBe('updated');
      expect(stored.status).toBe('draft');
      expect(drafts).toHaveLength(1);
      expect(await store.history('Draft', draftId)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe('SQLiteArtifactStore', () => {
  it('works with better-sqlite3 when installed and otherwise throws a clear dependency error', async () => {
    let store: ReturnType<typeof SQLiteArtifactStore>;
    try {
      store = SQLiteArtifactStore({ dbPath: ':memory:' });
    } catch (error) {
      expect((error as Error).message).toMatch(/better-sqlite3/);
      return;
    }

    const id = await store.put('Draft', { body: 'v1', status: 'draft' });
    await store.update(id, { body: 'v2' });
    const history = await store.history('Draft', id);
    expect(history.map((entry) => (entry.snapshot as Record<string, unknown>).body)).toEqual(['v1', 'v2']);
  });

  it('can be attached to AgentWorkspace as a typed store', () => {
    const store = MemoryArtifactStore();
    const workspace = AgentWorkspace.create({ store });
    expect(workspace.store).toBe(store);
  });
});
