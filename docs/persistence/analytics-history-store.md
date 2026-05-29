# Analytics History Store

`FileSystemAnalyticsHistoryStore` and `AnalyticsAdapter` were removed in **v0.3.0**.

For tracking performance data across agent runs, use `ArtifactStore` with a typed schema:

```ts
import { Agent, FileArtifactStore, Provider } from "@deskcreate/agentcraft";
import { z } from "zod";

const PerformanceReport = z.object({
  postId: z.string(),
  publishedAt: z.string(),
  impressions: z.number(),
  clicks: z.number(),
  notes: z.string().optional(),
});

const store = new FileArtifactStore({ root: ".agentcraft/analytics" });

// Save a report
await store.write("performance-report", {
  id: "post-2025-06-01",
  data: PerformanceReport.parse({
    postId: "post-2025-06-01",
    publishedAt: "2025-06-01T10:00:00Z",
    impressions: 8400,
    clicks: 320,
    notes: "Highest CTR this quarter",
  }),
});

// Read back and inject into agent context
const report = await store.read("performance-report", "post-2025-06-01");

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const analysis = await agent.run({
  prompt: `Analyze this performance report and recommend what to write next.\n\n${JSON.stringify(report?.data, null, 2)}`,
});

console.log(analysis.content);
```

## Related

- [Artifact Store](./artifact-store.md) — generic typed persistence
- [Semantic Memory](./semantic-memory.md) — cross-run vector memory
- [Creator Overview](../creator/overview.md)
