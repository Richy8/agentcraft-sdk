import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import { createAdapter, tool } from './types.js';

export interface ApifyAdapterConfig {
  token: string;
  defaultDatasetId?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class ApifyAdapter {
  static readonly adapterName = 'apify';

  static connect(config: ApifyAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? 'https://api.apify.com/v2';
    const headers = { authorization: `Bearer ${config.token}` };
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'api-key', trustLevel: 'review-required', sideEffects: ['read', 'write', 'external'], scopes: ['actors', 'datasets'], requiredSecrets: ['APIFY_TOKEN'], readOnly: false },
      tools: [
        tool({ name: 'scrape_url', description: 'Run a scraping actor for a URL.', security: { sideEffect: 'external', scopes: ['apify:actors'] }, params: { actorId: { type: 'string', description: 'Actor ID.' }, url: { type: 'string', description: 'URL.' } }, run: async ({ actorId, url }) => run('scrape_url', (signal) => requestJson(apiBaseUrl, `/acts/${actorId}/runs`, { method: 'POST', headers, signal, body: { startUrls: [{ url }] } })) }),
        tool({ name: 'crawl_site', description: 'Run a crawl actor.', security: { sideEffect: 'external', scopes: ['apify:actors'] }, params: { actorId: { type: 'string', description: 'Actor ID.' }, startUrl: { type: 'string', description: 'Start URL.' } }, run: async ({ actorId, startUrl }) => run('crawl_site', (signal) => requestJson(apiBaseUrl, `/acts/${actorId}/runs`, { method: 'POST', headers, signal, body: { startUrls: [{ url: startUrl }] } })) }),
        tool({ name: 'run_actor', description: 'Run an Apify actor.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['apify:actors'] }, params: { actorId: { type: 'string', description: 'Actor ID.' }, input: { type: 'object', description: 'Actor input.', required: false } }, run: async ({ actorId, input = {} }) => run('run_actor', (signal) => requestJson(apiBaseUrl, `/acts/${actorId}/runs`, { method: 'POST', headers, signal, body: input })) }),
        tool({ name: 'get_dataset_items', description: 'Get Apify dataset items.', security: { sideEffect: 'external', scopes: ['apify:datasets'] }, params: { datasetId: { type: 'string', description: 'Dataset ID.', required: false }, limit: { type: 'number', description: 'Max items.', required: false } }, run: async ({ datasetId, limit = 100 }) => run('get_dataset_items', (signal) => requestJson(apiBaseUrl, `/datasets/${datasetId ?? config.defaultDatasetId}/items?limit=${limit}`, { headers, signal })) }),
      ],
    });
  }
}
