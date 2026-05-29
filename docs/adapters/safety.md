# Adapter Safety

Adapters expose real-world capabilities to the model — web fetches, API calls, database queries. Unsafe adapters can exfiltrate data, corrupt state, or make irreversible changes at model direction. This page covers how to scope, constrain, and monitor adapter behavior.

## Security Checklist

Before attaching any adapter to a production agent:

- Scope credentials to the minimum required permissions
- Use `readOnly: true` on any adapter that should not mutate state
- Set `toolPolicy.maxResultBytes` to prevent large tool results from overflowing context
- Enable `redactSecrets: true` to strip credentials from tool results before they reach the model
- Mark write tools with `requiresConfirmation: true` to require approval before execution
- Set `allowedDomains` on `FetchAdapter` to prevent SSRF
- Treat external data as untrusted — enable guardrails for prompt injection defense

## Metadata Fields

Every adapter's `metadata` documents its security posture. Use it to make informed decisions about trust:

```ts
import { createAdapter } from "@deskcreate/agentcraft/adapters";

const myAdapter = createAdapter({
  name: "my-data-source",
  metadata: {
    kind: "native-sdk",           // how it's implemented
    auth: "api-key",              // credential model
    trustLevel: "review-required", // tool results should be reviewed
    sideEffects: ["read"],        // only reads, no writes
    scopes: ["database", "web"],  // permission domains
    requiredSecrets: ["DATA_API_KEY"], // env vars needed
    readOnly: true,               // signals non-mutating adapter
  },
  tools: [/* ... */],
});
```

| Field | Values | Purpose |
| --- | --- | --- |
| `kind` | `"native-sdk"`, `"mcp-backed"`, `"custom"`, `"placeholder"` | How the adapter is implemented |
| `auth` | `"none"`, `"api-key"`, `"oauth"`, `"aws"`, `"connection-string"`, `"custom"` | Credential model |
| `trustLevel` | `"trusted"`, `"review-required"`, `"untrusted"` | Whether tool results need review |
| `sideEffects` | `Array<"none" \| "read" \| "write" \| "external">` | Maximum side-effect levels |
| `scopes` | `string[]` | Permission domains (e.g. `"repo"`, `"web"`, `"database"`) |
| `requiredSecrets` | `string[]` | Environment variables the adapter needs |
| `readOnly` | `boolean` | Whether the adapter only performs reads |

## Patterns

### Read-Only Agent

Enforce that no adapter can make writes, regardless of the adapter's own configuration:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  // Block all write tools at the policy level — adapters cannot override this
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 100_000,
    redactSecrets: true,
  },
})
  .use(
    FetchAdapter.connect({
      allowedDomains: ["api.github.com", "raw.githubusercontent.com"],
      allowedProtocols: ["https:"],
    }),
  )
  .use(
    GitHubMCP.connect({
      token: process.env.GITHUB_TOKEN!,
    }),
  );

const response = await agent.run({ prompt: "Summarize open pull requests." });
```

### Approval Gate for Write Operations

Require human approval before any write-side-effect tool executes:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { DatabaseAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    // Return true to approve, false to deny
    onApprovalRequired: async ({ tool }) => {
      const approved = await humanReviewSystem.requestApproval({ toolName: tool.name });
      return approved;
    },
  },
}).use(
  DatabaseAdapter.connect({
    connectionString: process.env.DATABASE_URL!,
  }),
);
```

### Domain Allowlisting (FetchAdapter)

Prevent SSRF and unintended external calls by restricting the fetch adapter to known-safe domains:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  FetchAdapter.connect({
    // Only these domains can be fetched — all others are blocked
    allowedDomains: [
      "api.github.com",
      "raw.githubusercontent.com",
      "registry.npmjs.org",
    ],
    // Limit response size to prevent context overflow
    maxResponseBytes: 500_000,
    // Timeout per request
    timeoutMs: 10_000,
  }),
);
```

Attempts to fetch from unlisted domains are blocked at the adapter level before execution, with an error returned to the model.

### Secret Redaction

Strip credentials and secrets from tool results before they reach the model and get included in conversation history:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { DatabaseAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    redactSecrets: true,      // strip known secret patterns (API keys, tokens, etc.)
    maxResultBytes: 50_000,   // prevent large result payloads from bloating context
  },
}).use(
  DatabaseAdapter.connect({
    connectionString: process.env.DATABASE_URL!,
    readOnly: true,
  }),
);
```

Redaction happens after `execute()` returns but before the result is appended to conversation history. The model never sees the raw value.

### Untrusted External Data — Prompt Injection Defense

Data fetched from external sources (web pages, user-provided files, API responses) may contain prompt injection attempts. Enable guardrails to detect and strip injected instructions:

```ts
import { Agent, Provider, blockPromptInjectionGuardrail } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    // Block results containing prompt injection patterns
    outputGuardrails: [blockPromptInjectionGuardrail],
  },
}).use(
  FetchAdapter.connect({
    allowedDomains: ["docs.example.com"],
  }),
);
```

### Audit Logging

Log every tool call and its outcome to a durable audit trail:

```ts
import { AgentWorkspace, Agent, Provider } from "@deskcreate/agentcraft";
import * as fs from "node:fs";

const workspace = AgentWorkspace.memory();
const auditLog = fs.createWriteStream("adapter-audit.log", { flags: "a" });

// Log every tool call
workspace.events.on("tool.called", ({ toolName, sideEffectLevel }) => {
  auditLog.write(JSON.stringify({
    ts: new Date().toISOString(),
    event: "tool.called",
    toolName,
    sideEffectLevel,
  }) + "\n");
});

// Log approval decisions
workspace.events.on("approval.granted", ({ toolName }) => {
  auditLog.write(JSON.stringify({
    ts: new Date().toISOString(),
    event: "approval.granted",
    toolName,
  }) + "\n");
});

workspace.events.on("approval.denied", ({ toolName }) => {
  auditLog.write(JSON.stringify({
    ts: new Date().toISOString(),
    event: "approval.denied",
    toolName,
  }) + "\n");
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  workspace,
});
```

## Dependency Validation

When an adapter declares that it `dependsOn` another adapter, the attachment manager checks that the dependency is present before the run proceeds:

```ts
import { createAdapter } from "@deskcreate/agentcraft/adapters";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";
import { AdapterRequirementError } from "@deskcreate/agentcraft";

// This adapter requires FetchAdapter to also be attached
const myWebSummary = createAdapter({
  name: "web-summary",
  dependsOn: [{ adapterName: "fetch" }],
  tools: [/* ... */],
});

// If FetchAdapter is not attached, AdapterRequirementError is thrown
```

## Live Testing Rules

When writing integration tests for adapters:

- Use sandbox environments or test fixtures — never production data
- Clean up any state created during tests (files written, rows inserted)
- If the adapter has external costs (API calls, compute), mock at the network level for unit tests
- Test the golden path, boundary conditions, and failure modes (invalid credentials, empty results, oversized results)

## Related

- [Tool Policy](../tools/tool-policy.md)
- [Guardrails](../tools/guardrails.md)
- [Approvals](../tools/approvals.md)
- [Agent Events](../core/agent-events.md)
- [Security Model](../production/security-model.md)
- [Custom Adapters](./custom.md)
