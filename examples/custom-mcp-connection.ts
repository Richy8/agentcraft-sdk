import { Agent, MCPAdapter, Provider } from "@deskcreate/agentcraft";

// Use MCPAdapter.connect when AgentCraft does not ship a wrapper for the server
// you need, or when your company hosts an internal MCP server.
const internalDocsMcp = MCPAdapter.connect({
  // transport is mandatory. Values:
  // - 'stdio': starts a local command or package as a child process.
  // - 'http': talks to a JSON-RPC MCP endpoint.
  // - 'sse': talks to an MCP endpoint that streams server-sent events.
  transport: "stdio",
  // name is optional but strongly recommended. It appears in traces and adapter metadata.
  name: "internal-docs",
  // command is required for stdio. Keep this allowlisted in production.
  command: "npx",
  // Pin package versions for stdio package launches. Unpinned specs are useful
  // in prototypes but risky in production because the package can change later.
  args: ["-y", "@acme/internal-docs-mcp@1.2.3"],
  allowedCommands: ["npx"],
  rejectUnpinnedPackage: true,
  // env is optional. Use it only for secrets the MCP server requires.
  // Keep the actual secret in the environment, not in source control.
  env: { DOCS_TOKEN: process.env.DOCS_TOKEN! },
  // discovery controls when tools are loaded. Values:
  // - 'lazy': discover when the agent first needs tools.
  // - 'eager': discover during adapter init so startup fails earlier.
  discovery: "lazy",
  // Allowlist only the tools this agent should use. This is one of the most
  // important MCP production controls.
  allowedTools: ["search_docs", "read_doc"],
  // allowedResources is optional. Use it when the server exposes resources
  // and the agent should only see approved URIs.
  allowedResources: ["docs://public"],
  // roots is optional. It constrains rooted servers to approved paths or URIs.
  roots: ["https://docs.example.com"],
  timeoutMs: 15_000,
  metadata: {
    trustLevel: "review-required",
    packageName: "@acme/internal-docs-mcp@1.2.3",
    packagePinned: true,
    requiredSecrets: ["DOCS_TOKEN"],
    sideEffects: ["read", "external"],
    scopes: ["docs:read"],
  },
  onSecurityWarning: (message) => {
    // In production, send this to your telemetry or deployment gate.
    console.warn(`[mcp security] ${message}`);
  },
  onTrace: (event) => {
    // event.type values include mcp_start, mcp_request, mcp_response, mcp_error, mcp_close.
    console.log(`[mcp trace] ${event.type} ${event.serverName}`);
  },
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(internalDocsMcp);

const answer = await agent.run({
  prompt:
    "Search internal docs for the billing webhook retry policy and summarize it.",
  toolPolicy: {
    timeoutMs: 10_000,
    // `read` allows read-only tools. Alternatives:
    // - 'none': pure computation only.
    // - 'write': permit local mutations when the tool also allows them.
    // - 'external': permit third-party/network side effects.
    readOnly: true,
  },
  budget: {
    maxToolCalls: 4,
  },
});

console.log(answer.content);

// HTTP and SSE hosted MCP servers use the same adapter. The main differences are
// `transport`, `url`, and optional auth headers:
//
// MCPAdapter.connect({
//   transport: 'http',
//   name: 'hosted-docs',
//   url: 'https://mcp.example.com/rpc',
//   headers: { Authorization: `Bearer ${process.env.MCP_TOKEN!}` },
//   allowedTools: ['search_docs', 'read_doc'],
// });
