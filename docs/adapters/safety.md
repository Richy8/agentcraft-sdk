# Adapter Safety

Adapter safety is about constraining what a tool can read, write, and expose.

## Safety Fields

| Field                  | Purpose                       | Example                      |
| ---------------------- | ----------------------------- | ---------------------------- |
| `metadata.auth`        | Documents credential model.   | `api-key`, `oauth`, `custom` |
| `metadata.sideEffects` | Declares maximum behavior.    | `read`, `write`, `external`  |
| `metadata.scopes`      | Labels permission domain.     | `repo`, `web`, `database`    |
| `metadata.readOnly`    | Signals non-mutating adapter. | `true`                       |

## Safer Pattern

```ts
import { Agent, Provider } from "agentcraft";
import { FileSystemAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 100_000,
    redactSecrets: true,
  },
}).use(
  FileSystemAdapter.connect({
    rootPath: "./docs",
    readOnly: true,
    allowedExtensions: [".md"],
  }),
);

const response = await agent.run({ prompt: "List all markdown files." });
console.log(response.content);
```

## Rules

- Scope credentials before passing them into adapters.
- Prefer read-only adapters for analysis and review.
- Mark writes with `requiresConfirmation`.
- Treat external data as untrusted.
- Add live tests only with sandbox fixtures and cleanup.
