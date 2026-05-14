import { describe, expect, it } from 'vitest';
import { FetchAdapter, SeoAdapter, createAdapter } from '../../adapters/index.js';
import { capabilitiesForAdapter, capabilitiesForAdapters } from '../registry.js';

describe('capability registry', () => {
  it('maps native, MCP-like, skill-local, and mocked adapters to capabilities', () => {
    expect(capabilitiesForAdapter(FetchAdapter.connect())).toContain('web.fetch');
    expect(capabilitiesForAdapter(SeoAdapter.connect())).toContain('seo.serp');
    expect(
      capabilitiesForAdapter(
        createAdapter({
          name: 'mock-search',
          metadata: { scopes: ['web.search'], sideEffects: ['read'] },
        })
      )
    ).toContain('web.search');

    const all = capabilitiesForAdapters([FetchAdapter.connect(), SeoAdapter.connect()]);
    expect(all.has('web.fetch')).toBe(true);
    expect(all.has('seo.keywordMetrics')).toBe(true);
  });
});
