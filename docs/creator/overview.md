# Creator Overview

The creator system turns AgentCraft into a workflow engine for platform-native writing, video, newsletters, books, resumes, publishing readiness, and creator memory. Marketing SEO, ads, analytics, and campaign planning live in the marketing and data analytics packs and compose cleanly with creator packs.

## What It Includes

| Piece            | Purpose                                                                                                      | More                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| Creator packs    | Curated skill bundles.                                                                                       | [Creator Packs](./packs.md)         |
| Creator skills   | Platform-specific skills across blog, Medium, LinkedIn, YouTube, TikTok, newsletter, book, resume, and more. | [Creator Skills](./skills.md)       |
| Creator adapters | SEO, citations, resources, publishing, analytics.                                                            | [Creator Adapters](./adapters.md)   |
| Memory           | Brand voice and corpus retrieval.                                                                            | [Creator Memory](./memory.md)       |
| Analytics        | Performance and experiment history.                                                                          | [Creator Analytics](./analytics.md) |
| Workflows        | Blog, Medium, video, newsletter, resume, and marketing-adjacent workflows.                                   | [Creator Workflows](./workflows.md) |

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

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
