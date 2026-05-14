import type { AgentAdapter } from "../adapters/types.js";
import type { McpWrapperSecurityOptions } from "./shared.js";
import { httpMcp, stdioMcp } from "./shared.js";

export type StripeMCPConfig =
  | ({
      transport?: "stdio";
      secretKey: string;
      tools?: string[];
    } & McpWrapperSecurityOptions)
  | ({
      transport: "http";
      secretKey: string;
      url: string;
      tools?: string[];
    } & McpWrapperSecurityOptions);

export const StripeMCP = {
  adapterName: "stripe-mcp",
  connect(config: StripeMCPConfig): AgentAdapter {
    if (config.transport === "http") {
      return httpMcp(
        this.adapterName,
        config.url,
        { Authorization: `Bearer ${config.secretKey}` },
        config,
      );
    }
    return stdioMcp(
      this.adapterName,
      "@stripe/mcp",
      { STRIPE_SECRET_KEY: config.secretKey },
      config.tools?.flatMap((item) => ["--tools", item]) ?? [],
      {
        ...config,
        ...((config.allowedTools ?? config.tools) !== undefined && {
          allowedTools: (config.allowedTools ?? config.tools)!,
        }),
      },
    );
  },
};
