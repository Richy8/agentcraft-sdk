import { ConfigurationError } from '../../errors/index.js';
import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { createAdapter, tool } from './types.js';

export interface RedisClientLike {
  get(key: string): Promise<unknown>;
  set(key: string, value: string, options?: { ttl?: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
  keys(pattern: string): Promise<string[]>;
  expire(key: string, seconds: number): Promise<unknown>;
  lpush(key: string, value: string): Promise<unknown>;
  rpop(key: string): Promise<unknown>;
  lrange(key: string, start: number, stop: number): Promise<unknown[]>;
}

export interface RedisAdapterConfig {
  url: string;
  keyPrefix?: string;
  defaultTtl?: number;
  client?: RedisClientLike;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class RedisAdapter {
  static readonly adapterName = 'redis';

  static connect(config: RedisAdapterConfig) {
    const client = config.client;
    const key = (value: string) => `${config.keyPrefix ?? ''}${value}`;
    const run = <T>(toolName: string, operation: () => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, async () => operation(), { ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }), ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }) });
    const requireClient = () => {
      if (!client) throw new ConfigurationError('Redis adapter requires an injected client for live execution');
      return client;
    };
    return createAdapter({
      name: this.adapterName,
      metadata: { kind: 'native-sdk', auth: 'connection-string', trustLevel: 'review-required', sideEffects: ['read', 'write'], scopes: ['cache'], requiredSecrets: ['REDIS_URL'], readOnly: false },
      tools: [
        tool({ name: 'get_value', description: 'Get Redis value.', security: { sideEffect: 'read', scopes: ['redis:read'] }, params: { key: { type: 'string', description: 'Key.' } }, run: async ({ key: k }) => run('get_value', () => requireClient().get(key(k))) }),
        tool({ name: 'set_value', description: 'Set Redis value.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['redis:write'] }, params: { key: { type: 'string', description: 'Key.' }, value: { type: 'string', description: 'Value.' }, ttl: { type: 'number', description: 'TTL seconds.', required: false } }, run: async ({ key: k, value, ttl }) => run('set_value', () => requireClient().set(key(k), value, { ttl: ttl ?? config.defaultTtl })) }),
        tool({ name: 'delete_value', description: 'Delete Redis key.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['redis:write'] }, params: { key: { type: 'string', description: 'Key.' } }, run: async ({ key: k }) => run('delete_value', () => requireClient().del(key(k))) }),
        tool({ name: 'list_keys', description: 'List Redis keys by pattern.', security: { sideEffect: 'read', scopes: ['redis:read'] }, params: { pattern: { type: 'string', description: 'Pattern.', required: false } }, run: async ({ pattern = '*' }) => run('list_keys', () => requireClient().keys(key(pattern))) }),
        tool({ name: 'expire_key', description: 'Set key expiration.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['redis:write'] }, params: { key: { type: 'string', description: 'Key.' }, seconds: { type: 'number', description: 'Seconds.' } }, run: async ({ key: k, seconds }) => run('expire_key', () => requireClient().expire(key(k), seconds)) }),
        tool({ name: 'push_to_list', description: 'Push to list.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['redis:write'] }, params: { key: { type: 'string', description: 'Key.' }, value: { type: 'string', description: 'Value.' } }, run: async ({ key: k, value }) => run('push_to_list', () => requireClient().lpush(key(k), value)) }),
        tool({ name: 'pop_from_list', description: 'Pop from list.', security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['redis:write'] }, params: { key: { type: 'string', description: 'Key.' } }, run: async ({ key: k }) => run('pop_from_list', () => requireClient().rpop(key(k))) }),
        tool({ name: 'get_list', description: 'Get list range.', security: { sideEffect: 'read', scopes: ['redis:read'] }, params: { key: { type: 'string', description: 'Key.' }, start: { type: 'number', description: 'Start.', required: false }, stop: { type: 'number', description: 'Stop.', required: false } }, run: async ({ key: k, start = 0, stop = -1 }) => run('get_list', () => requireClient().lrange(key(k), start, stop)) }),
      ],
    });
  }
}
