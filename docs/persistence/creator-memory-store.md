# Creator Memory Store

`FileSystemCreatorMemoryStore` persists brand voice, corpus documents, and audience context so creator workflows resume with the same voice, persona, and knowledge without re-loading it every run.

## How It Works

```txt
Agent run with CreatorResourcesAdapter
  → CreatorResourcesAdapter exposes tools:
      read_brand_voice       (read)   — load tone, phrases, examples
      upsert_brand_voice     (write)  — update stored voice profile
      add_corpus_document    (write)  — add reference text to corpus
      search_corpus          (read)   — find relevant corpus sections
      summarize_memory       (read)   — compact memory context string
  → FileSystemCreatorMemoryStore reads/writes JSON files at root/
  → Brand voice injected into systemMessage as context
```

## Quick Start

```ts
import {
  Agent,
  FileSystemCreatorMemoryStore,
  Provider,
} from "@deskcreate/agentcraft";
import { CreatorResourcesAdapter } from "@deskcreate/agentcraft/adapters";

const memory = new FileSystemCreatorMemoryStore("./.agentcraft/creator-memory");

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(CreatorResourcesAdapter.connect({ memoryStore: memory }));

// First run: establish brand voice
await agent.run({
  prompt: `Store our brand voice:
  Tone: Direct, technical, no buzzwords
  Preferred phrases: "in practice", "the trade-off is"
  Banned: "leverage", "synergy", "game-changer"
  Examples: "Claude agents compose well because they share a single event loop."`,
});

// Future runs: load and inject voice context manually
const context = await memory.summarizeContext({ query: "blog post" });
const post = await agent.run({
  prompt: "Write a post about TypeScript generics for experienced developers.",
  system: context,
});
console.log(post.content);
```

## Configuration

### `FileSystemCreatorMemoryStore` Options

| Option | Required | Default | Purpose |
| --- | --- | --- | --- |
| `root` | No | `"content/memory"` | Directory where voice and corpus JSON files are written |
| `staleAfterMs` | No | None | Mark memories as stale after this many milliseconds |
| `requireWriteApproval` | No | `false` | Require callback approval before writing to disk |
| `approveWrite` | No | None | Async callback `(request) => boolean` for write gate |
| `redactSensitive` | No | `true` | Block likely secrets and sensitive content from being stored |

The constructor accepts either a root path string or an options object:

```ts
// Short form — root path only
const memory = new FileSystemCreatorMemoryStore("./.agentcraft/creator-memory");

// Full options
const memory = new FileSystemCreatorMemoryStore({
  root: "./.agentcraft/creator-memory",
  staleAfterMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  requireWriteApproval: true,
  approveWrite: async ({ operation, id, preview }) => {
    console.log(`[memory write] ${operation}: ${preview}`);
    return true; // auto-approve; replace with interactive prompt for production
  },
  redactSensitive: true,
});
```

## API

### Store Methods

| Method | Returns | Purpose |
| --- | --- | --- |
| `upsertBrandVoice(profile)` | `Promise<BrandVoiceProfile>` | Create or overwrite the stored brand voice profile |
| `readBrandVoice(id?)` | `Promise<BrandVoiceProfile \| undefined>` | Read the brand voice (default ID if not specified) |
| `addCorpusDocument(doc)` | `Promise<CorpusDocument>` | Add a reference text to the corpus for recall |
| `searchCorpus(query, options?)` | `Promise<CorpusSearchResult[]>` | Find corpus documents relevant to a query |
| `summarizeContext(options?)` | `Promise<string>` | Compact memory context string for system prompt injection |

### `BrandVoiceProfile` Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Profile identifier (use `"default"` for single-brand setups) |
| `tone` | `string?` | Overall tone description |
| `preferredPhrases` | `string[]?` | Phrases to encourage in output |
| `bannedPhrases` | `string[]?` | Phrases to avoid |
| `examples` | `string[]?` | Sample sentences demonstrating the voice |
| `updatedAt` | `string` | ISO timestamp (auto-set) |
| `freshness` | `MemoryFreshness?` | Staleness metadata if `staleAfterMs` is configured |

### `MemorySummaryOptions`

