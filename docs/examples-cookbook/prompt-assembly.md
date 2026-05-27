# Prompt Assembly Examples

Composing prompts from files and templates.

## `promptFile()` Shorthand

Load a single prompt file directly in `agent.run()`:

```ts
import { Agent, Provider, promptFile } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: promptFile("./prompts/summarize.md"),
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
import { promptFile } from "@deskcreate/agentcraft";

const response = await agent.run({
  prompt: promptFile("./prompts/review.md", {
    variables: {
      language: "TypeScript",
      context: "production codebase",
      focus: "security vulnerabilities",
    },
  }),
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
import { PromptAssembler } from "@deskcreate/agentcraft";

const assembler = new PromptAssembler({
  root: "./prompts",
  mode: "concat",
});

const assembled = await assembler.assemble([
  "personas/technical-writer.md",
  "tasks/summarize.md",
  "constraints/brevity.md",
]);

const response = await agent.run({
  prompt: assembled.content,
});

console.log(`Assembled ${assembled.stats.fileCount} files, ${assembled.stats.totalBytes} bytes`);
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

| Mode | Behavior |
| --- | --- |
| `concat` | Joins files with newlines |
| `sections` | Wraps each file in a labeled section |
| `merge` | De-duplicates overlapping instructions |

```ts
const assembler = new PromptAssembler({
  root: "./prompts",
  mode: "sections",
  sectionSeparator: "\n\n---\n\n",
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
