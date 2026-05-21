import type { CreatorPack, CreatorPackConfig, CreatorSideEffectRisk } from '../creator/types.js';
import { validateCreatorPack } from '../creator/types.js';
import type { AgentSkill } from '../skills/types.js';

export interface PackSkillOverride {
  readonly enabled?: boolean;
}

export interface PackConfig extends CreatorPackConfig {
  readonly skillOverrides?: Readonly<Record<string, PackSkillOverride>>;
}

export interface PackSpec {
  readonly name: string;
  readonly description: string;
  readonly domain: string;
  readonly category: string;
  readonly skillIds: readonly string[];
  readonly defaultConfig?: PackConfig;
  readonly docsPath?: string;
  readonly examples?: readonly string[];
  readonly humanReviewRequired?: boolean;
  readonly sideEffectRisk?: CreatorSideEffectRisk;
}

export interface PackSpecFilter {
  readonly domain?: string;
  readonly category?: string;
}

export type PackSkillResolver = (skillId: string) => AgentSkill;

export function definePackSpec(spec: PackSpec): PackSpec {
  validatePackSpec(spec);
  return spec;
}

export class PackRegistry {
  readonly #specs = new Map<string, PackSpec>();

  constructor(specs: readonly PackSpec[] = []) {
    this.registerMany(specs);
  }

  register(spec: PackSpec): this {
    validatePackSpec(spec);
    if (this.#specs.has(spec.name)) {
      throw new Error(`Pack spec '${spec.name}' is already registered`);
    }
    this.#specs.set(spec.name, spec);
    return this;
  }

  registerMany(specs: readonly PackSpec[]): this {
    for (const spec of specs) this.register(spec);
    return this;
  }

  get(name: string): PackSpec | undefined {
    return this.#specs.get(name);
  }

  require(name: string): PackSpec {
    const spec = this.get(name);
    if (!spec) throw new Error(`Unknown pack spec '${name}'`);
    return spec;
  }

  list(filter: PackSpecFilter = {}): PackSpec[] {
    return [...this.#specs.values()]
      .filter((spec) => matchesPackFilter(spec, filter))
      .sort(comparePackSpecs);
  }
}

export const defaultPackRegistry = new PackRegistry();

export function registerPackSpecs(specs: readonly PackSpec[], registry: PackRegistry = defaultPackRegistry): PackRegistry {
  return registry.registerMany(specs);
}

export function getPackSpec(name: string, registry: PackRegistry = defaultPackRegistry): PackSpec | undefined {
  return registry.get(name);
}

export function listPackSpecs(filter: PackSpecFilter = {}, registry: PackRegistry = defaultPackRegistry): PackSpec[] {
  return registry.list(filter);
}

export function createPackFromSpec(
  spec: PackSpec,
  resolveSkill: PackSkillResolver,
  config?: PackConfig,
): CreatorPack {
  const effectiveConfig = mergePackConfig(spec.defaultConfig, config);
  const skillIds = spec.skillIds.filter((skillId) => effectiveConfig.skillOverrides?.[skillId]?.enabled !== false);
  const attachments = skillIds.map((skillId) => resolveSkill(skillId));
  const configFields = Object.keys(effectiveConfig).filter((key) => effectiveConfig[key as keyof PackConfig] !== undefined);
  const sideEffectRisk = spec.sideEffectRisk ?? highestSideEffectRisk([
    ...attachments.map((skill) => skill.skillMetadata?.sideEffectRisk ?? 'read'),
  ]);
  const requiredCapabilities = uniqueStrings(
    attachments.flatMap((skill) => [
      ...(skill.skillMetadata?.requiredAdapters ?? []),
      ...(skill.skillMetadata?.requiredCapabilities ?? []),
    ]),
  );
  const optionalCapabilities = uniqueStrings(
    attachments.flatMap((skill) => skill.skillMetadata?.optionalAdapters ?? []),
  );

  return validateCreatorPack({
    type: 'creator-pack',
    name: spec.name,
    description: spec.description,
    attachments,
    ...(Object.keys(effectiveConfig).length > 0 && { config: effectiveConfig }),
    manifest: {
      name: spec.name,
      description: spec.description,
      skills: skillIds,
      requiredCapabilities,
      optionalCapabilities,
      configFields,
      sideEffectRisk,
    },
  });
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)].sort();
}

export function comparePackSpecs(left: PackSpec, right: PackSpec): number {
  const domainDelta = left.domain.localeCompare(right.domain);
  if (domainDelta !== 0) return domainDelta;
  const categoryDelta = left.category.localeCompare(right.category);
  if (categoryDelta !== 0) return categoryDelta;
  return left.name.localeCompare(right.name);
}

function validatePackSpec(spec: PackSpec): void {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(spec.name)) {
    throw new Error(`Pack spec '${spec.name}' must use lowercase kebab-case`);
  }
  if (spec.description.trim().length === 0) {
    throw new Error(`Pack spec '${spec.name}' is missing a description`);
  }
  if (spec.domain.trim().length === 0 || spec.category.trim().length === 0) {
    throw new Error(`Pack spec '${spec.name}' must include domain and category`);
  }
  if (spec.skillIds.length === 0 || spec.skillIds.some((skillId) => skillId.trim().length === 0)) {
    throw new Error(`Pack spec '${spec.name}' must include at least one skill id`);
  }
}

function mergePackConfig(base: PackConfig | undefined, override: PackConfig | undefined): PackConfig {
  const skillOverrides = {
    ...(base?.skillOverrides ?? {}),
    ...(override?.skillOverrides ?? {}),
  };
  return {
    ...(base ?? {}),
    ...(override ?? {}),
    ...(Object.keys(skillOverrides).length > 0 && { skillOverrides }),
  };
}

function matchesPackFilter(spec: PackSpec, filter: PackSpecFilter): boolean {
  if (filter.domain !== undefined && spec.domain !== filter.domain) return false;
  if (filter.category !== undefined && spec.category !== filter.category) return false;
  return true;
}

function highestSideEffectRisk(risks: readonly CreatorSideEffectRisk[]): CreatorSideEffectRisk {
  if (risks.includes('write')) return 'write';
  if (risks.includes('external')) return 'external';
  if (risks.includes('read')) return 'read';
  return 'none';
}
