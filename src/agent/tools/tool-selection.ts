import type { AgentAdapter } from "../adapters/types.js";

/**
 * In tool-selection mode "auto", select only adapters that have tools.
 * Without a trait system, all tool-bearing adapters are included.
 */
export function selectToolAdaptersForActiveTraits(options: {
  readonly adapters: readonly AgentAdapter[];
  readonly activeTraits: readonly never[];
}): AgentAdapter[] {
  return options.adapters.filter((adapter) => adapter.getTools);
}
