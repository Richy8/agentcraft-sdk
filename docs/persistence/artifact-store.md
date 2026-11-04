# ArtifactStore

`ArtifactStore` is the durable persistence interface for structured workflow outputs. It gives runs a place to write typed artifacts that later runs, tools, and workflows can read, update, and query.

## Purpose

| Implementation        | Dependency       | Best for                                   | Related page                                       |
| --------------------- | ---------------- | ------------------------------------------ | -------------------------------------------------- |
| `MemoryArtifactStore` | None             | Tests, demos, ephemeral scripts            | [AgentWorkflow](../orchestration/agent-workflow)   |
| `FileArtifactStore`   | None             | Local dev, JSON per artifact               | [AgentWorkspace](../orchestration/agent-workspace) |
| `SQLiteArtifactStore` | `better-sqlite3` | Local production, history, queryable state | [AgentWorkflow](../orchestration/agent-workflow)   |

## Usage

```ts
import { AgentWorkspace, FileArtifactStore } from "@deskcreate/agentcraft";

const store = FileArtifactStore({ root: "./.artifacts" });
const workspace = AgentWorkspace.create({ store });
if (workspace.store === undefined)
  throw new Error("Artifact store is required");

const draftId = await workspace.store.put("Draft", {
  title: "My Article",
  body: "Content here",
  status: "draft",
});

const draft = await workspace.store.get("Draft", draftId);
const drafts = await workspace.store.query("Draft", { status: "draft" });

await workspace.store.update(draftId, { status: "in_review" });
await workspace.store.updateByType("Draft", draftId, { status: "reviewed" });

const reviewId = await workspace.store.put("EditorialReview", {
  verdict: "needs_revision",
  notes: ["Add stronger source attribution"],
});

await workspace.store.link(
  { type: "Draft", id: draftId },
  { type: "EditorialReview", id: reviewId },
);

console.log(draft, drafts.length);
console.log(await workspace.store.listLinks({ type: "Draft", id: draftId }));
console.log(workspace.store.capabilities());
```

## Configuration

### `FileArtifactStore(options)`

| Field / Option    | Required | Default | Purpose                                                                      |
| ----------------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `root`            | Yes      | None    | Directory where artifact JSON files are written. Created if missing.         |
| `validateSchemas` | No       | `false` | Validate registered artifact types through `ArtifactRegistry` on put/update. |

### `SQLiteArtifactStore(options)`

| Field / Option    | Required | Default | Purpose                                                                      |
| ----------------- | -------- | ------- | ---------------------------------------------------------------------------- |
| `dbPath`          | Yes      | None    | Path to the SQLite database file. Use `:memory:` for in-process tests.       |
| `validateSchemas` | No       | `false` | Validate registered artifact types through `ArtifactRegistry` on put/update. |

`SQLiteArtifactStore` requires `better-sqlite3` as an optional peer dependency:

```sh
npm install better-sqlite3
```

### `ArtifactStore` Interface

| Method                          | Returns                      | Purpose                                               |
| ------------------------------- | ---------------------------- | ----------------------------------------------------- |
| `put(type, artifact)`           | `Promise<string>`            | Persist an artifact. Returns the generated ID.        |
| `get(type, id)`                 | `Promise<unknown>`           | Retrieve by type and ID.                              |
| `query(type, filter?)`          | `Promise<unknown[]>`         | List artifacts with optional filters.                 |
| `update(id, patch)`             | `Promise<void>`              | Shallow-merge patch onto a stored artifact.           |
| `updateByType(type, id, patch)` | `Promise<void>`              | Patch by type and ID to avoid duplicate-ID ambiguity. |
| `delete(type, id)`              | `Promise<boolean>`           | Remove an artifact. Returns true if deleted.          |
| `listTypes()`                   | `Promise<string[]>`          | All types with at least one artifact.                 |
| `history(type, id)`             | `Promise<ArtifactHistory[]>` | All revisions when the store supports history.        |
| `link(sourceRef, targetRef)`    | `Promise<void>`              | Create a directed link between two artifacts.         |
| `listLinks(sourceRef?)`         | `Promise<ArtifactLink[]>`    | List links for one source or the whole store.         |
| `capabilities()`                | `ArtifactStoreCapabilities`  | Reports backend guarantees and enabled validation.    |

### Schema Validation

Set `validateSchemas: true` when artifacts should match schemas registered with [`ArtifactRegistry`](../core/structured-output.md#with-artifactregistry).

```ts
import { FileArtifactStore } from "@deskcreate/agentcraft";

const store = FileArtifactStore({
  root: "./.agentcraft/artifacts",
  validateSchemas: true,
});

await store.put("Draft", {
  id: "draft-1",
  type: "Draft",
  createdAt: new Date().toISOString(),
  sourceSkill: "blog-writer",
  provenance: [{ kind: "model", ref: "blog-writer" }],
  inputs: [],
  status: "draft",
  format: "article",
  body: "Draft body",
});
```

### Typed Helpers

Use helpers when your app works with one artifact type repeatedly.

```ts
import {
  createArtifactTypeHelper,
  FileArtifactStore,
} from "@deskcreate/agentcraft";

const store = FileArtifactStore({ root: "./.agentcraft/artifacts" });
const drafts = createArtifactTypeHelper<Record<string, unknown>>(
  store,
  "Draft",
);

const id = await drafts.put({ body: "v1", status: "draft" });
await drafts.update(id, { body: "v2" });
```

### Capabilities

Backends differ by deployment target:

| Backend               | History | Links | Transactions | Schema validation |
| --------------------- | ------- | ----- | ------------ | ----------------- |
| `MemoryArtifactStore` | Yes     | Yes   | No           | Optional          |
| `FileArtifactStore`   | Yes     | Yes   | No           | Optional          |
| `SQLiteArtifactStore` | Yes     | Yes   | Yes          | Optional          |

### `ArtifactFilter`

| Field / Option  | Required | Default | Purpose                                          |
| --------------- | -------- | ------- | ------------------------------------------------ |
| `status`        | No       | None    | Match artifacts with this status value.          |
| `createdAfter`  | No       | None    | ISO date. Return artifacts created on or after.  |
| `createdBefore` | No       | None    | ISO date. Return artifacts created on or before. |
| `limit`         | No       | None    | Maximum results to return.                       |

## Local Examples

Use `MemoryArtifactStore` for test-scoped artifacts:

```ts
import { MemoryArtifactStore } from "@deskcreate/agentcraft";

const store = MemoryArtifactStore();
const id = await store.put("Draft", { body: "hello", status: "draft" });
const draft = await store.get("Draft", id);

console.log(draft);
```

Use `SQLiteArtifactStore` when revision history matters:

```ts
import { SQLiteArtifactStore } from "@deskcreate/agentcraft";

const store = SQLiteArtifactStore({ dbPath: "./.agentcraft/artifacts.db" });
const id = await store.put("Draft", { body: "v1", status: "draft" });

await store.update(id, { body: "v2", status: "in_review" });

const history = await store.history("Draft", id);
console.log(history.length);
```

More variants: [production cookbook](../examples-cookbook/production.md) and [AgentWorkflow](../orchestration/agent-workflow.md).
