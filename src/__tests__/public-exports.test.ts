import { describe, expect, it } from "vitest";
import {
  Agent,
  AgentCache,
  AgentPool,
  AgentWorkflow,
  AgentWorkspace,
  ApprovalStep,
  ArtifactRegistry,
  BestFitResolver,
  CustomStep,
  DeterministicFakeProvider,
  FileArtifactStore,
  FileSystemAnalyticsHistoryStore,
  FileSystemCreatorMemoryStore,
  MemoryArtifactStore,
  Provider,
  PromptAssembler,
  SQLiteArtifactStore,
  ToolStep,
  costCalculator,
  estimateTokens,
} from "../index.js";
import {
  CitationManagerAdapter,
  LinkCheckerAdapter,
  SeoAdapter,
  TavilySearchAdapter,
  tool,
} from "../adapters.js";
import {
  BlogWriterSkill,
  GitHubSkillLoader,
  HumanizerSkill,
} from "../skills.js";
import { CreatorPacks } from "../packs.js";
import { LinearMCP } from "../mcp.js";
import { AgentTeam } from "../team.js";

describe("public entry points", () => {
  it("exports the core API and subpath barrels", () => {
    expect(Agent).toBeDefined();
    expect(AgentPool).toBeDefined();
    expect(Provider.ollama["llama3.2"]).toBe("ollama:llama3.2");
    expect(PromptAssembler).toBeDefined();
    expect(
      TavilySearchAdapter.connect({ apiKey: "key" }).declaredToolNames,
    ).toEqual(["web_search", "get_page_content"]);
    expect(CitationManagerAdapter.connect().name).toBe("citation-manager");
    expect(LinkCheckerAdapter.connect().name).toBe("link-checker");
    expect(SeoAdapter.connect().name).toBe("seo");
    expect(tool).toBeDefined();
    expect(HumanizerSkill.create().directive).toBe("humanizer");
    expect(LinearMCP.connect({ apiKey: "key" }).name).toBe("linear-mcp");
    expect(AgentTeam).toBeDefined();
    expect(DeterministicFakeProvider).toBeDefined();
    expect(costCalculator).toBeDefined();
    expect(BestFitResolver).toBeDefined();
    expect(estimateTokens).toBeDefined();
    expect(AgentCache.disabled().config.type).toBe("disabled");
    expect(AgentCache.memory().config.type).toBe("memory");
    expect(AgentWorkspace.create({}).events).toBeDefined();
    expect(AgentWorkflow.create({ steps: [] }).inspect().steps).toEqual([]);
    expect(CustomStep({ id: "x", run: async () => "ok" }).type).toBe("custom");
    expect(ApprovalStep({ description: "approve" }).type).toBe("approval");
    expect(ToolStep).toBeDefined();
    expect(MemoryArtifactStore()).toBeDefined();
    expect(FileArtifactStore({ root: "/tmp/agentcraft-artifacts" })).toBeDefined();
    expect(SQLiteArtifactStore).toBeDefined();
    expect(ArtifactRegistry.lookup("Draft")).toBeDefined();
    expect(
      new FileSystemCreatorMemoryStore("/tmp/agentcraft-memory").root,
    ).toContain("agentcraft-memory");
    expect(
      new FileSystemAnalyticsHistoryStore("/tmp/agentcraft-analytics").root,
    ).toContain("agentcraft-analytics");
    expect(CreatorPacks.blog().type).toBe("creator-pack");
    expect(BlogWriterSkill.create().skillMetadata?.creator?.name).toBe(
      "blog-writer",
    );
    expect(GitHubSkillLoader).toBeDefined();
  });
});
