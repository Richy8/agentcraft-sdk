# External Skills

`GitHubSkillLoader` loads skills from local directories or public GitHub repositories into the same `AgentSkill` shape as built-in skills. Each external skill is a folder with two required files: `skill.json` (manifest) and `SKILL.md` (instructions).

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubSkillLoader } from "@deskcreate/agentcraft/skills";

// Load a skill from a local directory
const skill = await GitHubSkillLoader.loadLocal("./skills/my-skill");

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(skill);

const response = await agent.run({
  prompt: "/my-skill Draft a post about AI caching.",
});
console.log(response.content);
```

## Methods

| Method                         | Returns                 | Purpose                                                   |
| ------------------------------ | ----------------------- | --------------------------------------------------------- |
| `loadLocal(directory, trust?)` | `Promise<AgentSkill>`   | Load one skill from a local directory.                    |
| `loadManyLocal(directories)`   | `Promise<AgentSkill[]>` | Load multiple local skills. Throws on duplicate names.    |
| `load(config)`                 | `Promise<AgentSkill>`   | Load from a local path or a pinned GitHub repository URL. |

## `loadLocal(directory, trustOrOptions?)`

Reads `skill.json` and `SKILL.md` from the given directory. Trust defaults to `"workspace"`.

```ts
// Default trust level ("workspace")
const skill = await GitHubSkillLoader.loadLocal("./skills/my-skill");

// Explicit trust level (string shorthand)
const reviewed = await GitHubSkillLoader.loadLocal(
  "./skills/my-skill",
  "reviewed",
);

// Options object — trust + optional checksum verification
const verified = await GitHubSkillLoader.loadLocal("./skills/my-skill", {
  trust: "workspace",
  checksums: {
    "skill.json": "abc123...", // sha256 hex digest (with or without "sha256:" prefix)
    "SKILL.md": "sha256:def456...", // optional — verify SKILL.md too
  },
});
```

### `LocalSkillLoaderOptions`

| Field       | Required | Default       | Purpose                                                                  |
| ----------- | -------- | ------------- | ------------------------------------------------------------------------ |
| `trust`     | No       | `"workspace"` | Trust level applied to the skill. Controls write-capable skill blocking. |
| `checksums` | No       | None          | SHA-256 digests for `skill.json` and/or `SKILL.md`. Throws on mismatch.  |

## `loadManyLocal(directories)`

Loads a batch of local skills in parallel. Throws if two skills share the same name.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubSkillLoader } from "@deskcreate/agentcraft/skills";

const skills = await GitHubSkillLoader.loadManyLocal([
  "./skills/research",
  "./skills/writer",
  "./skills/fact-checker",
]);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
});

for (const skill of skills) {
  agent.use(skill);
}

const response = await agent.run({
  prompt: "/research Find sources about TypeScript 5.5.",
});
console.log(response.content);
```

## `load(config)` — `GitHubSkillLoaderConfig`

The general loader works for both local paths and remote GitHub URLs.

| Field          | Required         | Default       | Purpose                                                                                  |
| -------------- | ---------------- | ------------- | ---------------------------------------------------------------------------------------- |
| `repo`         | Yes              | None          | Local directory path (`.` or `/` prefix) or `https://github.com/owner/repo` URL.         |
| `ref`          | For GitHub repos | None          | Pinned commit SHA or tag. **Required for GitHub repos — prevents supply chain attacks.** |
| `path`         | No               | Repo root     | Subdirectory within the repo where `skill.json` and `SKILL.md` live.                     |
| `trust`        | No               | `"workspace"` | Trust level for the loaded skill.                                                        |
| `token`        | No               | None          | GitHub personal access token for private repos.                                          |
| `allowedRepos` | No               | Allow all     | Allowlist of GitHub repo URLs. Throws if `repo` is not in this list.                     |
| `checksums`    | No               | None          | SHA-256 digests to verify `skill.json` and/or `SKILL.md` before loading.                 |

