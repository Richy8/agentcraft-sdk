import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import { createAdapter, tool } from './types.js';

export interface PineconeAdapterConfig {
  apiKey: string;
  indexName: string;
  namespace?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class PineconeAdapter {
  static readonly adapterName = 'pinecone';

  static connect(config: PineconeAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? `https://${config.indexName}.svc.pinecone.io`;
    const headers = { 'api-key': config.apiKey };
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'api-key', trustLevel: 'review-required', sideEffects: ['read', 'write', 'external'], scopes: ['vectors'], requiredSecrets: ['PINECONE_API_KEY'], readOnly: false },
      tools: [
        tool({ name: 'upsert_vectors', description: 'Upsert vectors.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['vectors:write'] }, params: { vectors: { type: 'array', description: 'Vectors.' } }, run: async ({ vectors }) => run('upsert_vectors', (signal) => requestJson(apiBaseUrl, '/vectors/upsert', { method: 'POST', headers, signal, body: { vectors, namespace: config.namespace } })) }),
        tool({ name: 'query_vectors', description: 'Query vectors.', security: { sideEffect: 'external', scopes: ['vectors:read'] }, params: { vector: { type: 'array', description: 'Query vector.' }, topK: { type: 'number', description: 'Top K.', required: false } }, run: async ({ vector, topK = 10 }) => run('query_vectors', (signal) => requestJson(apiBaseUrl, '/query', { method: 'POST', headers, signal, body: { vector, topK, namespace: config.namespace } })) }),
        tool({ name: 'delete_vectors', description: 'Delete vectors.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['vectors:write'] }, params: { ids: { type: 'array', description: 'Vector IDs.' } }, run: async ({ ids }) => run('delete_vectors', (signal) => requestJson(apiBaseUrl, '/vectors/delete', { method: 'POST', headers, signal, body: { ids, namespace: config.namespace } })) }),
        tool({ name: 'list_indexes', description: 'List Pinecone indexes.', security: { sideEffect: 'external', scopes: ['vectors:read'] }, params: {}, run: async () => run('list_indexes', (signal) => requestJson('https://api.pinecone.io', '/indexes', { headers, signal })) }),
        tool({ name: 'describe_index', description: 'Describe Pinecone index.', security: { sideEffect: 'external', scopes: ['vectors:read'] }, params: {}, run: async () => run('describe_index', (signal) => requestJson('https://api.pinecone.io', `/indexes/${config.indexName}`, { headers, signal })) }),
      ],
    });
  }
}
