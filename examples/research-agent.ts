import { Agent, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  // FetchAdapter wraps fetched content as untrusted and enforces URL policy.
  // allowedDomains is optional but recommended. Omit only for broad web agents.
  .use(FetchAdapter.connect({ allowedDomains: ["example.com"] }));

const response = await agent.run({
  prompt: "Research https://example.com and produce a concise brief.",
});

console.log(response.content);
