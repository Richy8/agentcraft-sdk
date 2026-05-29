# Skills

A skill is a reusable prompt fragment that shapes how an agent behaves for a specific task. Skills use a three-level progressive disclosure model: the model always sees the skill name and description, and can call tools to load instructions and reference files on demand.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { Skill } from "@deskcreate/agentcraft/skills";

const precisionWriter = Skill.define({
  name: "precision-writer",
  description: "Produces structured, concise technical writing with numbered sections and measurable claims.",
  instructions: `
Structure every response as:
  1. One-sentence hook — state the core claim directly
  2. Three supporting points, each with a concrete example
  3. One-sentence actionable takeaway

Rules: 150–220 words. No filler phrases. Active voice. End with: ─── end ───
  `.trim(),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(precisionWriter);

const response = await agent.run({
  prompt: "Write about why agent memory matters for production systems.",
});
console.log(response.content);
```

## How Skills Work

### Level 1 — Activation signal

Every skill's name and description are injected into the system prompt automatically when the skill is attached:

```
[Skill available: precision-writer: Produces structured, concise technical writing...]
```

The model sees this on every run. No tool call required.

### Level 2 — Instructions (on demand)

When a skill has `instructions`, AgentCraft exposes a `load_skill_instructions` tool. The model calls it when it is about to apply the skill. This keeps the system prompt lean — instructions are only loaded when needed.

### Level 3 — Reference files (on demand)

When a skill has `files`, AgentCraft exposes a `load_skill_file` tool. The model can load tone guides, domain-specific rules, or example libraries at run time. Files are never pushed into the prompt unconditionally.

## Defining Skills

### `Skill.define()` — Inline

```ts
import { Skill } from "@deskcreate/agentcraft/skills";

const mySkill = Skill.define({
  name: "code-reviewer",          // kebab-case, unique
  description: "Reviews TypeScript code for type safety, edge cases, and naming.",
  instructions: "...",            // Level 2 — loaded on demand
  files: {                        // Level 3 — loaded on demand
    "review-checklist.txt": "...",
    "naming-guide.txt": "...",
  },
  version: 1,                     // optional
});

agent.use(mySkill);
```

### `Skill.from()` — Local directory

Load a skill from a folder containing a `SKILL.md` file. All sibling files become Level 3 reference files.

```
my-skill/
  SKILL.md            ← frontmatter (name, description) + body (instructions)
  tone-guide.txt      ← Level 3 reference file
  examples.txt        ← Level 3 reference file
```

```ts
import { Skill } from "@deskcreate/agentcraft/skills";

const skill = Skill.from("./skills/code-reviewer");
agent.use(skill);
```

**SKILL.md format:**

```md
---
name: code-reviewer
description: Reviews TypeScript code for type safety, edge cases, and naming.
version: 1
---

## Review Contract

Check every PR for:
1. Missing null checks on external inputs
2. Overly broad `catch` blocks that swallow errors
3. Names that describe type rather than role (`data`, `info`, `obj`)
```

### `Skill.fromDir()` — Scan a directory

Load every subdirectory that contains a `SKILL.md` as its own skill.

```ts
const skills = Skill.fromDir("./skills");
for (const skill of skills) agent.use(skill);
```

### `Skill.fromGitHub()` — Remote skill

Fetch a skill from a public or private GitHub repository. Skill definitions are cached in memory for the process lifetime. Pass an `AgentCache` instance to also persist across restarts.

```ts
import { Skill } from "@deskcreate/agentcraft/skills";
import { AgentCache } from "@deskcreate/agentcraft";

// Single named skill
const skill = await Skill.fromGitHub(
  "https://github.com/your-org/skills-repo",
  "code-reviewer",
);
agent.use(skill);

// All skills in a repo
const skills = await Skill.fromGitHub("https://github.com/your-org/skills-repo");
for (const skill of skills) agent.use(skill);

// With options: branch, token, subdir, external cache
const cache = AgentCache.create({ backend: "file", root: ".agentcraft/cache" });

const privSkill = await Skill.fromGitHub(
  "https://github.com/your-org/private-skills",
  "brand-voice",
  {
    ref: "main",
    token: process.env.GITHUB_TOKEN!,
    subdir: "skills",       // look in /skills/ instead of repo root
    cache,                  // persist definitions across process restarts
    cacheTtlMs: 3_600_000,  // 1 hour
  },
);
agent.use(privSkill);
```

## GitHubSkillOptions

| Option       | Type          | Default     | Purpose                                                          |
| ------------ | ------------- | ----------- | ---------------------------------------------------------------- |
| `ref`        | `string`      | default branch | Branch, tag, or commit SHA to fetch from.                     |
| `token`      | `string`      | None        | GitHub PAT. Required for private repos; reduces rate-limit risk. |
| `subdir`     | `string`      | `''`        | Subdirectory within the repo where skills live.                  |
| `cache`      | `AgentCache`  | None        | External cache for cross-restart persistence.                    |
| `cacheTtlMs` | `number`      | `3_600_000` | How long to keep fetched skills in the external cache.           |

## Multiple Skills

Attach as many skills as needed. Each gets its own `load_skill_instructions` and `load_skill_file` tools, namespaced by skill name.

```ts
agent
  .use(Skill.define({ name: "brand-voice", description: "..." }))
  .use(Skill.define({ name: "code-reviewer", description: "..." }))
  .use(await Skill.fromGitHub("https://github.com/org/skills", "seo-optimizer"));
```

The model activates the right skill based on the task — you don't need to route manually.

## Naming Conventions

- Use **kebab-case**: `code-reviewer`, `brand-voice`, `seo-optimizer`
- Make the `description` task-specific — it is the activation signal the model reads
- Keep `instructions` focused on a single concern; split large instruction sets into multiple skills

## More

- [Skills API reference](./api.md)
- [Tools](../tools/tools.md)
- [Adapters](../adapters/overview.md)
- [MCP](../mcp/overview.md)
