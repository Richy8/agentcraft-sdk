import { describe, expect, it } from 'vitest';
import { FetchAdapter, TavilySearchAdapter, defineAdapter } from '../../adapters/index.js';
import { capabilitiesForAdapter, capabilitiesForAdapters } from '../registry.js';

describe('capability registry', () => {
  it('maps native and custom adapters to capabilities', () => {
    expect(capabilitiesForAdapter(FetchAdapter.connect())).toContain('web.fetch');
    expect(capabilitiesForAdapter(TavilySearchAdapter.connect({ apiKey: 'key' }))).toContain('web.search');
    expect(
      capabilitiesForAdapter(
        defineAdapter(
          'mock-search',
          { noop: { description: 'noop', params: {}, run: async () => null } },
          { scopes: ['web.search'] }
        )
      )
    ).toContain('web.search');

    const all = capabilitiesForAdapters([
      FetchAdapter.connect(),
      TavilySearchAdapter.connect({ apiKey: 'key' }),
    ]);
    expect(all.has('web.fetch')).toBe(true);
    expect(all.has('web.search')).toBe(true);
  });
});
