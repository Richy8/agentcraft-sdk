import type { AgentAdapter } from "../adapters/types.js";
import type { McpWrapperSecurityOptions } from "./shared.js";
import { httpMcp, stdioMcp } from "./shared.js";

export type ResendMCPConfig =
  | ({ transport?: "stdio"; apiKey: string } & McpWrapperSecurityOptions)
  | ({
      transport: "http";
      apiKey: string;
      url: string;
    } & McpWrapperSecurityOptions);

export const ResendMCP = {
  adapterName: "resend-mcp",
  connect(config: ResendMCPConfig): AgentAdapter {
    if (config.transport === "http") {
      return httpMcp(
        this.adapterName,
        config.url,
        { Authorization: `Bearer ${config.apiKey}` },
        config,
      );
    }
    return stdioMcp(
      this.adapterName,
      "resend-mcp",
      { RESEND_API_KEY: config.apiKey },
      [],
      config,
    );
  },
};
