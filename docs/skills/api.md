# Skills API Reference

All skill methods are imported from `@deskcreate/agentcraft/skills`.

```ts
import { Skill } from "@deskcreate/agentcraft/skills";
import type {
  GitHubSkillOptions,
  SkillDefinition,
} from "@deskcreate/agentcraft/skills";
```

## `Skill.define(spec)`

Define a skill inline. Returns an `AgentAdapter` ready for `agent.use()`.

```ts
const adapter = Skill.define({
  name: string;           // required, kebab-case
  description: string;    // required, shown to model at Level 1
  instructions?: string;  // optional, Level 2 — loaded via tool
  files?: Record<string, string>;  // optional, Level 3 — loaded via tool
  version?: number;       // optional, defaults to 1
});
```

**Validation:** `name` must be 1–64 characters, kebab-case. `description` must be 10–500 characters.

## `Skill.from(dirPath)`

Load a skill from a local directory. Reads `SKILL.md` for frontmatter and instructions; all sibling files become Level 3 reference files.

```ts
const adapter = Skill.from("./skills/code-reviewer");
```

**SKILL.md frontmatter fields:**

```yaml
---
name: code-reviewer # required
description: "..." # required
version: 1 # optional
---
## Instructions body here
```

Throws `Error` if no `SKILL.md` is found in the directory.

## `Skill.fromDir(dirPath)`

Scan a directory and load every subdirectory that contains a `SKILL.md`. Returns `AgentAdapter[]`. Skips subdirectories without a valid `SKILL.md` silently.

```ts
const adapters = Skill.fromDir("./skills");
for (const adapter of adapters) agent.use(adapter);
```

## `Skill.fromGitHub(url, skillName?, options?)`

Fetch skills from a GitHub repository. Overloaded:

```ts
// Single named skill
Skill.fromGitHub(url: string, skillName: string, options?: GitHubSkillOptions): Promise<AgentAdapter>

// All skills in the repo (every subdirectory with a SKILL.md)
Skill.fromGitHub(url: string, options?: GitHubSkillOptions): Promise<AgentAdapter[]>
```

Supported URL formats:

```
https://github.com/owner/repo
https://github.com/owner/repo/tree/ref
https://github.com/owner/repo/tree/ref/subdir
```

**Caching:** Definitions are cached in the in-process `Map` for the process lifetime. Pass `options.cache` (any `AgentCache`) to also persist across restarts.

## `GitHubSkillOptions`

```ts
interface GitHubSkillOptions {
  ref?: string; // branch, tag, or commit SHA (default: repo default branch)
  token?: string; // GitHub PAT for private repos
  subdir?: string; // subdirectory within repo (overrides any subdir in the URL)
  cache?: {
    // external cache for cross-restart persistence
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown, ttlMs?: number): Promise<void>;
  };
  cacheTtlMs?: number; // cache TTL in ms (default: 3_600_000 = 1 hour)
}
```

Any `AgentCache` instance satisfies the `cache` interface.

## `SkillDefinition`

Internal type representing a resolved skill before adapter construction.

```ts
interface SkillDefinition {
  name: string;
  description: string;
  version: number;
  instructions?: string;
  files?: Record<string, string>;
}
```

## Progressive Disclosure Summary

| Level | What the model sees             | When                                       |
| ----- | ------------------------------- | ------------------------------------------ |
| 1     | `[Skill available: name: desc]` | Always, in system prompt                   |
| 2     | Full `instructions` string      | When model calls `load_skill_instructions` |
| 3     | Individual file contents        | When model calls `load_skill_file`         |
