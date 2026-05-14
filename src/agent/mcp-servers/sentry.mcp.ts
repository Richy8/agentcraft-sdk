import type { AgentAdapter } from "../adapters/types.js";
import type { McpWrapperSecurityOptions } from "./shared.js";
import { httpMcp, stdioMcp } from "./shared.js";

export type SentryMCPConfig =
  | ({ transport: "stdio"; authToken: string } & McpWrapperSecurityOptions)
  | ({
      transport: "http";
      authToken: string;
      url?: string;
    } & McpWrapperSecurityOptions);

export const SentryMCP = {
  adapterName: "sentry-mcp",
  connect(config: SentryMCPConfig): AgentAdapter {
    if (config.transport === "http") {
      return httpMcp(
        this.adapterName,
        config.url ?? "https://mcp.sentry.dev/mcp",
        {
          Authorization: `Bearer ${config.authToken}`,
        },
        config,
      );
    }
    return stdioMcp(
      this.adapterName,
      "@sentry/mcp-server",
      { SENTRY_AUTH_TOKEN: config.authToken },
      [],
      config,
    );
  },
};
