# Semantic Memory

`AgentMemory` is the general-purpose memory layer for agents, teams, workflows, and living systems. It retrieves small, scoped memories across runs without dumping an entire knowledge base into the prompt.

Use it for durable context like brand rules, user preferences, audience notes, operating procedures, customer constraints, or project decisions. Use [Creator Memory](../creator/memory.md) when you specifically need the creator resource tools for brand voice and corpus workflows.

## Quick Start

```ts
import {
  Agent,
  AgentMemory,
  AgentWorkspace,
  Provider,
} from "@deskcreate/agentcraft";

const memory = AgentMemory.local({
  root: ".agentcraft/memory",
  namespace: "linkedin-system",
  defaultScope: "brand",
  maxContextChars: 1_200,
  writes: {
    // Durable writes are approval-gated by default. Set this explicitly when
    // your app already controls who can write memory.
    requireApproval: false,
  },
});

await memory.add({
  text: "Voice: clear, practical, no hype. Avoid motivational filler.",
  source: "brand-workshop",
  metadata: { owner: "user" },
});

const workspace = AgentWorkspace.create({ memory });

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  workspace,
});

const response = await agent.run({
  prompt: "Draft next week LinkedIn post ideas using remembered brand voice.",
});

console.log(response.content);
```

## What It Adds

Semantic memory gives AgentCraft a bounded retrieval primitive:

- `AgentMemory.local()` stores records on disk and searches them with zero-dependency lexical embeddings.
- `AgentMemory.vector()` connects to Qdrant, Pinecone, Supabase pgvector, or a custom vector store.
- `AgentMemory.custom()` lets your app bring its own memory controller.
- Workspace memory is shared by single agents, [AgentTeam](../orchestration/agent-team.md), and [AgentWorkflow](../orchestration/agent-workflow.md).
- Memory events flow into [Observability Reports](../production/observability-reports.md).

## Local Memory

```ts
import { AgentMemory } from "@deskcreate/agentcraft";

const memory = AgentMemory.local({
  root: ".agentcraft/memory",
  namespace: "support-agent",
  defaultScope: "customer",
  maxContextChars: 1_500,
  retrieval: {
    topK: 4,
    minScore: 0.05,
    includeSources: true,
  },
  writes: {
    requireApproval: true,
    approveWrite: async (request) => {
      console.log(request.operation, request.scope, request.preview);
      return true; // Replace with your app reviewer or approval queue.
    },
    redactSensitive: true,
  },
});

await memory.add({
  scope: "customer",
  text: "Customer prefers short implementation notes and exact config names.",
  source: "onboarding-call",
});

const matches = await memory.search("implementation notes", {
  scopes: ["customer"],
  topK: 2,
  maxContextChars: 800,
});

console.log(matches.map((item) => item.source));
```

## Vector Memory

Vector memory uses a dense embedding provider. OpenAI embeddings are available through `AgentMemory.embeddings.openAI()`, and custom embedding functions are supported.

### Qdrant

```ts
import { AgentMemory } from "@deskcreate/agentcraft";

const memory = AgentMemory.vector({
  provider: "qdrant",
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
  collection: "agentcraft_memory",
  embeddings: AgentMemory.embeddings.openAI({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
  }),
  writes: { requireApproval: true },
});
```

### Pinecone

```ts
import { AgentMemory } from "@deskcreate/agentcraft";

const memory = AgentMemory.vector({
  provider: "pinecone",
  url: process.env.PINECONE_INDEX_HOST!,
  apiKey: process.env.PINECONE_API_KEY!,
  index: "agentcraft-memory",
  namespace: "production",
  embeddings: AgentMemory.embeddings.openAI({
    apiKey: process.env.OPENAI_API_KEY!,
  }),
});
```

### Supabase pgvector

```ts
import { AgentMemory } from "@deskcreate/agentcraft";

const memory = AgentMemory.vector({
  provider: "supabase",
  url: process.env.SUPABASE_URL!,
  apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  table: "agentcraft_memory",
  searchRpc: "match_agentcraft_memory",
  embeddings: AgentMemory.embeddings.openAI({
    apiKey: process.env.OPENAI_API_KEY!,
  }),
});
```

Your Supabase project should provide a table for records and an RPC that accepts `query_embedding`, `match_count`, `min_score`, and `scopes`. If your schema differs, use `AgentMemory.custom()` or the Supabase `client` option.

