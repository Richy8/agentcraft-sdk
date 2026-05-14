import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import { createAdapter, tool } from './types.js';

export interface NotionAdapterConfig {
  token: string;
  defaultParentId?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class NotionAdapter {
  static readonly adapterName = 'notion';

  static connect(config: NotionAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? 'https://api.notion.com/v1';
    const headers = { authorization: `Bearer ${config.token}`, 'notion-version': '2022-06-28' };
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'api-key', trustLevel: 'review-required', sideEffects: ['read', 'write', 'external'], scopes: ['notion'], requiredSecrets: ['NOTION_TOKEN'], readOnly: false },
      tools: [
        tool({ name: 'search_notion', description: 'Search Notion.', security: { sideEffect: 'external', scopes: ['notion:read'] }, params: { query: { type: 'string', description: 'Query.', required: false } }, run: async ({ query }) => run('search_notion', (signal) => requestJson(apiBaseUrl, '/search', { method: 'POST', headers, signal, body: { query } })) }),
        tool({ name: 'get_page', description: 'Get a Notion page.', security: { sideEffect: 'external', scopes: ['notion:read'] }, params: { pageId: { type: 'string', description: 'Page ID.' } }, run: async ({ pageId }) => run('get_page', (signal) => requestJson(apiBaseUrl, `/pages/${pageId}`, { headers, signal })) }),
        tool({ name: 'create_page', description: 'Create a Notion page.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['notion:write'] }, params: { title: { type: 'string', description: 'Title.' }, parentId: { type: 'string', description: 'Parent page/database ID.', required: false }, properties: { type: 'object', description: 'Notion properties.', required: false } }, run: async ({ title, parentId, properties = {} }) => run('create_page', (signal) => requestJson(apiBaseUrl, '/pages', { method: 'POST', headers, signal, body: { parent: { page_id: parentId ?? config.defaultParentId }, properties: Object.keys(properties).length ? properties : { title: { title: [{ text: { content: title } }] } } } })) }),
        tool({ name: 'update_page', description: 'Update Notion page properties.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['notion:write'] }, params: { pageId: { type: 'string', description: 'Page ID.' }, properties: { type: 'object', description: 'Properties.' } }, run: async ({ pageId, properties }) => run('update_page', (signal) => requestJson(apiBaseUrl, `/pages/${pageId}`, { method: 'PATCH', headers, signal, body: { properties } })) }),
        tool({ name: 'get_database', description: 'Get a Notion database.', security: { sideEffect: 'external', scopes: ['notion:read'] }, params: { databaseId: { type: 'string', description: 'Database ID.' } }, run: async ({ databaseId }) => run('get_database', (signal) => requestJson(apiBaseUrl, `/databases/${databaseId}`, { headers, signal })) }),
        tool({ name: 'query_database', description: 'Query a Notion database.', security: { sideEffect: 'external', scopes: ['notion:read'] }, params: { databaseId: { type: 'string', description: 'Database ID.' }, filter: { type: 'object', description: 'Filter.', required: false } }, run: async ({ databaseId, filter }) => run('query_database', (signal) => requestJson(apiBaseUrl, `/databases/${databaseId}/query`, { method: 'POST', headers, signal, body: { filter } })) }),
        tool({ name: 'create_database_entry', description: 'Create a Notion database entry.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['notion:write'] }, params: { databaseId: { type: 'string', description: 'Database ID.' }, properties: { type: 'object', description: 'Entry properties.' } }, run: async ({ databaseId, properties }) => run('create_database_entry', (signal) => requestJson(apiBaseUrl, '/pages', { method: 'POST', headers, signal, body: { parent: { database_id: databaseId }, properties } })) }),
      ],
    });
  }
}
