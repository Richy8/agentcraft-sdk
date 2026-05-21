import type { AgentAdapter } from "../adapters/types.js";
import {
  flattenCapabilityExpressions,
  isAgentSkill,
} from "../skills/activation-engine.js";
import type { AgentSkill } from "../skills/types.js";

export function selectToolAdaptersForActiveSkills(options: {
  readonly adapters: readonly AgentAdapter[];
  readonly activeSkills: readonly AgentSkill[];
}): AgentAdapter[] {
  if (options.activeSkills.length === 0) return [];
  const capabilityTerms = new Set(
    options.activeSkills.flatMap((skill) => [
      ...(skill.skillMetadata?.requiredAdapters ?? []),
      ...(skill.skillMetadata?.optionalAdapters ?? []),
      ...flattenCapabilityExpressions(
        skill.skillMetadata?.creator?.requiredCapabilities ?? [],
      ),
      ...flattenCapabilityExpressions(
        skill.skillMetadata?.creator?.optionalCapabilities ?? [],
      ),
    ]),
  );

  return options.adapters.filter((adapter) => {
    if (!adapter.getTools) return false;
    if (isAgentSkill(adapter)) {
      return options.activeSkills.some((skill) => skill.name === adapter.name);
    }
    if (capabilityTerms.size === 0) return true;
    const searchable = [
      adapter.name,
      ...(adapter.metadata?.scopes ?? []),
      ...(adapter.metadata?.sideEffects ?? []),
    ].join(" ");
    return Array.from(capabilityTerms).some((term) =>
      searchable.includes(term.split(".")[0]!),
    );
  });
}
