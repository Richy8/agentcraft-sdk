# Memory & Store Config

Configuration for all persistence backends.

## `AgentMemory` Backends

### Local (In-Memory)

```ts
import { AgentMemory } from "@deskcreate/agentcraft";

const memory = AgentMemory.local();
// No persistence across restarts. For testing and development only.
```

### Qdrant

```ts
const memory = AgentMemory.qdrant({
  url: process.env.QDRANT_URL!, // e.g., "http://localhost:6333"
  apiKey: process.env.QDRANT_API_KEY, // optional for local instances
  collectionName: "agent-memory",
  dimension: 1536, // must match your embedding model's output dimension
  namespace: "prod", // optional, for multi-tenant isolation
});
```

### Pinecone

```ts
const memory = AgentMemory.pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
  indexName: "agent-memory",
  namespace: "default",
  dimension: 1536,
});
```

### Supabase

```ts
const memory = AgentMemory.supabase({
  url: process.env.SUPABASE_URL!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  tableName: "agent_memory",
});
```

## `MemoryArtifactStore` Options

```ts
import { MemoryArtifactStore } from "@deskcreate/agentcraft";

const store = new MemoryArtifactStore();
// In-memory only. No configuration needed. Ephemeral.
```

## `FileArtifactStore` Options

```ts
import { FileArtifactStore } from "@deskcreate/agentcraft";

const store = new FileArtifactStore({
  root: ".agentcraft/artifacts", // required: root directory
  maxSizeBytes: 10 * 1024 * 1024, // optional: max artifact size (10MB default)
});
```

| Field          | Type     | Default           | Description                                |
| -------------- | -------- | ----------------- | ------------------------------------------ |
| `root`         | `string` | Required          | Directory for storing artifact JSON files. |
| `maxSizeBytes` | `number` | `10485760` (10MB) | Maximum size of a single artifact.         |

## `SQLiteArtifactStore` Options

```ts
import { SQLiteArtifactStore } from "@deskcreate/agentcraft";

const store = new SQLiteArtifactStore({
  path: ".agentcraft/artifacts.db", // required: SQLite database file path
  tableName: "artifacts", // optional: custom table name
});
```

| Field       | Type     | Default       | Description                                                 |
| ----------- | -------- | ------------- | ----------------------------------------------------------- |
| `path`      | `string` | Required      | Path to the SQLite `.db` file. Created if it doesn't exist. |
| `tableName` | `string` | `'artifacts'` | Table name for artifact storage.                            |

## Related

- [Semantic Memory](../persistence/semantic-memory.md)
- [Artifact Store](../persistence/artifact-store.md)
- [Authoring a Domain Store](../persistence/authoring-domain-store.md)
