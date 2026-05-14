# Tools And Adapters Examples

These examples combine native adapters with tool policy so users can add capability without opening unnecessary side effects.

## Read A Web Page

```ts
import { Agent, Provider } from "agentcraft";
import { FetchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(FetchAdapter.connect({ allowedDomains: ["developer.mozilla.org"] }));

const response = await agent.run({
  prompt: "Read the URL I provide and summarize the API contract.",
});
console.log(response.content);
```

## Write Drafts Locally

```ts
import { Agent, Provider } from "agentcraft";
import { FileSystemAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: { maxResultBytes: 20_000 },
}).use(
  FileSystemAdapter.connect({
    rootPath: "./content",
    allowedExtensions: [".md"],
  }),
);

const response = await agent.run({
  prompt: "Write the draft to ./content/draft.md.",
  budget: { maxToolCalls: 4 },
  toolPolicy: { approvedTools: ["write_file"] },
});
console.log(response.content);
```

## Browser Check

```ts
import { Agent, Provider } from "agentcraft";
import { PlaywrightAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(PlaywrightAdapter.connect({ headless: true }));

const response = await agent.run({
  prompt:
    "Open the staging page, confirm the hero CTA is visible, and report issues.",
});
console.log(response.content);
```

More detail: [Adapters](../adapters/overview.md), [Tools](../tools/tools.md), [Approvals](../tools/approvals.md).
