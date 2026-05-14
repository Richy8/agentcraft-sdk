import { Agent, Provider } from "agentcraft";
import { GitHubMCP } from "agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  GitHubMCP.connect({
    // token is required by this MCP wrapper and becomes an env var for the MCP server.
    token: process.env.GITHUB_TOKEN!,
    // Stdio MCP packages should be version-pinned for repeatable installs.
    // packageSpec is optional only when the wrapper has a verified default package.
    // For GitHub MCP, this example passes it explicitly because available servers vary.
    packageSpec: "@artificable/github-mcp-server@0.1.0",
  }),
);

const response = await agent.run({
  prompt: "Use GitHub MCP tools to summarize repository issues.",
  // readOnly is especially important for MCP because server tools can expose
  // external side effects. Start locked down, then approve writes deliberately.
  // Other useful policy flags include dryRun, approvedTools, maxResultBytes,
  // timeoutMs, inputGuardrails, and outputGuardrails.
  toolPolicy: { readOnly: true },
  // trace includes MCP discovery/execution spans for debugging.
  trace: true,
});

console.log(response.content);
