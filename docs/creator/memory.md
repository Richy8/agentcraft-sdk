# Creator Memory

Creator memory persists brand voice and prior-work corpus context.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { CreatorResourcesAdapter } from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";
import { FileSystemCreatorMemoryStore } from "agentcraft";

const memory = new FileSystemCreatorMemoryStore(".agentcraft/memory");

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

| Field            | Default          | Purpose                        |
| ---------------- | ---------------- | ------------------------------ |
| `root`           | `content/memory` | Filesystem storage root.       |
| brand voice `id` | Required         | Profile identifier.            |
| corpus `tags`    | Required array   | Retrieval filters and context. |
| search `limit`   | `5`              | Max results.                   |

## More

- [Creator Memory And Analytics](../creator/analytics.md)
- [Creator Memory Store](../persistence/creator-memory-store.md)
