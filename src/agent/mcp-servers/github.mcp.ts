import type { AgentAdapter } from "../adapters/types.js";
import type { McpWrapperSecurityOptions } from "./shared.js";
import { stdioMcp } from "./shared.js";

export const GitHubMCP = {
  adapterName: "github-mcp",
  connect(
    config: { token: string; packageSpec?: string } & McpWrapperSecurityOptions,
  ): AgentAdapter {
    return stdioMcp(
      this.adapterName,
      config.packageSpec,
      { GITHUB_PERSONAL_ACCESS_TOKEN: config.token },
      [],
      config,
    );
  },
};
