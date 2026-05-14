import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import { createAdapter, tool } from './types.js';

export interface SlackAdapterConfig {
  token: string;
  defaultChannel?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class SlackAdapter {
  static readonly adapterName = 'slack';

  static connect(config: SlackAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? 'https://slack.com/api';
    const headers = { authorization: `Bearer ${config.token}` };
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    const channelParam = { channel: { type: 'string' as const, description: 'Slack channel ID.', required: false } };
    const channel = (value?: string) => value ?? config.defaultChannel;

    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'oauth', trustLevel: 'review-required', sideEffects: ['read', 'write', 'external'], scopes: ['slack'], requiredSecrets: ['SLACK_BOT_TOKEN'], readOnly: false },
      tools: [
        tool({ name: 'send_message', description: 'Send a Slack message.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['slack:write'] }, params: { ...channelParam, text: { type: 'string', description: 'Message text.' } }, run: async ({ channel: c, text }) => run('send_message', (signal) => requestJson(apiBaseUrl, '/chat.postMessage', { method: 'POST', headers, signal, body: { channel: channel(c), text } })) }),
        tool({ name: 'send_reply', description: 'Send a Slack thread reply.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['slack:write'] }, params: { ...channelParam, threadTs: { type: 'string', description: 'Thread timestamp.' }, text: { type: 'string', description: 'Reply text.' } }, run: async ({ channel: c, threadTs, text }) => run('send_reply', (signal) => requestJson(apiBaseUrl, '/chat.postMessage', { method: 'POST', headers, signal, body: { channel: channel(c), thread_ts: threadTs, text } })) }),
        tool({ name: 'get_channel_history', description: 'Read Slack channel history.', security: { sideEffect: 'external', scopes: ['slack:read'] }, params: { ...channelParam, limit: { type: 'number', description: 'Max messages.', required: false } }, run: async ({ channel: c, limit = 20 }) => run('get_channel_history', (signal) => requestJson(apiBaseUrl, `/conversations.history?channel=${channel(c)}&limit=${limit}`, { headers, signal })) }),
        tool({ name: 'list_channels', description: 'List Slack channels.', security: { sideEffect: 'external', scopes: ['slack:read'] }, params: {}, run: async () => run('list_channels', (signal) => requestJson(apiBaseUrl, '/conversations.list', { headers, signal })) }),
        tool({ name: 'upload_file', description: 'Create an external Slack upload URL.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['slack:files:write'] }, params: { filename: { type: 'string', description: 'Filename.' }, length: { type: 'number', description: 'File byte length.' } }, run: async ({ filename, length }) => run('upload_file', (signal) => requestJson(apiBaseUrl, '/files.getUploadURLExternal', { method: 'POST', headers, signal, body: { filename, length } })) }),
        tool({ name: 'add_reaction', description: 'Add a Slack reaction.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['slack:write'] }, params: { ...channelParam, timestamp: { type: 'string', description: 'Message timestamp.' }, name: { type: 'string', description: 'Reaction name.' } }, run: async ({ channel: c, timestamp, name }) => run('add_reaction', (signal) => requestJson(apiBaseUrl, '/reactions.add', { method: 'POST', headers, signal, body: { channel: channel(c), timestamp, name } })) }),
      ],
    });
  }
}
