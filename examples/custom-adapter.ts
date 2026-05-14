import { Agent, Provider } from "agentcraft";
import { createAdapter, tool } from "agentcraft/adapters";

// Custom adapters are the cleanest way to turn application capabilities into tools.
const inventory = createAdapter({
  // name is required and should be stable. It appears in traces and conflict checks.
  name: "inventory",
  // Metadata lets policies, docs, traces, and reviewers understand risk.
  // kind values: 'placeholder' | 'mcp-backed' | 'native-sdk' | 'custom'.
  // auth values: 'none' | 'api-key' | 'oauth' | 'aws' | 'connection-string' | 'custom'.
  // sideEffects values: 'none' | 'read' | 'write' | 'external'.
  metadata: {
    kind: "custom",
    auth: "none",
    sideEffects: ["read"],
    readOnly: true,
  },
  tools: [
    tool({
      // Tool names are required, provider-visible, and should be snake_case.
      name: "lookup_sku",
      // description is required. It should tell the model when to use this tool.
      description: "Look up a product SKU.",
      // sideEffect read means this can run in read-only mode.
      // Alternatives: 'none' for pure computation, 'write' for mutations,
      // 'external' for network calls or third-party side effects.
      security: { sideEffect: "read" },
      params: {
        // Param type is required. Values: string, number, boolean, array, object.
        // required defaults to true; set required: false for optional params.
        sku: { type: "string", description: "SKU to look up." },
      },
      // Real applications would call a service or database here.
      run: async ({ sku }) => ({ sku, inStock: true }),
    }),
  ],
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(inventory);

const response = await agent.run({
  // This prompt intentionally references a SKU so the model has a reason to call lookup_sku.
  prompt: "Check SKU ABC-123 and tell me whether it is available.",
});

console.log(response.content);
