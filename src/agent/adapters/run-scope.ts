import { AdapterRequirementError, AdapterToolConflictError } from "../../errors/index.js";
import type { ModelCapabilities } from "../../types/provider.types.js";
import type { AgentRunParams } from "../types.js";
import type { AgentAdapter } from "./types.js";

export interface RunAdapterScope {
  adapters: readonly AgentAdapter[];
  runOnlyAdapters: readonly AgentAdapter[];
}

export function createRunAdapterScope(options: {
  readonly currentAdapters: readonly AgentAdapter[];
  readonly params: AgentRunParams;
  readonly capabilities: ModelCapabilities;
  readonly model: string;
}): RunAdapterScope {
  const requested = normalizeRunAttachments(options.params.use);
  if (requested.length === 0) {
    return { adapters: options.currentAdapters, runOnlyAdapters: [] };
  }

  const runOnlyAdapters: AgentAdapter[] = [];
  const seenNames = new Set(options.currentAdapters.map((adapter) => adapter.name));
  for (const adapter of requested) {
    if (seenNames.has(adapter.name)) continue;
    seenNames.add(adapter.name);
    runOnlyAdapters.push(adapter);
  }

  const scopedAdapters = [...options.currentAdapters, ...runOnlyAdapters];
  validateScopedAdapters({
    scopedAdapters,
    scopedOnly: runOnlyAdapters,
    capabilities: options.capabilities,
    model: options.model,
  });
  return { adapters: scopedAdapters, runOnlyAdapters };
}

export function validateScopedAdapters(options: {
  readonly scopedAdapters: readonly AgentAdapter[];
  readonly scopedOnly: readonly AgentAdapter[];
  readonly capabilities: ModelCapabilities;
  readonly model: string;
}): void {
  for (const adapter of options.scopedOnly) {
    assertAdapterRequirements(adapter, options.capabilities, options.model);
  }
  assertNoDeclaredToolConflicts(options.scopedAdapters);
}

export function assertAdapterRequirements(
  adapter: AgentAdapter,
  capabilities: ModelCapabilities,
  model: string,
): void {
  for (const req of adapter.requires ?? []) {
    const supported = {
      tools: capabilities.supportsTools,
      vision: capabilities.supportsVision,
      audio: capabilities.supportsAudio,
      video: capabilities.supportsVideo,
      files: capabilities.supportsFiles,
    }[req];
    if (!supported) {
      throw new AdapterRequirementError(
        `Adapter '${adapter.name}' requires '${req}' but '${model}' does not support it.`,
      );
    }
  }
}

export function isAttached(adapters: readonly AgentAdapter[], name: string): boolean {
  return adapters.some((adapter) => adapter.name === name);
}

function normalizeRunAttachments(
  attachments: AgentRunParams["use"],
): readonly AgentAdapter[] {
  if (!attachments) return [];
  return Array.isArray(attachments)
    ? ([...attachments] as AgentAdapter[])
    : [attachments as AgentAdapter];
}

function assertNoDeclaredToolConflicts(
  adapters: readonly AgentAdapter[],
): void {
  const ownerByTool = new Map<string, string>();
  for (const adapter of adapters) {
    for (const toolName of adapter.declaredToolNames ?? []) {
      const owner = ownerByTool.get(toolName);
      if (owner) {
        throw new AdapterToolConflictError(
          `Tool name conflict: '${adapter.name}' registers tool '${toolName}' which is already registered by '${owner}'`,
        );
      }
      ownerByTool.set(toolName, adapter.name);
    }
  }
}
