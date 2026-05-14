import { ConfigurationError } from '../../errors/index.js';
import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { createAdapter, tool } from './types.js';

export interface StorageClientLike {
  upload(key: string, content: string): Promise<unknown>;
  download(key: string): Promise<unknown>;
  list(prefix?: string): Promise<unknown>;
  delete(key: string): Promise<unknown>;
  signedUrl(key: string, expiresIn?: number): Promise<unknown>;
  copy(from: string, to: string): Promise<unknown>;
}

export type StorageAdapterConfig =
  | {
      provider: 's3' | 'r2';
      bucket: string;
      region: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      endpoint?: string;
      client?: StorageClientLike;
      timeoutMs?: number;
      onAuditEvent?: (event: AdapterAuditEvent) => void;
    }
  | {
      provider: 'cloudinary';
      cloudName?: string;
      apiKey?: string;
      apiSecret?: string;
      folder?: string;
      client?: StorageClientLike;
      timeoutMs?: number;
      onAuditEvent?: (event: AdapterAuditEvent) => void;
    };

export class StorageAdapter {
  static readonly adapterName = 'storage';

  static connect(config: StorageAdapterConfig) {
    const client = config.client;
    const run = <T>(toolName: string, operation: () => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, async () => operation(), { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    const requireClient = () => {
      if (!client) throw new ConfigurationError('Storage adapter requires an injected client for live execution');
      return client;
    };
    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'custom', trustLevel: 'review-required', sideEffects: ['read', 'write', 'external'], scopes: ['storage'], requiredSecrets: ['STORAGE_CREDENTIALS'], readOnly: false },
      tools: [
        tool({ name: 'upload_file', description: 'Upload object content.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['storage:write'] }, params: { key: { type: 'string', description: 'Object key.' }, content: { type: 'string', description: 'Text content.' } }, run: async ({ key, content }) => run('upload_file', () => requireClient().upload(key, content)) }),
        tool({ name: 'download_file', description: 'Download object content.', security: { sideEffect: 'external', scopes: ['storage:read'] }, params: { key: { type: 'string', description: 'Object key.' } }, run: async ({ key }) => run('download_file', () => requireClient().download(key)) }),
        tool({ name: 'list_files', description: 'List stored objects.', security: { sideEffect: 'external', scopes: ['storage:read'] }, params: { prefix: { type: 'string', description: 'Prefix.', required: false } }, run: async ({ prefix }) => run('list_files', () => requireClient().list(prefix)) }),
        tool({ name: 'delete_file', description: 'Delete object.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['storage:write'] }, params: { key: { type: 'string', description: 'Object key.' } }, run: async ({ key }) => run('delete_file', () => requireClient().delete(key)) }),
        tool({ name: 'get_signed_url', description: 'Create signed URL.', security: { sideEffect: 'external', scopes: ['storage:read'] }, params: { key: { type: 'string', description: 'Object key.' }, expiresIn: { type: 'number', description: 'Seconds.', required: false } }, run: async ({ key, expiresIn }) => run('get_signed_url', () => requireClient().signedUrl(key, expiresIn)) }),
        tool({ name: 'copy_file', description: 'Copy object.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['storage:write'] }, params: { from: { type: 'string', description: 'Source key.' }, to: { type: 'string', description: 'Destination key.' } }, run: async ({ from, to }) => run('copy_file', () => requireClient().copy(from, to)) }),
      ],
    });
  }
}
