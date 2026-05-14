import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import { createAdapter, tool } from './types.js';

export interface ElevenLabsAdapterConfig {
  apiKey: string;
  defaultVoiceId?: string;
  defaultModel?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class ElevenLabsAdapter {
  static readonly adapterName = 'elevenlabs';

  static connect(config: ElevenLabsAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? 'https://api.elevenlabs.io/v1';
    const headers = { 'xi-api-key': config.apiKey };
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'api-key', trustLevel: 'review-required', sideEffects: ['read', 'write', 'external'], scopes: ['audio'], requiredSecrets: ['ELEVENLABS_API_KEY'], readOnly: false },
      tools: [
        tool({ name: 'text_to_speech', description: 'Generate speech audio.', security: { sideEffect: 'external', scopes: ['audio:generate'] }, params: { text: { type: 'string', description: 'Text.' }, voiceId: { type: 'string', description: 'Voice ID.', required: false }, modelId: { type: 'string', description: 'Model ID.', required: false } }, run: async ({ text, voiceId, modelId }) => run('text_to_speech', (signal) => requestJson(apiBaseUrl, `/text-to-speech/${voiceId ?? config.defaultVoiceId}`, { method: 'POST', headers, signal, body: { text, model_id: modelId ?? config.defaultModel } })) }),
        tool({ name: 'list_voices', description: 'List voices.', security: { sideEffect: 'external', scopes: ['audio:read'] }, params: {}, run: async () => run('list_voices', (signal) => requestJson(apiBaseUrl, '/voices', { headers, signal })) }),
        tool({ name: 'get_voice', description: 'Get voice metadata.', security: { sideEffect: 'external', scopes: ['audio:read'] }, params: { voiceId: { type: 'string', description: 'Voice ID.', required: false } }, run: async ({ voiceId }) => run('get_voice', (signal) => requestJson(apiBaseUrl, `/voices/${voiceId ?? config.defaultVoiceId}`, { headers, signal })) }),
        tool({ name: 'clone_voice', description: 'Create a cloned voice metadata request.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['audio:write'] }, params: { name: { type: 'string', description: 'Voice name.' }, description: { type: 'string', description: 'Description.', required: false } }, run: async ({ name, description }) => run('clone_voice', (signal) => requestJson(apiBaseUrl, '/voices/add', { method: 'POST', headers, signal, body: { name, description } })) }),
      ],
    });
  }
}
