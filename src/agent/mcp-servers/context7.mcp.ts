import type { AgentAdapter } from "../adapters/types.js";
import type { McpWrapperSecurityOptions } from "./shared.js";
import { httpMcp, stdioMcp } from "./shared.js";

export type Context7MCPConfig =
  | ({ transport?: "stdio"; apiKey?: string } & McpWrapperSecurityOptions)
  | ({
      transport: "http";
      apiKey?: string;
      url: string;
    } & McpWrapperSecurityOptions);

export const Context7MCP = {
  adapterName: "context7-mcp",
  connect(config: Context7MCPConfig = {}): AgentAdapter {
    if (config.transport === "http") {
      return httpMcp(
        this.adapterName,
        config.url,
        config.apiKey !== undefined
          ? { Authorization: `Bearer ${config.apiKey}` }
          : undefined,
        config,
      );
    }
    return stdioMcp(
      this.adapterName,
      "@upstash/context7-mcp",
      config.apiKey !== undefined
        ? { CONTEXT7_API_KEY: config.apiKey }
        : undefined,
      [],
      config,
    );
  },
};
