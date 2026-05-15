import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Create a release checklist for a TypeScript library.",
  // responseSchema makes model output contract-driven instead of prose-driven.
  // AgentCraft validates the final content and returns structuredResponse.
  responseSchema: {
    // Schema type is required for this JSON Schema shape.
    // Values supported by the lightweight validator: object, array, string,
    // number, boolean, and null.
    type: "object",
    // required is optional. Omit it when all properties are optional.
    required: ["title", "items"],
    properties: {
      title: { type: "string" },
      items: { type: "array", items: { type: "string" } },
    },
  },
  // retries asks the model to repair invalid JSON/schema mismatches.
  // toolFallback lets tool-capable models submit the schema through a tool
  // when native JSON mode is unavailable or unreliable.
  // toolFallback values: 'auto' (default-like behavior), true, or false.
  structuredOutput: { retries: 1, toolFallback: "auto" },
});

console.log(response.structuredResponse);
