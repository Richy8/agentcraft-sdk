# Creator Overview

The creator system turns AgentCraft into a workflow engine for research, planning, writing, SEO, video, social, publishing preparation, analytics, and repurposing.

## What It Includes

| Piece            | Purpose                                           | More                                |
| ---------------- | ------------------------------------------------- | ----------------------------------- |
| Creator packs    | Curated skill bundles.                            | [Creator Packs](./packs.md)         |
| Creator skills   | 28 specialized skills.                            | [Creator Skills](./skills.md)       |
| Creator adapters | SEO, citations, resources, publishing, analytics. | [Creator Adapters](./adapters.md)   |
| Memory           | Brand voice and corpus retrieval.                 | [Creator Memory](./memory.md)       |
| Analytics        | Performance and experiment history.               | [Creator Analytics](./analytics.md) |
| Workflows        | Blog, SEO, video, social, publishing.             | [Creator Workflows](./workflows.md) |

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
}).use(CreatorPacks.blog({ readOnlyByDefault: true }));

const response = await agent.run({
  prompt: "Draft a blog post about AI agents.",
});
console.log(response.content);
```

## Recommended Reading

1. [Creator Packs](./packs.md)
2. [Creator Skills](./skills.md)
3. [Creator Memory](./memory.md)
4. [Creator Workflows](./workflows.md)
