# Authoring a Domain Store

Pattern guide for building a specialized persistence store for a custom domain.

## When to Build a Domain Store

Use a domain store when:

- Your data shape doesn't fit `ArtifactStore` generics (e.g., brand voice profiles, experiment plans)
- You need domain-specific search (e.g., cosine-similarity over corpus documents)
- You need freshness semantics (e.g., stale-after-N-ms)
- You want write approval gating specific to your domain

For pattern inspiration, see [Artifact Store](./artifact-store.md) and [Semantic Memory](./semantic-memory.md).

## Step 1 — Define Your Data Shape

```ts
import { z } from "zod";

export const CustomerProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  industry: z.string(),
  notes: z.string().optional(),
  updatedAt: z.number(), // Unix ms
});

export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;
```

## Step 2 — Choose a Backend

| Backend                    | Use when                                     |
| -------------------------- | -------------------------------------------- |
| `fs/promises` (JSON files) | Small data sets, local dev, single instance  |
| SQLite                     | Medium data, single-node, structured queries |
| Postgres                   | Multi-instance, complex queries, production  |

```ts
import { promises as fs } from "node:fs";
import path from "node:path";

export class FileCustomerStore {
  constructor(private root: string) {}

  private filePath(id: string) {
    return path.join(this.root, `${id}.json`);
  }
}
```

## Step 3 — Implement Read/Write/Search

```ts
async put(profile: CustomerProfile): Promise<void> {
  await fs.mkdir(this.root, { recursive: true });
  await fs.writeFile(
    this.filePath(profile.id),
    JSON.stringify(profile, null, 2),
  );
}

async get(id: string): Promise<CustomerProfile | undefined> {
  try {
    const raw = await fs.readFile(this.filePath(id), "utf-8");
    return CustomerProfileSchema.parse(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

async list(): Promise<CustomerProfile[]> {
  const files = await fs.readdir(this.root).catch(() => []);
  const profiles = await Promise.all(
    files.filter(f => f.endsWith(".json")).map(async f => {
      const raw = await fs.readFile(path.join(this.root, f), "utf-8");
      return CustomerProfileSchema.parse(JSON.parse(raw));
    }),
  );
  return profiles;
}
```

## Step 4 — Add Write Approvals

Gate destructive writes behind an `approveWrite` callback:

```ts
export interface FileCustomerStoreOptions {
  root: string;
  requireWriteApproval?: boolean;
  approveWrite?: (id: string, profile: CustomerProfile) => Promise<boolean>;
}

async put(profile: CustomerProfile): Promise<void> {
  if (this.options.requireWriteApproval && this.options.approveWrite) {
    const approved = await this.options.approveWrite(profile.id, profile);
    if (!approved) throw new Error(`Write for ${profile.id} was denied`);
  }
  // ... proceed with write
}
```

## Step 5 — Add Staleness

Track freshness with `updatedAt` + `staleAfterMs`:

```ts
export interface MemoryFreshness {
  stale: boolean;
  ageMs: number;
  staleAfterMs: number;
  checkedAt: number;
}

freshness(profile: CustomerProfile): MemoryFreshness {
  const ageMs = Date.now() - profile.updatedAt;
  const staleAfterMs = this.options.staleAfterMs ?? 86_400_000; // 24h default
  return {
    stale: ageMs > staleAfterMs,
    ageMs,
    staleAfterMs,
    checkedAt: Date.now(),
  };
}
```

## Step 6 — Add Secret Redaction

Prevent credentials from being stored:

```ts
function assertStoreSafe(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (/sk-[A-Za-z0-9_-]{20,}|api[_-]?key/i.test(serialized)) {
    throw new Error("Refusing to persist likely secret material");
  }
}

async put(profile: CustomerProfile): Promise<void> {
  assertStoreSafe(profile); // throws if secrets detected
  // ... write
}
```

## Step 7 — Integrate With a Workflow

Expose the store to agents via workspace:

```ts
import { AgentWorkspace } from "@deskcreate/agentcraft";

const store = new FileCustomerStore({
  root: ".agentcraft/customers",
  staleAfterMs: 3_600_000,
});

const workspace = AgentWorkspace.create({ store });

// Agents access store via workspace.store
const workflow = AgentWorkflow.create({ workspace, steps: [...] });
```

## Related

- [Creator Memory Store](./creator-memory-store.md) — reference implementation
- [Analytics History Store](./analytics-history-store.md) — reference implementation
- [Artifact Store](./artifact-store.md) — generic typed persistence
- [Memory & Store Config](../configuration/memory-store-config.md)
