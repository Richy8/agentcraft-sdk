# Tools And Adapters Examples

These examples combine native adapters with tool policy so you can add capability without opening unnecessary side effects.

## Web Search

Add live search with the Tavily search adapter:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt:
    "Search for the latest TypeScript 5.x release notes and summarize what changed.",
  budget: { maxToolCalls: 3 },
});
console.log(response.content);
```

## Read A Web Page

Fetch specific pages from allowlisted domains:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  FetchAdapter.connect({
    allowedDomains: ["developer.mozilla.org", "tc39.es"],
    maxResponseBytes: 100_000,
  }),
);

const response = await agent.run({
  prompt:
    "Fetch https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise and explain the `Promise.allSettled` method.",
});
console.log(response.content);
```

## Read Local Files

Read source code, markdown, or config files within a bounded directory using `FilesystemMCP`:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: { readOnly: true },
}).use(
  FilesystemMCP.connect({
    allowedPaths: ["./src"],
  }),
);

const response = await agent.run({
  prompt: "Read src/agent/agent.ts and explain the run() method signature.",
});
console.log(response.content);
```

## Write Files With Approval

Write files but gate every write tool call on explicit approval:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    onApprovalRequired: async ({ tool }) => {
      // Approve write and create operations, deny everything else
      return ["write_file", "create_directory"].includes(tool.name);
    },
    maxResultBytes: 20_000,
  },
}).use(
  FilesystemMCP.connect({
    allowedPaths: ["./content"],
  }),
);

const response = await agent.run({
  prompt:
    "Write a blog post about semantic caching to ./content/semantic-caching.md.",
  budget: { maxToolCalls: 4 },
});
console.log(response.content);
```

## Search + Save Pipeline

Combine web search and file writing for research-and-save workflows:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: {
    approvedTools: ["tavily_search", "write_file"],
    maxResultBytes: 50_000,
  },
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(FilesystemMCP.connect({ allowedPaths: ["./research"] }));

const response = await agent.run({
  prompt: `Research the top 3 TypeScript agent frameworks in 2025.
Write a comparison markdown document to ./research/agent-frameworks.md.`,
  budget: { maxToolCalls: 8 },
});
console.log(response.content);
```

## Web Scraping With Firecrawl

Scrape and extract structured content from any URL:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FirecrawlMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(FirecrawlMCP.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }));

const response = await agent.run({
  prompt:
    "Scrape the pricing page at https://example.com/pricing and extract all plan names and prices as structured JSON.",
  budget: { maxToolCalls: 3 },
});
console.log(response.content);
```

## Slack Message With Approval

Send messages to Slack with an explicit approval gate before dispatch:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { SlackMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: {
    onApprovalRequired: async ({ tool }) => {
      // Only approve the send operation — not reads
      return tool.name === "slack_post_message";
    },
  },
}).use(
  SlackMCP.connect({
    botToken: process.env.SLACK_BOT_TOKEN!,
    teamId: process.env.SLACK_TEAM_ID!,
  }),
);

const response = await agent.run({
  prompt:
    "Post a message to #engineering about the Q3 roadmap review meeting on Tuesday at 2pm.",
});
console.log(response.content);
```

## Database Query (Read-Only)

Query a database safely with read-only enforcement:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { DatabaseAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 100_000,
  },
}).use(
  DatabaseAdapter.connect({
    connectionString: process.env.DATABASE_URL!,
    readOnly: true,
    rowLimit: 100,
  }),
);

const response = await agent.run({
  prompt:
    "How many users signed up in the last 7 days? Break it down by plan tier.",
});
console.log(response.content);
```

More detail: [Adapters Overview](../adapters/overview.md), [Adapters Safety](../adapters/safety.md), [Tool Policy](../tools/tool-policy.md).
