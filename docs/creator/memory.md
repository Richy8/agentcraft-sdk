# Creator Memory

`FileSystemCreatorMemoryStore` and `CreatorResourcesAdapter` were removed in **v0.3.0**.

Use [AgentMemory](../persistence/semantic-memory.md) for cross-run fact persistence, and [Skills](../skills/overview.md) to inject brand voice and content constraints at run time.

```ts
import { Agent, AgentMemory, Provider } from "@deskcreate/agentcraft";
import { Skill } from "@deskcreate/agentcraft/skills";

// Persist facts across runs with semantic memory
const memory = AgentMemory.create({ backend: "local" });

// Inject brand voice and constraints via a skill
const brandVoice = Skill.define({
  name: "brand-voice",
  description: "Applies tone: practical, direct, evidence-led.",
  instructions: "Lead with the claim. Active voice. No filler.",
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  memory,
}).use(brandVoice);

await agent.run({ prompt: "Remember: our primary audience is engineering leads." });

const response = await agent.run({
  prompt: "Draft a post about our caching strategy update.",
});
console.log(response.content);
```

See [Semantic Memory](../persistence/semantic-memory.md) for backend options (Qdrant, Pinecone, Supabase) and [Skills](../skills/overview.md) for tone, format, and output contracts.
