import type { AgentAdapter } from "../adapters/types.js";
import type { McpWrapperSecurityOptions } from "./shared.js";
import { stdioMcp } from "./shared.js";

export const FilesystemMCP = {
  adapterName: "filesystem-mcp",
  connect(
    config: { allowedPaths: string[] } & McpWrapperSecurityOptions,
  ): AgentAdapter {
    return stdioMcp(
      this.adapterName,
      "@modelcontextprotocol/server-filesystem",
      undefined,
      config.allowedPaths,
      {
        ...config,
        roots: config.roots ?? config.allowedPaths,
      },
    );
  },
};
