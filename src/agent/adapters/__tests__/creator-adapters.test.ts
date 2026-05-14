import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AnalyticsAdapter,
  CitationManagerAdapter,
  CreatorResourcesAdapter,
  LinkCheckerAdapter,
  PublishingAdapter,
  SeoAdapter,
} from '../index.js';

describe('creator adapters', () => {
  it('saves and reads citations through filesystem-backed tools', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-citations-'));
    const adapter = CitationManagerAdapter.connect({ root });
    const tools = await adapter.getTools!();
    const save = tools.find((tool) => tool.name === 'save_citation')!;
    const read = tools.find((tool) => tool.name === 'read_citation')!;

    await save.execute({ id: 'source-1', summary: 'Useful source', quality: 'strong' });
    await expect(read.execute({ id: 'source-1' })).resolves.toMatchObject({
      id: 'source-1',
      quality: 'strong',
    });
    await expect(save.execute({ id: '../bad', summary: 'nope' })).rejects.toThrow(
      'Invalid citation id'
    );
    await rm(root, { recursive: true, force: true });
  });

  it('returns unavailable SEO metrics instead of inventing provider data', async () => {
    const adapter = SeoAdapter.connect();
    const metrics = (await adapter.getTools!()).find((tool) => tool.name === 'get_keyword_metrics')!;
    await expect(metrics.execute({ keyword: 'agent tooling' })).resolves.toMatchObject({
      keyword: 'agent tooling',
      volume: { available: false },
      difficulty: { available: false },
      cpc: { available: false },
    });
  });

  it('keeps link checking read-only and rejects unsupported protocols by default', async () => {
    const adapter = LinkCheckerAdapter.connect();
    const check = (await adapter.getTools!()).find((tool) => tool.name === 'check_link')!;

    expect(check.security?.sideEffect).toBe('read');
    await expect(check.execute({ url: 'http://example.test' })).resolves.toMatchObject({
      ok: false,
      status: 'error',
    });
  });

  it('provides brand memory, corpus, and asset-library fixture tools', async () => {
    const adapter = CreatorResourcesAdapter.connect({
      brandVoice: { tone: 'practical' },
      corpus: [{ id: 'post-1', text: 'agent cache strategy', tags: ['cache'] }],
      assets: [{ id: 'asset-1', type: 'thumbnail', description: 'Bright thumbnail' }],
    });
    const tools = await adapter.getTools!();
    await expect(tools.find((tool) => tool.name === 'read_brand_voice')!.execute({})).resolves.toEqual({
      tone: 'practical',
    });
    await expect(
      tools.find((tool) => tool.name === 'search_content_corpus')!.execute({ query: 'cache' })
    ).resolves.toHaveLength(1);
    await expect(
      tools.find((tool) => tool.name === 'list_creator_assets')!.execute({ type: 'thumbnail' })
    ).resolves.toHaveLength(1);
  });

  it('keeps publishing write-capable tools confirmation-gated', async () => {
    const tools = await PublishingAdapter.connect().getTools!();
    expect(tools.find((tool) => tool.name === 'create_publish_draft')?.security).toMatchObject({
      sideEffect: 'write',
      requiresConfirmation: true,
    });
    expect(tools.find((tool) => tool.name === 'publish_content')?.security).toMatchObject({
      sideEffect: 'write',
      requiresConfirmation: true,
    });
  });

  it('reads fixture analytics metrics for deterministic performance tests', async () => {
    const adapter = AnalyticsAdapter.connect({
      metrics: [{ name: 'traffic', value: 1200, source: 'fixture', dateRange: 'last-28-days' }],
    });
    const read = (await adapter.getTools!()).find((tool) => tool.name === 'read_content_metrics')!;
    await expect(read.execute({ metric: 'traffic' })).resolves.toEqual([
      { name: 'traffic', value: 1200, source: 'fixture', dateRange: 'last-28-days' },
    ]);
  });
});
