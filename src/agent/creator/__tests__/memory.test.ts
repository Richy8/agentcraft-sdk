import { mkdtemp, rm, writeFile } from 'node:fs/promises';
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

  it('surfaces freshness metadata and compact memory summaries', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-memory-freshness-'));
    const store = new FileSystemCreatorMemoryStore({
      root,
      staleAfterMs: 1,
    });
    await store.upsertBrandVoice({
      id: 'default',
      tone: 'plainspoken',
      preferredPhrases: ['name the tradeoff'],
      bannedPhrases: ['game changer'],
      examples: ['Short sentences. Concrete proof.'],
    });
    await store.addCorpusDocument({
      id: 'voice-note',
      text: 'Write with practical examples about caching and budget limits.',
      tags: ['voice', 'cache'],
    });
    await writeFile(
      path.join(root, 'brand-voice', 'default.json'),
      `${JSON.stringify({
        id: 'default',
        tone: 'plainspoken',
        preferredPhrases: ['name the tradeoff'],
        updatedAt: '2020-01-01T00:00:00.000Z',
      })}\n`,
      'utf8',
    );

    const brand = await store.readBrandVoice();
    const summary = await store.summarizeContext({
      query: 'cache budget',
      tags: ['voice'],
      includeStaleWarnings: true,
      maxChars: 500,
    });

    expect(brand?.freshness?.stale).toBe(true);
    expect(summary).toContain('Creator Memory Context');
    expect(summary).toContain('Memory warning');
    expect(summary).toContain('voice-note');
    await rm(root, { recursive: true, force: true });
  });

  it('requires approval for durable memory writes when configured', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-memory-approval-'));
    const store = new FileSystemCreatorMemoryStore({
      root,
      requireWriteApproval: true,
      approveWrite: (request) => request.operation === 'brand-voice.upsert',
    });

    await expect(store.upsertBrandVoice({ id: 'default', tone: 'direct' })).resolves.toMatchObject({
      id: 'default',
    });
    await expect(
      store.addCorpusDocument({ id: 'post', text: 'private strategy', tags: [] }),
    ).rejects.toThrow(/requires approval/);
    await rm(root, { recursive: true, force: true });
  });

  it('blocks likely secrets and sensitive personal details by default', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-memory-privacy-'));
    const store = new FileSystemCreatorMemoryStore(root);

    await expect(
      store.addCorpusDocument({
        id: 'secret',
        text: 'The API key is sk-test_1234567890abcdef',
        tags: ['private'],
      }),
    ).rejects.toThrow(/refusing to store/);
    await rm(root, { recursive: true, force: true });
  });

  it('meets lexical recall and tag filtering on known corpus fixtures', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-memory-recall-'));
    const store = new FileSystemCreatorMemoryStore(root);
    await store.addCorpusDocument({
      id: 'cache-cost',
      text: 'Agent cache replay reduces repeated tool calls and lowers budget waste.',
      tags: ['cache', 'cost'],
    });
    await store.addCorpusDocument({
      id: 'video-script',
      text: 'A short video script needs hook pacing and visual beats.',
      tags: ['video'],
    });
    await store.addCorpusDocument({
      id: 'seo-brief',
      text: 'Search intent and SERP gaps shape the article brief.',
      tags: ['seo'],
    });

    const cacheResults = await store.searchCorpus('cache replay budget waste', {
      limit: 2,
      tags: ['cache'],
    });
    const videoResults = await store.searchCorpus('hook pacing visual', {
      limit: 1,
    });

    expect(cacheResults.at(0)?.id).toBe('cache-cost');
    expect(cacheResults.every((result) => result.tags.includes('cache'))).toBe(true);
    expect(videoResults.at(0)?.id).toBe('video-script');
    await rm(root, { recursive: true, force: true });
  });
});
