# Specialized Adapters

AgentCraft ships one native adapter for media generation. For communication, productivity, and other specialized capabilities, use the [built-in MCP wrappers](../mcp/built-in.md) or a [custom adapter](./custom.md).

## ImageGenerationAdapter

Generate images using OpenAI DALL-E or a compatible API.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { ImageGenerationAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  ImageGenerationAdapter.connect({
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY!,
    defaultSize: "1024x1024",
    defaultModel: "dall-e-3",
  }),
);

const response = await agent.run({
  prompt: "Generate a hero image for a blog post about TypeScript 5.x — modern, developer-focused aesthetic.",
});
console.log(response.content); // includes the image URL or base64 data
```

### Config

| Field | Required | Default | Purpose |
| --- | --- | --- | --- |
| `provider` | Yes | — | `"openai"` or compatible |
| `apiKey` | Yes | — | Provider API key |
| `defaultModel` | No | Provider default | Default model (e.g. `"dall-e-3"`) |
| `defaultSize` | No | Provider default | Default image size (e.g. `"1024x1024"`) |
| `timeoutMs` | No | `30000` | Per-request timeout |

### Tools

| Tool | Side Effect | Purpose |
| --- | --- | --- |
| `generate_image` | `external` | Generate an image from a text prompt |

## Other Capabilities via MCP

For capabilities not covered by native adapters, use MCP wrappers or `MCP.connect()`:

| Capability | Approach |
| --- | --- |
| Email (Gmail) | `MCP.connect({ package: "@gomomento/mcp-gmail" })` or Gmail MCP |
| Calendar | `MCP.connect()` with a Google Calendar MCP server |
| Slack messaging | `SlackMCP.connect({ botToken, teamId })` from `@deskcreate/agentcraft/mcp` |
| File read/write | `FilesystemMCP.connect({ allowedPaths })` from `@deskcreate/agentcraft/mcp` |
| GitHub operations | `GitHubMCP.connect({ token })` from `@deskcreate/agentcraft/mcp` |

See [Built-In MCP Wrappers](../mcp/built-in.md) for the full list, or use [`MCP.connect()`](../mcp/custom.md) to connect any MCP server.

For fully custom capabilities, define tools with `tool()` and bundle them into an adapter with `createAdapter()`. See [Custom Adapters](./custom.md).

## Related

- [Built-In Adapters](./built-in.md)
- [Built-In MCP Wrappers](../mcp/built-in.md)
- [Custom Adapters](./custom.md)
- [Adapter Safety](./safety.md)
