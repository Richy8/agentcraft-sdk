# Creator Pack Config

Creator pack config applies shared behavior to a group of creator skills. The available value of each setting depends on the tools attached to the agent.

## Fields

| Option            | Required | Default   | Purpose                                                       |
| ----------------- | -------- | --------- | ------------------------------------------------------------- |
| `contentRoot`     | No       | Undefined | Workspace for drafts, briefs, and artifacts.                  |
| `cacheRoot`       | No       | Undefined | Pack-oriented cache location when used by cache integrations. |
| `memory`          | No       | `false`   | Enables creator memory behavior when a store/tool exists.     |
| `skillActivation` | No       | `auto`    | `always`, `auto`, or `directive-only`.                        |

## More Fields

| Option              | Required | Default           | Purpose                                       |
| ------------------- | -------- | ----------------- | --------------------------------------------- |
| `cache`             | No       | `false`           | `false`, `auto`, or `aggressive`.             |
| `toolSelection`     | No       | `auto`            | `auto` or `all`.                              |
| `readOnlyByDefault` | No       | `false`           | Treats write-like activity as approval-bound. |
| `budget`            | No       | Agent/run default | Caps pack-heavy workflows.                    |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
}).use(
  CreatorPacks.blog({
    contentRoot: "./content",
    memory: true,
    cache: "auto",
    skillActivation: "auto",
    toolSelection: "auto",
    readOnlyByDefault: true,
  }),
);

const response = await agent.run({
  prompt: "Draft a blog post about agent caching.",
});
console.log(response.content);
```

See [Creator Packs](../creator/packs.md) for every pack and [pack pages](../creator/packs/default.md) for per-pack examples.
