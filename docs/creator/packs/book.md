# Book Pack

The book pack is built for positioning, outlines, chapters, continuity, developmental editing, and citation review. It is memory-friendly because books need consistent voice, definitions, promises, and argument architecture across many sessions.

## Coverage

| Stage       | Included Skills           | Tools to Attach                   | Purpose                                                          |
| ----------- | ------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| Positioning | `book-positioning`        | `CreatorResourcesAdapter`, memory | Define promise, reader transformation, and shelf fit.            |
| Structure   | `book-outline-writer`     | filesystem, memory                | Build chapter sequence and argument logic.                       |
| Drafting    | `book-chapter-writer`     | filesystem, artifact store        | Produce chapters and sections from a clear chapter job.          |
| Continuity  | `book-continuity-review`  | filesystem, memory                | Catch repeated claims, contradictions, and terminology drift.    |
| Editing     | `book-developmental-edit` | filesystem                        | Improve structure, pacing, argument strength, and reader payoff. |
| Evidence    | `book-citation-review`    | fetch, citation tools             | Check source use, quote handling, and evidence boundaries.       |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FileSystemAdapter } from "@deskcreate/agentcraft/adapters";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "auto",
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
    "Draft chapter 2 from the outline, preserve the book's central promise, and flag continuity risks against chapter 1.",
});
console.log(response.content);
```

## Focused Review

```ts
await agent.run({
  prompt:
    "/review-book-continuity Review chapter 4 for repeated argument, terminology drift, and unresolved setup from earlier chapters.",
});
```

See [Creator Memory](../memory.md) for continuity patterns.
