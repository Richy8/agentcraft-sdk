import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  // Pick a streaming and tool-capable model when you want interleaved events.
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

for await (const event of agent.stream({
  prompt: "Use the clock tool, then say the current timestamp.",
  tools: [
    {
      name: "clock",
      description: "Return the current timestamp.",
      // Tool parameters are intentionally JSON-schema-like so providers can
      // receive a native function/tool declaration.
      // Top-level type is normally 'object'. properties define named args;
      // required lists mandatory args. Empty object means no args.
      parameters: { type: "object", properties: {}, required: [] },
      // sideEffect none tells policy/observability this is safe to call.
      // Alternatives: 'read', 'write', or 'external'.
      security: { sideEffect: "none" },
      execute: async () => ({ now: new Date().toISOString() }),
    },
  ],
})) {
  // Streams emit a typed event union:
  // model_delta, tool_call, tool_result, and final.
  // final includes finishReason, which can be stop, length, tool_calls, or content_filter.
  if (event.type === "model_delta") process.stdout.write(event.delta);
  if (event.type === "tool_call")
    console.log("\nTool call:", event.toolCall?.name);
  if (event.type === "tool_result")
    console.log("\nTool result:", event.toolResult?.content);
}
