# Security Model

AgentCraft treats all external input as untrusted by default: prompt content, adapter responses, file paths, MCP tool results, scraped pages, and user-uploaded data. Security is enforced at multiple layers — adapter scoping, tool metadata, tool policy, guardrails, approval gates, and budget limits — so no single misconfiguration creates a full vulnerability.

## Threat Model

| Threat | Attack vector | Mitigation |
| --- | --- | --- |
| Prompt injection | Scraped content, MCP tool output, user messages | Directive injection prevention in code blocks; guardrails; tool policy |
| Path traversal | Filesystem MCP with relative paths | `allowedPaths` boundary enforcement; `readOnly: true` default |
| SSRF / domain abuse | FetchAdapter with arbitrary URLs | `allowedDomains` allowlist; domain-level restriction |
| Over-permissioned tools | MCP servers exposing write tools | `allowedTools` MCP allowlisting; tool policy read-only mode |
| Secret leakage | Tool results containing API keys | `redactSecrets: true`; `maxResultBytes` truncation |
| Runaway tool calls | Agents looping on tool use | `maxToolCalls` budget; per-run enforcement |
| Supply chain (MCP) | Unpinned stdio MCP packages | Pinned `npx` with exact version |
| Unauthorized cost | Agents running expensive models | `maxCost` budget; preflight estimation |

## Security Layers

### 1. Adapter Scope

Every adapter restricts what the agent can reach. Scoping is enforced at the adapter level — the agent cannot bypass it by rewriting the tool call.

```ts
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";

// Filesystem: read-only, bounded to allowed paths
FilesystemMCP.connect({
  allowedPaths: ["./content"],
})

// Fetch: allowlisted domains only
FetchAdapter.connect({
  allowedDomains: ["api.github.com", "raw.githubusercontent.com"],
  maxResponseBytes: 500_000,
})
```

### 2. Tool Policy

Tool policy controls approval gates, read-only enforcement, and tool allowlisting at the agent or workspace level:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,                // blocks all write-side-effect tools
    maxResultBytes: 20_000,        // truncates large tool results
    redactSecrets: true,           // redacts secret-like patterns from results
    onApprovalRequired: async ({ tool }) => ["publish_draft", "send_email"].includes(tool.name),
  },
});
```

### 3. Runtime Budget

Budgets cap tool calls and cost on every run, preventing runaway loops or expensive accidental calls:

```ts
const response = await agent.run({
  prompt: "Research and summarize the top 10 TypeScript libraries.",
  budget: {
    maxToolCalls: 8,    // stop after 8 tool calls
    maxCost: 0.10,      // stop if estimated cost exceeds $0.10
  },
});
```

### 4. Guardrails

Guardrails inspect tool inputs and outputs before they cross a tool boundary:

```ts
import {
  Agent,
  Provider,
  blockPiiGuardrail,
  blockPromptInjectionGuardrail,
} from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: {
    inputGuardrails: [blockPromptInjectionGuardrail],
    outputGuardrails: [blockPiiGuardrail, blockPromptInjectionGuardrail],
    guardrailMode: "enforce",
  },
});
```

### 5. Approval Queue

Write tools can require explicit approval before execution. Use `ApprovalQueue` for programmatic gating or human-in-the-loop review:

```ts
import { Agent, ApprovalQueue, Provider } from "@deskcreate/agentcraft";
import { SlackMCP } from "@deskcreate/agentcraft/mcp";

const queue = ApprovalQueue.create();

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    approvalQueue: queue,
    onApprovalRequired: async ({ tool }) => tool.name === "slack_post_message",
  },
})
  .use(SlackMCP.connect({
    botToken: process.env.SLACK_BOT_TOKEN!,
    teamId: process.env.SLACK_TEAM_ID!,
  }));

// Approve programmatically
queue.onRequest(async ({ toolName, args }) => {
  console.log(`[approval] ${toolName}:`, args);
  return true; // or false to deny
});
```

### 6. MCP Server Scoping

MCP servers must have their tools explicitly allowlisted. Never mount an MCP server without specifying `allowedTools`:

```ts
import { GitHubMCP, MCP } from "@deskcreate/agentcraft/mcp";

