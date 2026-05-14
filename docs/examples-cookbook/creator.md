# Creator Examples

Creator examples combine packs, direct skills, tools, memory, cache, and review passes.

## Medium Blog Workflow

```ts
import { Agent, AgentCache, Provider } from "agentcraft";
import { FirecrawlAdapter, FileSystemAdapter } from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file("./.agentcraft/cache", { strategy: "auto" }),
})
  .use(FirecrawlAdapter.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }))
  .use(
    FileSystemAdapter.connect({
      rootPath: "./content",
      allowedExtensions: [".md"],
    }),
  )
  .use(CreatorPacks.blog({ contentRoot: "./content", cache: "auto" }));

const response = await agent.run({
  prompt: "Write a Medium article about testing agent workflows in production.",
});
console.log(response.content);
```

## Multiple Packs Plus A Skill

```ts
import { Agent, Provider } from "agentcraft";
import { BrandVoiceSkill } from "agentcraft/skills";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(CreatorPacks.seo())
  .use(CreatorPacks.blog())
  .use(BrandVoiceSkill.create());

const response = await agent.run({
  prompt: "Draft an SEO-optimized blog post.",
});
console.log(response.content);
```

## Review Before Publish

```ts
import { Agent, Provider } from "agentcraft";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(CreatorPacks.publishing());

const response = await agent.run({
  prompt:
    "/publish-qa Review this draft for metadata, broken links, and unsupported claims.",
});
console.log(response.content);
```

More detail: [Creator Packs](../creator/packs.md), [Creator Skills](../creator/skills.md), [Creator Memory](../creator/memory.md).
