import { Agent, Provider } from "agentcraft";
import { FileSystemAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  // Local providers are useful for private filesystem tasks because no prompt
  // leaves the machine unless your local runtime is configured to do so.
  // model is required. Ollama alternatives depend on what you have installed;
  // the Provider catalog includes a typed default and common local model aliases.
  model: Provider.ollama["llama3.2"],
  // readOnly blocks write/delete-style tools even if they are attached.
  toolPolicy: { readOnly: true },
}).use(
  FileSystemAdapter.connect({
    // rootPath is the sandbox. Paths outside this root are rejected.
    // This string is required for the filesystem adapter.
    rootPath: process.cwd(),
    // allowedExtensions narrows what the agent can inspect.
    // Optional; omit to allow all extensions inside rootPath.
    allowedExtensions: [".md", ".txt"],
    // readOnly removes write behavior at the adapter level as well.
    readOnly: true,
  }),
);

const response = await agent.run({
  prompt: "List documentation files and summarize what should be read first.",
});

console.log(response.content);
