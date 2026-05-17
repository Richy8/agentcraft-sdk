# Creator Memory Store

Creator memory stores brand voice, audience notes, prior performance learnings, and recurring preferences. It is what keeps a creator workflow from starting cold every time.

## Purpose

| Memory type          | Good example                      | Tool                           | Related page                                    |
| -------------------- | --------------------------------- | ------------------------------ | ----------------------------------------------- |
| Brand voice          | Preferred tone and banned phrases | `FileSystemCreatorMemoryStore` | [Brand Voice](../creator/skills.md)             |
| Audience notes       | ICP, objections, reader maturity  | `CreatorMemoryStore`           | [Creator Memory](../creator/memory.md)          |
| Performance learning | Topics that worked                | `AnalyticsHistoryStore`        | [Analytics Store](./analytics-history-store.md) |
| Semantic memory      | Cross-run project facts           | `AgentMemory`                  | [Semantic Memory](./semantic-memory.md)         |
| External memory      | MCP memory graph                  | `MemoryMCP`                    | [Built-In MCP](../mcp/built-in.md)              |

## Usage

```ts
import {
  Agent,
  FileSystemCreatorMemoryStore,
  Provider,
} from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

// Constructor takes either a root path or an options object.
const memory = new FileSystemCreatorMemoryStore({
  root: "./.agentcraft/creator-memory",
  staleAfterMs: 1000 * 60 * 60 * 24 * 30,
  requireWriteApproval: true,
  approveWrite: async (request) => {
    console.log(`Approve memory write: ${request.operation}`, request.preview);
    return true;
  },
});

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

| Option                 | Required | Default          | Purpose                                        |
| ---------------------- | -------- | ---------------- | ---------------------------------------------- |
| `root`                 | No       | `content/memory` | Filesystem storage root.                       |
| `staleAfterMs`         | No       | None             | Marks returned memories as stale after age.    |
| `requireWriteApproval` | No       | `false`          | Requires `approveWrite` before durable writes. |
| `approveWrite`         | No       | None             | App callback for memory write approvals.       |
| `redactSensitive`      | No       | `true`           | Blocks likely secrets and sensitive details.   |
| `memory`               | No       | `false`          | Pack-level memory enablement.                  |
| `readOnlyByDefault`    | No       | `false`          | Prevents accidental tool writes.               |
| `cache`                | No       | `false`          | Reuses stable memory context.                  |

## Local Examples

Use memory for a brand voice pass:

```ts
await agent.run({
  prompt:
    "/brand-voice Rewrite this post to match our concise technical voice.",
});
```

Create compact memory context for a run:

```ts
const memoryContext = await memory.summarizeContext({
  brandVoiceId: "default",
  query: "cache budget article",
  tags: ["brand", "cache"],
  corpusLimit: 3,
  maxChars: 1200,
});

const response = await agent.run({
  system: memoryContext,
  prompt: "Draft the article intro using the stored voice.",
});
```

Check freshness before trusting durable memory:

```ts
const voice = await memory.readBrandVoice("default");

if (voice?.freshness?.stale) {
  console.warn("Brand voice memory is stale; ask the user to confirm.");
}
```

## Mental Model

`CreatorMemoryStore` is for reusable creator context such as voice, corpus, audience notes, and preferences. [Semantic Memory](./semantic-memory.md) is the general `AgentMemory` primitive for bounded cross-run project facts outside creator workflows. `AnalyticsHistoryStore` is for performance and experiment history. `ArtifactStore` is for structured workflow outputs such as drafts, briefs, claim maps, calendars, and publish packages. `MemoryMCP` is an optional external memory server when you want model-visible graph memory through MCP tools.

The built-in creator file memory uses deterministic lexical recall so creator workflows stay dependency-free. Use `AgentMemory.vector()` when a project needs Qdrant, Pinecone, Supabase pgvector, or a custom semantic store.

More variants: [Creator Memory and Analytics](../creator/analytics.md) and [Semantic Memory](./semantic-memory.md).
