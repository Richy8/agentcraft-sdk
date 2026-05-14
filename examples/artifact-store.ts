import {
  Agent,
  AgentWorkspace,
  ArtifactRegistry,
  FileArtifactStore,
  MemoryArtifactStore,
  Provider,
  SQLiteArtifactStore,
} from "agentcraft";

// FileArtifactStore writes one JSON file per artifact for local inspection.
const fileStore = FileArtifactStore({ root: "./.artifacts" });

// MemoryArtifactStore keeps test artifacts isolated to the current process.
const memStore = MemoryArtifactStore();
await memStore.put("Draft", { body: "test fixture", status: "draft" });

// SQLiteArtifactStore adds durable history when better-sqlite3 is installed.
const sqliteStore =
  process.env.AGENTCRAFT_USE_SQLITE === "true"
    ? SQLiteArtifactStore({ dbPath: "./.agentcraft/artifacts.db" })
    : fileStore;

const workspace = AgentWorkspace.create({
  store: sqliteStore,
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const DraftSchema = ArtifactRegistry.lookup("Draft");
const response = await agent.run({
  prompt: "Draft a short article on AI agent memory patterns.",
  responseSchema: DraftSchema,
});

if (!workspace.store) throw new Error("Artifact store is required");

const id = await workspace.store.put("Draft", {
  ...((response.structuredResponse ?? {}) as Record<string, unknown>),
  status: "draft",
});

const pending = await workspace.store.query("Draft", { status: "draft" });
await workspace.store.update(id, { status: "in_review" });

const history = await workspace.store.history("Draft", id);
console.log("Draft stored:", id);
console.log("Pending drafts:", pending.length);
console.log("Revisions:", history.length);
