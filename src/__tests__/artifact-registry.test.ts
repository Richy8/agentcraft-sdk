import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ArtifactRegistry } from "../artifact-registry/registry.js";
import {
  BrandVoiceProfileSchema,
  ContentPillarsSchema,
  CreatorArtifactUnionSchema,
  MediaBriefSchema,
  PersonaProfileSchema,
  PublishingStatusSchema,
} from "../agent/creator/types.js";

const baseArtifact = {
  id: "artifact-1",
  createdAt: "2026-05-14T00:00:00.000Z",
  sourceSkill: "test-skill",
  provenance: [{ kind: "user" as const, ref: "prompt" }],
  inputs: ["prompt"],
  status: "draft" as const,
};

describe("ArtifactRegistry", () => {
  afterEach(() => {
    ArtifactRegistry.deregister("TestArtifact");
  });

  it("lists all built-in schemas", () => {
    expect(ArtifactRegistry.list().length).toBeGreaterThanOrEqual(19);
  });

  it("starts with exactly the 19 built-in schemas", () => {
    expect(ArtifactRegistry.list()).toHaveLength(19);
  });

  it("looks up built-in schema by name", () => {
    expect(ArtifactRegistry.lookup("Draft")).toBeDefined();
  });

  it("registers and looks up a custom schema", () => {
    const TestSchema = z.object({
      type: z.literal("TestArtifact"),
      value: z.string(),
    });
    ArtifactRegistry.register("TestArtifact", TestSchema);
    expect(ArtifactRegistry.lookup("TestArtifact")).toBe(TestSchema);
  });

  it("throws on duplicate registration", () => {
    expect(() => ArtifactRegistry.register("Draft", z.any())).toThrow(
      /already registered/,
    );
  });

  it("protects built-in schemas from deregistration", () => {
    expect(ArtifactRegistry.deregister("Draft")).toBe(false);
  });

  it("parses the new living-system artifact schemas", () => {
    expect(
      BrandVoiceProfileSchema.parse({
        ...baseArtifact,
        type: "BrandVoiceProfile",
      }).tone,
    ).toEqual([]);
    expect(
      ContentPillarsSchema.parse({
        ...baseArtifact,
        type: "ContentPillars",
        pillars: [{ name: "Trust", description: "Trust-building content" }],
      }).pillars[0]?.themes,
    ).toEqual([]);
    expect(
      PersonaProfileSchema.parse({
        ...baseArtifact,
        type: "PersonaProfile",
      }).decisionDrivers,
    ).toEqual([]);
    expect(
      MediaBriefSchema.parse({
        ...baseArtifact,
        type: "MediaBrief",
      }).format,
    ).toBe("other");
    expect(
      PublishingStatusSchema.parse({
        ...baseArtifact,
        type: "PublishingStatus",
        artifactRef: "draft-1",
        channel: "linkedin",
      }).stage,
    ).toBe("planned");
  });

  it("discriminates all built-in artifact union types", () => {
    const artifacts = [
      { ...baseArtifact, type: "AudienceProfile" },
      { ...baseArtifact, type: "PositioningBrief" },
      { ...baseArtifact, type: "ContentBrief" },
      {
        ...baseArtifact,
        type: "SourceNote",
        retrievedAt: baseArtifact.createdAt,
      },
      { ...baseArtifact, type: "ClaimMap" },
      { ...baseArtifact, type: "Draft" },
      { ...baseArtifact, type: "EditorialReview" },
      { ...baseArtifact, type: "SeoPlan" },
      { ...baseArtifact, type: "SerpBrief" },
      { ...baseArtifact, type: "RepurposingPack" },
      { ...baseArtifact, type: "PublishPackage" },
      { ...baseArtifact, type: "ContentCalendar" },
      { ...baseArtifact, type: "PerformanceReport" },
      { ...baseArtifact, type: "ExperimentPlan" },
      { ...baseArtifact, type: "BrandVoiceProfile" },
      { ...baseArtifact, type: "ContentPillars" },
      { ...baseArtifact, type: "PersonaProfile" },
      { ...baseArtifact, type: "MediaBrief" },
      {
        ...baseArtifact,
        type: "PublishingStatus",
        artifactRef: "draft-1",
        channel: "linkedin",
      },
    ];

    for (const artifact of artifacts) {
      expect(ArtifactRegistry.lookup(artifact.type)?.parse(artifact).type).toBe(
        artifact.type,
      );
      expect(CreatorArtifactUnionSchema.parse(artifact).type).toBe(
        artifact.type,
      );
    }
  });

  it("can use a registry schema as a responseSchema source", () => {
    const schema = ArtifactRegistry.lookup("Draft");
    expect(schema?.parse({ ...baseArtifact, type: "Draft" }).type).toBe(
      "Draft",
    );
  });
});
