import { AdapterRequirementError, AdapterToolConflictError } from "../../errors/index.js";
import type { ModelCapabilities } from "../../types/provider.types.js";
import { isCreatorPack, type CreatorPack } from "../creator/types.js";
import type { AdapterRef, AgentSkill } from "../skills/types.js";
import type { AgentRunParams } from "../types.js";
import type { AgentAdapter } from "./types.js";
import {
  adapterRefName,
  isAgentSkill,
  isAttachedTo,
} from "../skills/activation-engine.js";

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
  for (const attachment of requested) {
    const adapters = isCreatorPack(attachment)
      ? attachment.attachments
      : [attachment];
    for (const adapter of adapters) {
      if (seenNames.has(adapter.name)) continue;
      seenNames.add(adapter.name);
      runOnlyAdapters.push(adapter);
    }
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
    if (isAgentSkill(adapter)) {
      assertSkillDependencies(adapter, options.scopedAdapters);
    }
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

export function assertSkillDependencies(
  skill: AgentSkill,
  adapters: readonly AgentAdapter[],
): void {
  for (const dep of skill.dependsOn ?? []) {
    if (Array.isArray(dep)) {
      if (!dep.some((ref) => isAttachedTo(adapters, ref))) {
        const names = dep.map(adapterRefName).join(" or ");
        throw new AdapterRequirementError(
          `Skill '${skill.name}' requires at least one of: [${names}]`,
        );
      }
    } else if (!isAttachedTo(adapters, dep)) {
      throw new AdapterRequirementError(
        `Skill '${skill.name}' requires '${adapterRefName(dep)}' - attach it first`,
      );
    }
  }
}

export function isAttached(adapters: readonly AgentAdapter[], ref: AdapterRef): boolean {
  const expected = adapterRefName(ref);
  return adapters.some((adapter) => adapter.name === expected);
}

function normalizeRunAttachments(
  attachments: AgentRunParams["use"],
): readonly (AgentAdapter | CreatorPack)[] {
  if (!attachments) return [];
  return Array.isArray(attachments)
    ? ([...attachments] as Array<AgentAdapter | CreatorPack>)
    : [attachments as AgentAdapter | CreatorPack];
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
