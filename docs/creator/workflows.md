# Creator Workflows

Creator workflows combine packs, direct skills, adapters, memory, analytics, and cache.

## Blog + SEO

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  SeoAdapter,
  LinkCheckerAdapter,
} from "@deskcreate/agentcraft/adapters";
import { CreatorPacks, MarketingPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
})
  .use(CreatorPacks.blog())
  .use(MarketingPacks.seo())
  .use(SeoAdapter.connect())
  .use(LinkCheckerAdapter.connect());

const response = await agent.run({
  prompt:
    "/write-blog Write an SEO-optimized blog post on agent caching with source and link-readiness notes.",
});
console.log(response.content);
```

## Video

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorResourcesAdapter } from "@deskcreate/agentcraft/adapters";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";
import { FileSystemCreatorMemoryStore } from "@deskcreate/agentcraft";

const memoryStore = new FileSystemCreatorMemoryStore(".agentcraft/memory");

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(CreatorPacks.youtube())
  .use(CreatorResourcesAdapter.connect({ memoryStore }));

const response = await agent.run({
  prompt:
    "Ideate and script a 5-minute YouTube video on AI agents, including retention risks and chapter ideas.",
});
console.log(response.content);
```

## Analytics Feedback Loop

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AnalyticsAdapter } from "@deskcreate/agentcraft/adapters";
import { MarketingPacks } from "@deskcreate/agentcraft/packs";
import { FileSystemAnalyticsHistoryStore } from "@deskcreate/agentcraft";

const historyStore = new FileSystemAnalyticsHistoryStore(
  ".agentcraft/analytics",
);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(MarketingPacks.digitalMarketing())
  .use(AnalyticsAdapter.connect({ historyStore }));

const response = await agent.run({
  prompt: "Analyze my last 10 posts and suggest improvements.",
});
console.log(response.content);
```

## More Variants

- [Creator Examples](../examples-cookbook/creator.md)
- [Creator Pack Workflow](../examples.md#creator-pack-workflow)
- [Creator Memory Analytics](../examples.md#creator-memory-analytics)
