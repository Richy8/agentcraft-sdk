import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CreatorResourcesAdapter } from '../../adapters/creator-resources.adapter.js';
import { FileSystemCreatorMemoryStore } from '../memory.js';

describe('creator memory store', () => {
  it('persists brand voice and retrieves corpus documents by local vector similarity', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-memory-'));
    const store = new FileSystemCreatorMemoryStore(root);

    await store.upsertBrandVoice({
      id: 'default',
      tone: 'practical',
      preferredPhrases: ['show the tradeoff'],
      bannedPhrases: ['magic'],
      examples: ['Explain systems with crisp examples.'],
    });
    await store.addCorpusDocument({
      id: 'post-1',
      text: 'A practical guide to cache strategy for agent tools.',
      tags: ['cache', 'agents'],
      source: 'medium',
    });
    await store.addCorpusDocument({
      id: 'post-2',
      text: 'A launch checklist for creator analytics and experiments.',
      tags: ['analytics'],
    });

    await expect(store.readBrandVoice()).resolves.toMatchObject({
      id: 'default',
      tone: 'practical',
    });
    await expect(store.searchCorpus('agent cache tools', { limit: 1 })).resolves.toMatchObject([
      { id: 'post-1', score: expect.any(Number) },
    ]);
    await expect(store.searchCorpus('experiments', { tags: ['analytics'] })).resolves.toMatchObject([
      { id: 'post-2' },
    ]);
    await rm(root, { recursive: true, force: true });
  });

  it('exposes persisted memory through creator resource tools', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-memory-adapter-'));
    const store = new FileSystemCreatorMemoryStore(root);
    await store.upsertBrandVoice({ id: 'default', tone: 'direct' });
    await store.addCorpusDocument({
      id: 'post-1',
      text: 'Creator pack workflow for durable memory.',
      tags: ['packs'],
    });

    const tools = await CreatorResourcesAdapter.connect({ memoryStore: store }).getTools!();

    await expect(tools.find((tool) => tool.name === 'read_brand_voice')!.execute({})).resolves.toMatchObject({
      tone: 'direct',
    });
    await expect(
      tools.find((tool) => tool.name === 'search_content_corpus')!.execute({ query: 'durable memory' })
    ).resolves.toMatchObject([{ id: 'post-1' }]);
    await rm(root, { recursive: true, force: true });
  });

  it('blocks traversal-shaped memory ids', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-memory-invalid-'));
    const store = new FileSystemCreatorMemoryStore(root);

    await expect(
      store.addCorpusDocument({ id: '../bad', text: 'bad', tags: [] })
    ).rejects.toThrow('Invalid creator memory id');
    await rm(root, { recursive: true, force: true });
  });
});
