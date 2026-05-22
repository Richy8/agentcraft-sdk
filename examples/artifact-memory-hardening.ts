import {
  AgentWorkspace,
  createArtifactTypeHelper,
  FileArtifactStore,
  FileSystemCreatorMemoryStore,
} from "@deskcreate/agentcraft";

const store = FileArtifactStore({
  root: "./.agentcraft/artifacts",
  validateSchemas: true,
});

const memory = new FileSystemCreatorMemoryStore({
  root: "./.agentcraft/memory",
  staleAfterMs: 1000 * 60 * 60 * 24 * 30,
  requireWriteApproval: true,
  approveWrite: async (request) => {
    // Route this to your app's approval system in production.
    console.log(
      `Approving memory write: ${request.operation}`,
      request.preview,
    );
    return true;
  },
});

await memory.upsertBrandVoice({
  id: "default",
  tone: "practical and evidence-led",
  preferredPhrases: ["show the tradeoff"],
  bannedPhrases: ["game changer"],
  examples: ["We explain systems by naming the constraint first."],
});

await memory.addCorpusDocument({
  id: "cache-post",
  text: "Prior article: cache replay reduces repeated tool calls, but freshness rules decide when reuse is safe.",
  tags: ["cache", "cost"],
});

const workspace = AgentWorkspace.create({ store });
if (!workspace.store) throw new Error("Artifact store is required");

const drafts = createArtifactTypeHelper<Record<string, unknown>>(
  workspace.store,
  "Draft",
);

const draftId = await drafts.put({
  id: "draft-local-example",
  type: "Draft",
  createdAt: new Date().toISOString(),
  sourceSkill: "blog-writer",
  provenance: [{ kind: "model", ref: "blog-writer" }],
  inputs: [],
  status: "draft",
  format: "article",
  body: "Draft body from an agent run.",
});

await drafts.update(draftId, { status: "reviewed" });

const reviewId = await workspace.store.put("EditorialReview", {
  id: "review-local-example",
  type: "EditorialReview",
  createdAt: new Date().toISOString(),
  sourceSkill: "blog-fact-check",
  provenance: [{ kind: "model", ref: "blog-fact-check" }],
  inputs: [draftId],
  status: "reviewed",
  findings: ["Add stronger source attribution."],
  recommendedEdits: ["Name the tradeoff in the introduction."],
});

await workspace.store.link(
  { type: "Draft", id: draftId },
  { type: "EditorialReview", id: reviewId },
);

const memoryContext = await memory.summarizeContext({
  query: "cache cost article",
  tags: ["cache"],
  maxChars: 900,
});

console.log("Store capabilities:", workspace.store.capabilities());
console.log("Draft history:", await workspace.store.history("Draft", draftId));
console.log(
  "Draft links:",
  await workspace.store.listLinks({ type: "Draft", id: draftId }),
);
console.log("Compact memory context:", memoryContext);
