import { z } from "zod";
import type { AgentAdapter } from "../adapters/types.js";
import type { RunBudget } from "../types.js";

export const CreatorStageSchema = z.enum([
  "context",
  "strategy",
  "creation",
  "review",
  "operations",
]);

export const CreatorCategorySchema = z.enum([
  "strategy-and-research",
  "seo",
  "creation",
  "review-and-governance",
  "operations",
]);

export const CreatorSideEffectRiskSchema = z.enum([
  "none",
  "read",
  "write",
  "external",
]);

export const CreatorOutputOwnerSchema = z.enum([
  "supporting-context",
  "plan",
  "primary-draft",
  "review-report",
  "publish-package",
]);

export const CreatorSkillReadinessSchema = z.enum([
  "metadata-only",
  "preview",
  "production-ready",
]);

export const CapabilityExpressionSchema = z.union([
  z.string().min(1),
  z.object({ oneOf: z.array(z.string().min(1)).min(1) }),
  z.object({ allOf: z.array(z.string().min(1)).min(1) }),
]);

export const CreatorSkillManifestSchema = z.object({
  name: z.string().min(1),
  directive: z.string().min(1),
  category: CreatorCategorySchema,
  stage: CreatorStageSchema,
  priority: z.number().int(),
  description: z.string().min(1),
  docsPath: z.string().min(1),
  requiredCapabilities: z.array(CapabilityExpressionSchema),
  optionalCapabilities: z.array(CapabilityExpressionSchema),
  consumesArtifacts: z.array(z.string().min(1)),
  producesArtifacts: z.array(z.string().min(1)),
  sideEffectRisk: CreatorSideEffectRiskSchema,
  outputOwner: CreatorOutputOwnerSchema,
  composesWith: z.array(z.string().min(1)),
  readiness: CreatorSkillReadinessSchema,
  promptVersion: z.string().min(1),
});

export type CreatorStage = z.infer<typeof CreatorStageSchema>;
export type CreatorCategory = z.infer<typeof CreatorCategorySchema>;
export type CreatorSideEffectRisk = z.infer<typeof CreatorSideEffectRiskSchema>;
export type CreatorOutputOwner = z.infer<typeof CreatorOutputOwnerSchema>;
export type CreatorSkillReadiness = z.infer<typeof CreatorSkillReadinessSchema>;
export type CapabilityExpression = z.infer<typeof CapabilityExpressionSchema>;
export type CreatorSkillManifest = z.infer<typeof CreatorSkillManifestSchema>;

export const ArtifactProvenanceSchema = z.object({
  kind: z.enum(["user", "tool", "file", "model"]),
  ref: z.string().min(1),
});

export const CreatorArtifactSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  title: z.string().min(1).optional(),
  createdAt: z.string().min(1),
  sourceSkill: z.string().min(1),
  provenance: z.array(ArtifactProvenanceSchema),
  inputs: z.array(z.string()),
  status: z.enum([
    "draft",
    "reviewed",
    "verified",
    "blocked",
    "published",
    "archived",
  ]),
});

export type ArtifactProvenance = z.infer<typeof ArtifactProvenanceSchema>;
export type CreatorArtifact = z.infer<typeof CreatorArtifactSchema>;

export const AudienceProfileSchema = CreatorArtifactSchema.extend({
  type: z.literal("AudienceProfile"),
  segments: z.array(z.string()).default([]),
  pains: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  desiredOutcomes: z.array(z.string()).default([]),
});

export const PositioningBriefSchema = CreatorArtifactSchema.extend({
  type: z.literal("PositioningBrief"),
  thesis: z.string().default(""),
  promise: z.string().default(""),
  differentiators: z.array(z.string()).default([]),
});

export const ContentBriefSchema = CreatorArtifactSchema.extend({
  type: z.literal("ContentBrief"),
  audience: z.string().default(""),
  intent: z.string().default(""),
  outline: z.array(z.string()).default([]),
});

export const SourceNoteSchema = CreatorArtifactSchema.extend({
  type: z.literal("SourceNote"),
  url: z.string().optional(),
  retrievedAt: z.string().min(1),
  summary: z.string().default(""),
  quality: z
    .enum(["primary", "strong", "mixed", "weak", "unknown"])
    .default("unknown"),
});

export const ClaimMapSchema = CreatorArtifactSchema.extend({
  type: z.literal("ClaimMap"),
  claims: z
    .array(
      z.object({
        claim: z.string().min(1),
        status: z.enum(["verified", "weak", "conflicting", "unverified"]),
        sourceRefs: z.array(z.string()),
      }),
    )
    .default([]),
});

export const DraftSchema = CreatorArtifactSchema.extend({
  type: z.literal("Draft"),
  format: z.string().default("article"),
  body: z.string().default(""),
});

