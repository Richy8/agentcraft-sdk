import type { AgentAdapter } from "../adapters/types.js";
import type { McpWrapperSecurityOptions } from "./shared.js";
import { httpMcp, stdioMcp } from "./shared.js";

export type ApifyMCPConfig =
  | ({
      transport?: "stdio";
      token: string;
      actors?: string[];
    } & McpWrapperSecurityOptions)
  | ({
      transport: "http";
      token: string;
      url: string;
    } & McpWrapperSecurityOptions);

export const ApifyMCP = {
  adapterName: "apify-mcp",
  connect(config: ApifyMCPConfig): AgentAdapter {
    if (config.transport === "http") {
      return httpMcp(
        this.adapterName,
        config.url,
        { Authorization: `Bearer ${config.token}` },
        config,
      );
    }
    return stdioMcp(
      this.adapterName,
      "@apify/actors-mcp-server",
      { APIFY_TOKEN: config.token },
      config.actors ?? [],
      config,
    );
  },
};
