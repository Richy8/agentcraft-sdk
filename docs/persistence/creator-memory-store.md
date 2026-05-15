# Creator Memory Store

Creator memory stores brand voice, audience notes, prior performance learnings, and recurring preferences. It is what keeps a creator workflow from starting cold every time.

## Purpose

| Memory type          | Good example                      | Tool                           | Related page                                    |
| -------------------- | --------------------------------- | ------------------------------ | ----------------------------------------------- |
| Brand voice          | Preferred tone and banned phrases | `FileSystemCreatorMemoryStore` | [Brand Voice](../creator/skills.md)             |
| Audience notes       | ICP, objections, reader maturity  | `CreatorMemoryStore`           | [Creator Memory](../creator/memory.md)          |
| Performance learning | Topics that worked                | `AnalyticsHistoryStore`        | [Analytics Store](./analytics-history-store.md) |
| External memory      | MCP memory graph                  | `MemoryMCP`                    | [Built-In MCP](../mcp/built-in.md)              |

## Usage

```ts
import { Agent, FileSystemCreatorMemoryStore, Provider } from "agentcraft";
import { CreatorPacks } from "agentcraft/packs";

// Constructor takes a root directory path (created if missing)
const memory = new FileSystemCreatorMemoryStore("./.agentcraft/creator-memory");

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(CreatorPacks.social({ memory: true }));

const response = await agent.run({
  prompt: "Draft a social post using our brand voice.",
});
console.log(response.content);
```

## Configuration

| Option              | Required       | Default | Purpose                            |
| ------------------- | -------------- | ------- | ---------------------------------- |
| `filePath`          | For file store | None    | Durable memory file.               |
| `memory`            | No             | `false` | Pack-level memory enablement.      |
| `readOnlyByDefault` | No             | `false` | Prevents accidental memory writes. |
| `cache`             | No             | `false` | Reuses stable memory context.      |

## Local Examples

Use memory for a brand voice pass:

```ts
await agent.run({
  prompt:
    "/brand-voice Rewrite this post to match our concise technical voice.",
});
```

More variants: [Creator Memory and Analytics](../creator/analytics.md).
