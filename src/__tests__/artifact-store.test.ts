import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { beforeEach, describe, expect, it } from 'vitest';
import { FileArtifactStore } from '../artifact-store/file.js';
import { createArtifactTypeHelper } from '../artifact-store/helpers.js';
import { MemoryArtifactStore } from '../artifact-store/memory.js';
import { SQLiteArtifactStore } from '../artifact-store/sqlite.js';
import { AgentWorkspace } from '../agent/workspace.js';
import { AgentWorkflow, CustomStep } from '../agent/workflow/index.js';

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
    await expect(store.listLinks({ type: 'Draft', id: draft })).resolves.toMatchObject([
      {
        source: { type: 'Draft', id: draft },
        target: { type: 'SourceNote', id: source },
      },
    ]);
  });

  it('validates registered schemas and supports typed helpers', async () => {
    const validated = MemoryArtifactStore({ validateSchemas: true });
    await expect(validated.put('Draft', { body: 'missing base fields' })).rejects.toThrow(
      /schema validation/,
    );

    const draft = createArtifactTypeHelper<Record<string, unknown>>(validated, 'Draft');
    const id = await draft.put(validDraft({ body: 'v1' }));
    await draft.update(id, { body: 'v2' });
    await expect(draft.get(id)).resolves.toMatchObject({ body: 'v2' });
    expect(validated.capabilities()).toMatchObject({
      history: true,
      links: true,
      schemaValidation: true,
    });
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
      expect(await store.history('Draft', draftId)).toHaveLength(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('skips corrupt artifact and link files without crashing unrelated queries', async () => {
    const root = await mkdtemp(join(tmpdir(), 'agentcraft-artifacts-corrupt-'));
    const store = FileArtifactStore({ root });

    try {
      await store.put('Draft', { body: 'good', status: 'draft' });
      await mkdir(join(root, 'Draft'), { recursive: true });
      await writeFile(join(root, 'Draft', 'broken.json'), '{not-json', 'utf8');
      await writeFile(join(root, 'Draft', 'broken.links.json'), '{not-json', 'utf8');

      await expect(store.query('Draft')).resolves.toHaveLength(1);
      await expect(store.listLinks()).resolves.toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('persists artifacts, links, and history across store re-instantiation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'agentcraft-artifacts-restart-'));

    try {
      const first = FileArtifactStore({ root });
      const draft = await first.put('Draft', { body: 'v1', status: 'draft' });
      const source = await first.put('SourceNote', { summary: 'source' });
      await first.updateByType('Draft', draft, { body: 'v2' });
      await first.link({ type: 'Draft', id: draft }, { type: 'SourceNote', id: source });

      const second = FileArtifactStore({ root });
      await expect(second.get('Draft', draft)).resolves.toMatchObject({ body: 'v2' });
      await expect(second.history('Draft', draft)).resolves.toHaveLength(2);
      await expect(second.listLinks({ type: 'Draft', id: draft })).resolves.toMatchObject([
        { target: { type: 'SourceNote', id: source } },
      ]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('requires updateByType when duplicate ids exist across artifact types', async () => {
    const root = await mkdtemp(join(tmpdir(), 'agentcraft-artifacts-duplicate-'));
    const id = 'same-id';

    try {
      await mkdir(join(root, 'Draft'), { recursive: true });
      await mkdir(join(root, 'SourceNote'), { recursive: true });
      await writeFile(join(root, 'Draft', `${id}.json`), JSON.stringify({ id, type: 'Draft', body: 'draft' }), 'utf8');
      await writeFile(
        join(root, 'SourceNote', `${id}.json`),
        JSON.stringify({ id, type: 'SourceNote', summary: 'source' }),
        'utf8',
      );
      const store = FileArtifactStore({ root });

      await expect(store.update(id, { status: 'reviewed' })).rejects.toThrow(/ambiguous/);
      await expect(store.updateByType('Draft', id, { status: 'reviewed' })).resolves.toBeUndefined();
      await expect(store.get('Draft', id)).resolves.toMatchObject({ status: 'reviewed' });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('resumes a workflow from persisted file artifacts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'agentcraft-workflow-resume-'));
    const store = FileArtifactStore({ root });
    const firstStep = CustomStep({ id: 'first', run: async () => 'done' });
    const secondStep = CustomStep({ id: 'second', run: async () => 'resumed' });
    const workflow = AgentWorkflow.create({
      workspace: AgentWorkspace.create({ store }),
      steps: [firstStep, secondStep],
    });

    try {
      const run = await workflow.run({ input: {} });
      const runId = run.runId;
      const resumed = await AgentWorkflow.create({
        workspace: AgentWorkspace.create({ store: FileArtifactStore({ root }) }),
        steps: [firstStep, secondStep],
      }).resume(runId);

      expect(resumed.status).toBe('completed');
      expect(resumed.steps.map((step) => step.stepId)).toEqual(['first', 'second']);
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
    expect(store.capabilities()).toMatchObject({ transactions: true, links: true, history: true });
  });

  it('preserves history across SQLite store re-instantiation and handles concurrent writes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'agentcraft-sqlite-artifacts-'));
    const dbPath = join(root, 'artifacts.db');
    let store: ReturnType<typeof SQLiteArtifactStore>;
    try {
      store = SQLiteArtifactStore({ dbPath });
    } catch (error) {
      expect((error as Error).message).toMatch(/better-sqlite3/);
      await rm(root, { recursive: true, force: true });
      return;
    }

    try {
      const ids = await Promise.all(
        Array.from({ length: 5 }, (_, index) => store.put('Draft', { body: `v${index}`, status: 'draft' })),
      );
      await store.updateByType('Draft', ids[0]!, { body: 'updated' });
      const restarted = SQLiteArtifactStore({ dbPath });

      await expect(restarted.history('Draft', ids[0]!)).resolves.toHaveLength(2);
      await expect(restarted.query('Draft')).resolves.toHaveLength(5);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('can be attached to AgentWorkspace as a typed store', () => {
    const store = MemoryArtifactStore();
    const workspace = AgentWorkspace.create({ store });
    expect(workspace.store).toBe(store);
  });
});

function validDraft(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'draft-id',
    type: 'Draft',
    createdAt: new Date().toISOString(),
    sourceSkill: 'test',
    provenance: [{ kind: 'model', ref: 'test' }],
    inputs: [],
    status: 'draft',
    format: 'article',
    body: 'draft',
    ...overrides,
  };
}