```ts
// Load from a local path (same as loadLocal)
const localSkill = await GitHubSkillLoader.load({
  repo: "./skills/my-skill",
  trust: "workspace",
});

// Load from a public GitHub repo — ref is required
const remoteSkill = await GitHubSkillLoader.load({
  repo: "https://github.com/acme/agentcraft-skills",
  ref: "a1b2c3d4e5f6...", // pinned commit SHA — never use a branch name
  path: "skills/writer", // subdirectory in the repo
  trust: "reviewed",
});

// Private repo with a GitHub token
const privateSkill = await GitHubSkillLoader.load({
  repo: "https://github.com/myorg/internal-skills",
  ref: "v1.2.0",
  token: process.env.GITHUB_TOKEN!,
  trust: "workspace",
});

// With allowlist and checksum verification
const strictSkill = await GitHubSkillLoader.load({
  repo: "https://github.com/acme/agentcraft-skills",
  ref: "a1b2c3d4...",
  allowedRepos: ["https://github.com/acme/agentcraft-skills"], // block other repos
  checksums: {
    "skill.json": "sha256:abc123...",
    "SKILL.md": "sha256:def456...",
  },
  trust: "reviewed",
});
```

## Trust Levels

| Level         | Write-capable skills | Use when                                       |
| ------------- | -------------------- | ---------------------------------------------- |
| `"untrusted"` | Blocked              | Public or unknown skills you haven't reviewed. |
| `"reviewed"`  | Allowed              | Skills you've audited and approved.            |
| `"workspace"` | Allowed (default)    | Internal team skills in your own repository.   |
| `"official"`  | Allowed              | First-party AgentCraft skills.                 |

Write-capable skills (those with `sideEffectRisk: "write"` or `"external"`) are blocked when `trust` is `"untrusted"`. This prevents an unreviewed remote skill from publishing, deleting, or sending data.

## Skill Folder Structure

Every external skill directory must contain exactly two files:

```
my-skill/
  skill.json   ← manifest (metadata, capabilities, artifact contract)
  SKILL.md     ← system prompt extension (the actual skill instructions)
```

### `skill.json` Format

The top-level fields are `name`, `description`, `directive`, and `creator`. The `creator` block is validated against the full `CreatorSkillManifest` schema.

```json
{
  "name": "medium-writer",
  "description": "Writes long-form Medium articles with clear structure.",
  "directive": "medium",
  "creator": {
    "name": "medium-writer",
    "directive": "medium",
    "category": "creation",
    "stage": "creation",
    "priority": 50,
    "description": "Writes long-form Medium articles with clear structure.",
    "docsPath": "SKILL.md",
    "requiredCapabilities": ["tools"],
    "optionalCapabilities": ["filesystem.read"],
    "consumesArtifacts": ["ContentBrief"],
    "producesArtifacts": ["Draft"],
    "sideEffectRisk": "read",
    "outputOwner": "primary-draft",
    "composesWith": ["blog-writer"],
    "readiness": "production-ready",
    "promptVersion": "2026-05-01"
  }
}
```

### `creator` Block Fields

| Field                  | Type       | Allowed values                                                                              | Purpose                                        |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `name`                 | `string`   | Any                                                                                         | Stable skill identifier.                       |
| `directive`            | `string`   | Any (matches top-level `directive`)                                                         | Slash command trigger.                         |
| `category`             | `string`   | `"strategy-and-research"`, `"seo"`, `"creation"`, `"review-and-governance"`, `"operations"` | Skill category for routing and filtering.      |
| `stage`                | `string`   | `"context"`, `"strategy"`, `"creation"`, `"review"`, `"operations"`                         | Workflow stage this skill belongs to.          |
| `priority`             | `number`   | Integer (higher = higher priority)                                                          | Selection order when multiple skills match.    |
| `description`          | `string`   | Any                                                                                         | Human-readable skill description.              |
| `docsPath`             | `string`   | Any path or URL                                                                             | Link to docs or `SKILL.md`.                    |
| `requiredCapabilities` | `string[]` | Capability strings or `{ oneOf: [...] }` / `{ allOf: [...] }` expressions                   | Model capabilities this skill needs.           |
| `optionalCapabilities` | `string[]` | Same as required                                                                            | Capabilities used if available.                |
| `consumesArtifacts`    | `string[]` | Artifact type names (e.g. `"ContentBrief"`)                                                 | Input artifact types this skill reads.         |
| `producesArtifacts`    | `string[]` | Artifact type names (e.g. `"Draft"`)                                                        | Output artifact types this skill writes.       |
| `sideEffectRisk`       | `string`   | `"none"`, `"read"`, `"write"`, `"external"`                                                 | Highest side-effect level of this skill.       |
| `outputOwner`          | `string`   | `"supporting-context"`, `"plan"`, `"primary-draft"`, `"review-report"`, `"publish-package"` | What the skill's output is used for.           |
| `composesWith`         | `string[]` | Skill names                                                                                 | Skills this one is designed to work alongside. |
| `readiness`            | `string`   | `"metadata-only"`, `"preview"`, `"production-ready"`                                        | Maturity level of this skill.                  |
| `promptVersion`        | `string`   | Any version string (e.g. `"2026-05-01"`)                                                    | Cache invalidation key for prompt changes.     |

