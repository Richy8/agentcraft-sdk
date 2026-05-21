import type { AgentSkill } from '../types.js';
import { createSkillFromSpec } from './skill-factory.js';
import type { SkillSpec, SkillSpecFilter } from './skill-spec.js';
import { validateSkillSpec } from './skill-validation.js';

export interface SkillCapabilityHints {
  readonly minimumInput: readonly string[];
  readonly toolsAndDataSources: readonly string[];
  readonly freshnessRules: readonly string[];
  readonly humanReviewTriggers: readonly string[];
  readonly riskBoundaries: readonly string[];
}

export interface SkillInspection {
  readonly name: string;
  readonly description: string;
  readonly displayName?: string;
  readonly directive?: string;
  readonly version?: string;
  readonly domain?: string;
  readonly category?: string;
  readonly stage?: string;
  readonly priority?: number;
  readonly requiredCapabilities?: SkillSpec['requiredCapabilities'];
  readonly requiredAdapters: readonly string[];
  readonly optionalAdapters: readonly string[];
  readonly dependsOn: NonNullable<SkillSpec['dependsOn']>;
  readonly stateful: boolean;
  readonly sideEffectRisk: NonNullable<SkillSpec['sideEffectRisk']>;
  readonly sideEffectIntents: readonly NonNullable<SkillSpec['sideEffectIntents']>[number][];
  readonly promptVersion?: string;
  readonly consumesArtifacts: readonly string[];
  readonly producesArtifacts: readonly string[];
  readonly capabilityHints?: SkillCapabilityHints;
  readonly toolNames: readonly string[];
  readonly hasPrompt: boolean;
  readonly hasSystemPromptExtension: boolean;
  readonly hasExamples: boolean;
  readonly hasLifecycleHooks: boolean;
}

export class SkillRegistry {
  readonly #specs = new Map<string, SkillSpec>();

  constructor(specs: readonly SkillSpec[] = []) {
    this.registerMany(specs);
  }

  register(spec: SkillSpec): this {
    validateSkillSpec(spec);
    if (this.#specs.has(spec.name)) {
      throw new Error(`Skill spec '${spec.name}' is already registered`);
    }
    this.#specs.set(spec.name, spec);
    return this;
  }

  registerMany(specs: readonly SkillSpec[]): this {
    for (const spec of specs) this.register(spec);
    return this;
  }

  get(name: string): SkillSpec | undefined {
    return this.#specs.get(name);
  }

  require(name: string): SkillSpec {
    const spec = this.get(name);
    if (!spec) throw new Error(`Unknown skill spec '${name}'`);
    return spec;
  }

  create(name: string): AgentSkill {
    return createSkillFromSpec(this.require(name));
  }

