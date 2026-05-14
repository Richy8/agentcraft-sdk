import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import { createAdapter, tool } from './types.js';

export interface SupabaseAdapterConfig {
  url: string;
  key: string;
  schema?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class SupabaseAdapter {
  static readonly adapterName = 'supabase';

  static connect(config: SupabaseAdapterConfig) {
    const headers = { apikey: config.key, authorization: `Bearer ${config.key}`, ...(config.schema !== undefined && { 'accept-profile': config.schema, 'content-profile': config.schema }) };
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'api-key', trustLevel: 'review-required', sideEffects: ['read', 'write', 'external'], scopes: ['database', 'storage'], requiredSecrets: ['SUPABASE_KEY'], readOnly: false },
      tools: [
        tool({ name: 'query_table', description: 'Query a Supabase table.', security: { sideEffect: 'external', scopes: ['supabase:read'] }, params: { table: { type: 'string', description: 'Table.' }, select: { type: 'string', description: 'Select expression.', required: false }, filter: { type: 'string', description: 'URL query filter.', required: false } }, run: async ({ table, select = '*', filter = '' }) => run('query_table', (signal) => requestJson(config.url, `/rest/v1/${table}?select=${encodeURIComponent(select)}${filter ? `&${filter}` : ''}`, { headers, signal })) }),
        tool({ name: 'insert_record', description: 'Insert a Supabase record.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['supabase:write'] }, params: { table: { type: 'string', description: 'Table.' }, record: { type: 'object', description: 'Record.' } }, run: async ({ table, record }) => run('insert_record', (signal) => requestJson(config.url, `/rest/v1/${table}`, { method: 'POST', headers: { ...headers, prefer: 'return=representation' }, signal, body: record })) }),
        tool({ name: 'update_record', description: 'Update Supabase records.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['supabase:write'] }, params: { table: { type: 'string', description: 'Table.' }, filter: { type: 'string', description: 'URL query filter.' }, record: { type: 'object', description: 'Patch.' } }, run: async ({ table, filter, record }) => run('update_record', (signal) => requestJson(config.url, `/rest/v1/${table}?${filter}`, { method: 'PATCH', headers: { ...headers, prefer: 'return=representation' }, signal, body: record })) }),
        tool({ name: 'delete_record', description: 'Delete Supabase records.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['supabase:write'] }, params: { table: { type: 'string', description: 'Table.' }, filter: { type: 'string', description: 'URL query filter.' } }, run: async ({ table, filter }) => run('delete_record', (signal) => requestJson(config.url, `/rest/v1/${table}?${filter}`, { method: 'DELETE', headers, signal })) }),
        tool({ name: 'rpc_call', description: 'Call a Supabase RPC function.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['supabase:rpc'] }, params: { functionName: { type: 'string', description: 'Function name.' }, args: { type: 'object', description: 'Arguments.', required: false } }, run: async ({ functionName, args = {} }) => run('rpc_call', (signal) => requestJson(config.url, `/rest/v1/rpc/${functionName}`, { method: 'POST', headers, signal, body: args })) }),
        tool({ name: 'storage_upload', description: 'Upload object metadata/content to Supabase Storage.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['supabase:storage:write'] }, params: { bucket: { type: 'string', description: 'Bucket.' }, path: { type: 'string', description: 'Object path.' }, content: { type: 'string', description: 'Text content.' } }, run: async ({ bucket, path, content }) => run('storage_upload', (signal) => requestJson(config.url, `/storage/v1/object/${bucket}/${path}`, { method: 'POST', headers, signal, body: { content } })) }),
        tool({ name: 'storage_download', description: 'Download from Supabase Storage.', security: { sideEffect: 'external', scopes: ['supabase:storage:read'] }, params: { bucket: { type: 'string', description: 'Bucket.' }, path: { type: 'string', description: 'Object path.' } }, run: async ({ bucket, path }) => run('storage_download', (signal) => requestJson(config.url, `/storage/v1/object/${bucket}/${path}`, { headers, signal })) }),
        tool({ name: 'storage_list', description: 'List Supabase Storage objects.', security: { sideEffect: 'external', scopes: ['supabase:storage:read'] }, params: { bucket: { type: 'string', description: 'Bucket.' }, prefix: { type: 'string', description: 'Prefix.', required: false } }, run: async ({ bucket, prefix = '' }) => run('storage_list', (signal) => requestJson(config.url, `/storage/v1/object/list/${bucket}`, { method: 'POST', headers, signal, body: { prefix } })) }),
      ],
    });
  }
}
