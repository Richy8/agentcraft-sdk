import { describe, expect, it } from 'vitest';
import {
  FetchAdapter,
  TavilySearchAdapter,
} from '../../agent/adapters/index.js';

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const liveAdapters = parseSelection(process.env.AGENTCRAFT_LIVE_ADAPTERS);

describe('live native adapter smoke tests', () => {
  // GitHubAdapter removed in v1.0.0 — use GitHubMCP.connect() instead
  it.skip('github reads public repository metadata with the configured token', () => {});

  // FirecrawlAdapter removed in v1.0.0 — use FirecrawlMCP.connect() instead
  it.skip('firecrawl performs a tiny read-only scrape', () => {});

  const fetchIt =
    integrationEnabled && liveAdapters.has('fetch') && process.env.AGENTCRAFT_LIVE_FETCH_URL
      ? it
      : it.skip;

  fetchIt(
    'fetch reads a real public URL with guardrails',
    async () => {
      const url = process.env.AGENTCRAFT_LIVE_FETCH_URL!;
      const adapter = FetchAdapter.connect({
        allowedDomains: [new URL(url).hostname],
        maxResponseBytes: 500_000,
        timeoutMs: 15_000,
      });
      const fetchUrl = (await adapter.getTools?.())?.find((tool) => tool.name === 'fetch_url');

      const result = await fetchUrl?.execute({ url });

      expect(JSON.stringify(result).toLowerCase()).toContain(new URL(url).hostname.split('.')[0]);
    },
    25_000
  );

  const fetchAuthIt =
    integrationEnabled &&
    liveAdapters.has('fetch-auth') &&
    process.env.AGENTCRAFT_LIVE_AUTH_URL &&
    process.env.AGENTCRAFT_LIVE_AUTH_USERNAME &&
    process.env.AGENTCRAFT_LIVE_AUTH_PASSWORD
      ? it
      : it.skip;

  fetchAuthIt(
    'fetch accesses a public Basic Auth fixture with explicit credentials',
    async () => {
      const url = process.env.AGENTCRAFT_LIVE_AUTH_URL!;
      const credentials = Buffer.from(
        `${process.env.AGENTCRAFT_LIVE_AUTH_USERNAME}:${process.env.AGENTCRAFT_LIVE_AUTH_PASSWORD}`
      ).toString('base64');
      const adapter = FetchAdapter.connect({
        allowedDomains: [process.env.AGENTCRAFT_LIVE_AUTH_DOMAIN ?? new URL(url).hostname],
        allowedContentTypes: ['application/json'],
        headers: { authorization: `Basic ${credentials}` },
        timeoutMs: 15_000,
      });
      const fetchUrl = (await adapter.getTools?.())?.find((tool) => tool.name === 'fetch_url');

      const result = await fetchUrl?.execute({ url });

      expect(JSON.stringify(result)).toContain('authenticated');
      expect(JSON.stringify(result)).toContain(process.env.AGENTCRAFT_LIVE_AUTH_USERNAME);
    },
    25_000
  );

  // ApifyAdapter removed in v1.0.0 — use MCP.connect() with the Apify MCP package instead
  it.skip('apify reads a configured dataset without starting an actor', () => {});

  // FileSystemAdapter removed in v1.0.0 — use FilesystemMCP.connect() instead
  it.skip('filesystem reads from a local sandbox and rejects traversal', () => {});

  const tavilyIt =
    integrationEnabled &&
    liveAdapters.has('tavily') &&
    isConfiguredSecret(process.env.TAVILY_API_KEY)
      ? it
      : it.skip;

  tavilyIt(
    'tavily performs a low-cost basic web search',
    async () => {
      const adapter = TavilySearchAdapter.connect({
        apiKey: process.env.TAVILY_API_KEY!,
        searchDepth: 'basic',
        maxResults: 1,
        timeoutMs: 20_000,
      });
      const webSearch = (await adapter.getTools?.())?.find((tool) => tool.name === 'web_search');

      const result = await webSearch?.execute({
        query: process.env.AGENTCRAFT_LIVE_TAVILY_QUERY ?? 'vitepress documentation',
        maxResults: 1,
      });

      expect(JSON.stringify(result).toLowerCase()).toContain('results');
    },
    30_000
  );

  // PlaywrightAdapter removed in v1.0.0 — use Playwright's MCP server via MCP.connect() instead
  it.skip('playwright can navigate to a public Basic Auth fixture when enabled', () => {});
});

function parseSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set();
  const selected = value
    .split(',')
    .map((adapter) => adapter.trim().toLowerCase())
    .filter(Boolean);

  if (selected.includes('all')) {
    return new Set(['fetch', 'fetch-auth', 'tavily']);
  }
  return new Set(selected);
}

function isConfiguredSecret(value: string | undefined): boolean {
  return Boolean(value && !value.includes('...') && value.trim().length > 8);
}
