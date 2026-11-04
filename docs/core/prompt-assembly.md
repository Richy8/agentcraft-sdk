# Prompt Assembly

Prompt assembly loads reusable prompt files from disk, resolves `&#123;&#123;include&#125;&#125;` partials, injects runtime variables and app config, and minifies the result before sending it to the model. Use it to version prompts alongside your code, share fragments across agents, and inject per-tenant or per-run context without string concatenation.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  // Load a prompt file from disk instead of writing it inline
  promptFile: "prompts/release-note.prompt",
  // Inject runtime variables into {{variable}} placeholders
  vars: {
    product: "AgentCraft",
    version: "1.4.0",
    audience: "senior TypeScript engineers",
  },
  assembly: {
    // Inject app/tenant config into {{config.path}} placeholders
    config: {
      brand: { voice: "clear and practical" },
      release: { channel: "public-beta" },
    },
    // Throw if any placeholder is unresolved — catches typos early
    strict: true,
  },
});

console.log(response.content);
// → "Release 1.4.0 brings..."

// Inspect what the assembler did
console.log(response.promptProvenance?.source); // → "file"
console.log(response.promptProvenance?.assembled); // → true
console.log(response.measurement?.estimatedPromptTokens); // → 312
```

## Prompt File Syntax

Prompt files are plain text with any extension (`.prompt`, `.txt`, `.md`). Three placeholder types are supported:

```handlebars
Write a concise release note for
{{product}}
v{{version}}. Audience:
{{audience}}
Brand voice:
{{config.brand.voice}}
Release channel:
{{config.release.channel}}

Include: - One headline sentence - Three value bullets - One migration note if
breaking changes exist
```

### Placeholder Types

| Syntax                                 | Source            | Description                                        |
| -------------------------------------- | ----------------- | -------------------------------------------------- |
| `&#123;&#123;variable&#125;&#125;`     | `vars`            | Runtime injection — user data, task input          |
| `&#123;&#123;config.path&#125;&#125;`  | `assembly.config` | App/tenant config — nested dot paths supported     |
| `&#123;&#123;include path&#125;&#125;` | Filesystem        | Pulls in another file relative to the current file |

### Array Variables

Arrays in `vars` are automatically formatted as markdown bullet lists:

```ts
const response = await agent.run({
  promptFile: "prompts/review.prompt",
  vars: {
    files: ["src/auth.ts", "src/session.ts", "src/tokens.ts"],
  },
});
```

In the prompt file, `&#123;&#123;files&#125;&#125;` becomes:

```txt
- src/auth.ts
- src/session.ts
- src/tokens.ts
```

## Multi-File Bundles with `&#123;&#123;include&#125;&#125;`

An entry file can compose other files using include directives. Includes resolve relative to the file that contains them.

```handlebars
{{include 00-context.prompt}}
{{include 10-audience.prompt}}
{{include partials/brand-rules.prompt}}
{{include 20-output-format.prompt}}
```

A typical prompt directory layout:

```txt
prompts/
  release-note/
    main.prompt          ← entry point
    00-context.prompt    ← product background
    10-audience.prompt   ← audience definition
    20-output-format.prompt
    partials/
      brand-rules.prompt ← shared across many prompts
      style-guide.prompt
```

```ts
const response = await agent.run({
  promptFile: "prompts/release-note/main.prompt",
  vars: { product: "AgentCraft", version: "1.4.0" },
});

// Provenance shows the file and that assembly ran
console.log(response.promptProvenance?.promptFile); // → "prompts/release-note/main.prompt"
console.log(response.promptProvenance?.assembled); // → true
```

Includes are deduplicated — the same partial is never resolved twice, even if included from multiple files.

## Configuration

All prompt assembly options live on `agent.run()`. There is no agent-level default for `promptFile` — set it per run.

| Field                       | Required                       | Default                 | Purpose                                                             |
| --------------------------- | ------------------------------ | ----------------------- | ------------------------------------------------------------------- |
| `prompt`                    | One of `prompt` / `promptFile` | —                       | Inline prompt string                                                |
| `promptFile`                | One of `prompt` / `promptFile` | —                       | Path to the entry prompt file                                       |
| `vars`                      | No                             | `{}`                    | Runtime `&#123;&#123;variable&#125;&#125;` replacements             |
| `assembly.config`           | No                             | `{}`                    | App/tenant `&#123;&#123;config.path&#125;&#125;` replacements       |
| `assembly.strict`           | No                             | `false`                 | Throw on unresolved `&#123;&#123;variable&#125;&#125;` placeholders |
| `assembly.minify`           | No                             | `true`                  | Strip redundant whitespace before sending                           |
| `assembly.maxPartialDepth`  | No                             | `10`                    | Maximum `&#123;&#123;include&#125;&#125;` nesting depth             |
| `assembly.rootDir`          | No                             | Prompt file's directory | Boundary directory for file reads                                   |
| `assembly.allowOutsideRoot` | No                             | `false`                 | Allow includes outside `rootDir`                                    |