export const EditorialReviewSchema = CreatorArtifactSchema.extend({
  type: z.literal("EditorialReview"),
  findings: z.array(z.string()).default([]),
  recommendedEdits: z.array(z.string()).default([]),
});

export const SeoPlanSchema = CreatorArtifactSchema.extend({
  type: z.literal("SeoPlan"),
  keywords: z.array(z.string()).default([]),
  intent: z.string().default(""),
  internalLinks: z.array(z.string()).default([]),
});

export const SerpBriefSchema = CreatorArtifactSchema.extend({
  type: z.literal("SerpBrief"),
  inspectedUrls: z.array(z.string()).default([]),
  gaps: z.array(z.string()).default([]),
});

export const RepurposingPackSchema = CreatorArtifactSchema.extend({
  type: z.literal("RepurposingPack"),
  assets: z
    .array(z.object({ channel: z.string().min(1), content: z.string().min(1) }))
    .default([]),
});

export const PublishPackageSchema = CreatorArtifactSchema.extend({
  type: z.literal("PublishPackage"),
  title: z.string().default(""),
  subtitle: z.string().optional(),
  slug: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metaDescription: z.string().optional(),
  canonicalUrlNote: z.string().optional(),
  excerpt: z.string().optional(),
  cta: z.string().optional(),
  altText: z.array(z.string()).default([]),
});

export const ContentCalendarSchema = CreatorArtifactSchema.extend({
  type: z.literal("ContentCalendar"),
  items: z
    .array(
      z.object({
        title: z.string().min(1),
        channel: z.string().min(1),
        dueDate: z.string().optional(),
        dependencies: z.array(z.string()).default([]),
        reviewGate: z.string().optional(),
      }),
    )
    .default([]),
});

export const PerformanceReportSchema = CreatorArtifactSchema.extend({
  type: z.literal("PerformanceReport"),
  metrics: z
    .array(
      z.object({
        name: z.enum([
          "traffic",
          "ranking",
          "ctr",
          "retention",
          "engagement",
          "conversion",
        ]),
        value: z.number(),
        source: z.string().min(1),
      }),
    )
    .default([]),
  recommendations: z.array(z.string()).default([]),
});

export const ExperimentPlanSchema = CreatorArtifactSchema.extend({
  type: z.literal("ExperimentPlan"),
  hypothesis: z.string().default(""),
  variants: z.array(z.string()).default([]),
  metric: z.string().default(""),
  duration: z.string().default(""),
  decisionRule: z.string().default(""),
});

export const BrandVoiceProfileSchema = CreatorArtifactSchema.extend({
  type: z.literal("BrandVoiceProfile"),
  tone: z.array(z.string()).default([]),
  vocabulary: z.array(z.string()).default([]),
  avoidPhrases: z.array(z.string()).default([]),
  exampleSentences: z.array(z.string()).default([]),
  missionStatement: z.string().optional(),
});

export type BrandVoiceProfile = z.infer<typeof BrandVoiceProfileSchema>;

export const ContentPillarsSchema = CreatorArtifactSchema.extend({
  type: z.literal("ContentPillars"),
  pillars: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        themes: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});

export type ContentPillars = z.infer<typeof ContentPillarsSchema>;

export const PersonaProfileSchema = CreatorArtifactSchema.extend({
  type: z.literal("PersonaProfile"),
  personaName: z.string().default(""),
  role: z.string().default(""),
  goals: z.array(z.string()).default([]),
  frustrations: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
  decisionDrivers: z.array(z.string()).default([]),
});

export type PersonaProfile = z.infer<typeof PersonaProfileSchema>;

export const MediaBriefSchema = CreatorArtifactSchema.extend({
  type: z.literal("MediaBrief"),
  format: z
    .enum(["image", "video", "infographic", "podcast", "webinar", "other"])
    .default("other"),
  direction: z.string().default(""),
  dimensions: z.string().optional(),
  duration: z.string().optional(),
  brandElements: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
});

export type MediaBrief = z.infer<typeof MediaBriefSchema>;

export const PublishingStatusSchema = CreatorArtifactSchema.extend({
  type: z.literal("PublishingStatus"),
  artifactRef: z.string().min(1),
  channel: z.string().min(1),
  stage: z
    .enum([
      "planned",
      "briefed",
      "drafted",
      "in_review",
      "approved",
      "scheduled",
      "published",
      "failed",
      "needs_revision",
      "archived",
    ])
    .default("planned"),
  scheduledAt: z.string().optional(),
  publishedAt: z.string().optional(),
  externalUrl: z.string().optional(),
  notes: z.string().optional(),
});

export type PublishingStatus = z.infer<typeof PublishingStatusSchema>;

