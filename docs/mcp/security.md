# MCP Security

MCP servers can expose broad external capability. Treat them like plugins with credentials and tool execution.

## Checklist

| Check                  | Why                                    |
| ---------------------- | -------------------------------------- |
| Pin stdio packages     | Prevents surprise package drift.       |
| Restrict commands      | Avoids arbitrary process execution.    |
| Set `allowedTools`     | Narrows exposed tool surface.          |
| Set `allowedResources` | Narrows resource reads.                |
| Set `roots`            | Narrows filesystem/resource scope.     |
| Use `ToolPolicy`       | Enforces approvals and read-only mode. |

## Safe Pattern

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MemoryMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 100_000,
  },
}).use(MemoryMCP.connect());

const response = await agent.run({ prompt: "What do you remember about me?" });
console.log(response.content);
```

## Related

- [MCP Security Checklist](../guides/mcp-security-checklist.md)
- [Security Model](../production/security-model.md)