## Patterns

### Strict Mode — Catch Placeholder Typos

Enable `strict` to make unresolved `&#123;&#123;variables&#125;&#125;` an error instead of leaving the raw placeholder in the prompt:

```ts
try {
  const response = await agent.run({
    promptFile: "prompts/report.prompt",
    vars: { title: "Q4 Summary" },
    assembly: { strict: true },
  });
} catch (err) {
  if (
    err instanceof Error &&
    "code" in err &&
    err.code === "PROMPT_ASSEMBLY_ERROR"
  ) {
    // → "Unresolved variable: {{author}} at line 3"
    console.error(err.message);
  }
}
```

Missing `&#123;&#123;include&#125;&#125;` paths always throw regardless of `strict`. The `strict` flag only controls `&#123;&#123;variable&#125;&#125;` and `&#123;&#123;config.path&#125;&#125;` placeholders.

### Tenant Config Injection

Inject per-tenant configuration without modifying prompt files:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

async function runForTenant(tenantId: string, task: string) {
  const tenantConfig = await loadTenantConfig(tenantId);

  const agent = Agent.create({
    model: Provider.anthropic["claude-sonnet-4-6"],
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });

  return agent.run({
    promptFile: "prompts/support-response.prompt",
    vars: { task },
    assembly: {
      // Config paths like {{config.brand.name}}, {{config.tone}}, {{config.escalation.email}}
      config: {
        brand: { name: tenantConfig.brandName, voice: tenantConfig.voice },
        tone: tenantConfig.formalityLevel,
        escalation: { email: tenantConfig.supportEmail },
      },
      strict: true,
    },
  });
}
```

### Disabling Minification

By default the assembler strips redundant blank lines and leading/trailing whitespace. Disable minification when whitespace is meaningful (e.g., code templates, YAML prompts):

```ts
const response = await agent.run({
  promptFile: "prompts/yaml-template.prompt",
  vars: { serviceName: "auth-api" },
  assembly: {
    minify: false, // preserve all whitespace
  },
});
```

### Measuring Token Estimates

Use `response.measurement` to check how large the assembled prompt is before you commit to a run:

```ts
const response = await agent.run({
  promptFile: "prompts/deep-analysis.prompt",
  vars: { document: longDocument },
});

const m = response.measurement;
if (m) {
  console.log(`Prompt chars: ${m.promptChars}`);
  console.log(`System chars: ${m.systemChars}`);
  console.log(`Assembled chars: ${m.assembledPromptChars}`);
  console.log(`Estimated tokens: ${m.estimatedPromptTokens}`);
  console.log(`Minified: ${m.promptMinified}`);
}
```

### Root Directory Boundary

By default, includes resolve relative to the entry file's directory. Set `rootDir` to a different directory to tighten the boundary, or use `allowOutsideRoot` to permit escaping it (not recommended for untrusted prompt sources):

```ts
const response = await agent.run({
  promptFile: "prompts/report/main.prompt",
  assembly: {
    // Restrict all file reads to this directory
    rootDir: "prompts",
    // Allow partials outside rootDir — only use for trusted sources
    allowOutsideRoot: false,
  },
});
```

## Using `PromptAssembler` Directly

`PromptAssembler` is also available as a standalone class for use outside of `agent.run()` — useful for pre-validating prompts in CI, inspecting assembly stats, or building prompt preview tools.

```ts
import { PromptAssembler, FileLoader } from "@deskcreate/agentcraft";

const assembler = new PromptAssembler(new FileLoader());

const result = await assembler.assemble({
  mode: "file",
  file: "prompts/release-note/main.prompt",
  vars: {
    product: "AgentCraft",
    version: "1.4.0",
    audience: "TypeScript engineers",
  },
  config: {
    brand: { voice: "clear and practical" },
  },
  strict: true,
  minify: true,
  measureTokens: true,
  logStats: true, // logs to console.debug
});

console.log(result.prompt);
// → "Write a concise release note for AgentCraft v1.4.0..."

// Full assembly report
console.log(result.stats.partialsCount); // → 3 (included partials)
console.log(result.stats.varsReplaced); // → 4
console.log(result.stats.configReplaced); // → 2
console.log(result.stats.charsBefore); // → 1842
console.log(result.stats.charsAfter); // → 1601 (after minify)
console.log(result.stats.estimatedTokens); // → 401
```

### Inline Assembly

For inline prompts with variable injection but no file reads:

```ts
import { PromptAssembler, FileLoader } from "@deskcreate/agentcraft";