  list(filter: SkillSpecFilter = {}): SkillSpec[] {
    return [...this.#specs.values()]
      .filter((spec) => matchesFilter(spec, filter))
      .sort(compareSkillSpecs);
  }

  inspect(name: string): SkillInspection | undefined {
    const spec = this.get(name);
    return spec ? inspectSkillSpec(spec) : undefined;
  }

  requireInspection(name: string): SkillInspection {
    const inspection = this.inspect(name);
    if (!inspection) throw new Error(`Unknown skill spec '${name}'`);
    return inspection;
  }

  listInspections(filter: SkillSpecFilter = {}): SkillInspection[] {
    return this.list(filter).map(inspectSkillSpec);
  }
}

export const defaultSkillRegistry = new SkillRegistry();

export function registerSkillSpecs(specs: readonly SkillSpec[], registry: SkillRegistry = defaultSkillRegistry): SkillRegistry {
  return registry.registerMany(specs);
}

export function getSkillSpec(name: string, registry: SkillRegistry = defaultSkillRegistry): SkillSpec | undefined {
  return registry.get(name);
}

export function inspectSkillSpec(spec: SkillSpec): SkillInspection {
  const requiredCapabilities = spec.requiredCapabilities ?? spec.requires;
  return {
    name: spec.name,
    description: spec.description,
    ...(spec.displayName !== undefined && { displayName: spec.displayName }),
    ...(spec.directive !== undefined && { directive: spec.directive }),
    ...(spec.version !== undefined && { version: spec.version }),
    ...(spec.domain !== undefined && { domain: spec.domain }),
    ...(spec.category !== undefined && { category: spec.category }),
    ...(spec.stage !== undefined && { stage: spec.stage }),
    ...(spec.priority !== undefined && { priority: spec.priority }),
    ...(requiredCapabilities !== undefined && { requiredCapabilities }),
    requiredAdapters: spec.requiredAdapters ?? [],
    optionalAdapters: spec.optionalAdapters ?? [],
    dependsOn: spec.dependsOn ?? [],
    stateful: spec.stateful ?? false,
    sideEffectRisk: spec.sideEffectRisk ?? 'none',
    sideEffectIntents: spec.sideEffectIntents ?? [],
    ...(spec.promptVersion !== undefined && { promptVersion: spec.promptVersion }),
    consumesArtifacts: spec.consumesArtifacts ?? [],
    producesArtifacts: spec.producesArtifacts ?? [],
    ...(spec.domainIntelligence !== undefined && {
      capabilityHints: sanitizeDomainIntelligence(spec.domainIntelligence),
    }),
    toolNames: (spec.tools ?? []).map((tool) => tool.name),
    hasPrompt: spec.prompt !== undefined,
    hasSystemPromptExtension: spec.systemPromptExtension !== undefined,
    hasExamples: (spec.examples?.length ?? 0) > 0,
    hasLifecycleHooks:
      spec.init !== undefined ||
      spec.cleanup !== undefined ||
      spec.onBeforeRun !== undefined ||
      spec.onAfterRun !== undefined ||
      spec.onAfterStream !== undefined,
  };
}

function sanitizeDomainIntelligence(
  domainIntelligence: NonNullable<SkillSpec['domainIntelligence']>,
): SkillCapabilityHints {
  return {
    minimumInput: domainIntelligence.minimumInput ?? [],
    toolsAndDataSources: domainIntelligence.toolsAndDataSources ?? [],
    freshnessRules: domainIntelligence.freshnessRules ?? [],
    humanReviewTriggers: domainIntelligence.humanReviewTriggers ?? [],
    riskBoundaries: domainIntelligence.riskBoundaries ?? [],
  };
}

export function inspectSkillByName(
  name: string,
  registry: SkillRegistry = defaultSkillRegistry,
): SkillInspection | undefined {
  return registry.inspect(name);
}

export function requireSkillInspection(
  name: string,
  registry: SkillRegistry = defaultSkillRegistry,
): SkillInspection {
  return registry.requireInspection(name);
}

export function createSkillByName(name: string, registry: SkillRegistry = defaultSkillRegistry): AgentSkill {
  return registry.create(name);
}

export function listSkillSpecs(filter: SkillSpecFilter = {}, registry: SkillRegistry = defaultSkillRegistry): SkillSpec[] {
  return registry.list(filter);
}

export function listSkillInspections(
  filter: SkillSpecFilter = {},
  registry: SkillRegistry = defaultSkillRegistry,
): SkillInspection[] {
  return registry.listInspections(filter);
}

export function compareSkillSpecs(left: SkillSpec, right: SkillSpec): number {
  const domainDelta = (left.domain ?? '').localeCompare(right.domain ?? '');
  if (domainDelta !== 0) return domainDelta;
  const categoryDelta = (left.category ?? '').localeCompare(right.category ?? '');
  if (categoryDelta !== 0) return categoryDelta;
  const stageDelta = (left.stage ?? '').localeCompare(right.stage ?? '');
  if (stageDelta !== 0) return stageDelta;
  const priorityDelta = (left.priority ?? 1000) - (right.priority ?? 1000);
  if (priorityDelta !== 0) return priorityDelta;
  return left.name.localeCompare(right.name);
}

function matchesFilter(spec: SkillSpec, filter: SkillSpecFilter): boolean {
  if (filter.domain !== undefined && spec.domain !== filter.domain) return false;
  if (filter.category !== undefined && spec.category !== filter.category) return false;
  if (filter.stage !== undefined && spec.stage !== filter.stage) return false;
  return true;
}
