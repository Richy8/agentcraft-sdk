import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import { createAdapter, tool } from './types.js';

export type GoogleCredentials = Record<string, unknown>;

export interface GoogleSheetsAdapterConfig {
  credentials: GoogleCredentials;
  spreadsheetId?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class GoogleSheetsAdapter {
  static readonly adapterName = 'google-sheets';

  static connect(config: GoogleSheetsAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? 'https://sheets.googleapis.com/v4';
    const token = String(config.credentials.accessToken ?? config.credentials.access_token ?? '');
    const headers = token ? { authorization: `Bearer ${token}` } : {};
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    const sheet = (id?: string) => id ?? config.spreadsheetId;
    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'oauth', trustLevel: 'review-required', sideEffects: ['read', 'write', 'external'], scopes: ['sheets'], requiredSecrets: ['GOOGLE_CREDENTIALS'], readOnly: false },
      tools: [
        tool({ name: 'get_spreadsheet', description: 'Get spreadsheet metadata.', security: { sideEffect: 'external', scopes: ['sheets:read'] }, params: { spreadsheetId: { type: 'string', description: 'Spreadsheet ID.', required: false } }, run: async ({ spreadsheetId }) => run('get_spreadsheet', (signal) => requestJson(apiBaseUrl, `/spreadsheets/${sheet(spreadsheetId)}`, { headers, signal })) }),
        tool({ name: 'read_range', description: 'Read a range.', security: { sideEffect: 'external', scopes: ['sheets:read'] }, params: { spreadsheetId: { type: 'string', description: 'Spreadsheet ID.', required: false }, range: { type: 'string', description: 'A1 range.' } }, run: async ({ spreadsheetId, range }) => run('read_range', (signal) => requestJson(apiBaseUrl, `/spreadsheets/${sheet(spreadsheetId)}/values/${encodeURIComponent(range)}`, { headers, signal })) }),
        tool({ name: 'write_range', description: 'Write a range.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['sheets:write'] }, params: { spreadsheetId: { type: 'string', description: 'Spreadsheet ID.', required: false }, range: { type: 'string', description: 'A1 range.' }, values: { type: 'array', description: 'Rows.' } }, run: async ({ spreadsheetId, range, values }) => run('write_range', (signal) => requestJson(apiBaseUrl, `/spreadsheets/${sheet(spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, { method: 'PUT', headers, signal, body: { values } })) }),
        tool({ name: 'append_row', description: 'Append rows.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['sheets:write'] }, params: { spreadsheetId: { type: 'string', description: 'Spreadsheet ID.', required: false }, range: { type: 'string', description: 'A1 range.' }, values: { type: 'array', description: 'Rows.' } }, run: async ({ spreadsheetId, range, values }) => run('append_row', (signal) => requestJson(apiBaseUrl, `/spreadsheets/${sheet(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`, { method: 'POST', headers, signal, body: { values } })) }),
        tool({ name: 'create_sheet', description: 'Create a sheet.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['sheets:write'] }, params: { spreadsheetId: { type: 'string', description: 'Spreadsheet ID.', required: false }, title: { type: 'string', description: 'Sheet title.' } }, run: async ({ spreadsheetId, title }) => run('create_sheet', (signal) => requestJson(apiBaseUrl, `/spreadsheets/${sheet(spreadsheetId)}:batchUpdate`, { method: 'POST', headers, signal, body: { requests: [{ addSheet: { properties: { title } } }] } })) }),
        tool({ name: 'list_sheets', description: 'List sheet names.', security: { sideEffect: 'external', scopes: ['sheets:read'] }, params: { spreadsheetId: { type: 'string', description: 'Spreadsheet ID.', required: false } }, run: async ({ spreadsheetId }) => run('list_sheets', (signal) => requestJson(apiBaseUrl, `/spreadsheets/${sheet(spreadsheetId)}?fields=sheets.properties`, { headers, signal })) }),
      ],
    });
  }
}