// ✓ Allowlisted — agent can only read PRs and files
GitHubMCP.connect({
  token: process.env.GITHUB_TOKEN!,
  allowedTools: ["list_pull_requests", "get_pull_request", "get_file_contents"],
})

// ✗ No allowlist — agent has access to all GitHub tools (create, delete, push)
GitHubMCP.connect({
  token: process.env.GITHUB_TOKEN!,
})
```

For stdio MCP packages, always pin the version:

```ts
import { MCP } from "@deskcreate/agentcraft/mcp";

// ✓ Pinned version — supply chain safe
MCP.connect({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem@1.2.3", "/path/to/root"],
  allowedTools: ["read_file", "list_directory"],
})

// ✗ Unpinned — can silently pull malicious updates
MCP.connect({
  command: "npx",
  args: ["@modelcontextprotocol/server-filesystem", "/path/to/root"],
})
```

## Production Security Baseline

The minimum security configuration for a production agent:

```ts
import { Agent, AgentWorkspace, AgentCache, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";

const workspace = AgentWorkspace.create({
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 50_000,
    redactSecrets: true,
  },
  budget: { maxCost: 1.00, maxToolCalls: 20 },
  cache: AgentCache.file(".cache", { strategy: "conservative" }),
  adapters: [
    FilesystemMCP.connect({ allowedPaths: ["./content"] }),
    TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }),
  ],
});

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
```

## Security Checklist

| Category | Check |
| --- | --- |
| Adapters | Scope every adapter (domain, path, channel, or project) |
| Adapters | Set `readOnly: true` on all adapters unless writes are required |
| Adapters | Set `allowedPaths` on `FilesystemMCP` to restrict directory access |
| Adapters | Set `allowedDomains` on `FetchAdapter` |
| Tool policy | Set `readOnly: true` at workspace or agent level |
| Tool policy | Set `redactSecrets: true` |
| Tool policy | Gate write tools with `onApprovalRequired` callback |
| MCP | Specify `allowedTools` for every MCP server |
| MCP | Pin stdio MCP packages with exact versions |
| Budget | Set `maxCost` and `maxToolCalls` on every production run |
| Guardrails | Enable `blockInjectionPatterns` for agents processing external input |
| Secrets | Load all API keys from environment variables, never hard-code |
| Secrets | Use `process.env.X!` assertion pattern, not string literals |
| Testing | Add regression tests for prompt injection, path traversal, and destructive actions |

## Testing Security Behavior

Test that your tool policy and adapter scoping are enforced:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";
import { DeterministicFakeProvider } from "@deskcreate/agentcraft/testing";

test("agent cannot read outside allowedPaths", async () => {
  const agent = Agent.create({
    model: Provider.openai["gpt-4o-mini"],
    apiKey: "test",
    provider: DeterministicFakeProvider.create({
      responses: [{ content: "I will try to read /etc/passwd" }],
    }),
  }).use(FilesystemMCP.connect({
    allowedPaths: ["./content"],
  }));

  const response = await agent.run({ prompt: "Read /etc/passwd" });
  // The adapter rejects the path traversal attempt
  expect(response.content).not.toContain("root:x:");
});

test("agent respects maxToolCalls budget", async () => {
  const response = await agent.run({
    prompt: "Research everything you can find about TypeScript.",
    budget: { maxToolCalls: 2 },
  });

  expect(response.cache?.toolCallsAvoided ?? 0 + (response.measurement?.toolCalls ?? 0))
    .toBeLessThanOrEqual(2);
});
```

## Related

- [Adapters Safety](../adapters/safety.md) — threat model and adapter security patterns
- [Tool Policy](../tools/tool-policy.md) — full tool policy configuration
- [Guardrails](../tools/guardrails.md) — input sanitization and content filtering
- [MCP Security](../mcp/security.md) — MCP-specific threat model and mitigations
- [Governance Queue](./governance-queue.md) — approval queue for write tool gates