## Custom Memory Provider

```ts
import { AgentMemory } from "@deskcreate/agentcraft";

const memory = AgentMemory.custom({
  async add(input) {
    return myStore.insert(input);
  },
  async search(query, options) {
    return myStore.semanticSearch(query, options);
  },
  async delete(id) {
    return myStore.remove(id);
  },
});
```

## Run-Level Control

Workspace memory is retrieved automatically and bounded when a memory store is configured. You can override or disable it per run.

```ts
await agent.run({
  prompt: "Draft a customer update.",
  memory: {
    query: "customer update tone and constraints",
    scopes: ["customer", "brand"],
    topK: 3,
    maxContextChars: 900,
  },
});

await agent.run({
  prompt: "Answer without using durable memory.",
  memory: false,
});
```

You can also pass a different store for one run:

```ts
await agent.run({
  prompt: "Use project-specific implementation notes.",
  memory: {
    store: projectMemory,
    scopes: ["project-alpha"],
    topK: 2,
  },
});
```

## Memory With Approval Queue

Use a queue when user memories should be reviewed before becoming durable cross-run context.
The first write queues the request and returns `false`; after approval, rerun the same write or call your app's approved persistence path.

```ts
import { AgentMemory, ApprovalQueue } from "@deskcreate/agentcraft";

const approvals = ApprovalQueue.memory({
  defaultReviewer: "ops@example.com",
  requireReason: true,
});

const memory = AgentMemory.local({
  root: ".agentcraft/memory",
  writes: {
    requireApproval: true,
    approveWrite: async (request) => {
      const queued = await approvals.requestApproval({
        tool: {
          name: request.operation,
          description: "Persist semantic memory after reviewer approval.",
          parameters: { type: "object", properties: {}, required: [] },
          security: { sideEffect: "write", requiresConfirmation: true },
          execute: async () => ({ ok: true }),
        },
        args: {
          scope: request.scope,
          preview: request.preview,
          source: request.source,
        },
        riskReason: "Durable memory affects future agent runs.",
      });
      return queued.approved;
    },
  },
});
```

## Safety Defaults

Semantic memory is intentionally conservative.

- Durable writes require approval unless `writes.requireApproval` is set to `false`.
- Likely secrets and sensitive personal data are rejected by default.
- Retrieved context is capped by `maxContextChars`.
- Default `topK` is low so memory does not become a hidden token sink.
- Memory context is marked as untrusted background, not instructions.
- URL credentials are redacted in events, reports, and errors.

## Configuration

| Option                   | Required | Default                  | Purpose                                   |
| ------------------------ | -------- | ------------------------ | ----------------------------------------- |
| `namespace`              | No       | `"default"`              | Tenant, app, or system partition.         |
| `defaultScope`           | No       | `"default"`              | Scope used when writes omit `scope`.      |
| `maxContextChars`        | No       | `1800`                   | Hard cap for prompt memory context.       |
| `retrieval.topK`         | No       | `4`                      | Max records returned by default.          |
| `retrieval.minScore`     | No       | `0.05` local, `0` vector | Minimum similarity score.                 |
| `writes.requireApproval` | No       | `true`                   | Requires approval before durable writes.  |
| `writes.redactSensitive` | No       | `true`                   | Blocks likely secrets and sensitive data. |

## Events And Reports

Attach a report event collector when you want memory activity in a run report.

```ts
import {
  Agent,
  AgentMemory,
  AgentReports,
  AgentWorkspace,
  Provider,
} from "@deskcreate/agentcraft";

const memory = AgentMemory.local({
  root: ".agentcraft/memory",
  namespace: "report-demo",
  writes: { requireApproval: false },
});

const workspace = AgentWorkspace.create({ memory });
const events = AgentReports.eventCollector(workspace.events);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  workspace,
});

const response = await agent.run({
  prompt: "Use remembered audience objections.",
});

await AgentReports.writeMarkdown(response, "reports/run.md", {
  events: events.events(),
});
```

Report memory sections include reads, writes, deletes, blocked writes, and warnings.

## Related Pages

- [Creator Memory](../creator/memory.md)
- [Creator Memory Store](./creator-memory-store.md)
- [Artifact Store](./artifact-store.md)
- [Agent Workspace](../orchestration/agent-workspace.md)
- [Governance Queue](../production/governance-queue.md)
