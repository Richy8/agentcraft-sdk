import { defineDomainSkillSpec } from "../__shared__/domain-skill-factory.js";
import type { DomainSkillDefinition } from "../__shared__/domain-skill-factory.js";
import type { SkillSpec } from "../../registries/skill-spec.js";

export type ProductSkillDefinition = Omit<DomainSkillDefinition, "domain">;

export function defineProductSkillSpec(
  definition: ProductSkillDefinition,
): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: "product" });
}
