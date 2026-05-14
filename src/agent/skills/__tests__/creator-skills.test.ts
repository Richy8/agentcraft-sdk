import { describe, expect, it } from "vitest";
import { preprocessDirectives } from "../../utils/directives.js";
import {
  AudienceResearchSkill,
  BlogWriterSkill,
  BookWriterSkill,
  BrandVoiceSkill,
  CREATOR_SKILL_MANIFESTS,
  CREATOR_WAVE_1_SKILL_NAMES,
  ClaimRiskReviewSkill,
  CompetitorAnalysisSkill,
  ContentBriefSkill,
  ContentCalendarSkill,
  ContentPositioningSkill,
  CopyReviewSkill,
  CopywriterSkill,
  CreativeDirectionSkill,
  EditorialReviewSkill,
  ExperimentPlannerSkill,
  FactCheckSkill,
  NewsletterWriterSkill,
  PerformanceAnalysisSkill,
  PublishQaSkill,
  RepurposingSkill,
  ResearchSynthesisSkill,
  SeoAuditSkill,
  SeoReviewSkill,
  SeoStrategySkill,
  SerpBriefSkill,
  SocialWriterSkill,
  TrendDiscoverySkill,
  VideoIdeationSkill,
  VideoScriptwriterSkill,
  assertCreatorSkillCapabilities,
  compareCreatorSkillsForComposition,
} from "../index.js";

const waveOneSkills = [
  AudienceResearchSkill.create(),
  ContentPositioningSkill.create(),
  ContentBriefSkill.create(),
  ResearchSynthesisSkill.create(),
  FactCheckSkill.create(),
  SeoStrategySkill.create(),
  SerpBriefSkill.create(),
  BlogWriterSkill.create(),
  CopywriterSkill.create(),
  VideoScriptwriterSkill.create(),
  RepurposingSkill.create(),
  EditorialReviewSkill.create(),
];

const allCreatorSkills = [
  AudienceResearchSkill.create(),
  ContentPositioningSkill.create(),
  ContentBriefSkill.create(),
  ResearchSynthesisSkill.create(),
  FactCheckSkill.create(),
  SeoStrategySkill.create(),
  SerpBriefSkill.create(),
  BlogWriterSkill.create(),
  CopywriterSkill.create(),
  VideoScriptwriterSkill.create(),
  RepurposingSkill.create(),
  EditorialReviewSkill.create(),
  CompetitorAnalysisSkill.create(),
  TrendDiscoverySkill.create(),
  SeoAuditSkill.create(),
  SeoReviewSkill.create(),
  BookWriterSkill.create(),
  NewsletterWriterSkill.create(),
  SocialWriterSkill.create(),
  VideoIdeationSkill.create(),
  CreativeDirectionSkill.create(),
  CopyReviewSkill.create(),
  ClaimRiskReviewSkill.create(),
  BrandVoiceSkill.create(),
  PublishQaSkill.create(),
  ContentCalendarSkill.create(),
  PerformanceAnalysisSkill.create(),
  ExperimentPlannerSkill.create(),
];

