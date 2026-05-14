import { Agent, Provider } from "agentcraft";
import { PlaywrightAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  // A cloud model is useful for browser tasks because it can reason over extracted page text.
  // Swap to Provider.ollama['llama3.2'] for local-only summarization after extraction.
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  PlaywrightAdapter.connect({
    // allowedDomains is optional but strongly recommended. If omitted, the
    // adapter can navigate to any domain the tool asks for. Values are hostnames
    // like 'example.com'; subdomains are allowed by the matcher.
    allowedDomains: ["example.com"],
    // defaultTimeout is optional and in milliseconds. It applies to navigation,
    // selectors, clicks, and fills. Use a smaller value for CI, larger for slow apps.
    defaultTimeout: 10_000,
  }),
);

const response = await agent.run({
  prompt: "Open https://example.com, extract the page text, and summarize it.",
  // Browser clicks/form fills can have side effects. Start read-only where possible.
  // readOnly true blocks write/confirmation-required tools. Set false only when
  // your app has an approval flow for clicks/forms.
  toolPolicy: { readOnly: true },
});

console.log(response.content);
