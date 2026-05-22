# Industry Domain Skills

Industry domain skills are pre-built skill packs for specific professional verticals. Each domain bundles 10–37 skills organized by workflow stage — research, drafting, review, and operations. Attach an entire domain with one `createSkillPackByName()` call, or pick individual skills from any domain.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

// Attach the entire engineering domain — ~23 skills
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  // "auto" prevents all skills from activating on every run
  skillActivation: "auto",
}).use(createSkillPackByName("engineering"));

// Only relevant skills activate per run
const response = await agent.run({
  prompt: "/review-code Review this TypeScript function for type safety and performance issues.",
});
console.log(response.selection?.activeSkills); // → ["code-review"]
```

## Available Domains

| Domain | Pack name | Skills | Focus |
| --- | --- | --- | --- |
| [Brand & Voice](./brand.md) | `"brand"` | 17 | Positioning, messaging, voice, research |
| [Business Operations](./business.md) | `"business"` | 30 | Strategy, operations, M&A, investment |
| [Content & Creator](./creator.md) | `"creator"` | 30+ | Blog, social, video, book, SEO, newsletter |
| [Data & Analytics](./data-analytics.md) | `"data-analytics"` | 12 | Metrics, experiments, dashboards |
| [Engineering](./engineering.md) | `"engineering"` | 23 | Code review, architecture, debugging, DevOps |
| [Finance](./finance.md) | `"finance"` | 24 | Research, portfolio, budgeting, risk |
| [Healthcare](./healthcare.md) | `"healthcare"` | 11 | Clinical docs, patient education, research |
| [Legal](./legal.md) | `"legal"` | 12 | Contract review, compliance, policy |
| [Marketing](./marketing.md) | `"marketing"` | 37 | Ads, campaigns, SEO, email, social, content |
| [Personal Productivity](./personal-productivity.md) | `"personal-productivity"` | 16 | Planning, tasks, calendar, communication |
| [Product](./product.md) | `"product"` | 23 | PRD, roadmap, research, launch |
| [Sales](./sales.md) | `"sales"` | 23 | Account research, outreach, pipeline, proposals |
| [Support](./support.md) | `"support"` | 14 | Tickets, responses, CS, renewals |

## Using Domain Packs

### Attach the Full Domain

```ts
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

// Each domain name maps to its pack
const engineering = createSkillPackByName("engineering");
const marketing = createSkillPackByName("marketing");
const legal = createSkillPackByName("legal");
```

### Attach Individual Domain Skills

Pick only the skills you need instead of the whole domain:

```ts
import { createSkillByName } from "@deskcreate/agentcraft/skills";
import { Agent, Provider } from "@deskcreate/agentcraft";

// Just the code review skill from engineering
const codeReviewSkill = createSkillByName("code-review");

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(codeReviewSkill);
```

### Browse Domain Skills Programmatically

```ts
import { listSkillSpecs } from "@deskcreate/agentcraft/skills";

// All engineering domain skills
const engineeringSkills = listSkillSpecs({ domain: "engineering" });
console.log(engineeringSkills.map((s) => `${s.name} → /${s.directive}`));

// All skills in the "review" category across all domains
const reviewSkills = listSkillSpecs({ category: "review" });
```

### Combine Domains

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

// An agent with both marketing and data-analytics domain skills
const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillPackByName("marketing"))
  .use(createSkillPackByName("data-analytics"));

// Auto mode selects the right skills per run
const campaign = await agent.run({ prompt: "/review-campaign-performance Assess last month's email campaigns." });
const metrics = await agent.run({ prompt: "/analyze-data Identify anomalies in conversion rate." });
```

## Stability

Industry domain skills are in **Beta** — the API (pack names, skill names, directives) may have minor changes before reaching Stable. The behavior and output quality of individual skills is considered production-quality.

## Related

- [Skill Activation](../activation.md) — `"auto"` vs `"always"` vs `"directive-only"`
- [Directives](../directives.md) — how `/directive` syntax works
- [Primitive Skills](../built-in.md) — 17 cross-domain skills
- [Custom Skills](../custom.md) — define your own domain skill
- [External Skills](../external-skills.md) — load skills from GitHub
