import { mkdirSync } from 'node:fs';
import { AgentCache } from './cache.js';
import type { AgentAdapter } from './adapters/types.js';
import type { ToolPolicy } from './adapters/tool-policy.js';
import type { AgentCacheController } from './creator/types.js';
import { createAgentEventEmitter, type AgentEventEmitter } from './events.js';
import type { AgentMemoryStore } from './memory/index.js';
import type { TraceSink } from './observability.js';
import type { RunBudget } from './types.js';
import type { ArtifactStore } from '../artifact-store/types.js';
import type { Logger } from '../types/logger.js';
import type { TokenUsage } from './types.js';

export interface AgentWorkspaceMetricsSnapshot {
  readonly cost: number;
  readonly tokensUsed: TokenUsage;
  readonly cache: {
    readonly hits: number;
    readonly misses: number;
    readonly writes: number;
  };
  readonly toolCalls: number;
  readonly artifacts: {
    readonly reads: number;
    readonly writes: number;
    readonly updates: number;
    readonly deletes: number;
  };
  readonly memory: {
    readonly reads: number;
    readonly writes: number;
    readonly deletes: number;
    readonly blocked: number;
  };
}

export interface AgentWorkspaceMetrics {
  snapshot(): AgentWorkspaceMetricsSnapshot;
  reset(): void;
}

/** Shared runtime resources applied to teams, workflows, and their agents. */
export interface AgentWorkspaceConfig {
  readonly cache?: AgentCacheController;
  readonly adapters?: readonly AgentAdapter[];
  readonly mcps?: readonly AgentAdapter[];
  readonly toolPolicy?: ToolPolicy;
  readonly budget?: RunBudget;
  readonly traceSink?: TraceSink;
  readonly logger?: Logger;
  readonly store?: ArtifactStore;
  readonly memory?: AgentMemoryStore;
}

/** Runtime workspace returned by AgentWorkspace factory methods. */
export interface AgentWorkspaceInstance {
  readonly cache: AgentCacheController | undefined;
  readonly store: ArtifactStore | undefined;
  readonly memory: AgentMemoryStore | undefined;
  readonly adapters: readonly AgentAdapter[];
  readonly mcps: readonly AgentAdapter[];
  readonly toolPolicy: ToolPolicy | undefined;
  readonly budget: RunBudget | undefined;
  readonly traceSink: TraceSink | undefined;
  readonly logger: Logger | undefined;
  readonly events: AgentEventEmitter;
  readonly metrics: AgentWorkspaceMetrics;
}

class WorkspaceImpl implements AgentWorkspaceInstance {
  readonly cache: AgentCacheController | undefined;
  readonly store: ArtifactStore | undefined;
  readonly memory: AgentMemoryStore | undefined;
  readonly adapters: readonly AgentAdapter[];
  readonly mcps: readonly AgentAdapter[];
  readonly toolPolicy: ToolPolicy | undefined;
  readonly budget: RunBudget | undefined;
  readonly traceSink: TraceSink | undefined;
  readonly logger: Logger | undefined;
  readonly events: AgentEventEmitter;
  readonly metrics: AgentWorkspaceMetrics;

  constructor(config: AgentWorkspaceConfig) {
    this.cache = config.cache;
    this.store = config.store;
    this.memory = config.memory;
    this.adapters = Object.freeze([...(config.adapters ?? [])]);
    this.mcps = Object.freeze([...(config.mcps ?? [])]);
    this.toolPolicy = config.toolPolicy;
    this.budget = config.budget;
    this.traceSink = config.traceSink;
    this.logger = config.logger;
    this.events = createAgentEventEmitter();
    this.memory?.setEventEmitter?.(this.events);
    this.metrics = createWorkspaceMetrics(this.events);
  }
}

/** Options for AgentWorkspace.local(). */
export interface LocalWorkspaceOptions {
  /** Directory for the file-based cache. Defaults to `${root}/.agentcraft-cache`. */
  readonly cacheRoot?: string;
}

