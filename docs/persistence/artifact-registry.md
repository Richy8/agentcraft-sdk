# ArtifactRegistry

`ArtifactRegistry` is a runtime registry of named Zod schemas. It lets you look up schemas by artifact type, register custom types, and use registered schemas as `responseSchema` sources.

## Purpose

| Use case                                | How registry helps                                     | Related page                                      |
| --------------------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| Validate structured output by type name | `ArtifactRegistry.lookup("Draft")` as `responseSchema` | [Structured Output](../core/structured-output.md) |
| Extend artifact vocabulary              | Register custom schemas without forking the package    | [ArtifactStore](./artifact-store.md)              |
| Store-level validation before write     | Validate shape before calling `store.put()`            | [ArtifactStore](./artifact-store.md)              |

## Usage

```ts
import { Agent, ArtifactRegistry, Provider } from "@deskcreate/agentcraft";
import { z } from "zod";

const apiKey = process.env.OPENAI_API_KEY ?? "";
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey,
});

const DraftSchema = ArtifactRegistry.lookup("Draft");
const response = await agent.run({
  prompt: "Draft an article on AI agents.",
  responseSchema: DraftSchema,
});

const ResumeDraftSchema = z.object({
  type: z.literal("ResumeDraft"),
  name: z.string(),
  summary: z.string(),
});

ArtifactRegistry.register("ResumeDraft", ResumeDraftSchema);

console.log(response.structuredResponse, ArtifactRegistry.list().length);
```

## API

| Method                   | Returns                  | Purpose                                                              |
| ------------------------ | ------------------------ | -------------------------------------------------------------------- |
| `register(name, schema)` | `void`                   | Register a custom Zod schema. Throws if name already exists.         |
| `lookup(name)`           | `ZodSchema \| undefined` | Return the schema for a type name. Returns `undefined` if not found. |
| `list()`                 | `string[]`               | All registered type names, built-in and custom.                      |
| `deregister(name)`       | `boolean`                | Remove a custom schema. Returns false for built-in names.            |

## Built-In Schemas

All 19 built-in creator artifact schemas are pre-registered:

`AudienceProfile`, `PositioningBrief`, `ContentBrief`, `SourceNote`, `ClaimMap`, `Draft`, `EditorialReview`, `SeoPlan`, `SerpBrief`, `RepurposingPack`, `PublishPackage`, `ContentCalendar`, `PerformanceReport`, `ExperimentPlan`, `BrandVoiceProfile`, `ContentPillars`, `PersonaProfile`, `MediaBrief`, `PublishingStatus`

## Extending Types

Register project-owned artifact types under project-owned names. Built-in names are protected from replacement.

```ts
import { ArtifactRegistry } from "@deskcreate/agentcraft";
import { z } from "zod";

const CampaignBriefSchema = z.object({
  type: z.literal("CampaignBrief"),
  campaignName: z.string(),
  channels: z.array(z.string()).default([]),
  status: z.enum(["draft", "approved"]).default("draft"),
});

ArtifactRegistry.register("CampaignBrief", CampaignBriefSchema);

const schema = ArtifactRegistry.lookup("CampaignBrief");
console.log(schema?.parse({ type: "CampaignBrief", campaignName: "Q3" }));
```

## Local Examples

Validate before writing to a store:

```ts
import { ArtifactRegistry, MemoryArtifactStore } from "@deskcreate/agentcraft";

const store = MemoryArtifactStore();
const schema = ArtifactRegistry.lookup("Draft");

const raw = { type: "Draft", body: "Content", status: "draft" };
const validated = schema?.parse(raw);

if (validated) {
  await store.put("Draft", validated);
}
```

More variants: [production cookbook](../examples-cookbook/production.md).
