import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { requestJson } from './http-utils.js';
import { createAdapter, tool } from './types.js';

export interface ImageGenerationAdapterConfig {
  provider: 'openai' | 'stability';
  apiKey: string;
  defaultModel?: string;
  defaultSize?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class ImageGenerationAdapter {
  static readonly adapterName = 'image-generation';

  static connect(config: ImageGenerationAdapterConfig) {
    const apiBaseUrl = config.apiBaseUrl ?? (config.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.stability.ai/v2beta');
    const headers = { authorization: `Bearer ${config.apiKey}` };
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'api-key', trustLevel: 'review-required', sideEffects: ['write', 'external'], scopes: ['image_generation'], requiredSecrets: ['IMAGE_API_KEY'], readOnly: false },
      tools: [
        tool({ name: 'generate_image', description: 'Generate an image.', security: { sideEffect: 'external', scopes: ['image:generate'] }, params: { prompt: { type: 'string', description: 'Prompt.' }, size: { type: 'string', description: 'Size.', required: false }, model: { type: 'string', description: 'Model.', required: false } }, run: async ({ prompt, size, model }) => run('generate_image', (signal) => requestJson(apiBaseUrl, config.provider === 'openai' ? '/images/generations' : '/stable-image/generate/core', { method: 'POST', headers, signal, body: { prompt, size: size ?? config.defaultSize, model: model ?? config.defaultModel } })) }),
        tool({ name: 'edit_image', description: 'Submit an image edit request.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['image:edit'] }, params: { image: { type: 'string', description: 'Image reference or base64.' }, prompt: { type: 'string', description: 'Prompt.' } }, run: async ({ image, prompt }) => run('edit_image', (signal) => requestJson(apiBaseUrl, '/images/edits', { method: 'POST', headers, signal, body: { image, prompt, model: config.defaultModel } })) }),
        tool({ name: 'generate_variations', description: 'Generate image variations.', security: { sideEffect: 'external', scopes: ['image:generate'] }, params: { image: { type: 'string', description: 'Image reference or base64.' }, n: { type: 'number', description: 'Number of variations.', required: false } }, run: async ({ image, n = 1 }) => run('generate_variations', (signal) => requestJson(apiBaseUrl, '/images/variations', { method: 'POST', headers, signal, body: { image, n, model: config.defaultModel } })) }),
      ],
    });
  }
}
