import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FileSystemCreatorArtifactStore } from '../artifacts.js';
import type { CreatorArtifact } from '../types.js';

describe('creator artifact store', () => {
  it('writes and reads validated artifacts inside the configured root', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-artifacts-'));
    const store = new FileSystemCreatorArtifactStore(root);
    const artifact: CreatorArtifact = {
      id: 'draft-1',
      type: 'Draft',
      createdAt: '2026-05-11T00:00:00.000Z',
      sourceSkill: 'blog-writer',
      provenance: [{ kind: 'model', ref: 'blog-writer' }],
      inputs: ['brief-1'],
      status: 'draft',
    };

    await store.save(artifact);
    await expect(store.load('Draft', 'draft-1')).resolves.toMatchObject({
      id: 'draft-1',
      type: 'Draft',
    });
    await rm(root, { recursive: true, force: true });
  });

  it('rejects traversal and invalid artifact paths', () => {
    const store = new FileSystemCreatorArtifactStore('/tmp/agentcraft-artifacts');
    expect(() => store.resolveArtifactPath('../Draft', 'x.json')).toThrow('Invalid artifact type');
    expect(() => store.resolveArtifactPath('Draft', '../x.json')).toThrow(
      'Invalid artifact filename'
    );
  });
});
