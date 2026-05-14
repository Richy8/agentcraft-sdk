import { ArtifactRegistry, MemoryArtifactStore } from "agentcraft";
import { z } from "zod";

console.log("Registered artifact types:", ArtifactRegistry.list().length);

// Register domain-owned artifact types without changing AgentCraft internals.
const ResumeDraftSchema = z.object({
  type: z.literal("ResumeDraft"),
  name: z.string(),
  summary: z.string(),
  experience: z
    .array(
      z.object({
        role: z.string(),
        company: z.string(),
        years: z.number(),
      }),
    )
    .default([]),
  status: z.enum(["draft", "reviewed", "final"]).default("draft"),
  createdAt: z.string().default(() => new Date().toISOString()),
});

ArtifactRegistry.register("ResumeDraft", ResumeDraftSchema);

const schema = ArtifactRegistry.lookup("ResumeDraft");
console.log("ResumeDraft schema found:", schema !== undefined);

const store = MemoryArtifactStore();
const raw = {
  type: "ResumeDraft",
  name: "Alex Chen",
  summary: "5 years building distributed systems.",
};

const validated = schema?.parse(raw);
if (validated) {
  const id = await store.put("ResumeDraft", validated);
  console.log("Stored resume draft:", id);
}

// Custom types can extend your own prior custom schema.
const ReviewedResumeDraftSchema = ResumeDraftSchema.extend({
  reviewNotes: z.array(z.string()).default([]),
});

ArtifactRegistry.register("ReviewedResumeDraft", ReviewedResumeDraftSchema);
console.log(
  "Reviewed type registered:",
  ArtifactRegistry.lookup("ReviewedResumeDraft") !== undefined,
);
