# Creator Memory

Creator memory persists brand voice and prior-work corpus context.

For general cross-run memory that is not tied to creator resource tools, use [Semantic Memory](../persistence/semantic-memory.md). A common production setup uses both: semantic memory for app-wide user/project facts, and creator memory for brand voice plus creator corpus retrieval.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorResourcesAdapter } from "@deskcreate/agentcraft/adapters";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";
import { FileSystemCreatorMemoryStore } from "@deskcreate/agentcraft";

const memory = new FileSystemCreatorMemoryStore({
  root: ".agentcraft/memory",
  staleAfterMs: 1000 * 60 * 60 * 24 * 30,
  requireWriteApproval: true,
  approveWrite: () => true,
});

await memory.upsertBrandVoice({
  id: "default",
  tone: "practical and evidence-led",
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(CreatorPacks.blog())
  .use(CreatorResourcesAdapter.connect({ memoryStore: memory }));

const response = await agent.run({
  prompt: "Draft a post using our brand voice.",
});
console.log(response.content);
```

## Config

| Field                  | Default          | Purpose                                      |
| ---------------------- | ---------------- | -------------------------------------------- |
| `root`                 | `content/memory` | Filesystem storage root.                     |
| `staleAfterMs`         | None             | Marks old memories as stale.                 |
| `requireWriteApproval` | `false`          | Requires approval before durable writes.     |
| `redactSensitive`      | `true`           | Blocks likely secrets and sensitive details. |
| brand voice `id`       | Required         | Profile identifier.                          |
| corpus `tags`          | Required array   | Retrieval filters and context.               |
| search `limit`         | `5`              | Max results.                                 |

## Compact Context

Use `summarizeContext()` when you want memory benefits without dumping full brand examples into the prompt.

```ts
const system = await memory.summarizeContext({
  query: "LinkedIn post about cache savings",
  tags: ["linkedin", "cache"],
  maxChars: 1000,
});

await agent.run({
  system,
  prompt: "Write the post.",
});
```

## More

- [Semantic Memory](../persistence/semantic-memory.md)
- [Creator Memory And Analytics](../creator/analytics.md)
- [Creator Memory Store](../persistence/creator-memory-store.md)
