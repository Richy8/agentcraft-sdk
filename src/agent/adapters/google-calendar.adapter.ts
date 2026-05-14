import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import type { GoogleCredentials } from './google-sheets.adapter.js';
import { createAdapter, tool } from './types.js';

export interface GoogleCalendarAdapterConfig {
  credentials: GoogleCredentials;
  calendarId?: string;
  timezone?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class GoogleCalendarAdapter {
  static readonly adapterName = 'google-calendar';

  static connect(config: GoogleCalendarAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? 'https://www.googleapis.com/calendar/v3';
    const token = String(config.credentials.accessToken ?? config.credentials.access_token ?? '');
    const headers = token ? { authorization: `Bearer ${token}` } : {};
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    const calendar = (id?: string) => encodeURIComponent(id ?? config.calendarId ?? 'primary');
    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'oauth', trustLevel: 'review-required', sideEffects: ['read', 'write', 'external'], scopes: ['calendar'], requiredSecrets: ['GOOGLE_CREDENTIALS'], readOnly: false },
      tools: [
        tool({ name: 'list_events', description: 'List calendar events.', security: { sideEffect: 'external', scopes: ['calendar:read'] }, params: { calendarId: { type: 'string', description: 'Calendar ID.', required: false }, timeMin: { type: 'string', description: 'Start ISO.', required: false }, timeMax: { type: 'string', description: 'End ISO.', required: false } }, run: async ({ calendarId, timeMin, timeMax }) => run('list_events', (signal) => requestJson(apiBaseUrl, `/calendars/${calendar(calendarId)}/events?${new URLSearchParams({ ...(timeMin && { timeMin }), ...(timeMax && { timeMax }), ...(config.timezone && { timeZone: config.timezone }) }).toString()}`, { headers, signal })) }),
        tool({ name: 'get_event', description: 'Get calendar event.', security: { sideEffect: 'external', scopes: ['calendar:read'] }, params: { calendarId: { type: 'string', description: 'Calendar ID.', required: false }, eventId: { type: 'string', description: 'Event ID.' } }, run: async ({ calendarId, eventId }) => run('get_event', (signal) => requestJson(apiBaseUrl, `/calendars/${calendar(calendarId)}/events/${eventId}`, { headers, signal })) }),
        tool({ name: 'create_event', description: 'Create calendar event.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['calendar:write'] }, params: { calendarId: { type: 'string', description: 'Calendar ID.', required: false }, event: { type: 'object', description: 'Google event resource.' } }, run: async ({ calendarId, event }) => run('create_event', (signal) => requestJson(apiBaseUrl, `/calendars/${calendar(calendarId)}/events`, { method: 'POST', headers, signal, body: event })) }),
        tool({ name: 'update_event', description: 'Update calendar event.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['calendar:write'] }, params: { calendarId: { type: 'string', description: 'Calendar ID.', required: false }, eventId: { type: 'string', description: 'Event ID.' }, event: { type: 'object', description: 'Patch resource.' } }, run: async ({ calendarId, eventId, event }) => run('update_event', (signal) => requestJson(apiBaseUrl, `/calendars/${calendar(calendarId)}/events/${eventId}`, { method: 'PATCH', headers, signal, body: event })) }),
        tool({ name: 'delete_event', description: 'Delete calendar event.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['calendar:write'] }, params: { calendarId: { type: 'string', description: 'Calendar ID.', required: false }, eventId: { type: 'string', description: 'Event ID.' } }, run: async ({ calendarId, eventId }) => run('delete_event', (signal) => requestJson(apiBaseUrl, `/calendars/${calendar(calendarId)}/events/${eventId}`, { method: 'DELETE', headers, signal })) }),
        tool({ name: 'find_free_slots', description: 'Query free/busy information.', security: { sideEffect: 'external', scopes: ['calendar:read'] }, params: { calendarIds: { type: 'array', description: 'Calendar IDs.' }, timeMin: { type: 'string', description: 'Start ISO.' }, timeMax: { type: 'string', description: 'End ISO.' } }, run: async ({ calendarIds, timeMin, timeMax }) => run('find_free_slots', (signal) => requestJson(apiBaseUrl, '/freeBusy', { method: 'POST', headers, signal, body: { timeMin, timeMax, timeZone: config.timezone, items: calendarIds.map((id) => ({ id })) } })) }),
      ],
    });
  }
}
