# MCP Security

MCP servers expose broad external capabilities — filesystem access, API calls, database reads, browser automation. An MCP server with no restrictions can be directed by the model to exfiltrate data, execute arbitrary commands, or make irreversible changes. This page covers the threat model and concrete mitigations.

## Threat Model

### Prompt Injection via MCP Results

An MCP server fetches external content (a web page, a document, a database row) that contains embedded instructions designed to hijack the model's behavior. The model follows the injected instruction instead of the user's intent.

**Mitigation:** Treat all MCP tool results as untrusted external data. Enable output guardrails and set `trustLevel: "untrusted"` for servers that read user-controlled content.

### Over-Permissioned Tool Surface

Without allowlisting, every tool the server advertises is exposed to the model. A GitHub MCP server may expose 50+ tools — most of which are write operations that an analysis task should never call.

**Mitigation:** Always set `allowedTools` to the minimum required for the task. Add `toolPolicy.readOnly: true` for agents that should only read.

### Supply Chain — Stdio Command Drift

A stdio server launched with `npx @some-package/mcp-server` (without a pinned version) may execute a different package version on the next run, including a compromised one.

**Mitigation:** Always pin stdio packages to a specific version: `npx @some-package/mcp-server@1.2.3`.

### Credential Leakage

MCP tool results may include raw credentials, tokens, or PII fetched from external sources. These flow into conversation history and may appear in subsequent model outputs.

**Mitigation:** Enable `toolPolicy.redactSecrets: true`. Limit result size with `maxResultBytes`.

### Resource Scope Escape

An MCP server with filesystem access may expose files outside the intended directory if `roots` or `allowedResources` are not set.

**Mitigation:** Set `roots` (filesystem boundary) and `allowedResources` (URI prefix allowlist) on all file-reading MCP servers.

## Security Checklist

Before attaching any MCP server to a production agent:

| Check | Action |
| --- | --- |
| Pin stdio packages | Use `@package@version` not `@package/latest` |
| Allowlist tools | Set `allowedTools` to the minimum needed |
| Allowlist resources | Set `allowedResources` for resource-reading servers |
| Set roots | Set `roots` for filesystem-scoped servers |
| Apply tool policy | Use `toolPolicy.readOnly`, `maxResultBytes`, `redactSecrets` |
| Add guardrails | Enable `PromptInjectionGuardrail` for servers that fetch external content |
| Require approval | Set `requiresConfirmation: true` or `sideEffectPolicy.write: "queue"` for write tools |
| Review trust level | Set `trustLevel` based on how much you trust the server's output |

## Safe Patterns

### Read-Only MCP Agent

Block all writes at the policy level, cap result size, and strip secrets:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,          // block all write-side-effect MCP tools
    maxResultBytes: 100_000, // prevent context overflow
    redactSecrets: true,     // strip tokens from results
  },
}).use(
  GitHubMcp.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    // Only expose read tools
    allowedTools: [
      "list_issues",
      "get_issue",
      "list_pull_requests",
      "get_file_contents",
    ],
  }),
);
```

### Prompt Injection Defense — Untrusted Content

When an MCP server fetches user-controlled or external content, enable guardrails:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FetchMcp } from "@deskcreate/agentcraft/mcp";
import { PromptInjectionGuardrail } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    // Block tool results that contain prompt injection attempts
    outputGuardrails: [PromptInjectionGuardrail.create({ mode: "block" })],
    maxResultBytes: 500_000,
  },
}).use(
  FetchMcp.connect({
    // Only fetch from known-safe domains
    allowedDomains: ["docs.example.com", "api.example.com"],
  }),
);
```

### Pinned Stdio Package

Prevent supply chain drift by pinning the exact package version:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MCPAdapter } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  MCPAdapter.connect({
    transport: "stdio",
    command: "npx",
    // Always pin the version — never use "latest"
    args: ["@modelcontextprotocol/server-filesystem@1.0.2", "/workspace/docs"],
    allowedTools: ["read_file", "list_directory"],
    // Restrict to a specific directory
    roots: [{ uri: "file:///workspace/docs", name: "docs" }],
  }),
);
```

### Write Tools With Approval

Require human approval before any MCP write tool executes:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    sideEffectPolicy: {
      write: "queue",    // queue write tools for approval
      external: "allow", // allow reads through immediately
    },
    onApprovalRequest: async ({ toolName, args }) => {
      console.log(`Approve ${toolName}?`, JSON.stringify(args, null, 2));
      const input = await promptUser("Approve? (y/n): ");
      return input.trim() === "y" ? "approved" : "denied";
    },
  },
}).use(
  GitHubMcp.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    allowedTools: ["list_issues", "create_issue", "create_pull_request"],
  }),
);
```

### Allowlist Resources and Roots

For servers that read documents or files, scope their access to specific paths:

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/mcp";

const filesystemMcp = MCPAdapter.connect({
  transport: "stdio",
  command: "npx",
  args: ["@modelcontextprotocol/server-filesystem@1.0.2", "/data"],
  // Only allow these URI prefixes (resources)
  allowedResources: ["file:///data/reports/", "file:///data/exports/"],
  // Declare filesystem roots
  roots: [
    { uri: "file:///data/reports", name: "reports" },
    { uri: "file:///data/exports", name: "exports" },
  ],
});
```

### Scoped Trusted MCP

For fully trusted internal MCP servers (e.g. your own), you can relax restrictions — but still cap result sizes:

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/mcp";

const internalMcp = MCPAdapter.connect({
  transport: "http",
  url: "https://internal-mcp.yourcompany.com",
  headers: { Authorization: `Bearer ${process.env.INTERNAL_MCP_TOKEN}` },
  // No tool allowlist — trust all tools from this internal server
  // But still cap result sizes to prevent context overflow
});

// Then apply policy at the agent level
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: {
    maxResultBytes: 200_000,
    redactSecrets: false, // internal server results are pre-redacted
  },
}).use(internalMcp);
```

## Trust Levels

Set `trustLevel` in the MCP wrapper or adapter metadata to communicate the server's trust posture to the policy layer:

| Level | When to use | Effect |
| --- | --- | --- |
| `"trusted"` | Your own internal server | Results passed through without extra scrutiny |
| `"review-required"` | Known third-party server | Results subject to guardrail checks |
| `"untrusted"` | User-provided server or content | Results blocked by guardrails on injection detection |

## Related

- [MCP Overview](./overview.md)
- [Built-In MCP Wrappers](./built-in.md)
- [Custom MCP Servers](./custom.md)
- [Guardrails](../tools/guardrails.md)
- [Approvals](../tools/approvals.md)
- [Security Model](../production/security-model.md)
- [Tool Policy](../tools/tool-policy.md)
