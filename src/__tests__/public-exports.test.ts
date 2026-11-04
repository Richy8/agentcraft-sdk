import { describe, expect, it } from "vitest";
import {
  Agent,
  AgentCache,
  AgentEval,
  AgentPool,
  AgentReports,
  AgentWorkflow,
  AgentMemory,
  AgentWorkspace,
  ApprovalQueue,
  ApprovalStep,
  ArtifactRegistry,
  BestFitResolver,
  CustomStep,
  DeterministicFakeProvider,
  FileArtifactStore,
  MemoryArtifactStore,
  Provider,
  PromptAssembler,
  SQLiteArtifactStore,
  ToolStep,
  costCalculator,
  estimateTokens,
} from "../index.js";
import {
  DatabaseAdapter,
  FetchAdapter,
  ImageGenerationAdapter,
  TavilySearchAdapter,
  defineAdapter,
  tool,
} from "../adapters.js";
import { GitHubMCP, MCP } from "../mcp.js";
import { AgentTeam } from "../team.js";

describe("public entry points", () => {
  it("exports the core API and subpath barrels", async () => {
    expect(Agent).toBeDefined();
    expect(AgentPool).toBeDefined();
    expect(Provider.ollama["llama3.2"]).toBe("ollama:llama3.2");
    expect(PromptAssembler).toBeDefined();
    expect(
      TavilySearchAdapter.connect({ apiKey: "key" }).declaredToolNames,
    ).toEqual(["web_search", "get_page_content"]);
    expect(FetchAdapter.connect().name).toBe("fetch");
    expect(DatabaseAdapter.connect({ connectionString: "postgres://localhost/db" }).name).toBe("database");
    expect(ImageGenerationAdapter.connect({ provider: "openai", apiKey: "key" }).name).toBe("image-generation");
    expect(tool).toBeDefined();
    expect(defineAdapter).toBeDefined();
    expect(GitHubMCP.connect({ token: "token", packageSpec: "@artificable/github-mcp-server@0.1.0" }).name).toBe("github-mcp");
    expect(MCP.connect({ url: "https://example.com" }).name).toBe("mcp");
    expect(AgentTeam).toBeDefined();
    expect(DeterministicFakeProvider).toBeDefined();
    expect(costCalculator).toBeDefined();
    expect(BestFitResolver).toBeDefined();
    expect(estimateTokens).toBeDefined();
    expect(AgentCache.disabled().config.type).toBe("disabled");
    expect(AgentCache.memory().config.type).toBe("memory");
    expect(AgentCache.fromUrl("redis://localhost:6379").config.type).toBe("redis");
    expect(AgentMemory.local).toBeDefined();
    expect(AgentEval).toBeDefined();
    expect(AgentReports.eventCollector).toBeDefined();
    await expect(ApprovalQueue.memory().list()).resolves.toEqual([]);
    expect(AgentWorkspace.create({}).events).toBeDefined();
    expect(AgentWorkflow.create({ steps: [] }).inspect().steps).toEqual([]);
    expect(CustomStep({ id: "x", run: async () => "ok" }).type).toBe("custom");
    expect(ApprovalStep({ description: "approve" }).type).toBe("approval");
    expect(ToolStep).toBeDefined();
    expect(MemoryArtifactStore()).toBeDefined();
    expect(FileArtifactStore({ root: "/tmp/agentcraft-artifacts" })).toBeDefined();
    expect(SQLiteArtifactStore).toBeDefined();
    expect(ArtifactRegistry.list()).toBeDefined();
  });
});
