import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import { createAdapter, tool } from './types.js';

export interface FirecrawlAdapterConfig {
  apiKey: string;
  defaultFormats?: ('markdown' | 'html' | 'rawHtml' | 'links')[];
  defaultTimeout?: number;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class FirecrawlAdapter {
  static readonly adapterName = 'firecrawl';

  static connect(config: FirecrawlAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? 'https://api.firecrawl.dev/v1';
    const headers = { authorization: `Bearer ${config.apiKey}` };
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, {
        ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }),
        ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }),
      });

    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'api-key', trustLevel: 'review-required', sideEffects: ['read', 'external'], scopes: ['web'], requiredSecrets: ['FIRECRAWL_API_KEY'], readOnly: true },
      tools: [
        tool({ name: 'scrape_url', description: 'Scrape a URL with Firecrawl.', security: { sideEffect: 'external', scopes: ['web:read'] }, params: { url: { type: 'string', description: 'URL to scrape.' } }, run: async ({ url }) => run('scrape_url', (signal) => requestJson(apiBaseUrl, '/scrape', { method: 'POST', headers, signal, body: { url, formats: config.defaultFormats ?? ['markdown'], timeout: config.defaultTimeout } })) }),
        tool({ name: 'crawl_site', description: 'Start a Firecrawl crawl job.', security: { sideEffect: 'external', scopes: ['web:crawl'] }, params: { url: { type: 'string', description: 'Site URL.' } }, run: async ({ url }) => run('crawl_site', (signal) => requestJson(apiBaseUrl, '/crawl', { method: 'POST', headers, signal, body: { url, limit: 100 } })) }),
        tool({ name: 'search_web', description: 'Search the web with Firecrawl.', security: { sideEffect: 'external', scopes: ['web:search'] }, params: { query: { type: 'string', description: 'Search query.' } }, run: async ({ query }) => run('search_web', (signal) => requestJson(apiBaseUrl, '/search', { method: 'POST', headers, signal, body: { query } })) }),
        tool({ name: 'extract_structured_data', description: 'Extract structured data from a URL.', security: { sideEffect: 'external', scopes: ['web:extract'] }, params: { url: { type: 'string', description: 'URL.' }, prompt: { type: 'string', description: 'Extraction prompt.' } }, run: async ({ url, prompt }) => run('extract_structured_data', (signal) => requestJson(apiBaseUrl, '/extract', { method: 'POST', headers, signal, body: { urls: [url], prompt } })) }),
      ],
    });
  }
}
