# Artifact Registry

`ArtifactRegistry` is a runtime registry of named Zod schemas for typed artifact persistence and structured output. It starts empty by default; register the schemas your application owns at startup.

## Purpose

| Use case | How the registry helps |
| --- | --- |
| Validate structured agent output | Pass `ArtifactRegistry.lookup("CampaignBrief")` as `responseSchema` after registering it |
| Type-safe store writes | `FileArtifactStore({ validateSchemas: true })` validates registered types on `put()` and `updateByType()` |
| Custom artifact types | Register project-owned Zod schemas without modifying AgentCraft |
| Schema introspection | `ArtifactRegistry.list()` enumerates currently registered type names |

## Quick Start

```ts
import { Agent, ArtifactRegistry, Provider } from "@deskcreate/agentcraft";
import { z } from "zod";

const CampaignBriefSchema = z.object({
  type: z.literal("CampaignBrief"),
  campaignName: z.string(),
  channels: z.array(z.string()).default([]),
  status: z.enum(["draft", "approved", "active", "completed"]).default("draft"),
  kpis: z.array(z.string()).default([]),
});

ArtifactRegistry.register("CampaignBrief", CampaignBriefSchema);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Create a launch campaign brief for a developer-tools product.",
  responseSchema: ArtifactRegistry.lookup("CampaignBrief"),
});

console.log(response.structuredResponse);
```

## API

| Method | Returns | Purpose |
| --- | --- | --- |
| `ArtifactRegistry.lookup(name)` | `ZodSchema \| undefined` | Return the schema for a type name. Returns `undefined` if not registered. |
| `ArtifactRegistry.register(name, schema)` | `void` | Register a schema. Throws if the name already exists. |
| `ArtifactRegistry.list()` | `string[]` | All currently registered type names. |
| `ArtifactRegistry.deregister(name)` | `boolean` | Remove a registered schema. Returns `false` when the name is unknown. |

## Store-Level Schema Validation

Enable `validateSchemas: true` on the artifact store to validate registered types before persistence:

```ts
import { ArtifactRegistry, FileArtifactStore } from "@deskcreate/agentcraft";
import { z } from "zod";

ArtifactRegistry.register("SupportTicket", z.object({
  type: z.literal("SupportTicket"),
  subject: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "in-progress", "resolved"]).default("open"),
}));

const store = FileArtifactStore({
  root: "./.artifacts",
  validateSchemas: true,
});

await store.put("SupportTicket", {
  type: "SupportTicket",
  subject: "API returns 500 on bulk import",
  severity: "high",
  status: "open",
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
```

### Validate Before Writing

Validate against the registry before persisting to avoid silent schema drift:

```ts
import { ArtifactRegistry, MemoryArtifactStore } from "@deskcreate/agentcraft";

const store = MemoryArtifactStore();

async function validateAndStore(type: string, data: unknown): Promise<string> {
  const schema = ArtifactRegistry.lookup(type);
  if (!schema) throw new Error(`No schema registered for type: ${type}`);

  const validated = schema.parse(data);
  return store.put(type, validated);
}
```

### Deregistering Schemas

Use `deregister()` to remove schemas in tests or short-lived processes:

```ts
import { ArtifactRegistry } from "@deskcreate/agentcraft";
import { z } from "zod";

ArtifactRegistry.register("TestArtifact", z.object({ id: z.string() }));
console.log(ArtifactRegistry.lookup("TestArtifact")); // schema

const removed = ArtifactRegistry.deregister("TestArtifact");
console.log(removed); // true
console.log(ArtifactRegistry.lookup("TestArtifact")); // undefined

const missing = ArtifactRegistry.deregister("NeverRegistered");
console.log(missing); // false
```

## Registry in Practice

The registry is a singleton. Register custom types at application startup before any agent or store relies on them. Registration is not idempotent: calling `register()` with an existing name throws. Use `lookup()` first when registering conditionally:

```ts
import { ArtifactRegistry } from "@deskcreate/agentcraft";
import { z } from "zod";

function registerIfMissing(name: string, schema: z.ZodSchema) {
  if (!ArtifactRegistry.lookup(name)) {
    ArtifactRegistry.register(name, schema);
  }
}
```

## Related

- [Artifact Store](./artifact-store.md) — persistence layer that consumes registry schemas
- [Structured Output](../core/structured-output.md) — using schemas as `responseSchema`
