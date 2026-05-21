import { describe, expect, it } from "vitest";
import { scoreSkillSpecQuality } from "../certification/scoring.js";
import {
  PRODUCT_DOMAIN_SKILL_SPECS,
  PRODUCT_LAUNCH_SKILL_SPECS,
  PRODUCT_PRD_SKILL_SPECS,
  PRODUCT_PRODUCT_RESEARCH_SKILL_SPECS,
  PRODUCT_ROADMAP_SKILL_SPECS,
  PRODUCT_UX_RESEARCH_SKILL_SPECS,
} from "../domains/product/index.js";
import {
  SUPPORT_CUSTOMER_SUCCESS_SKILL_SPECS,
  SUPPORT_CUSTOMER_SUPPORT_SKILL_SPECS,
  SUPPORT_DOMAIN_SKILL_SPECS,
  SUPPORT_KNOWLEDGE_BASE_SKILL_SPECS,
} from "../domains/support/index.js";
import {
  createSkillByName,
  listSkillSpecs,
} from "../registries/skill-registry.js";

const expectedProductSkillNames = [
  "user-problem-research",
  "jtbd-synthesis",
  "competitor-feature-analysis",
  "user-feedback-clustering",
  "opportunity-solution-tree",
  "prd-discovery",
  "prd-writer",
  "user-story-writer",
  "acceptance-criteria-review",
  "prd-risk-review",
  "roadmap-prioritization",
  "rice-score-review",
  "dependency-map",
  "roadmap-narrative-writer",
  "launch-plan",
  "launch-readiness-review",
  "release-note-writer",
  "go-to-market-brief",
  "rollout-risk-review",
  "interview-guide-writer",
  "research-note-synthesis",
  "usability-finding-review",
  "persona-profile-builder",
] as const;

const expectedSupportSkillNames = [
  "ticket-triage",
  "support-response-writer",
  "refund-policy-review",
  "escalation-summary",
  "sentiment-risk-review",
  "kb-gap-analysis",
  "kb-article-writer",
  "kb-freshness-review",
  "support-macro-writer",
  "account-health-summary",
  "renewal-risk-analysis",
  "qbr-writer",
  "customer-outcome-plan",
  "churn-risk-review",
] as const;

describe("product and support domain skills", () => {
  it("exports every planned concrete product and support skill spec", () => {
    expect(PRODUCT_DOMAIN_SKILL_SPECS.map((spec) => spec.name).sort()).toEqual(
      [...expectedProductSkillNames].sort(),
    );
    expect(SUPPORT_DOMAIN_SKILL_SPECS.map((spec) => spec.name).sort()).toEqual(
      [...expectedSupportSkillNames].sort(),
    );

    expect(PRODUCT_PRODUCT_RESEARCH_SKILL_SPECS).toHaveLength(5);
    expect(PRODUCT_PRD_SKILL_SPECS).toHaveLength(5);
    expect(PRODUCT_ROADMAP_SKILL_SPECS).toHaveLength(4);
    expect(PRODUCT_LAUNCH_SKILL_SPECS).toHaveLength(5);
    expect(PRODUCT_UX_RESEARCH_SKILL_SPECS).toHaveLength(4);
    expect(SUPPORT_CUSTOMER_SUPPORT_SKILL_SPECS).toHaveLength(5);
    expect(SUPPORT_KNOWLEDGE_BASE_SKILL_SPECS).toHaveLength(4);
    expect(SUPPORT_CUSTOMER_SUCCESS_SKILL_SPECS).toHaveLength(5);
  });

  it("registers product and support specs with professional domain intelligence", () => {
    for (const [domain, specs, names] of [
      ["product", PRODUCT_DOMAIN_SKILL_SPECS, expectedProductSkillNames],
      ["support", SUPPORT_DOMAIN_SKILL_SPECS, expectedSupportSkillNames],
    ] as const) {
      const registered = listSkillSpecs({ domain }).filter((spec) =>
        names.includes(spec.name as (typeof names)[number]),
      );

      expect(registered).toHaveLength(names.length);
      for (const spec of specs) {
        expect(spec.domain).toBe(domain);
        expect(
          spec.domainIntelligence?.vocabulary?.length,
        ).toBeGreaterThanOrEqual(8);
        expect(
          spec.domainIntelligence?.metricsAndSignals?.length,
        ).toBeGreaterThanOrEqual(5);
        expect(
          [
            ...(spec.domainIntelligence?.antiStuffingNotes ?? []),
            ...(spec.prompt?.qualityChecklist ?? []),
          ].join(" "),
        ).toMatch(/stuff|jargon|vocabulary/i);
        expect(spec.prompt?.toolUsePolicy.join(" ")).toMatch(
          /approval|untrusted/i,
        );
        expect(spec.prompt?.safetyNotes.join(" ")).toContain(
          "Failure mode to avoid",
        );
      }
    }
  });

  it("keeps product and support skills above the 9.5 production quality threshold", () => {
    for (const spec of [
      ...PRODUCT_DOMAIN_SKILL_SPECS,
      ...SUPPORT_DOMAIN_SKILL_SPECS,
    ]) {
      const score = scoreSkillSpecQuality(spec);

      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(", ")}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });

  it("keeps examples senior-grade and decision-calibrated", () => {
    for (const spec of [
      ...PRODUCT_DOMAIN_SKILL_SPECS,
      ...SUPPORT_DOMAIN_SKILL_SPECS,
    ]) {
      const example = spec.examples?.[0];
      expect(example?.input).toMatch(
        /\d|%|days?|users?|customers?|tickets?|account|policy|analytics|metric|SLA|ARR/i,
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
        /Verdict|Summary|Logic|Register|Action|Operating Check/i,
      );
      expect(example?.output).toMatch(
        /Evidence|source|verified|metric|users?|customers?|workflow|status|owner/i,
      );
      expect(example?.output).toMatch(
        /Risk|gap|missing|unsupported|stale|approval|trust|delivery|blocker/i,
      );
      expect(example?.output).toMatch(
        /Next|Action|owner|gate|review|validate|resolve|commitment/i,
      );
      expect(example?.output).toContain("Skill-Specific Judgment");
      expect(example?.note).toMatch(
        /non-obvious professional move|evidence discipline|decision gate|owner clarity|audited/i,
      );
    }
  });

  it("creates direct product and support skills through the registry without requiring packs", () => {
    for (const skillName of ["prd-writer", "support-response-writer"]) {
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
