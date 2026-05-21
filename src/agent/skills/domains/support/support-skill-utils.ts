import { defineDomainSkillSpec } from "../__shared__/domain-skill-factory.js";
import type { DomainSkillDefinition } from "../__shared__/domain-skill-factory.js";
import type { SkillSpec } from "../../registries/skill-spec.js";

export type SupportSkillDefinition = Omit<DomainSkillDefinition, "domain">;

export function defineSupportSkillSpec(
  definition: SupportSkillDefinition,
): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: "support" });
}
