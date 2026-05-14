import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { ConfigurationError } from "../../../errors/index.js";
import {
  AirtableMCP,
  ApifyMCP,
  BraveSearchMCP,
  BrowserbaseMCP,
  CloudflareMCP,
  Context7MCP,
  ElevenLabsMCP,
  FetchMCP,
  FigmaMCP,
  FilesystemMCP,
  FirecrawlMCP,
  GitHubMCP,
  GmailMCP,
  JiraMCP,
  LinearMCP,
  MCP_WRAPPER_REGISTRY,
  MemoryMCP,
  NeonMCP,
  NotionMCP,
  PlaywrightMCP,
  PostgresMCP,
  QdrantMCP,
  RailwayMCP,
  RenderMCP,
  ResendMCP,
  SentryMCP,
  SlackMCP,
  StripeMCP,
  SupabaseMCP,
  VercelMCP,
} from "../index.js";

const warningSpy = vi
  .spyOn(console, "warn")
  .mockImplementation(() => undefined);

describe("MCP server wrappers", () => {
  afterEach(() => {
    warningSpy.mockClear();
    vi.unstubAllGlobals();
  });

  afterAll(() => {
    warningSpy.mockRestore();
  });

  it("creates stdio wrappers with dynamic tool discovery", () => {
    expect(LinearMCP.connect({ apiKey: "key" }).name).toBe("linear-mcp");
    expect(
      FilesystemMCP.connect({ allowedPaths: ["/tmp/workspace"] })
        .declaredToolNames,
    ).toBeUndefined();
  });

  it("creates hosted HTTP wrappers", () => {
    expect(NeonMCP.connect({ apiKey: "key" }).name).toBe("neon-mcp");
    expect(VercelMCP.connect({ apiToken: "token" }).name).toBe("vercel-mcp");
  });

  it("supports discriminated dual-transport wrappers", () => {
    expect(
      SentryMCP.connect({ transport: "http", authToken: "token" }).name,
    ).toBe("sentry-mcp");
    expect(
      StripeMCP.connect({ transport: "stdio", secretKey: "sk_test" }).name,
    ).toBe("stripe-mcp");
  });

  it("provides metadata for every built-in MCP wrapper", () => {
    expect(Object.keys(MCP_WRAPPER_REGISTRY).length).toBeGreaterThanOrEqual(28);
    for (const definition of Object.values(MCP_WRAPPER_REGISTRY)) {
      expect(definition.adapterName).toMatch(/-mcp$/);
      expect(definition.trustLevel).toBeTruthy();
      expect(definition.sideEffects.length).toBeGreaterThan(0);
      expect(definition.scopes.length).toBeGreaterThan(0);
    }

    expect(LinearMCP.connect({ apiKey: "key" }).metadata).toMatchObject({
      kind: "mcp-backed",
      trustLevel: "review-required",
      requiredSecrets: ["LINEAR_API_KEY"],
    });
  });

  it("smoke-tests every built-in MCP wrapper factory", () => {
    const adapters = [
      AirtableMCP.connect({ apiKey: "key", baseId: "base" }),
      ApifyMCP.connect({ token: "token" }),
      ApifyMCP.connect({
        transport: "http",
        token: "token",
        url: "https://mcp.example.test",
      }),
      BraveSearchMCP.connect({ apiKey: "key" }),
      BrowserbaseMCP.connect({ apiKey: "key", projectId: "project" }),
      CloudflareMCP.connect({ apiToken: "token", accountId: "acct" }),
      Context7MCP.connect(),
      Context7MCP.connect({
        transport: "http",
        url: "https://mcp.example.test",
      }),
      ElevenLabsMCP.connect({
        apiKey: "key",
        packageSpec: "@mindstone-engineering/mcp-server-elevenlabs@0.2.1",
      }),
      FetchMCP.connect({ packageSpec: "@yawlabs/fetch-mcp@0.3.1" }),
      FigmaMCP.connect({ apiToken: "token" }),
      FilesystemMCP.connect({ allowedPaths: ["/tmp/workspace"] }),
      FirecrawlMCP.connect({ apiKey: "key" }),
      GitHubMCP.connect({
        token: "token",
        packageSpec: "@artificable/github-mcp-server@0.1.0",
      }),
      GmailMCP.connect(),
      JiraMCP.connect({
        host: "https://example.atlassian.net",
        email: "me@example.com",
        apiToken: "token",
      }),
      LinearMCP.connect({ apiKey: "key" }),
      MemoryMCP.connect(),
      NeonMCP.connect({ apiKey: "key" }),
      NotionMCP.connect({ token: "token" }),
      PlaywrightMCP.connect(),
      PostgresMCP.connect({
        connectionString: "postgres://user:pass@localhost/db",
      }),
      QdrantMCP.connect({ url: "https://qdrant.example.test", apiKey: "key" }),
      RailwayMCP.connect({ apiToken: "token" }),
      RenderMCP.connect({ apiKey: "key" }),
      ResendMCP.connect({ apiKey: "key" }),
      ResendMCP.connect({
        transport: "http",
        apiKey: "key",
        url: "https://mcp.example.test",
      }),
      SentryMCP.connect({ transport: "stdio", authToken: "token" }),
      SentryMCP.connect({ transport: "http", authToken: "token" }),
      SlackMCP.connect({ botToken: "token", teamId: "T1" }),
      StripeMCP.connect({ secretKey: "sk_test" }),
      StripeMCP.connect({
        transport: "http",
        secretKey: "sk_test",
        url: "https://mcp.example.test",
      }),
      SupabaseMCP.connect({
        url: "https://supabase.example.test",
        apiKey: "key",
      }),
      VercelMCP.connect({ apiToken: "token" }),
    ];

    expect(adapters.map((adapter) => adapter.name).sort()).toEqual(
      expect.arrayContaining(Object.keys(MCP_WRAPPER_REGISTRY)),
    );
    for (const adapter of adapters) {
      expect(adapter.metadata?.kind).toBe("mcp-backed");
      expect(adapter.metadata?.trustLevel).toBeTruthy();
      expect(adapter.getTools).toBeDefined();
    }
    expect(warningSpy).not.toHaveBeenCalled();
  });

  it("fails closed for wrappers without verified default npm packages", () => {
    expect(() => GitHubMCP.connect({ token: "token" })).toThrow(
      ConfigurationError,
    );
    expect(() => FetchMCP.connect()).toThrow(ConfigurationError);
    expect(() => ElevenLabsMCP.connect({ apiKey: "key" })).toThrow(
      ConfigurationError,
    );
    expect(() =>
      GitHubMCP.connect({
        token: "token",
        packageSpec: "@artificable/github-mcp-server",
      }),
    ).toThrow(ConfigurationError);
  });

  it("keeps every default stdio MCP package version-pinned", () => {
    for (const definition of Object.values(MCP_WRAPPER_REGISTRY)) {
      if (definition.packageStatus === "requires-user-package") {
        expect(definition.packageName).toBeUndefined();
        continue;
      }
      if (definition.transport === "stdio" || definition.transport === "dual") {
        expect(definition.packageName).toBeDefined();
        expect(isPinnedPackage(definition.packageName!)).toBe(true);
      }
    }
  });

  it("exposes wrapper-level allowlists for friendly MCP factories", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const message = JSON.parse(String(init?.body)) as {
          id: number;
          method: string;
        };
        return {
          ok: true,
          json: async () => ({
            jsonrpc: "2.0",
            id: message.id,
            result:
              message.method === "tools/list"
                ? {
                    tools: [
                      {
                        name: "allowed_lookup",
                        inputSchema: { type: "object" },
                      },
                      {
                        name: "blocked_write",
                        inputSchema: { type: "object" },
                      },
                    ],
                  }
                : {},
          }),
        } as Response;
      }),
    );

    const adapter = Context7MCP.connect({
      transport: "http",
      url: "https://mcp.example.test",
      allowedTools: ["allowed_lookup"],
      allowedResources: ["docs://agentcraft/"],
      roots: ["https://docs.example.test"],
    });
    const tools = await adapter.getTools?.();

    expect(tools?.map((item) => item.name)).toEqual(["allowed_lookup"]);
    await adapter.cleanup?.();
  });

  it("maps wrapper-level roots and tool allowlists into stdio MCP configs", () => {
    expect(() =>
      FilesystemMCP.connect({
        allowedPaths: ["/tmp/workspace"],
        allowedTools: ["read_file"],
        roots: ["../not-allowed"],
      }),
    ).toThrow(ConfigurationError);

    expect(
      StripeMCP.connect({
        secretKey: "sk_test",
        tools: ["customers.read"],
      }).metadata?.sideEffects,
    ).toEqual(["read", "write", "external"]);
  });
});

function isPinnedPackage(packageName: string): boolean {
  if (packageName.startsWith("@")) return packageName.slice(1).includes("@");
  return packageName.includes("@");
}
