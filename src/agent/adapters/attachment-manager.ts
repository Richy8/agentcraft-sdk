import {
  AdapterRequirementError,
  AdapterToolConflictError,
} from "../../errors/index.js";
import type { ModelCapabilities } from "../../types/provider.types.js";
import { assertAdapterRequirements } from "./run-scope.js";
import type { PendingAdapterInit } from "./lifecycle-manager.js";
import type { AgentAdapter } from "./types.js";

export interface AdapterAttachmentState {
  readonly adapters: AgentAdapter[];
  readonly pendingInits: PendingAdapterInit[];
  readonly pendingConflictChecks: Array<() => Promise<void>>;
  readonly resolvedDynamicToolNames: Set<string>;
  readonly capabilities: ModelCapabilities;
  readonly model: string;
}

export function attachAgentAdapter(
  attachment: AgentAdapter,
  state: AdapterAttachmentState,
): boolean {
  if (state.adapters.some((item) => item.name === attachment.name)) {
    return false;
  }

  assertAdapterRequirements(attachment, state.capabilities, state.model);
  assertNoStaticToolConflict(attachment, state.adapters);
  registerDynamicToolConflictCheck(attachment, state);

  state.adapters.push(attachment);
  if (attachment.init) {
    state.pendingInits.push({ adapter: attachment, init: () => attachment.init!() });
  }
  return true;
}

function assertNoStaticToolConflict(
  adapter: AgentAdapter,
  existingAdapters: readonly AgentAdapter[],
): void {
  const existingStaticNames = new Set(
    existingAdapters.flatMap((item) => item.declaredToolNames ?? []),
  );
  for (const name of adapter.declaredToolNames ?? []) {
    if (existingStaticNames.has(name)) {
      throw new AdapterToolConflictError(
        `Tool name conflict: '${adapter.name}' registers tool '${name}' which is already registered`,
      );
    }
  }
}

function registerDynamicToolConflictCheck(
  adapter: AgentAdapter,
  state: AdapterAttachmentState,
): void {
  if (adapter.declaredToolNames || !adapter.getTools) return;

  state.pendingConflictChecks.push(async () => {
    const tools = await adapter.getTools!();
    const allKnown = new Set([
      ...state.adapters.flatMap((item) => item.declaredToolNames ?? []),
      ...state.resolvedDynamicToolNames,
    ]);
    for (const tool of tools) {
      if (allKnown.has(tool.name)) {
        throw new AdapterToolConflictError(
          `Tool name conflict (post-init): '${adapter.name}' exposes '${tool.name}' which conflicts`,
        );
      }
    }
    tools.forEach((tool) => state.resolvedDynamicToolNames.add(tool.name));
  });
}
