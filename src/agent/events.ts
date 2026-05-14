import type { TokenUsage } from './types.js';

/** Events emitted by workspace-aware agent, team, workflow, and store operations. */
export interface AgentEventMap {
  'cache.hit': {
    toolName: string;
    key: string;
    estimatedSavedTokens?: number;
  };
  'cache.miss': {
    toolName: string;
    key: string;
  };
  'cost.updated': {
    model: string;
    provider: string;
    cost: number;
    tokensUsed: TokenUsage;
  };
  'tool.called': {
    toolName: string;
    sideEffectLevel?: 'none' | 'read' | 'write' | 'external';
  };
  'approval.requested': {
    toolName: string;
    sideEffect?: string;
  };
  'approval.granted': {
    toolName: string;
  };
  'approval.denied': {
    toolName: string;
  };
  'workflow.step.started': {
    stepId: string;
    type: string;
  };
  'workflow.step.completed': {
    stepId: string;
    status: 'completed' | 'failed' | 'skipped';
  };
  'artifact.read': {
    type: string;
    id: string;
  };
  'artifact.write': {
    type: string;
    id: string;
    operation: 'put' | 'update' | 'delete';
  };
}

/** Valid workspace event names. */
export type AgentEventType = keyof AgentEventMap;

/** Typed event subscription surface exposed by AgentWorkspace. */
export interface AgentEventEmitter {
  on<K extends AgentEventType>(
    event: K,
    handler: (data: AgentEventMap[K]) => void,
  ): () => void;
  off<K extends AgentEventType>(
    event: K,
    handler: (data: AgentEventMap[K]) => void,
  ): void;
  emit<K extends AgentEventType>(event: K, data: AgentEventMap[K]): void;
}

/** Create a lightweight event emitter whose handler errors are isolated. */
export function createAgentEventEmitter(): AgentEventEmitter {
  const handlers = new Map<AgentEventType, Set<(data: unknown) => void>>();

  return {
    on<K extends AgentEventType>(
      event: K,
      handler: (data: AgentEventMap[K]) => void,
    ): () => void {
      const set = handlers.get(event) ?? new Set<(data: unknown) => void>();
      set.add(handler as (data: unknown) => void);
      handlers.set(event, set);
      return () => this.off(event, handler);
    },

    off<K extends AgentEventType>(
      event: K,
      handler: (data: AgentEventMap[K]) => void,
    ): void {
      handlers.get(event)?.delete(handler as (data: unknown) => void);
    },

    emit<K extends AgentEventType>(event: K, data: AgentEventMap[K]): void {
      for (const handler of handlers.get(event) ?? []) {
        try {
          handler(data);
        } catch {
          // Event subscribers are observers; they must not break an agent run.
        }
      }
    },
  };
}
