# Adapter Config

Adapter config connects native tools such as GitHub, files, search, browser automation, storage, analytics, and publishing.

## Pattern

| Step    | Action                                                           | Required?   | Related page                                 |
| ------- | ---------------------------------------------------------------- | ----------- | -------------------------------------------- |
| Import  | `import { FetchAdapter } from '@deskcreate/agentcraft/adapters'` | Yes         | [Built-In Adapters](../adapters/built-in.md) |
| Connect | `FetchAdapter.connect(config)`                                   | Yes         | [Adapter Configs](../adapters/configs.md)    |
| Attach  | `agent.use(adapter)`                                             | Yes         | [Agents](../core/agents.md)                  |
| Govern  | `toolPolicy`, guardrails, approvals                              | Recommended | [Tool Policy](./tool-policy-config.md)       |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  FetchAdapter,
  FileSystemAdapter,
} from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(FetchAdapter.connect({ allowedDomains: ["developer.mozilla.org"] }))
  .use(
    FileSystemAdapter.connect({
      rootPath: "./content",
      allowedExtensions: [".md"],
    }),
  );

const response = await agent.run({
  prompt: "List all markdown files in the content folder.",
});
console.log(response.content);
```

## Configuration

| Option group    | Required         | Default         | Purpose                            |
| --------------- | ---------------- | --------------- | ---------------------------------- |
| Credentials     | Adapter-specific | None            | API access.                        |
| Scope limits    | Recommended      | Adapter default | Domains, paths, channels, indexes. |
| Runtime options | No               | Adapter default | Timeout and audit hooks.           |
| Safety metadata | Built in         | Tool default    | Side-effect and approval rules.    |

More variants: [tools and adapters cookbook](../examples-cookbook/tools-adapters.md).
