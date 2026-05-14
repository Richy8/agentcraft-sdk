import { Agent, Provider } from "agentcraft";
import { blockPromptInjectionGuardrail } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    // This global policy keeps side effects locked down unless a run explicitly approves them.
    // readOnly is optional and defaults false. true blocks tools marked write or
    // requiresConfirmation, even if the model asks to call them.
    readOnly: true,
    // inputGuardrails/outputGuardrails are optional arrays of functions.
    // Use guardrailMode: 'warn' to log without blocking; default behavior enforces.
    inputGuardrails: [blockPromptInjectionGuardrail],
  },
});

const response = await agent.run({
  prompt:
    "Use the audit tool to inspect this request, but do not make changes.",
  tools: [
    {
      name: "audit_request",
      description: "Inspect a request and return a safety summary.",
      parameters: {
        // JSON schema object is required for provider-native tool declaration.
        // Top-level type should be 'object'. Field types can be string, number,
        // boolean, array, or object.
        type: "object",
        properties: {
          text: { type: "string", description: "Text to audit" },
        },
        required: ["text"],
      },
      // sideEffect 'read' means allowed in read-only mode. Use 'write' for mutation,
      // 'external' for third-party/network effects, and 'none' for pure functions.
      security: { sideEffect: "read" },
      execute: async ({ text }) => ({
        safe: !String(text).includes("ignore previous instructions"),
      }),
    },
  ],
});

console.log(response.content);
