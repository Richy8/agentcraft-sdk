# Skills Overview

Skills package reusable behavior: role, goal, output expectations, directives, dependency metadata, and optional tools.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(WritingSkill.create());

const response = await agent.run({
  prompt: "/write Draft a concise customer update.",
});
console.log(response.content);
```

## Skill Surfaces

| Surface          | Purpose                              | More                                            |
| ---------------- | ------------------------------------ | ----------------------------------------------- |
| Built-in skills  | Ready-made behavior.                 | [Built-In Skills](./built-in.md)                |
| Directives       | Target skill behavior in prompt.     | [Skill Directives](./directives.md)             |
| Activation       | Controls when attached skills apply. | [Skill Activation](./activation.md)             |
| External skills  | Load local/GitHub skills.            | [External Skills](./external-skills.md)         |
| Custom skills    | App-owned behavior.                  | [Custom Skills](./custom.md)                    |
| Skill specs      | Registry-ready skill definitions.    | [Custom Skills](./custom.md#spec-backed-skills) |
| Primitive skills | Broad reusable building blocks.      | [Built-In Skills](./built-in.md)                |
| Domain skills    | Routine-specific skills by workflow. | [Domain Skill Examples](#domain-skill-examples) |
| Certification    | Prompt quality rubrics and reports.  | [Skill Certification](#skill-certification)     |

## Config

| Field       | Required    | Default | Purpose                                       |
| ----------- | ----------- | ------- | --------------------------------------------- |
| `name`      | Yes         | None    | Skill id.                                     |
| `directive` | Recommended | None    | Slash command target.                         |
| `prompt`    | Usually     | None    | Structured prompt behavior.                   |
| `metadata`  | Recommended | `{}`    | Dependencies, risk, versions.                 |
| `tools`     | No          | `[]`    | Skill-local tools.                            |
| `domain`    | No          | None    | Optional registry grouping for domain skills. |
| `category`  | No          | None    | Optional category inside a domain.            |

## Examples

- [Skill composition](../examples.md#skill-composition)
- [Skill directives](../examples.md#skill-directives)
- [Custom skills](../examples.md#custom-skills)

## Domain Skill Examples

Domain skills are narrower than primitive skills. Use them when the prompt is about a known routine such as writing a LinkedIn post, preparing a YouTube script, creating a resume, or building a blog brief.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(createSkillByName("blog-brief"))
  .use(createSkillByName("linkedin-post-writer"))
  .use(createSkillByName("youtube-scriptwriter"))
  .use(createSkillByName("resume-ats-review"));

const response = await agent.run({
  prompt:
    "/linkedin-post Turn this product note into a founder post with a specific tension and no fake metrics.",
});
console.log(response.content);
```

Routine-specific creator skills cover active creator categories including blog, Medium, LinkedIn, X/Twitter, Facebook, Pinterest, Instagram, Snapchat, TikTok, YouTube, short video, podcast, newsletter, Substack, book, course, webinar, and resume workflows. Use the direct class exports for the flagship hand-built skills, or resolve any registry-backed routine by name.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  createSkillByName,
  listSkillInspections,
} from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(createSkillByName("medium-article-writer"))
  .use(createSkillByName("tiktok-shot-list"))
  .use(createSkillByName("podcast-show-notes-writer"))
  .use(createSkillByName("cover-letter-writer"));

console.log(listSkillInspections({ domain: "creator" }).length);
```

Brand domain skills are spec-backed skills for brand research, audience insight, positioning, messaging, and voice systems. They are intentionally separate from creator packs so product teams, agencies, B2B teams, and internal brand operators can use them directly.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  createSkillByName,
  listSkillInspections,
} from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillByName("brand-research"))
  .use(createSkillByName("audience-insight-research"))
  .use(createSkillByName("brand-positioning"))
  .use(createSkillByName("messaging-framework-writer"))
  .use(createSkillByName("brand-consistency-review"));

const response = await agent.run({
  prompt:
    "Build a brand positioning brief from these customer notes, competitor pages, and our current homepage copy.",
});

console.log(
  listSkillInspections({ domain: "brand" }).map((skill) => skill.name),
);
console.log(response.content);
```

Marketing domain skills are spec-backed and can be attached directly without using a pack. They cover digital marketing strategy, SEO research and audits, ad creative workflows, campaign planning, email marketing, landing pages, and competitor intelligence.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  createSkillByName,
  listSkillInspections,
} from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(createSkillByName("seo-keyword-research"))
  .use(createSkillByName("landing-page-conversion-review"))
  .use(createSkillByName("ad-compliance-review"));

console.log(
  listSkillInspections({ domain: "marketing" }).map((skill) => skill.name),
);
```

Business domain skills are also direct spec-backed skills. They cover operating-business investments, strategy, operations, partnerships, business plans, and market expansion.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  createSkillByName,
  listSkillInspections,
} from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(createSkillByName("business-due-diligence-brief"))
  .use(createSkillByName("market-entry-strategy"))
  .use(createSkillByName("executive-decision-memo"));

console.log(
  listSkillInspections({ domain: "business" }).map((skill) => skill.name),
);
```

The remaining active domain surfaces follow the same direct-skill pattern for sales, finance, personal productivity, product, engineering, support, legal, healthcare, and data analytics.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  createSkillByName,
  listSkillInspections,
} from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(createSkillByName("equity-research-brief"))
  .use(createSkillByName("prd-writer"))
  .use(createSkillByName("contract-risk-review"))
  .use(createSkillByName("ab-test-analysis"));

console.log(
  listSkillInspections({ domain: "finance" }).length,
  listSkillInspections({ domain: "product" }).length,
);
```

## Domain Skill Packs

Use direct skills when you know the exact capability you want. Use `createSkillPackByName()` when you want the complete category set attached and let `skillActivation: "auto"` select only the relevant skills for a run.

Category pack names use `<domain>-<category>-skills` so they do not collide with curated workflow packs such as `MarketingPacks.seo()`.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  createSkillPackByName,
  listSkillPackSpecs,
} from "@deskcreate/agentcraft/packs";

const seoPack = createSkillPackByName("marketing-seo-skills", {
  readOnlyByDefault: true,
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
}).use(seoPack);

const availableCreatorPacks = listSkillPackSpecs({ domain: "creator" });
console.log(availableCreatorPacks.map((pack) => pack.name));
```

For compact, opinionated workflows, use [Creator Packs](../creator/packs.md) or [Industry Packs](../packs/industry.md). For category completeness, use skill packs.

## Skill Certification

AgentCraft exports lightweight certification helpers so teams can score spec-backed skills before shipping them.

```ts
import {
  formatSkillQualityCertificationReport,
  listSkillInspections,
  scoreSkillSpecQuality,
} from "@deskcreate/agentcraft/skills";

const scores = listSkillInspections({ domain: "creator" }).map((inspection) =>
  scoreSkillSpecQuality({
    name: inspection.name,
    description: inspection.description,
    prompt: inspection.hasPrompt
      ? {
          role: "Certification preview only.",
          goal: "Score public inspection metadata without exposing private prompt content.",
          constraints: [],
          toolUsePolicy: [],
          outputFormat: [],
          qualityChecklist: [],
        }
      : undefined,
  }),
);

console.log(formatSkillQualityCertificationReport(scores));
```

The built-in rubrics check domain intelligence, anti-stuffing discipline, AI-slop resistance, tool-use discipline, and evidence boundaries. Live provider certification remains opt-in through the integration test gates so unit tests stay fast and offline.
