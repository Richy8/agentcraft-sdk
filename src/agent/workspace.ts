import { mkdirSync } from 'node:fs';
import { AgentCache } from './cache.js';
import type { AgentAdapter } from './adapters/types.js';
import type { ToolPolicy } from './adapters/tool-policy.js';
import type { AgentCacheController } from './creator/types.js';
import { createAgentEventEmitter, type AgentEventEmitter } from './events.js';
import type { TraceSink } from './observability.js';
import type { RunBudget } from './types.js';
import type { ArtifactStore } from '../artifact-store/types.js';
import type { Logger } from '../types/logger.js';

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
}

/** Runtime workspace returned by AgentWorkspace factory methods. */
export interface AgentWorkspaceInstance {
  readonly cache: AgentCacheController | undefined;
  readonly store: ArtifactStore | undefined;
  readonly adapters: readonly AgentAdapter[];
  readonly mcps: readonly AgentAdapter[];
  readonly toolPolicy: ToolPolicy | undefined;
  readonly budget: RunBudget | undefined;
  readonly traceSink: TraceSink | undefined;
  readonly logger: Logger | undefined;
  readonly events: AgentEventEmitter;
}

class WorkspaceImpl implements AgentWorkspaceInstance {
  readonly cache: AgentCacheController | undefined;
  readonly store: ArtifactStore | undefined;
  readonly adapters: readonly AgentAdapter[];
  readonly mcps: readonly AgentAdapter[];
  readonly toolPolicy: ToolPolicy | undefined;
  readonly budget: RunBudget | undefined;
  readonly traceSink: TraceSink | undefined;
  readonly logger: Logger | undefined;
  readonly events: AgentEventEmitter;

  constructor(config: AgentWorkspaceConfig) {
    this.cache = config.cache;
    this.store = config.store;
    this.adapters = Object.freeze([...(config.adapters ?? [])]);
    this.mcps = Object.freeze([...(config.mcps ?? [])]);
    this.toolPolicy = config.toolPolicy;
    this.budget = config.budget;
    this.traceSink = config.traceSink;
    this.logger = config.logger;
    this.events = createAgentEventEmitter();
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
