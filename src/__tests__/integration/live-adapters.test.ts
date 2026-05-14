import { mkdir, writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { chromium } from 'playwright';
import {
  ApifyAdapter,
  FetchAdapter,
  FileSystemAdapter,
  FirecrawlAdapter,
  GitHubAdapter,
  PlaywrightAdapter,
  TavilySearchAdapter,
} from '../../agent/adapters/index.js';

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const liveAdapters = parseSelection(process.env.AGENTCRAFT_LIVE_ADAPTERS);

describe('live native adapter smoke tests', () => {
  const githubIt =
    integrationEnabled && liveAdapters.has('github') && process.env.GITHUB_TOKEN ? it : it.skip;

  githubIt(
    'github reads public repository metadata with the configured token',
    async () => {
      const [owner, repo] = (process.env.AGENTCRAFT_LIVE_GITHUB_REPO ?? 'octocat/Hello-World').split('/');
      const adapter = GitHubAdapter.connect({
        token: process.env.GITHUB_TOKEN!,
        allowedRepos: [`${owner}/${repo}`],
        timeoutMs: 10_000,
      });
      const getRepo = (await adapter.getTools?.())?.find((tool) => tool.name === 'get_repo');

      const result = await getRepo?.execute({ owner, repo });

      expect(result).toMatchObject({ full_name: `${owner}/${repo}` });
    },
    20_000
  );

  const firecrawlIt =
    integrationEnabled && liveAdapters.has('firecrawl') && process.env.FIRECRAWL_API_KEY
      ? it
      : it.skip;

  firecrawlIt(
    'firecrawl performs a tiny read-only scrape',
    async () => {
      const url = process.env.AGENTCRAFT_LIVE_FIRECRAWL_URL ?? process.env.AGENTCRAFT_LIVE_PUBLIC_URL ?? 'https://vitepress.dev/';
      const adapter = FirecrawlAdapter.connect({
        apiKey: process.env.FIRECRAWL_API_KEY!,
        defaultFormats: ['markdown'],
        defaultTimeout: 10_000,
        timeoutMs: 20_000,
      });
      const scrapeUrl = (await adapter.getTools?.())?.find((tool) => tool.name === 'scrape_url');

      const result = await scrapeUrl?.execute({ url });

      expect(JSON.stringify(result).toLowerCase()).toContain(new URL(url).hostname.split('.')[0]);
    },
    30_000
  );

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

  const apifyIt =
    integrationEnabled &&
    liveAdapters.has('apify') &&
    process.env.APIFY_TOKEN &&
    process.env.AGENTCRAFT_LIVE_APIFY_DATASET_ID
      ? it
      : it.skip;

  apifyIt(
    'apify reads a configured dataset without starting an actor',
    async () => {
      const adapter = ApifyAdapter.connect({
        token: process.env.APIFY_TOKEN!,
        defaultDatasetId: process.env.AGENTCRAFT_LIVE_APIFY_DATASET_ID,
        timeoutMs: 15_000,
      });
      const getDatasetItems = (await adapter.getTools?.())?.find(
        (tool) => tool.name === 'get_dataset_items'
      );

      const result = await getDatasetItems?.execute({ limit: 1 });

      expect(Array.isArray(result)).toBe(true);
    },
    30_000
  );

  const filesystemIt =
    integrationEnabled && liveAdapters.has('filesystem') && process.env.AGENTCRAFT_LIVE_FILESYSTEM_PATH
      ? it
      : it.skip;

  filesystemIt(
    'filesystem reads from a local sandbox and rejects traversal',
    async () => {
      const rootPath = process.env.AGENTCRAFT_LIVE_FILESYSTEM_PATH!;
      await mkdir(rootPath, { recursive: true });
      await writeFile(`${rootPath}/agentcraft-smoke.txt`, 'agentcraft filesystem smoke', 'utf8');

      const adapter = FileSystemAdapter.connect({
        rootPath,
        allowedExtensions: ['.txt'],
        readOnly: true,
      });
      const tools = await adapter.getTools?.();
      const readFileTool = tools?.find((tool) => tool.name === 'read_file');
      const listDirectory = tools?.find((tool) => tool.name === 'list_directory');

      await expect(listDirectory?.execute({ path: '.' })).resolves.toEqual(
        expect.arrayContaining([{ path: 'agentcraft-smoke.txt', type: 'file' }])
      );
      await expect(readFileTool?.execute({ path: 'agentcraft-smoke.txt' })).resolves.toContain(
        'agentcraft filesystem smoke'
      );
      await expect(readFileTool?.execute({ path: '../.env' })).rejects.toThrow('escapes the configured root');
    },
    20_000
  );

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

  const playwrightIt =
    integrationEnabled &&
    liveAdapters.has('playwright-auth') &&
    process.env.AGENTCRAFT_LIVE_ENABLE_PLAYWRIGHT_AUTH === 'true' &&
    process.env.AGENTCRAFT_LIVE_PLAYWRIGHT_AUTH_URL
      ? it
      : it.skip;

  playwrightIt(
    'playwright can navigate to a public Basic Auth fixture when enabled',
    async () => {
      const url = process.env.AGENTCRAFT_LIVE_PLAYWRIGHT_AUTH_URL!;
      const adapter = PlaywrightAdapter.connect({
        allowedDomains: [process.env.AGENTCRAFT_LIVE_AUTH_DOMAIN ?? new URL(url).hostname],
        defaultTimeout: 15_000,
        launch: (options) => chromium.launch(options),
        timeoutMs: 30_000,
      });
      try {
        const tools = await adapter.getTools?.();
        const browseUrl = tools?.find((tool) => tool.name === 'browse_url');
        const extractText = tools?.find((tool) => tool.name === 'extract_text');

        await browseUrl?.execute({ url });
        const result = await extractText?.execute({ selector: 'body' });

        expect(JSON.stringify(result)).toContain('authenticated');
      } finally {
        await adapter.cleanup?.();
      }
    },
    45_000
  );
});

function parseSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set();
  const selected = value
    .split(',')
    .map((adapter) => adapter.trim().toLowerCase())
    .filter(Boolean);

  if (selected.includes('all')) {
    return new Set([
      'github',
      'firecrawl',
      'apify',
      'fetch',
      'fetch-auth',
      'filesystem',
      'tavily',
      'playwright-auth',
    ]);
  }
  return new Set(selected);
}

function isConfiguredSecret(value: string | undefined): boolean {
  return Boolean(value && !value.includes('...') && value.trim().length > 8);
}
