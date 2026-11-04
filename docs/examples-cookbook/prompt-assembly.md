# Prompt Assembly Examples

Composing prompts from files and templates.

## Prompt Files

Load a single prompt file directly in `agent.run()`:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  promptFile: "./prompts/summarize.md",
});
```

Your `./prompts/summarize.md`:

```md
You are a technical writer. Summarize the following content in 3 bullet points.
Focus on practical implications for developers.
```

## Template Variable Injection

Inject variables into prompt templates:

```ts
const response = await agent.run({
  promptFile: "./prompts/review.md",
  vars: {
    language: "TypeScript",
    context: "production codebase",
    focus: "security vulnerabilities",
  },
});
```

Your `./prompts/review.md`:

```md
Review the following {{language}} code from a {{context}}.
Focus on {{focus}}.
```

## `PromptAssembler` for Multi-File Composition

Combine multiple prompt fragments into a single assembled prompt:

```ts
import { FileLoader, PromptAssembler } from "@deskcreate/agentcraft";

const assembler = new PromptAssembler(new FileLoader());

const assembled = await assembler.assemble({
  mode: "file",
  file: "prompts/summarize.md",
});

const response = await agent.run({
  prompt: assembled.prompt,
});

console.log(`Assembled ${assembled.stats.partialsCount} partials`);
```

## File Structure Conventions

Organize prompt files for reuse:

```
prompts/
  personas/
    technical-writer.md
    code-reviewer.md
    analyst.md
  tasks/
    summarize.md
    review.md
    analyze.md
  constraints/
    brevity.md
    formal-tone.md
    bullet-points.md
```

## Assembly Modes

| Mode     | Behavior                                                                       |
| -------- | ------------------------------------------------------------------------------ |
| `file`   | Loads one prompt file and resolves <code v-pre>{{include ...}}</code> partials |
| `inline` | Assembles an inline prompt with variable/config injection                      |

```ts
const assembled = await assembler.assemble({
  mode: "inline",
  content: "Write a {{tone}} summary for {{audience}}.",
  vars: { tone: "concise", audience: "engineers" },
});
```

## Inline vs File Prompts

Use file prompts when:

- The prompt is longer than ~200 characters
- The prompt is reused across multiple agents or runs
- The prompt benefits from version control alongside the code

Use inline strings when:

- The prompt is short and specific to one run
- The prompt is dynamically constructed at runtime

## Related

- [Prompt Assembly reference](../core/prompt-assembly.md)
- [Prompt Assembly Config](../configuration/prompt-assembly-config.md)