export const AgentWorkspace = {
  /** Create a workspace from explicit shared resources. */
  create(config: AgentWorkspaceConfig = {}): AgentWorkspaceInstance {
    return new WorkspaceImpl(config);
  },

  /** Create an empty in-memory workspace for tests and ephemeral runs. */
  memory(): AgentWorkspaceInstance {
    return new WorkspaceImpl({});
  },

  /** Create a local workspace with a file cache under cacheRoot or root/.agentcraft-cache. */
  local(root: string, options: LocalWorkspaceOptions = {}): AgentWorkspaceInstance {
    const cacheRoot = options.cacheRoot ?? `${root}/.agentcraft-cache`;
    mkdirSync(cacheRoot, { recursive: true });
    return new WorkspaceImpl({
      cache: AgentCache.file(cacheRoot),
    });
  },
} as const;

function createWorkspaceMetrics(events: AgentEventEmitter): AgentWorkspaceMetrics {
  let snapshot = emptyMetrics();

  events.on('cost.updated', (event) => {
    snapshot = {
      ...snapshot,
      cost: snapshot.cost + event.cost,
      tokensUsed: {
        prompt: snapshot.tokensUsed.prompt + event.tokensUsed.prompt,
        completion: snapshot.tokensUsed.completion + event.tokensUsed.completion,
        total: snapshot.tokensUsed.total + event.tokensUsed.total,
      },
    };
  });
  events.on('cache.hit', () => {
    snapshot = {
      ...snapshot,
      cache: { ...snapshot.cache, hits: snapshot.cache.hits + 1 },
    };
  });
  events.on('cache.miss', () => {
    snapshot = {
      ...snapshot,
      cache: { ...snapshot.cache, misses: snapshot.cache.misses + 1 },
    };
  });
  events.on('cache.write', () => {
    snapshot = {
      ...snapshot,
      cache: { ...snapshot.cache, writes: snapshot.cache.writes + 1 },
    };
  });
  events.on('tool.called', () => {
    snapshot = { ...snapshot, toolCalls: snapshot.toolCalls + 1 };
  });
  events.on('artifact.read', () => {
    snapshot = {
      ...snapshot,
      artifacts: { ...snapshot.artifacts, reads: snapshot.artifacts.reads + 1 },
    };
  });
  events.on('artifact.write', (event) => {
    snapshot = {
      ...snapshot,
      artifacts: {
        ...snapshot.artifacts,
        writes:
          event.operation === 'put'
            ? snapshot.artifacts.writes + 1
            : snapshot.artifacts.writes,
        updates:
          event.operation === 'update'
            ? snapshot.artifacts.updates + 1
            : snapshot.artifacts.updates,
        deletes:
          event.operation === 'delete'
            ? snapshot.artifacts.deletes + 1
            : snapshot.artifacts.deletes,
      },
    };
  });
  events.on('memory.read', () => {
    snapshot = {
      ...snapshot,
      memory: { ...snapshot.memory, reads: snapshot.memory.reads + 1 },
    };
  });
  events.on('memory.write', () => {
    snapshot = {
      ...snapshot,
      memory: { ...snapshot.memory, writes: snapshot.memory.writes + 1 },
    };
  });
  events.on('memory.delete', () => {
    snapshot = {
      ...snapshot,
      memory: { ...snapshot.memory, deletes: snapshot.memory.deletes + 1 },
    };
  });
  events.on('memory.blocked', () => {
    snapshot = {
      ...snapshot,
      memory: { ...snapshot.memory, blocked: snapshot.memory.blocked + 1 },
    };
  });

  return {
    snapshot: () => ({
      ...snapshot,
      tokensUsed: { ...snapshot.tokensUsed },
      cache: { ...snapshot.cache },
      artifacts: { ...snapshot.artifacts },
      memory: { ...snapshot.memory },
    }),
    reset: () => {
      snapshot = emptyMetrics();
    },
  };
}

function emptyMetrics(): AgentWorkspaceMetricsSnapshot {
  return {
    cost: 0,
    tokensUsed: { prompt: 0, completion: 0, total: 0 },
    cache: { hits: 0, misses: 0, writes: 0 },
    toolCalls: 0,
    artifacts: { reads: 0, writes: 0, updates: 0, deletes: 0 },
    memory: { reads: 0, writes: 0, deletes: 0, blocked: 0 },
  };
}