### `SKILL.md` Format

`SKILL.md` is injected verbatim as a system prompt extension. Write it as instructions to the model.

```markdown
You are a long-form content writer specializing in Medium articles.

When writing:

- Open with a hook that frames the problem clearly.
- Use subheadings every 300–400 words.
- End with a concrete takeaway.

Keep the tone practical and evidence-led. Avoid jargon without explanation.
```

## Checksum Verification

Checksums prevent tampered or substituted skill files. The loader computes a SHA-256 digest of the file content and compares it to the expected value. The `sha256:` prefix is optional.

```ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Generate checksums to pin before deploying
const manifestHash = createHash("sha256")
  .update(readFileSync("./skills/my-skill/skill.json", "utf8"))
  .digest("hex");

const instructionsHash = createHash("sha256")
  .update(readFileSync("./skills/my-skill/SKILL.md", "utf8"))
  .digest("hex");

console.log(`skill.json: ${manifestHash}`);
console.log(`SKILL.md:   ${instructionsHash}`);

// Then use in production
const skill = await GitHubSkillLoader.loadLocal("./skills/my-skill", {
  checksums: {
    "skill.json": manifestHash,
    "SKILL.md": `sha256:${instructionsHash}`,
  },
});
```

## Patterns

### Load and Attach Multiple Skills

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubSkillLoader } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const [researchSkill, writerSkill] = await GitHubSkillLoader.loadManyLocal([
  "./skills/research",
  "./skills/writer",
]);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(researchSkill)
  .use(writerSkill);

const r1 = await agent.run({
  prompt: "/research Find sources about AI caching.",
});
const r2 = await agent.run({
  prompt: "/writer Draft a post using those sources.",
});

console.log(r1.selection?.activeSkills); // → ["research"]
console.log(r2.selection?.activeSkills); // → ["writer"]
```

### Pinned GitHub Skill with Repo Allowlist

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubSkillLoader } from "@deskcreate/agentcraft/skills";

const skill = await GitHubSkillLoader.load({
  repo: "https://github.com/acme/agentcraft-skills",
  ref: "a1b2c3d4e5f67890abcdef1234567890abcdef12", // pinned SHA
  path: "skills/writer",
  trust: "reviewed",
  allowedRepos: ["https://github.com/acme/agentcraft-skills"], // block unrecognized repos
  checksums: {
    "skill.json": "sha256:abc...",
    "SKILL.md": "sha256:def...",
  },
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(skill);

const response = await agent.run({
  prompt: "/writer Draft a launch announcement.",
});
console.log(response.content);
```

### Untrusted Sandbox (Read-Only Skills Only)

```ts
import { GitHubSkillLoader } from "@deskcreate/agentcraft/skills";

// Blocks any skill with sideEffectRisk "write" or "external"
const skill = await GitHubSkillLoader.loadLocal(
  "./skills/unreviewed",
  "untrusted",
);

// If the skill has sideEffectRisk "write", this will throw:
// "External skill '...' requires elevated trust for write side effects"
```

### Skip Checksum for Development, Enable for Production

```ts
import { GitHubSkillLoader } from "@deskcreate/agentcraft/skills";

const isDev = process.env.NODE_ENV !== "production";

const skill = await GitHubSkillLoader.loadLocal("./skills/writer", {
  trust: isDev ? "workspace" : "reviewed",
  checksums: isDev
    ? undefined
    : {
        "skill.json": process.env.WRITER_SKILL_JSON_HASH!,
        "SKILL.md": process.env.WRITER_SKILL_MD_HASH!,
      },
});
```

## Related

- [Custom Skills](./custom.md)
- [Skill Activation](./activation.md)
- [Skill Directives](./directives.md)
- [Built-In Skills](./built-in.md)
