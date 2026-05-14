# Adapters Overview

Adapters package tools for a system: files, GitHub, web fetch, Slack, analytics, storage, databases, and more.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { FileSystemAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  FileSystemAdapter.connect({
    rootPath: "./docs",
    readOnly: true,
    allowedExtensions: [".md"],
  }),
);

const response = await agent.run({ prompt: "List the markdown files." });
console.log(response.content);
```

## Adapter Anatomy

| Part              | Purpose                            | More                            |
| ----------------- | ---------------------------------- | ------------------------------- |
| `connect(config)` | Creates an `AgentAdapter`.         | [Adapter Configs](./configs.md) |
| `metadata`        | Auth, side effects, scopes, trust. | [Adapter Safety](./safety.md)   |
| `tools`           | Model-callable actions.            | [Tools](../tools/tools.md)      |
| lifecycle hooks   | Adjust runs/results.               | [Custom Adapters](./custom.md)  |

## Built-In Categories

| Category      | Adapters                                              | Details                                                   |
| ------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| Local         | Filesystem, citation manager, creator resources.      | [Built-In Adapters](../reference/built-in-adapters.md)    |
| Web/research  | Fetch, Firecrawl, Tavily, Apify, SEO, link checker.   | [Creator Adapters](../creator/adapters.md)                |
| Communication | Slack, email, Google Calendar.                        | [Production examples](../examples-cookbook/production.md) |
| Data/storage  | Database, Supabase, Redis, Pinecone, storage, Sheets. | [Tool examples](../examples-cookbook/tools-adapters.md)   |
| Media/browser | Playwright, image generation, ElevenLabs.             | [Built-In Adapters](../reference/built-in-adapters.md)    |

## Related

- [Built-In Adapters](../reference/built-in-adapters.md)
- [Custom Adapters](./custom.md)
- [Adapter Configs](./configs.md)
