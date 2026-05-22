# Tools And Adapters Examples

These examples combine native adapters with tool policy so you can add capability without opening unnecessary side effects.

## Web Search

Add live search with a domain-restricted fetch adapter:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "Search for the latest TypeScript 5.x release notes and summarize what changed.",
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
}).use(FetchAdapter.connect({
  allowedDomains: ["developer.mozilla.org", "tc39.es"],
  maxResponseBytes: 100_000,
}));

const response = await agent.run({
  prompt: "Fetch https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise and explain the `Promise.allSettled` method.",
});
console.log(response.content);
```

## Read Files Locally

Read source code, markdown, or config files within a bounded directory:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: { readOnly: true },
}).use(FileSystemAdapter.connect({
  rootPath: "./src",
  readOnly: true,
  allowedExtensions: [".ts", ".tsx"],
}));

const response = await agent.run({
  prompt: "Read src/agent/agent.ts and explain the run() method signature.",
});
console.log(response.content);
```

## Write Files With Approval

Write files but gate every write tool call on explicit approval:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    requireConfirmation: ["write_file", "delete_file"],
    maxResultBytes: 20_000,
  },
}).use(FileSystemAdapter.connect({
  rootPath: "./content",
  allowedExtensions: [".md"],
}));

const response = await agent.run({
  prompt: "Write a blog post about semantic caching to ./content/semantic-caching.md.",
  budget: { maxToolCalls: 4 },
});
console.log(response.content);
```

## Search + File Read Pipeline

Combine web search and file reading for research-and-save workflows:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  FileSystemAdapter,
  TavilySearchAdapter,
} from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(FileSystemAdapter.connect({
    rootPath: "./research",
    allowedExtensions: [".md"],
  }));

const response = await agent.run({
  prompt: `Research the top 3 TypeScript agent frameworks in 2025.
Write a comparison markdown document to ./research/agent-frameworks.md.`,
  budget: { maxToolCalls: 8 },
  toolPolicy: { approvedTools: ["tavily_search", "write_file"] },
});
console.log(response.content);
```

## Browser Automation

Use Playwright for visual verification and interaction:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { PlaywrightAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(PlaywrightAdapter.connect({ headless: true }));

const response = await agent.run({
  prompt: `Navigate to http://localhost:3000/checkout.
  Verify the CTA button "Start Free Trial" is visible above the fold.
  Report any console errors or missing elements.`,
  budget: { maxToolCalls: 5 },
});
console.log(response.content);
```

## Email Send With Approval

Send emails with an explicit approval gate before dispatch:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { EmailAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: { requireConfirmation: ["send_email"] },
}).use(EmailAdapter.connect({
  provider: "sendgrid",
  apiKey: process.env.SENDGRID_API_KEY!,
  from: "agent@company.com",
}));

const response = await agent.run({
  prompt: `Draft and send a follow-up email to team@company.com about the Q3 roadmap review meeting scheduled for next Tuesday at 2pm.`,
});
console.log(response.content);
```

More detail: [Adapters Overview](../adapters/overview.md), [Adapters Safety](../adapters/safety.md), [Tool Policy](../tools/tool-policy.md).