| Option | Type | Purpose |
| --- | --- | --- |
| `brandVoiceId` | `string?` | Voice profile to include (defaults to `"default"`) |
| `query` | `string?` | Semantic query for corpus search |
| `tags` | `string[]?` | Filter corpus documents by tag |
| `corpusLimit` | `number?` | Max corpus documents to include |
| `maxChars` | `number?` | Truncate the summary at this character count |
| `includeStaleWarnings` | `boolean?` | Add staleness warnings to the context string |

## Patterns

### Brand Voice Setup and Recall

```ts
import {
  Agent,
  FileSystemCreatorMemoryStore,
  Provider,
} from "@deskcreate/agentcraft";
import { CreatorResourcesAdapter } from "@deskcreate/agentcraft/adapters";

const memory = new FileSystemCreatorMemoryStore({
  root: "./.agentcraft/creator-memory",
  staleAfterMs: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(CreatorResourcesAdapter.connect({ memoryStore: memory }));

// Establish voice from existing content
await agent.run({
  prompt: `Extract and store the brand voice from these sample LinkedIn posts.
  
  Sample 1: "We shipped native streaming support. Here's what changed and why..."
  Sample 2: "Tool caching saved us $40/day in OpenAI costs. The setup took 15 minutes."`,
});

// Load voice context and inject it for future runs
const context = await memory.summarizeContext({ query: "LinkedIn post" });
const post = await agent.run({
  prompt: "Write a post announcing our new MCP adapter support.",
  system: context,
});
```

### Corpus for Audience Context

```ts
// Add audience research to corpus
await memory.addCorpusDocument({
  id: "audience-dev-2025",
  text: "Target reader: senior TypeScript developers, 5+ years exp, works at 50-200 person startups. Pain: fragile LLM integrations, unpredictable costs.",
  tags: ["audience", "icp"],
});

await memory.addCorpusDocument({
  id: "objections-2025",
  text: "Top objections: 1) Why not LangChain? 2) How does this handle rate limits? 3) Does it support streaming?",
  tags: ["objections", "positioning"],
});

// Compact to system prompt
const context = await memory.summarizeContext({
  query: "blog post about TypeScript agent SDK",
  tags: ["audience"],
  corpusLimit: 2,
  maxChars: 800,
});

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  system: context,
});

const post = await agent.run({
  prompt: "Write a comparison post: AgentCraft vs. LangChain.",
});
```

### Freshness Checking

```ts
const voice = await memory.readBrandVoice("default");

if (!voice) {
  console.warn("No brand voice found — run voice extraction first.");
} else if (voice.freshness?.stale) {
  console.warn(
    `Brand voice is stale (${Math.round(voice.freshness.ageMs / 86_400_000)} days old). Consider refreshing.`
  );
} else {
  console.log("Brand voice is current.");
}
```

### Write Approval Gate

When you don't want the agent to silently mutate your brand voice:

```ts
const memory = new FileSystemCreatorMemoryStore({
  root: "./.agentcraft/creator-memory",
  requireWriteApproval: true,
  approveWrite: async ({ operation, id, preview }) => {
    // In production: prompt the user in a UI, send Slack notification, etc.
    const readline = await import("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
      rl.question(`Approve ${operation} for "${id}"?\n${preview}\n[y/N] `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "y");
      });
    });
  },
});
```

## Memory Types Compared

| Store | What it remembers | Scope | Backend |
| --- | --- | --- | --- |
| `FileSystemCreatorMemoryStore` | Brand voice, corpus, audience | Creator workflows | JSON files |
| `AgentMemory` (Qdrant/Pinecone) | General semantic facts | Any agent | Vector DB |
| `FileSystemAnalyticsHistoryStore` | Performance reports, experiments | Creator analytics | JSON files |
| `ArtifactStore` | Structured workflow outputs | Workflows | JSON / SQLite |
| `MemoryMCP` | Graph-structured project facts | MCP-enabled agents | External server |

## Related

- [Creator Analytics](../creator/analytics.md) — performance-driven content memory
- [Analytics History Store](./analytics-history-store.md) — experiment and metrics tracking
- [Semantic Memory](./semantic-memory.md) — general cross-run agent memory
