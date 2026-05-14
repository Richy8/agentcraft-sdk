import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Replay mode lets tests and demos use a captured response without making a provider call.
const response = await agent.run({
  prompt: "This prompt will not be sent because replay is provided.",
  // replay is optional. It can be a single AgentResponse or
  // { responses: AgentResponse[], index?: number } for multi-step fixtures.
  replay: {
    content: "This is a deterministic replayed response.",
    cost: 0,
    tokensUsed: { prompt: 1, completion: 1, total: 2 },
    // finishReason values: 'stop', 'length', 'tool_calls', or 'content_filter'.
    finishReason: "stop",
    model: "replay-model",
    provider: "replay",
  },
});

console.log(response.content);
