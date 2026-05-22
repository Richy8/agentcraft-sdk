# Citation Store

The citation store layer keeps source records, quote metadata, and evidence links accessible to evidence-heavy skills. It is composed of two adapters: `CitationManagerAdapter` (record citations) and `LinkCheckerAdapter` (validate live URLs). Together they support skills like `blog-fact-check`, `blog-citation`, `medical-literature-synthesis`, `landing-page-claim-risk-review`, and the full evidence pipeline for content with source requirements.

## How It Works

```txt
Agent run using blog or evidence skills
  → CitationManagerAdapter exposes tools:
      record_citation    (write) — store source URL, quote, attribution
      list_citations     (read)  — retrieve all citations for the run
      verify_citation    (read)  — check if a citation is still reachable
  → LinkCheckerAdapter exposes tools:
      check_link         (read)  — verify a URL is live and returns 2xx
      check_links_batch  (read)  — check multiple links concurrently
  → Skills use citations to:
      - Map claims to sources (blog-citation)
      - Flag broken or outdated sources (blog-fact-check)
      - Build evidence briefs with linked proof (landing-page-claim-risk-review)
```

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  CitationManagerAdapter,
  LinkCheckerAdapter,
} from "@deskcreate/agentcraft/adapters";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(CitationManagerAdapter.connect())
  .use(LinkCheckerAdapter.connect())
  .use(createSkillPackByName("creator"));

const response = await agent.run({
  prompt: `/research-blog-evidence Research sources for a post about TypeScript performance improvements.
  
/map-blog-citations Map all claims to sources and record them.`,
});

console.log(response.content);
```

## Configuration

### `CitationManagerAdapter.connect(options?)`

| Option | Required | Default | Purpose |
| --- | --- | --- | --- |
| `store` | No | In-memory | Backing store for citation records. Pass a persistent store for durability across runs. |
| `requireApproval` | No | `false` | Require tool policy approval before recording citations |
| `maxCitations` | No | `200` | Maximum citations stored per session |

### `LinkCheckerAdapter.connect(options?)`

| Option | Required | Default | Purpose |
| --- | --- | --- | --- |
| `timeoutMs` | No | `5000` | Milliseconds before a link check times out |
| `allowedDomains` | No | All domains | Restrict link checking to specific domains |
| `maxConcurrent` | No | `5` | Maximum concurrent link check requests |
| `userAgent` | No | Default agent string | User agent sent with link check requests |
| `followRedirects` | No | `true` | Follow HTTP redirects when checking links |

## Citation Tools

### CitationManagerAdapter Tools

| Tool | Side Effect | Purpose |
| --- | --- | --- |
| `record_citation` | write | Store a citation with URL, quote, page title, and claim context |
| `list_citations` | read | List all citations recorded in the current session |
| `verify_citation` | read | Check whether a recorded citation URL is still accessible |
| `export_citations` | read | Export all citations as structured JSON or markdown bibliography |

### LinkCheckerAdapter Tools

| Tool | Side Effect | Purpose |
| --- | --- | --- |
| `check_link` | read | Verify a single URL is live (returns status code, redirect chain) |
| `check_links_batch` | read | Check multiple URLs concurrently |

## Patterns

### Blog Post with Full Citation Pipeline

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  CitationManagerAdapter,
  FetchAdapter,
  FirecrawlAdapter,
  LinkCheckerAdapter,
} from "@deskcreate/agentcraft/adapters";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(CitationManagerAdapter.connect())
  .use(LinkCheckerAdapter.connect({ timeoutMs: 8000 }))
  .use(FetchAdapter.connect({ allowedDomains: ["github.com", "npmjs.com", "tc39.es"] }))
  .use(createSkillPackByName("creator"));

// Research with evidence
const research = await agent.run({
  prompt: `/research-blog-evidence Research evidence for: "TypeScript decorators are now stable in 5.0"
  
Use specific sources from TC39, GitHub, and npm.`,
});

// Write with citations embedded
const draft = await agent.run({
  prompt: `/write-blog Write a 1000-word blog post using this research.
  
Evidence: ${research.content}`,
});

// Map all claims to sources
const citations = await agent.run({
  prompt: `/map-blog-citations Map every claim in this draft to its supporting source.
  
Draft: ${draft.content}`,
});

// Fact-check and verify links
const factCheck = await agent.run({
  prompt: `/fact-check-blog Verify all claims and check that all source URLs are live.
  
Citations: ${citations.content}`,
});

console.log(factCheck.content);
```

### Domain-Restricted Citation Audit

```ts
const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
})
  .use(CitationManagerAdapter.connect({ maxCitations: 50 }))
  .use(LinkCheckerAdapter.connect({
    allowedDomains: ["pubmed.ncbi.nlm.nih.gov", "cochranelibrary.com", "nejm.org"],
    timeoutMs: 10000,
  }))
  .use(createSkillPackByName("healthcare"));

const review = await agent.run({
  prompt: `/synthesize-literature Synthesize these 5 RCTs on GLP-1 receptor agonists.
  Only accept sources from PubMed, Cochrane Library, or NEJM.
  
  Studies: [list of abstracts]`,
});

const evidenceGrade = await agent.run({
  prompt: `/grade-evidence Grade the evidence quality. Verify all source URLs are accessible.
  
  Synthesis: ${review.content}`,
});
```

### Legal Content Claim Review

```ts
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(CitationManagerAdapter.connect())
  .use(createSkillPackByName("legal"));

const claimReview = await agent.run({
  prompt: `/review-regulated-claim Review these marketing claims for FTC compliance.
  Record all supporting sources for each claim that passes review.
  
  Claims: "Clinically proven to reduce wrinkles by 50% in 4 weeks"`,
});
```

## Citation Record Shape

When `record_citation` is called, it stores:

```ts
interface CitationRecord {
  id: string;              // Auto-generated
  url: string;             // Source URL
  title: string;           // Page or document title
  quote?: string;          // Relevant verbatim excerpt
  claim: string;           // The claim this citation supports
  recordedAt: string;      // ISO timestamp
  verified?: boolean;      // Whether link was checked live
  statusCode?: number;     // HTTP response code from link check
}
```

## Capabilities by Adapter

| Feature | CitationManagerAdapter | LinkCheckerAdapter |
| --- | --- | --- |
| Record sources | ✓ | — |
| Batch link validation | — | ✓ |
| Single URL check | — | ✓ |
| Domain allowlisting | — | ✓ |
| Export bibliography | ✓ | — |
| Approval gate for writes | ✓ | N/A (read-only) |

## Related

- [Creator Domain Skills](../skills/domains/creator.md) — blog, fact-check, citation mapping skills
- [Healthcare Domain Skills](../skills/domains/healthcare.md) — medical literature synthesis
- [Legal Domain Skills](../skills/domains/legal.md) — regulated claim review
- [Creator Memory Store](./creator-memory-store.md) — brand voice and corpus memory
- [Artifact Store](./artifact-store.md) — general artifact persistence