const assembler = new PromptAssembler(new FileLoader());

const result = await assembler.assemble({
  mode: "inline",
  content: "Write a {{tone}} email to {{recipient}} about {{topic}}.",
  vars: {
    tone: "formal",
    recipient: "the engineering team",
    topic: "the upcoming API deprecation",
  },
  strict: true,
});

console.log(result.prompt);
// → "Write a formal email to the engineering team about the upcoming API deprecation."
```

Inline mode does not support `&#123;&#123;include&#125;&#125;` — use `promptFile` when you need file composition.

## Response Fields

| Field                                        | Type                  | Description                              |
| -------------------------------------------- | --------------------- | ---------------------------------------- |
| `response.promptProvenance.source`           | `"inline" \| "file"`  | How the prompt was supplied              |
| `response.promptProvenance.promptFile`       | `string \| undefined` | Entry file path if `promptFile` was used |
| `response.promptProvenance.assembled`        | `boolean`             | Whether assembly ran                     |
| `response.measurement.promptChars`           | `number`              | Characters in the assembled prompt       |
| `response.measurement.estimatedPromptTokens` | `number`              | Rough token estimate (chars ÷ 4)         |
| `response.measurement.promptMinified`        | `boolean`             | Whether minification ran                 |

## `AssemblyStats` Reference

When using `PromptAssembler` directly, `result.stats` contains:

| Field             | Type                 | Description                                                 |
| ----------------- | -------------------- | ----------------------------------------------------------- |
| `mode`            | `"file" \| "inline"` | Assembly mode used                                          |
| `partialsCount`   | `number`             | Unique files resolved via `&#123;&#123;include&#125;&#125;` |
| `varsReplaced`    | `number`             | `&#123;&#123;variable&#125;&#125;` placeholders replaced    |
| `configReplaced`  | `number`             | `&#123;&#123;config.*&#125;&#125;` placeholders replaced    |
| `charsBefore`     | `number`             | Character count before minification                         |
| `charsAfter`      | `number`             | Character count after minification                          |
| `estimatedTokens` | `number`             | Token estimate (only set when `measureTokens: true`)        |

## Cookbook

### CI Prompt Validation

Pre-validate all prompt files in your CI pipeline before deploying:

```ts
import { PromptAssembler, FileLoader } from "@deskcreate/agentcraft";
import { glob } from "glob";

const assembler = new PromptAssembler(new FileLoader());
const entryFiles = await glob("prompts/**/*.prompt");
let failures = 0;

for (const file of entryFiles) {
  try {
    await assembler.assemble({
      mode: "file",
      file,
      vars: {},
      strict: false, // allow unresolved vars in CI (they need runtime values)
    });
    console.log(`✓ ${file}`);
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      err.code === "PROMPT_ASSEMBLY_ERROR"
    ) {
      console.error(`✗ ${file}: ${err.message}`);
      failures++;
    }
  }
}

if (failures > 0) process.exit(1);
```

### Agent With Shared System Prompt

Combine an inline system prompt with a per-run file prompt:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  // System prompt is set at agent level
  system:
    "You are a senior technical writer who specializes in API documentation.",
});

// Each run uses a different file-based user prompt
const topics = ["streaming", "structured-output", "tool-caching"];

for (const topic of topics) {
  const response = await agent.run({
    promptFile: `prompts/docs/${topic}.prompt`,
    vars: { library: "AgentCraft", version: "1.4" },
    assembly: { strict: true },
  });
  console.log(`${topic}: ${response.content.slice(0, 80)}...`);
}
```

### Dynamic Partial Selection

Choose which partials to include at runtime by writing a thin entry file:

```ts
// Generate a dynamic entry prompt and pass it as inline content
import { PromptAssembler, FileLoader } from "@deskcreate/agentcraft";

const persona = user.isPremium ? "expert" : "general";
const entryContent = `
{{include shared/base.prompt}}
{{include personas/${persona}.prompt}}
{{include shared/output-format.prompt}}
`.trim();

const assembler = new PromptAssembler(new FileLoader());
const result = await assembler.assemble({
  mode: "inline",
  content: entryContent, // inline mode does NOT support includes — use file mode here
  vars: { username: user.name },
});

// For include support, write the entry content to a temp file or use file mode
```

For runtime partial selection with includes, write the entry content to a temp file or use the `promptFile` pointing at a file that itself uses `&#123;&#123;include&#125;&#125;` with paths constructed from known safe values.

## Related

- [Prompt Assembly Config](../configuration/prompt-assembly-config.md)
- [Running Agents](../core/running-agents.md)
- [Examples & Cookbook: Prompt Assembly](../examples-cookbook/prompt-assembly.md)
