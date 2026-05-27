# Creator Overview

The creator system turns AgentCraft into a workflow engine for platform-native writing, video, newsletters, books, resumes, publishing readiness, and creator memory. Marketing SEO, ads, analytics, and campaign planning compose cleanly with creator adapters and memory stores.

## What It Includes

| Piece            | Purpose                                               | More                                |
| ---------------- | ----------------------------------------------------- | ----------------------------------- |
| Creator adapters | SEO, citations, resources, publishing, analytics.     | [Creator Adapters](./adapters.md)   |
| Memory           | Brand voice and corpus retrieval.                     | [Creator Memory](./memory.md)       |
| Analytics        | Performance and experiment history.                   | [Creator Analytics](./analytics.md) |

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  CreatorResourcesAdapter,
  AnalyticsAdapter,
} from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(CreatorResourcesAdapter.connect({ memoryStore: myMemoryStore }))
  .use(AnalyticsAdapter.connect({ historyStore: myAnalyticsStore }));

const response = await agent.run({
  prompt: "Draft a blog post about AI agents.",
});
console.log(response.content);
```

## Recommended Reading

1. [Creator Adapters](./adapters.md)
2. [Creator Memory](./memory.md)
3. [Creator Analytics](./analytics.md)
