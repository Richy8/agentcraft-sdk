import { describe, expect, it, vi } from 'vitest';
import { createAgentEventEmitter } from '../events.js';

describe('createAgentEventEmitter', () => {
  it('isolates observer failures and reports them when configured', () => {
    const onHandlerError = vi.fn();
    const events = createAgentEventEmitter({ onHandlerError });
    const healthyHandler = vi.fn();
    const error = new Error('observer failed');

    events.on('cache.hit', () => {
      throw error;
    });
    events.on('cache.hit', healthyHandler);

    expect(() =>
      events.emit('cache.hit', {
        toolName: 'read',
        key: 'cache-key',
      })
    ).not.toThrow();
    expect(healthyHandler).toHaveBeenCalledOnce();
    expect(onHandlerError).toHaveBeenCalledWith(error, { event: 'cache.hit' });
  });
});
