import { describe, expect, it } from "vitest";
import { scoreSkillSpecQuality } from "../certification/scoring.js";
import {
  SALES_ACCOUNT_RESEARCH_SKILL_SPECS,
  SALES_CRM_SKILL_SPECS,
  SALES_DOMAIN_SKILL_SPECS,
  SALES_OBJECTION_HANDLING_SKILL_SPECS,
  SALES_PROPOSAL_SKILL_SPECS,
  SALES_PROSPECTING_SKILL_SPECS,
} from "../domains/sales/index.js";
import {
  createSkillByName,
  listSkillSpecs,
} from "../registries/skill-registry.js";

const expectedSalesSkillNames = [
  "prospect-research",
  "account-fit-analysis",
  "lead-prioritization",
  "outreach-personalization",
  "prospecting-risk-review",
  "proposal-discovery-synthesis",
  "proposal-writer",
  "proposal-pricing-rationale",
  "proposal-objection-review",
  "proposal-red-team-review",
  "crm-note-summarizer",
  "crm-next-step-planner",
  "pipeline-risk-analysis",
  "deal-review",
  "forecast-narrative-writer",
  "objection-research",
  "objection-response-writer",
  "competitive-objection-review",
  "sales-call-coach",
  "account-news-research",
  "stakeholder-map",
  "buying-committee-analysis",
  "account-plan-writer",
] as const;

describe("sales domain skills", () => {
  it("exports every planned concrete sales skill spec", () => {
    expect(SALES_DOMAIN_SKILL_SPECS.map((spec) => spec.name).sort()).toEqual(
      [...expectedSalesSkillNames].sort(),
    );

    expect(SALES_PROSPECTING_SKILL_SPECS).toHaveLength(5);
    expect(SALES_PROPOSAL_SKILL_SPECS).toHaveLength(5);
    expect(SALES_CRM_SKILL_SPECS).toHaveLength(5);
    expect(SALES_OBJECTION_HANDLING_SKILL_SPECS).toHaveLength(4);
    expect(SALES_ACCOUNT_RESEARCH_SKILL_SPECS).toHaveLength(4);
  });

  it("registers sales specs with senior-grade domain intelligence", () => {
    const registered = listSkillSpecs({ domain: "sales" }).filter((spec) =>
      expectedSalesSkillNames.includes(
        spec.name as (typeof expectedSalesSkillNames)[number],
      ),
    );

    expect(registered).toHaveLength(expectedSalesSkillNames.length);

    for (const spec of SALES_DOMAIN_SKILL_SPECS) {
      expect(spec.domain).toBe("sales");
      expect(
        spec.domainIntelligence?.vocabulary?.length,
      ).toBeGreaterThanOrEqual(10);
      expect(
        spec.domainIntelligence?.metricsAndSignals?.length,
      ).toBeGreaterThanOrEqual(6);
      expect(
        spec.domainIntelligence?.minimumInput?.length,
      ).toBeGreaterThanOrEqual(4);
      expect(spec.domainIntelligence?.riskBoundaries?.join(" ")).toMatch(
        /Do not invent|untrusted/i,
      );
      expect(spec.domainIntelligence?.antiStuffingNotes?.join(" ")).toMatch(
        /stuffing|jargon/i,
      );
      expect(spec.prompt?.toolUsePolicy.join(" ")).toMatch(
        /approval|untrusted/i,
      );
      expect(spec.prompt?.safetyNotes.join(" ")).toContain(
        "Failure mode to avoid",
      );
      expect(spec.prompt?.role).toMatch(
        /mechanism you watch for|failure mechanism|dangerous failure/i,
      );
      expect(spec.prompt?.constraints.join(" ")).toMatch(/must state how .* changes/i);
    }
  });

  it("keeps sales skills above the 9.5 production quality threshold", () => {
    for (const spec of SALES_DOMAIN_SKILL_SPECS) {
      const score = scoreSkillSpecQuality(spec);

      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(", ")}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });

  it("keeps sales examples senior-grade and Claude-reference deep", () => {
    for (const spec of SALES_DOMAIN_SKILL_SPECS) {
      const example = spec.examples?.[0];
      expect(example?.input).toMatch(
        /\d|M|K|%|days?|employees?|Stage|Deal|Buyer|Account|Lead|Opportunity/i,
      );
      expect(
        example?.output.split(/\s+/).length,
        `${spec.name} example is too flat`,
      ).toBeGreaterThan(135);

      const wordCount =
        `${example?.input} ${example?.output} ${example?.note ?? ""}`
          .split(/\s+/)
          .filter(Boolean).length;

      expect(
        wordCount,
        `${spec.name} example is too short for senior reasoning`,
      ).toBeGreaterThan(185);
      expect(
        wordCount,
        `${spec.name} example is too long for a reusable prompt example`,
      ).toBeLessThanOrEqual(650);
      expect(example?.output).toMatch(
        /Verdict|Summary|Methodology|Review|Map|Plan|Diagnosis|Position|Strategy/i,
      );
      expect(example?.output).toMatch(
        /Evidence|source|confirmed|score|count|threshold|days|%|\$|owner|date|confidence/i,
      );
      expect(example?.output).toMatch(
        /Risk|gap|blocker|unsupported|stale|missing|disqualif|approval/i,
      );
      expect(example?.output).toMatch(
        /Next|Action|Plan|Question|Gate|Owner|Recommendation|Remediation/i,
      );
      expect(example?.output).toContain("Problem-Solving Trace");
      expect(example?.output).toContain("Skill-Specific Judgment");
      expect(example?.note).toMatch(/mechanism is/i);
      expect(example?.note).toMatch(/generalist/i);
      expect(example?.note).toMatch(/practitioner/i);
    }
  });

  it("creates direct sales skills through the registry without requiring packs", () => {
    for (const skillName of [
      "prospect-research",
      "proposal-writer",
      "crm-next-step-planner",
    ]) {
      const skill = createSkillByName(skillName);
      const prompt =
        typeof skill.systemPromptExtension === "function"
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;

      expect(skill.name).toBe(skillName);
      expect(skill.skillMetadata?.promptVersion).toBe("2026-05-18");
      expect(prompt).toContain("Tool Use Policy");
      expect(prompt).toContain("Output Format");
      expect(prompt).toMatch(/Do not invent|Failure mode to avoid/);
    }
  });
});
