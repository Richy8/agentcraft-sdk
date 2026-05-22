# Artifact Registry

`ArtifactRegistry` is a runtime registry of named Zod schemas for typed artifact persistence. It pre-registers 19 built-in creator artifact types and lets you extend the vocabulary with custom types — without modifying the package or forking schemas.

## Purpose

| Use case | How the registry helps |
| --- | --- |
| Validate structured agent output | Pass `ArtifactRegistry.lookup("Draft")` as `responseSchema` |
| Type-safe store writes | `FileArtifactStore({ validateSchemas: true })` validates on `put()` |
| Custom artifact types | Register project-owned Zod schemas alongside built-ins |
| Schema introspection | `ArtifactRegistry.list()` enumerates all registered type names |

## Quick Start

```ts
import { Agent, ArtifactRegistry, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Use a built-in schema as responseSchema
const DraftSchema = ArtifactRegistry.lookup("Draft");

const response = await agent.run({
  prompt: "Draft a blog post about TypeScript generics.",
  responseSchema: DraftSchema,
});

console.log(response.structuredResponse); // typed Draft object
```

## API

| Method | Returns | Purpose |
| --- | --- | --- |
| `ArtifactRegistry.lookup(name)` | `ZodSchema \| undefined` | Return the schema for a type name. Returns `undefined` if not registered. |
| `ArtifactRegistry.register(name, schema)` | `void` | Register a custom Zod schema. Throws if the name already exists. |
| `ArtifactRegistry.list()` | `string[]` | All registered type names (built-in + custom). |
| `ArtifactRegistry.deregister(name)` | `boolean` | Remove a custom schema. Returns `false` for built-in names (protected). |

## Built-In Schemas

All 19 creator artifact types are pre-registered:

| Type | Purpose |
| --- | --- |
| `Draft` | Blog post, article, or long-form content draft |
| `ContentBrief` | Research-backed content brief with keywords and outline |
| `SeoPlan` | SEO strategy with target keywords and intent mapping |
| `SerpBrief` | SERP analysis with ranking patterns and gap opportunities |
| `EditorialReview` | Reviewer verdict, quality notes, and revision requests |
| `AudienceProfile` | Target reader segment with pain points and objections |
| `PositioningBrief` | Brand positioning statement with differentiation factors |
| `SourceNote` | Evidence source with URL, quote, and claim mapping |
| `ClaimMap` | Claim-to-source mapping with confidence and risk scores |
| `RepurposingPack` | Multi-platform content adaptations from a single source |
| `PublishPackage` | Final assembled publish-ready asset bundle |
| `ContentCalendar` | Scheduled content plan with topics and distribution |
| `PerformanceReport` | Weekly or campaign performance snapshot |
| `ExperimentPlan` | A/B test design with hypothesis and metrics |
| `BrandVoiceProfile` | Tone, preferred phrases, and banned phrases |
| `ContentPillars` | Strategic content themes with audience fit |
| `PersonaProfile` | Evidence-backed reader or customer persona |
| `MediaBrief` | Visual or multimedia production brief |
| `PublishingStatus` | Publish workflow state tracking artifact |

## Registering Custom Types

Register project-owned schemas under project-owned names. Built-in names are protected — `register()` throws if you use one.

```ts
import { ArtifactRegistry } from "@deskcreate/agentcraft";
import { z } from "zod";

// Custom schema for a business use case
const CampaignBriefSchema = z.object({
  type: z.literal("CampaignBrief"),
  campaignName: z.string(),
  channels: z.array(z.string()).default([]),
  budget: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["draft", "approved", "active", "completed"]).default("draft"),
  kpis: z.array(z.string()).default([]),
});

ArtifactRegistry.register("CampaignBrief", CampaignBriefSchema);

// Now usable as responseSchema
const agent = Agent.create({ model: ..., apiKey: ... });
const response = await agent.run({
  prompt: "Create a Q3 email campaign brief for our enterprise product.",
  responseSchema: ArtifactRegistry.lookup("CampaignBrief"),
});

console.log(response.structuredResponse);
// → { type: "CampaignBrief", campaignName: "Q3 Enterprise", channels: ["email", "linkedin"], ... }
```

