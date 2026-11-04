import type { AgentAdapter } from "./types.js";

export interface PendingAdapterInit {
  readonly adapter: AgentAdapter;
  readonly init: () => Promise<void>;
}

export async function initializeAttachedAdapters(
  pendingInits: PendingAdapterInit[],
  pendingConflictChecks: Array<() => Promise<void>>,
): Promise<void> {
  for (const pending of pendingInits) await pending.init();
  for (const check of pendingConflictChecks) await check();
  pendingInits.length = 0;
  pendingConflictChecks.length = 0;
}

export async function initializeRunOnlyAdapters(
  adapters: readonly AgentAdapter[],
): Promise<void> {
  for (const adapter of adapters) {
    if (adapter.init) await adapter.init();
  }
}

export async function cleanupRunOnlyAdapters(
  adapters: readonly AgentAdapter[],
): Promise<void> {
  for (const adapter of [...adapters].reverse()) {
    if (adapter.cleanup) await adapter.cleanup();
  }
}

export async function cleanupAttachedAdapters(options: {
  readonly adapters: readonly AgentAdapter[];
  readonly externallyManagedAdapters: ReadonlySet<AgentAdapter>;
}): Promise<void> {
  for (const adapter of [...options.adapters].reverse()) {
    if (!options.externallyManagedAdapters.has(adapter) && adapter.cleanup) {
      await adapter.cleanup();
    }
  }
}
