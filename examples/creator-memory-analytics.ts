import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  FileSystemAnalyticsHistoryStore,
  FileSystemCreatorMemoryStore,
} from "@deskcreate/agentcraft";
import {
  AnalyticsAdapter,
  CreatorResourcesAdapter,
} from "@deskcreate/agentcraft/adapters";

const root = await mkdtemp(path.join(tmpdir(), "agentcraft-creator-state-"));

const memory = new FileSystemCreatorMemoryStore(path.join(root, "memory"));
await memory.upsertBrandVoice({
  id: "default",
  tone: "practical and evidence-led",
  preferredPhrases: ["show the tradeoff"],
});
await memory.addCorpusDocument({
  id: "agent-cache-post",
  text: "A prior post about cache policy, tool calls, and token burn.",
  tags: ["cache", "agents"],
});

const analytics = new FileSystemAnalyticsHistoryStore(
  path.join(root, "analytics"),
);

const resourceTools = await CreatorResourcesAdapter.connect({
  memoryStore: memory,
}).getTools?.();
const analyticsTools = await AnalyticsAdapter.connect({
  historyStore: analytics,
}).getTools?.();

console.log(resourceTools?.map((tool) => tool.name));
console.log(analyticsTools?.map((tool) => tool.name));
