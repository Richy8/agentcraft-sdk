import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const releaseAssembly = {
  // config is optional. It fills {{config.path}} placeholders and is useful
  // for app/runtime configuration that should be distinct from task vars.
  // Example prompt text: "Use {{config.brand.voice}} voice."
  config: {
    brand: { voice: "clear, pragmatic, senior-engineer friendly" },
    release: { channel: "public-beta" },
  },
  // strict fails fast when variables or partials are missing.
  // strict is optional and defaults false.
  strict: true,
  // minify trims prompt whitespace before sending to the model.
  // minify is optional. Use it for cost-sensitive or long prompt flows.
  minify: true,
};

const fileResponse = await agent.run({
  // promptFile is useful when prompts are composed from versioned files.
  // This example assumes ./prompts/release-note.prompt exists in your application.
  // Use prompt for inline text, or promptFile for a file-backed entry prompt.
  // Inline prompts can also use {{var}} and {{config.path}} placeholders when vars
  // or assembly.config are provided.
  promptFile: "./prompts/release-note.prompt",
  vars: {
    // vars is optional. Keys must match placeholders in the prompt file.
    // Placeholder syntax: {{product}}, {{audience}}, {{nested.key}}.
    product: "AgentCraft",
    audience: "senior TypeScript engineers",
  },
  assembly: releaseAssembly,
});

const composedResponse = await agent.run({
  // promptFile can also point to an entry prompt that composes other prompt files.
  // This keeps ordering explicit: the main.prompt file decides where each include
  // is injected, and a missing include path fails during assembly before the LLM call.
  promptFile: "./prompts/release-note-bundle/main.prompt",
  vars: {
    product: "AgentCraft",
    audience: "platform engineers evaluating agent tooling",
  },
  assembly: releaseAssembly,
});

console.log(fileResponse.promptProvenance, fileResponse.content);
console.log(composedResponse.promptProvenance, composedResponse.content);
