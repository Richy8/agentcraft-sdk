# Creator Adapters

The creator-specific adapters (`CreatorResourcesAdapter`, `AnalyticsAdapter`, `PublishingAdapter`, `SeoAdapter`, `CitationManagerAdapter`, `LinkCheckerAdapter`) were removed in **v0.3.0**.

For content workflows, use the general-purpose adapters:

| Adapter               | Use for                           |
| --------------------- | --------------------------------- |
| `FetchAdapter`        | Fetch web content, API responses  |
| `TavilySearchAdapter` | Web search and research           |
| `DatabaseAdapter`     | Read from Postgres, MySQL, SQLite |

For brand voice and content rules, define a `Skill` with your tone guide:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { Skill } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const brandVoice = Skill.define({
  name: "brand-voice",
  description: "Applies our tone: practical, evidence-led, no filler phrases.",
  instructions: `
Write in an active, confident voice. Lead with the claim, not the context.
Avoid: "In today's world", "It is worth noting", "game-changing".
Prefer specific numbers and named systems over vague adjectives.
  `.trim(),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(brandVoice)
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt:
    "Research and draft a LinkedIn post about AI agent caching strategies.",
});
console.log(response.content);
```

## Related

- [Creator Overview](./overview.md)
- [Adapters Overview](../adapters/overview.md)
- [Skills Overview](../skills/overview.md)
- [Semantic Memory](../persistence/semantic-memory.md)
