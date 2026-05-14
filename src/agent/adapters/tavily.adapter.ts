import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { createAdapter, tool } from './types.js';

export interface TavilySearchAdapterConfig {
  apiKey: string;
  searchDepth?: 'basic' | 'advanced';
  maxResults?: number;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class TavilySearchAdapter {
  static readonly adapterName = 'tavily';

  static connect(config: TavilySearchAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? 'https://api.tavily.com';
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, {
        ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }),
        ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }),
      });

    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'api-key', trustLevel: 'review-required', sideEffects: ['read', 'external'], scopes: ['web_search'], requiredSecrets: ['TAVILY_API_KEY'], readOnly: true },
      tools: [
        tool({
          name: 'web_search',
          description: 'Search the web with Tavily.',
          security: { sideEffect: 'external', scopes: ['web:search'] },
          params: { query: { type: 'string', description: 'Search query.' }, maxResults: { type: 'number', description: 'Maximum results.', required: false } },
          run: async ({ query, maxResults }) =>
            run('web_search', (signal) =>
              postJson(apiBaseUrl, '/search', { api_key: config.apiKey, query, search_depth: config.searchDepth ?? 'basic', max_results: maxResults ?? config.maxResults ?? 5 }, signal)
            ),
        }),
        tool({
          name: 'get_page_content',
          description: 'Extract page content with Tavily.',
          security: { sideEffect: 'external', scopes: ['web:read'] },
          params: { url: { type: 'string', description: 'URL to extract.' } },
          run: async ({ url }) => run('get_page_content', (signal) => postJson(apiBaseUrl, '/extract', { api_key: config.apiKey, urls: [url] }, signal)),
        }),
      ],
    });
  }
}

async function postJson(baseUrl: string, path: string, body: unknown, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Tavily request failed with HTTP ${response.status}`);
  return response.json() as Promise<unknown>;
}
