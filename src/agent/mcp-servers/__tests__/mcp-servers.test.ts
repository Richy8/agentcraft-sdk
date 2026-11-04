import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { ConfigurationError } from "../../../errors/index.js";
import {
  BraveSearchMCP,
  FetchMCP,
  FilesystemMCP,
  FirecrawlMCP,
  GitHubMCP,
  MCP,
  PostgresMCP,
  SlackMCP,
  SupabaseMCP,
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

  it("creates all 8 kept wrappers", () => {
    expect(GitHubMCP.connect({ token: "token", packageSpec: "@artificable/github-mcp-server@0.1.0" }).name).toBe("github-mcp");
    expect(SlackMCP.connect({ botToken: "token", teamId: "T1" }).name).toBe("slack-mcp");
    expect(PostgresMCP.connect({ connectionString: "postgres://user:pass@localhost/db" }).name).toBe("postgres-mcp");
    expect(SupabaseMCP.connect({ url: "https://supabase.example.test", apiKey: "key" }).name).toBe("supabase-mcp");
    expect(FilesystemMCP.connect({ allowedPaths: ["/tmp/workspace"] }).name).toBe("filesystem-mcp");
    expect(BraveSearchMCP.connect({ apiKey: "key" }).name).toBe("brave-search-mcp");
    expect(FirecrawlMCP.connect({ apiKey: "key" }).name).toBe("firecrawl-mcp");
    expect(FetchMCP.connect({ packageSpec: "@yawlabs/fetch-mcp@0.3.1" }).name).toBe("fetch-mcp");
  });

  it("fails closed for wrappers without a verified default npm package", () => {
    expect(() => GitHubMCP.connect({ token: "token" })).toThrow(ConfigurationError);
    expect(() => FetchMCP.connect()).toThrow(ConfigurationError);
    expect(() => GitHubMCP.connect({ token: "token", packageSpec: "@artificable/github-mcp-server" })).toThrow(ConfigurationError);
  });

  it("MCP.connect() creates an HTTP adapter from a URL", () => {
    const adapter = MCP.connect({ url: "https://my-mcp.example.com", auth: { type: "bearer", token: "abc" } });
    expect(adapter.name).toBe("mcp");
    expect(adapter.metadata?.kind).toBe("mcp-backed");
  });

  it("MCP.connect() creates a stdio adapter from a command", () => {
    const adapter = MCP.connect({ command: "node", name: "my-mcp", args: ["./server.js"], env: { TOKEN: "x" } });
    expect(adapter.name).toBe("my-mcp");
    expect(adapter.metadata?.kind).toBe("mcp-backed");
  });

  it("MCP.connect() creates a package adapter via npx", () => {
    const adapter = MCP.connect({ package: "@modelcontextprotocol/server-github@2025.4.8", env: { GITHUB_TOKEN: "token" }, name: "gh" });
    expect(adapter.name).toBe("gh");
    expect(adapter.metadata?.kind).toBe("mcp-backed");
  });

  it("MCP.connect() supports api-key and basic auth", () => {
    const apiKey = MCP.connect({ url: "https://example.com", auth: { type: "api-key", header: "X-API-Key", key: "secret" } });
    expect(apiKey.name).toBe("mcp");

    const basic = MCP.connect({ url: "https://example.com", auth: { type: "basic", username: "user", password: "pass" } });
    expect(basic.name).toBe("mcp");
  });

  it("MCP.connect() rejects unpinned packages", () => {
    expect(() => MCP.connect({ package: "@modelcontextprotocol/server-github" })).toThrow(ConfigurationError);
  });

  it("supports allowedTools filtering in MCP.connect()", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const message = JSON.parse(String(init?.body)) as { id: number; method: string };
        return {
          ok: true,
          json: async () => ({
            jsonrpc: "2.0",
            id: message.id,
            result:
              message.method === "tools/list"
                ? { tools: [{ name: "allowed_tool", inputSchema: { type: "object" } }, { name: "blocked_tool", inputSchema: { type: "object" } }] }
                : {},
          }),
        } as Response;
      }),
    );

    const adapter = MCP.connect({
      url: "https://mcp.example.test",
      allowedTools: ["allowed_tool"],
    });
    const tools = await adapter.getTools?.();
    expect(tools?.map((t) => t.name)).toEqual(["allowed_tool"]);
    await adapter.cleanup?.();
  });

  it("FilesystemMCP rejects unsafe roots", () => {
    expect(() =>
      FilesystemMCP.connect({
        allowedPaths: ["/tmp/workspace"],
        allowedTools: ["read_file"],
        roots: ["../not-allowed"],
      }),
    ).toThrow(ConfigurationError);
  });

  it("wrapped adapters have mcp-backed metadata", () => {
    const adapters = [
      GitHubMCP.connect({ token: "token", packageSpec: "@artificable/github-mcp-server@0.1.0" }),
      SlackMCP.connect({ botToken: "token", teamId: "T1" }),
      PostgresMCP.connect({ connectionString: "postgres://user:pass@localhost/db" }),
      SupabaseMCP.connect({ url: "https://supabase.example.test", apiKey: "key" }),
      FilesystemMCP.connect({ allowedPaths: ["/tmp/workspace"] }),
      BraveSearchMCP.connect({ apiKey: "key" }),
      FirecrawlMCP.connect({ apiKey: "key" }),
      FetchMCP.connect({ packageSpec: "@yawlabs/fetch-mcp@0.3.1" }),
    ];

    for (const adapter of adapters) {
      expect(adapter.metadata?.kind).toBe("mcp-backed");
      expect(adapter.metadata?.trustLevel).toBeTruthy();
      expect(adapter.getTools).toBeDefined();
    }
    expect(warningSpy).not.toHaveBeenCalled();
  });
});
