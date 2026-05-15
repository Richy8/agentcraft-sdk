# Book Pack

The book pack is built for chapters, outlines, longform continuity, and editorial passes. It is intentionally memory-friendly because books need consistent voice, definitions, and promises across many sessions.

## Coverage

| Stage          | Included skills                   | Tools to attach                          | Purpose                            |
| -------------- | --------------------------------- | ---------------------------------------- | ---------------------------------- |
| Planning       | `content-brief`                   | `creator-resources`                      | Define chapter goal and structure. |
| Research       | `research-synthesis`              | `firecrawl`, `fetch`, `citation-manager` | Ground claims and source notes.    |
| Drafting       | `book-writer`                     | `filesystem`, `storage`                  | Produce chapters and sections.     |
| Voice and edit | `brand-voice`, `editorial-review` | `memory-mcp`, `CreatorMemoryStore`       | Maintain continuity and quality.   |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FileSystemAdapter } from "@deskcreate/agentcraft/adapters";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
  .use(
    FileSystemAdapter.connect({
      rootPath: "./book",
      allowedExtensions: [".md"],
    }),
  )
  .use(CreatorPacks.book({ contentRoot: "./book", memory: true }));

const response = await agent.run({
  prompt:
    "Draft chapter 2 from the outline and keep the same voice as chapter 1.",
});
console.log(response.content);
```

## Configuration

| Option            | Required | Default   | Purpose                                               |
| ----------------- | -------- | --------- | ----------------------------------------------------- |
| `memory`          | No       | `false`   | Stores voice, structure, and recurring terms.         |
| `contentRoot`     | No       | Undefined | Chapter workspace.                                    |
| `cache`           | No       | `false`   | Reuses book-level context and research.               |
| `skillActivation` | No       | `auto`    | Lets planning, writing, or review activate naturally. |

## Examples

Use a directive when doing a focused editorial pass:

```ts
await agent.run({
  prompt:
    "/editorial-review Review chapter 4 for repetition and weak transitions.",
});
```

See [Creator Memory](../memory.md) for continuity patterns.