export const CreatorArtifactUnionSchema = z.discriminatedUnion("type", [
  AudienceProfileSchema,
  PositioningBriefSchema,
  ContentBriefSchema,
  SourceNoteSchema,
  ClaimMapSchema,
  DraftSchema,
  EditorialReviewSchema,
  SeoPlanSchema,
  SerpBriefSchema,
  RepurposingPackSchema,
  PublishPackageSchema,
  ContentCalendarSchema,
  PerformanceReportSchema,
  ExperimentPlanSchema,
  BrandVoiceProfileSchema,
  ContentPillarsSchema,
  PersonaProfileSchema,
  MediaBriefSchema,
  PublishingStatusSchema,
]);

export const AdapterCapabilitySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  sideEffectRisk: CreatorSideEffectRiskSchema,
  providers: z.array(z.string().min(1)),
  requiredSemantics: z.array(z.string().min(1)),
});

export type AdapterCapability = z.infer<typeof AdapterCapabilitySchema>;

export const CreatorPackSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  skills: z.array(z.string().min(1)),
  requiredCapabilities: z.array(CapabilityExpressionSchema),
  optionalCapabilities: z.array(CapabilityExpressionSchema),
  configFields: z.array(z.string().min(1)),
  sideEffectRisk: CreatorSideEffectRiskSchema,
});

export interface CreatorPack {
  readonly type: "creator-pack";
  readonly name: string;
  readonly description: string;
  readonly manifest: z.infer<typeof CreatorPackSchema>;
  readonly attachments: readonly AgentAdapter[];
  readonly config?: CreatorPackConfig;
}

export interface CreatorPackConfig {
  readonly contentRoot?: string;
  readonly cacheRoot?: string;
  readonly readOnlyByDefault?: boolean;
  readonly memory?: boolean | { readonly filePath?: string };
  readonly cache?: boolean | "auto" | "aggressive";
  readonly skillActivation?: "always" | "auto" | "directive-only";
  readonly toolSelection?: "all" | "auto";
  readonly budget?: RunBudget;
}

export interface AgentCacheConfig {
  readonly type: "disabled" | "file" | "memory";
  readonly root?: string;
  readonly strategy?: "conservative" | "auto" | "aggressive";
  readonly defaultTtlMs?: number;
  readonly namespace?: string;
  readonly version?: string;
  readonly maxEntryBytes?: number;
}

export interface AgentCacheController {
  readonly config: AgentCacheConfig;
  get?(key: string): Promise<unknown | undefined>;
  getEntry?(key: string): Promise<AgentCacheLookup>;
  set?(
    key: string,
    value: unknown,
    options?: { readonly ttlMs?: number },
  ): Promise<void>;
  delete?(key: string): Promise<boolean>;
  clear?(): Promise<void>;
  pruneExpired?(): Promise<number>;
}

export interface AgentCacheLookup {
  readonly status: "hit" | "miss" | "stale" | "corrupt" | "oversize";
  readonly value?: unknown;
  readonly bytes?: number;
  readonly createdAt?: number;
  readonly expiresAt?: number;
}

export function isCreatorPack(value: unknown): value is CreatorPack {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { readonly type?: unknown }).type === "creator-pack" &&
    Array.isArray((value as { readonly attachments?: unknown }).attachments)
  );
}

export function validateCreatorSkillManifest(
  manifest: CreatorSkillManifest,
): CreatorSkillManifest {
  return CreatorSkillManifestSchema.parse(manifest);
}

export function validateCreatorPack(pack: CreatorPack): CreatorPack {
  CreatorPackSchema.parse(pack.manifest);
  return pack;
}

export function findMissingCapabilityExpressions(
  requiredCapabilities: readonly CapabilityExpression[],
  availableCapabilities: ReadonlySet<string>,
): CapabilityExpression[] {
  return requiredCapabilities.filter((expression) => {
    if (typeof expression === "string")
      return !availableCapabilities.has(expression);
    if ("oneOf" in expression) {
      return !expression.oneOf.some((capability) =>
        availableCapabilities.has(capability),
      );
    }
    return !expression.allOf.every((capability) =>
      availableCapabilities.has(capability),
    );
  });
}

export function assertCreatorSkillCapabilities(
  manifest: CreatorSkillManifest,
  availableCapabilities: ReadonlySet<string>,
): void {
  const missing = findMissingCapabilityExpressions(
    manifest.requiredCapabilities,
    availableCapabilities,
  );
  if (missing.length === 0) return;

  const rendered = missing
    .map((expression) => {
      if (typeof expression === "string") return expression;
      if ("oneOf" in expression) return `oneOf(${expression.oneOf.join(", ")})`;
      return `allOf(${expression.allOf.join(", ")})`;
    })
    .join("; ");

  throw new Error(
    `Creator skill '${manifest.name}' is missing required capabilities: ${rendered}`,
  );
}
