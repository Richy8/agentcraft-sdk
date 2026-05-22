# Skills Examples

Skills add reusable prompt behavior, dependency metadata, and optional directives. These examples cover built-in primitive skills, domain skill packs, custom skills, and directive-driven activation.

## Built-In Primitive Skills (Auto Mode)

Multiple skills activate automatically based on the prompt content:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  ResearchSkill,
  WritingSkill,
  SummarizeSkill,
} from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(ResearchSkill.create())
  .use(WritingSkill.create())
  .use(SummarizeSkill.create());

const response = await agent.run({
  prompt: "Research the top 3 TypeScript testing frameworks and write an executive summary.",
});

console.log(response.content);
console.log("Active skills:", response.selection?.activeSkills);
// → ["research", "writing"]
```

## Directive-Only Skills

Force explicit directive syntax — no skills activate unless the prompt contains the right `/directive`:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  HumanizerSkill,
  WritingSkill,
  CodeReviewSkill,
} from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
})
  .use(WritingSkill.create())
  .use(HumanizerSkill.create())
  .use(CodeReviewSkill.create());

// Only writing and humanizer activate — code-review does not
const response = await agent.run({
  prompt: `/write Draft a product announcement about our new streaming API.
  
/humanize Make the closing paragraph warmer and more personal.`,
});

console.log(response.content);
console.log(response.selection?.activeSkills);
// → ["writing", "humanizer"]
```

## Domain Skill Pack — Engineering

Load all 23 engineering domain skills at once:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("engineering"))
  .use(GitHubMcp.connect({
    token: process.env.GITHUB_TOKEN!,
    allowedTools: ["get_pull_request", "get_file_contents"],
  }));

const review = await agent.run({
  prompt: `/review-code Review PR #88 for type safety and edge case handling.
  
/review-security Flag any security concerns in auth-related files.`,
});
console.log(review.content);
```

## Domain Skill Pack — Marketing

Run an SEO content brief pipeline:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("marketing"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const keywords = await agent.run({
  prompt: `/research-keywords Research SEO keywords for "TypeScript agent SDK".
  Focus: developer-intent keywords, low difficulty, high commercial value.`,
});

const brief = await agent.run({
  prompt: `/brief-seo-content Create an SEO content brief for the keyword "TypeScript agent SDK".
  
  Keyword research: ${keywords.content.slice(0, 600)}`,
});

console.log(brief.content);
```

## Custom Skill

Define a project-specific skill with a custom directive:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { defineSkill } from "@deskcreate/agentcraft/skills";

const legalReviewSkill = defineSkill({
  name: "contract-reviewer",
  directive: "review-contract",
  description: "Review contracts for clause risks and plain-language gaps.",
  prompt: {
    sections: [
      {
        title: "Contract Review Mode",
        body: `Review the contract provided. Identify:
1. Ambiguous or one-sided clauses
2. Missing standard provisions (indemnification, limitation of liability, governing law)
3. Unusually long or short notice periods
4. Any auto-renewal provisions

Provide plain-language summaries for flagged clauses.`,
      },
    ],
  },
});

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
}).use(legalReviewSkill);

const response = await agent.run({
  prompt: "/review-contract Review this SaaS vendor agreement for unusual liability clauses.",
});
console.log(response.content);
```

## Inspect Skill Activation

```ts
const response = await agent.run({
  prompt: "/research-keywords Find keywords for 'AI agent framework TypeScript'.",
});

const reasons = response.selection?.activationReasons ?? [];
for (const { skill, reason, confidence, matched } of reasons) {
  console.log(`${skill}: ${reason} (confidence: ${confidence}${matched ? `, matched: "${matched}"` : ""})`);
}
// → seo-keyword-research: directive (confidence: 1.0, matched: "/research-keywords")
```

More detail: [Skills Overview](../skills/overview.md), [Directives](../skills/directives.md), [Domain Skills](../skills/domains/overview.md).