## Store-Level Schema Validation

Enable `validateSchemas: true` on the artifact store to validate every `put()` call against registered schemas:

```ts
import {
  ArtifactRegistry,
  FileArtifactStore,
} from "@deskcreate/agentcraft";
import { z } from "zod";

// Register custom type
ArtifactRegistry.register("SupportTicket", z.object({
  type: z.literal("SupportTicket"),
  subject: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "in-progress", "resolved"]).default("open"),
}));

const store = FileArtifactStore({
  root: "./.artifacts",
  validateSchemas: true, // validates on put() and updateByType()
});

// This passes validation
await store.put("SupportTicket", {
  type: "SupportTicket",
  subject: "API returns 500 on bulk import",
  severity: "high",
  status: "open",
});

// This throws — severity must be one of the enum values
await store.put("SupportTicket", {
  type: "SupportTicket",
  subject: "Login broken",
  severity: "urgent", // invalid
});
```

## Patterns

### Response Schema from Registry

Use the registry as a lookup table for dynamic schema resolution:

```ts
import { Agent, ArtifactRegistry, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

async function runWithType(prompt: string, artifactType: string) {
  const schema = ArtifactRegistry.lookup(artifactType);
  if (!schema) throw new Error(`Unknown artifact type: ${artifactType}`);

  return agent.run({ prompt, responseSchema: schema });
}

const draftResult = await runWithType(
  "Write a blog post about TypeScript 5.x features.",
  "Draft"
);
const briefResult = await runWithType(
  "Create a content brief for 'TypeScript generics explained'.",
  "ContentBrief"
);
```

### Validate Before Writing

Validate against the registry before persisting to avoid silent schema drift:

```ts
import { ArtifactRegistry, MemoryArtifactStore } from "@deskcreate/agentcraft";

const store = MemoryArtifactStore();

async function validateAndStore(type: string, data: unknown): Promise<string> {
  const schema = ArtifactRegistry.lookup(type);
  if (!schema) throw new Error(`No schema registered for type: ${type}`);
  
  const validated = schema.parse(data); // throws ZodError if invalid
  return store.put(type, validated);
}

const id = await validateAndStore("EditorialReview", {
  type: "EditorialReview",
  verdict: "approved",
  notes: ["Good structure", "Sources need one more citation"],
  qualityScore: 8.5,
});
```

### List All Types at Runtime

```ts
import { ArtifactRegistry } from "@deskcreate/agentcraft";

const allTypes = ArtifactRegistry.list();
console.log(`Registered types (${allTypes.length}):`);
for (const typeName of allTypes) {
  const schema = ArtifactRegistry.lookup(typeName);
  console.log(`  ${typeName}: ${schema ? "schema present" : "missing"}`);
}
```

### Deregistering Custom Types

Remove a custom type you registered (useful in tests to reset state):

```ts
import { ArtifactRegistry } from "@deskcreate/agentcraft";

ArtifactRegistry.register("TestArtifact", z.object({ id: z.string() }));
console.log(ArtifactRegistry.lookup("TestArtifact")); // schema

const removed = ArtifactRegistry.deregister("TestArtifact");
console.log(removed); // true
console.log(ArtifactRegistry.lookup("TestArtifact")); // undefined

// Built-ins cannot be deregistered
const builtInRemoved = ArtifactRegistry.deregister("Draft");
console.log(builtInRemoved); // false
```

## Registry in Practice

The registry is a singleton. Register custom types at application startup before any agent or store is created. Registration is not idempotent — calling `register()` with an existing name throws. Use `lookup()` first if you're registering conditionally:

```ts
import { ArtifactRegistry } from "@deskcreate/agentcraft";
import { z } from "zod";

function registerIfMissing(name: string, schema: z.ZodSchema) {
  if (!ArtifactRegistry.lookup(name)) {
    ArtifactRegistry.register(name, schema);
  }
}

registerIfMissing("MyCustomType", z.object({ value: z.string() }));
```

## Related

- [Artifact Store](./artifact-store.md) — persistence layer that consumes registry schemas
- [Structured Output](../core/structured-output.md) — using schemas as `responseSchema`
- [Creator Packs](../creator/packs.md) — packs that produce built-in artifact types