describe("creator skills", () => {
  it("declares a complete 28-skill creator metadata catalog", () => {
    expect(CREATOR_SKILL_MANIFESTS).toHaveLength(28);
    expect(new Set(CREATOR_SKILL_MANIFESTS.map((item) => item.name)).size).toBe(
      28,
    );
    expect(
      new Set(CREATOR_SKILL_MANIFESTS.map((item) => item.directive)).size,
    ).toBe(28);

    for (const manifest of CREATOR_SKILL_MANIFESTS) {
      expect(manifest.name).toBeTruthy();
      expect(manifest.directive).toBeTruthy();
      expect(manifest.docsPath).toContain("docs/skills/");
      expect(manifest.requiredCapabilities).toBeDefined();
      expect(manifest.optionalCapabilities).toBeDefined();
      expect(manifest.consumesArtifacts).toBeDefined();
      expect(manifest.producesArtifacts.length).toBeGreaterThan(0);
      expect(manifest.sideEffectRisk).toBeTruthy();
      expect(manifest.outputOwner).toBeTruthy();
      expect(manifest.readiness).toBeTruthy();
    }
  });

  it("marks the complete creator catalog production-ready by final certification phase", () => {
    expect(
      CREATOR_SKILL_MANIFESTS.every(
        (manifest) => manifest.readiness === "production-ready",
      ),
    ).toBe(true);
  });

  it("builds complete production prompt contracts for Wave 1 skills", () => {
    expect(CREATOR_WAVE_1_SKILL_NAMES).toEqual(
      expect.arrayContaining(waveOneSkills.map((skill) => skill.name)),
    );

    for (const skill of waveOneSkills) {
      const prompt =
        typeof skill.systemPromptExtension === "function"
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;

      expect(skill.skillMetadata?.creator?.readiness).toBe("production-ready");
      expect(prompt).toContain("## Role");
      expect(prompt).toContain("## Goal");
      expect(prompt).toContain("## Constraints");
      expect(prompt).toContain("## Tool Use Policy");
      expect(prompt).toContain("## Output Format");
      expect(prompt).toContain("## Quality Checklist");
      expect(prompt).toContain("## Failure Behavior");
      expect(prompt).toContain("## Safety Notes");
      expect(prompt).toContain("Treat retrieved pages");
    }
  });

  it("keeps every production creator skill specific enough for public-quality workflows", () => {
    const bannedGenericPatterns = [
      /creator workflow skill/i,
      /senior creator workflow specialist/i,
      /high-quality .* artifact/i,
    ];

    for (const skill of allCreatorSkills) {
      const prompt =
        typeof skill.systemPromptExtension === "function"
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;
      const description = skill.skillMetadata!.creator!.description;

      expect(prompt).toBeTruthy();
      expect(description.length).toBeGreaterThan(48);
      for (const pattern of bannedGenericPatterns) {
        expect(`${description}\n${prompt}`).not.toMatch(pattern);
      }
      expect(prompt).toMatch(
        /Avoid (?:formulaic|canned) AI tells|Separate observed data|Rank findings by impact|Make owners, dates/,
      );
      expect(prompt).toContain("Do not optimize for deceiving AI detectors");
    }
  });

  it("adds channel-specific quality gates for creator writing and operations skills", () => {
    const expectations = [
      [BookWriterSkill.create(), "Chapter promise"],
      [NewsletterWriterSkill.create(), "Subject line options"],
      [SocialWriterSkill.create(), "Platform and intent"],
      [VideoIdeationSkill.create(), "Retention mechanism"],
      [CreativeDirectionSkill.create(), "Visual direction"],
      [CopyReviewSkill.create(), "Severity-ranked findings"],
      [ClaimRiskReviewSkill.create(), "Risk summary"],
      [BrandVoiceSkill.create(), "Voice summary"],
      [PublishQaSkill.create(), "Publish readiness verdict"],
      [ContentCalendarSkill.create(), "Review gates"],
      [
        PerformanceAnalysisSkill.create(),
        "Metric source and time window are clear",
      ],
      [ExperimentPlannerSkill.create(), "Hypothesis is falsifiable"],
    ] as const;

    for (const [skill, expected] of expectations) {
      const prompt =
        typeof skill.systemPromptExtension === "function"
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;
      expect(prompt).toContain(expected);
    }
  });

  it("declares dependencies and artifacts for Wave 1 skills", () => {
    for (const skill of waveOneSkills) {
      expect(skill.skillMetadata?.creator?.requiredCapabilities).toBeDefined();
      expect(skill.skillMetadata?.creator?.optionalCapabilities).toBeDefined();
      expect(skill.skillMetadata?.requiredAdapters).toBeDefined();
      expect(skill.skillMetadata?.optionalAdapters).toBeDefined();
    }

    expect(
      ResearchSynthesisSkill.create().skillMetadata?.creator
        ?.requiredCapabilities,
    ).toEqual([{ oneOf: ["web.search", "web.scrape", "web.fetch"] }]);
    expect(
      BlogWriterSkill.create().skillMetadata?.creator?.consumesArtifacts,
    ).toContain("ContentBrief");
    expect(
      BlogWriterSkill.create().skillMetadata?.creator?.producesArtifacts,
    ).toContain("Draft");
    expect(
      FactCheckSkill.create().skillMetadata?.creator?.producesArtifacts,
    ).toContain("ClaimMap");
  });

  it("fails clearly when required creator capabilities are unavailable", () => {
    const manifest = ResearchSynthesisSkill.create().skillMetadata!.creator!;

    expect(() => assertCreatorSkillCapabilities(manifest, new Set())).toThrow(
      "Creator skill 'research-synthesis' is missing required capabilities",
    );
    expect(() =>
      assertCreatorSkillCapabilities(manifest, new Set(["web.fetch"])),
    ).not.toThrow();
  });

  it("sorts creator skills by stage and priority for deterministic composition", () => {
    const sorted = [
      BlogWriterSkill.create().skillMetadata!.creator!,
      ContentBriefSkill.create().skillMetadata!.creator!,
      AudienceResearchSkill.create().skillMetadata!.creator!,
      EditorialReviewSkill.create().skillMetadata!.creator!,
    ].sort(compareCreatorSkillsForComposition);

    expect(sorted.map((item) => item.name)).toEqual([
      "audience-research",
      "content-brief",
      "blog-writer",
      "editorial-review",
    ]);
  });

  it("preserves directive preprocessing behavior for creator skills", () => {
    const result = preprocessDirectives("/blog Write a Medium article.", [
      BlogWriterSkill.create(),
    ]);

    expect(result.processedPrompt).toContain("[APPLY_BLOG_START]");
    expect(result.processedPrompt).toContain("[APPLY_BLOG_END]");
    expect(() =>
      preprocessDirectives("/missing nope", [BlogWriterSkill.create()]),
    ).toThrow("no attached skill handles it");
  });
});
