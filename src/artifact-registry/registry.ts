import { z } from "zod";
import {
  AudienceProfileSchema,
  BrandVoiceProfileSchema,
  ClaimMapSchema,
  ContentBriefSchema,
  ContentCalendarSchema,
  ContentPillarsSchema,
  DraftSchema,
  EditorialReviewSchema,
  ExperimentPlanSchema,
  MediaBriefSchema,
  PerformanceReportSchema,
  PersonaProfileSchema,
  PositioningBriefSchema,
  PublishPackageSchema,
  PublishingStatusSchema,
  RepurposingPackSchema,
  SeoPlanSchema,
  SerpBriefSchema,
  SourceNoteSchema,
} from "../agent/creator/types.js";

type AnyZodSchema = z.ZodTypeAny;

const registry = new Map<string, AnyZodSchema>();

const BUILT_IN_SCHEMAS: Record<string, AnyZodSchema> = {
  AudienceProfile: AudienceProfileSchema,
  PositioningBrief: PositioningBriefSchema,
  ContentBrief: ContentBriefSchema,
  SourceNote: SourceNoteSchema,
  ClaimMap: ClaimMapSchema,
  Draft: DraftSchema,
  EditorialReview: EditorialReviewSchema,
  SeoPlan: SeoPlanSchema,
  SerpBrief: SerpBriefSchema,
  RepurposingPack: RepurposingPackSchema,
  PublishPackage: PublishPackageSchema,
  ContentCalendar: ContentCalendarSchema,
  PerformanceReport: PerformanceReportSchema,
  ExperimentPlan: ExperimentPlanSchema,
  BrandVoiceProfile: BrandVoiceProfileSchema,
  ContentPillars: ContentPillarsSchema,
  PersonaProfile: PersonaProfileSchema,
  MediaBrief: MediaBriefSchema,
  PublishingStatus: PublishingStatusSchema,
};

for (const [name, schema] of Object.entries(BUILT_IN_SCHEMAS)) {
  registry.set(name, schema);
}

export const ArtifactRegistry = {
  register(name: string, schema: AnyZodSchema): void {
    if (registry.has(name)) {
      throw new Error(
        `ArtifactRegistry: schema '${name}' is already registered. Use a unique name for custom artifact types.`,
      );
    }
    registry.set(name, schema);
  },

  lookup(name: string): AnyZodSchema | undefined {
    return registry.get(name);
  },

  list(): string[] {
    return [...registry.keys()];
  },

  deregister(name: string): boolean {
    if (name in BUILT_IN_SCHEMAS) return false;
    return registry.delete(name);
  },
} as const;
