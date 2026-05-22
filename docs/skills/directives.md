# Directives

Directives are `/word` commands in a prompt that explicitly activate a skill by name. They are the `"directive-only"` activation trigger and always win over keyword matching in `"auto"` mode. Use them when you want the user or calling code to control exactly which skill applies to a given prompt.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill, HumanizerSkill, SummarizeSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only", // only activated via /directive
})
  .use(WritingSkill.create())    // directive: "write"
  .use(HumanizerSkill.create())  // directive: "humanize"
  .use(SummarizeSkill.create()); // directive: "summarize"

const response = await agent.run({
  prompt: `/write Draft a product update about the new caching feature.

/humanize Make the final paragraph warmer and more personal.`,
});

console.log(response.content);
// → Drafts the update with writing guidance applied,
//   then humanizes the closing paragraph

console.log(response.selection?.activeSkills);
// → ["writing", "humanizer"]
// SummarizeSkill did not activate — no /summarize directive in the prompt
```

## How Directives Work

A directive is a `/word` or `/phrase-with-hyphens` that appears in the prompt. The activation engine:

1. Parses the prompt for directive tokens
2. Matches each token against the `directive` field of attached skills
3. Activates matching skills — they inject their prompt guidance
4. Reports activation in `response.selection?.activationReasons` with `reason: "directive"`

### What Counts as a Directive

```txt
/write            ← matches WritingSkill (directive: "write")
/code-review      ← matches CodeReviewSkill (directive: "code-review")
/summarize        ← matches SummarizeSkill (directive: "summarize")
```

Directives are case-insensitive. They can appear anywhere in the prompt as long as they start with `/`.

### What Does NOT Count

The activation engine ignores directive-like tokens inside:

- Fenced code blocks (` ```...``` `)
- Lines that look like retrieved content, tool output, or external data

This prevents injected content (scraped pages, API responses, user uploads) from accidentally activating skills.

## Directive Naming Convention

When defining a skill, the `directive` must be a short **imperative verb or verb phrase** describing the action — not the skill name:

| Good directives | Bad directives |
| --- | --- |
| `"write"` | `"writing"` |
| `"summarize"` | `"summarization"` |
| `"review-code"` | `"code-review"` |
| `"draft"` | `"draft-skill"` |
| `"audit"` | `"auditing"` |

## All Built-In Directives

| Skill | Directive | Example |
| --- | --- | --- |
| `WritingSkill` | `write` | `/write Draft a blog post` |
| `HumanizerSkill` | `humanize` | `/humanize Make this warmer` |
| `SummarizeSkill` | `summarize` | `/summarize Condense this article` |
| `ResearchSkill` | `research` | `/research Find recent TypeScript papers` |
| `DeepResearchSkill` | `deep-research` | `/deep-research Analyze this market` |
| `TranslationSkill` | `translate` | `/translate Convert to Spanish` |
| `EmailDraftSkill` | `draft-email` | `/draft-email Write a follow-up email` |
| `DataAnalysisSkill` | `analyze-data` | `/analyze-data Interpret this CSV` |
| `DocumentAnalysisSkill` | `analyze-document` | `/analyze-document Review this contract` |
| `TranscriptionSkill` | `transcribe` | `/transcribe Clean up this transcript` |
| `VisionSkill` | `describe-image` | `/describe-image What is in this image?` |
| `CodeReviewSkill` | `review-code` | `/review-code Check for type safety issues` |
| `CopyrightSkill` | `check-copyright` | `/check-copyright Is this content original?` |
| `ConversationSkill` | `converse` | `/converse Help me think through this` |
| `MeetingSkill` | `prepare-meeting` | `/prepare-meeting Create an agenda for...` |
| `MemorySkill` | `remember` | `/remember Store this context` |
| `SchedulerSkill` | `schedule` | `/schedule Set up a recurring task` |

Domain skills also have directives — see [Industry Domain Skills](./domains/overview.md) for the full list by domain.

## Patterns

### Directive-Only Agent

Force callers to always be explicit about which skill to use:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill, ResearchSkill, CodeReviewSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(WritingSkill.create())
  .use(ResearchSkill.create())
  .use(CodeReviewSkill.create());

// No directive → no skills → plain model response
const plain = await agent.run({ prompt: "Explain caching." });
console.log(plain.selection?.activeSkills); // → []

// With directive → specific skill activates
const written = await agent.run({ prompt: "/write Explain caching in a blog-friendly style." });
console.log(written.selection?.activeSkills); // → ["writing"]
```

### Multi-Directive Prompt

Multiple directives in one prompt activate multiple skills simultaneously:

```ts
const response = await agent.run({
  prompt: `/research Find the top 3 TypeScript build tools in 2025.

/write Present the findings as a comparison table with pros and cons.`,
});

console.log(response.selection?.activeSkills);
// → ["research", "writing"]
```

### Directives in `"auto"` Mode

Directives also work in `"auto"` mode — they override keyword matching and activate the targeted skill with maximum confidence:

```ts
const response = await agent.run({
  prompt: "/review-code Assess whether this function handles edge cases.",
  // No need for skillActivation override — directive wins
});

const reasons = response.selection?.activationReasons ?? [];
const reviewReason = reasons.find((r) => r.skill === "code-review");
console.log(reviewReason?.reason);     // → "directive"
console.log(reviewReason?.confidence); // → 1.0
```

### Custom Skill With Directive

```ts
import { defineSkill } from "@deskcreate/agentcraft/skills";
import { Agent, Provider } from "@deskcreate/agentcraft";

const legalReviewSkill = defineSkill({
  name: "legal-review",
  directive: "review-contract", // /review-contract activates this skill
  description: "Legal review guidance — clause analysis and plain-language summaries.",
  prompt: {
    sections: [
      {
        title: "Legal Review Mode",
        body: "You are reviewing documents with legal accuracy in mind. Flag ambiguous clauses, identify missing standard provisions, and provide plain-language summaries.",
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
  prompt: "/review-contract Review this service agreement for unusual liability clauses.",
});
```

### Inspecting Directive Activation

```ts
const response = await agent.run({
  prompt: "/write Summarize the key benefits of semantic caching.",
});

const reasons = response.selection?.activationReasons ?? [];

for (const reason of reasons) {
  if (reason.reason === "directive") {
    console.log(`Skill "${reason.skill}" activated via directive "${reason.matched}"`);
    // → Skill "writing" activated via directive "/write"
  }
}
```

## Behavior Summary

| Case | Result |
| --- | --- |
| `/directive` matches an attached skill | That skill activates |
| `/directive` does not match any attached skill | Ignored (or error in `directive-only` mode) |
| No directive in prompt | Depends on `skillActivation` mode |
| `/directive` inside a code block | Ignored — injection prevention |
| Multiple `/directives` | All matching skills activate |

## Related

- [Skill Activation](./activation.md)
- [Primitive Skills](./built-in.md)
- [Custom Skills](./custom.md)
- [Skill Config](../configuration/skill-config.md)
