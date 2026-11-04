# Creator System

The creator-specific adapters (`CreatorResourcesAdapter`, `AnalyticsAdapter`, `PublishingAdapter`, `SeoAdapter`, `CitationManagerAdapter`, `LinkCheckerAdapter`) and memory stores (`FileSystemCreatorMemoryStore`, `FileSystemAnalyticsHistoryStore`) were removed in **v0.3.0**.

For content workflows, use general-purpose primitives:

- **Inject brand voice** via [Skills](../skills/overview.md) — define a `Skill` with your tone guide and output contract as reference files.
- **Persist facts across runs** via [Semantic Memory](../persistence/semantic-memory.md) — `AgentMemory` with a local, Qdrant, Pinecone, or Supabase backend.
- **Structure outputs** via [Structured Output](../core/structured-output.md) — enforce schemas for posts, summaries, and reports.
- **Fetch and research** via [FetchAdapter](../adapters/built-in.md#fetchadapter) and [TavilySearchAdapter](../adapters/built-in.md#tavlysearchadapter).

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
