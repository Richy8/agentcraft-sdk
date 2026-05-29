# Creator Analytics

`FileSystemAnalyticsHistoryStore` and `AnalyticsAdapter` were removed in **v0.3.0**.

For structured reporting and experiment tracking, use [AgentReports](../production/agent-reports.md) and [ArtifactStore](../persistence/artifact-store.md) directly.

```ts
import { Agent, Provider, MemoryArtifactStore } from "@deskcreate/agentcraft";
import { AgentReports } from "@deskcreate/agentcraft";

const store = new MemoryArtifactStore();

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize the top 3 learnings from Q1 content experiments.",
});

// Save the result as a typed artifact
await store.save({
  type: "analysis-report",
  content: response.content,
  metadata: { period: "Q1-2026" },
});

console.log(response.content);
```

See [ArtifactStore](../persistence/artifact-store.md) for file, memory, and SQLite backends.
