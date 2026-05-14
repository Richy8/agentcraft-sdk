# Creator Workflows

Creator workflows combine packs, direct skills, adapters, memory, analytics, and cache.

## Blog + SEO

```ts
import { Agent, Provider } from "agentcraft";
import { SeoAdapter, LinkCheckerAdapter } from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
})
  .use(CreatorPacks.blog())
  .use(CreatorPacks.seo())
  .use(SeoAdapter.connect())
  .use(LinkCheckerAdapter.connect());

const response = await agent.run({
  prompt: "Write an SEO-optimized blog post on agent caching.",
});
console.log(response.content);
```

## Video

```ts
import { Agent, Provider } from "agentcraft";
import { CreatorResourcesAdapter } from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";
import { FileSystemCreatorMemoryStore } from "agentcraft/persistence";

const memoryStore = new FileSystemCreatorMemoryStore(".agentcraft/memory");

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(CreatorPacks.video())
  .use(CreatorResourcesAdapter.connect({ memoryStore }));

const response = await agent.run({
  prompt: "Ideate and script a 5-minute video on AI agents.",
});
console.log(response.content);
```

## Analytics Feedback Loop

```ts
import { Agent, Provider } from "agentcraft";
import { AnalyticsAdapter } from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";
import { FileSystemAnalyticsHistoryStore } from "agentcraft/persistence";

const historyStore = new FileSystemAnalyticsHistoryStore(
  ".agentcraft/analytics",
);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(CreatorPacks.analytics())
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
