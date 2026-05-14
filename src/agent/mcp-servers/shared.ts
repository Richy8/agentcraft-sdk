import { MCPAdapter } from "../adapters/mcp.adapter.js";
import type { McpServerMetadata } from "../adapters/mcp.adapter.js";
import type { AgentAdapter } from "../adapters/types.js";
import { ConfigurationError } from "../../errors/index.js";
import { getMcpWrapperMetadata } from "./registry.js";

export interface McpWrapperSecurityOptions {
  readonly allowedTools?: string[];
  readonly allowedResources?: string[];
  readonly roots?: string[];
}

export function stdioMcp(
  name: string,
  packageName: string | undefined,
  env?: Record<string, string>,
  extraArgs: string[] = [],
  metadata: McpServerMetadata & McpWrapperSecurityOptions = {},
): AgentAdapter {
  const baseMetadata = { ...getMcpWrapperMetadata(name), ...metadata };
  const packageSpec = baseMetadata.packageName ?? packageName;
  if (!packageSpec) {
    throw new ConfigurationError(
      `MCP wrapper '${name}' does not have a verified npm package. Provide a reviewed, version-pinned package spec explicitly.`,
    );
  }
  return MCPAdapter.connect({
    name,
    transport: "stdio",
    command: "npx",
    args: ["-y", packageSpec, ...extraArgs],
    rejectUnpinnedPackage: true,
    ...(metadata.allowedTools !== undefined && {
      allowedTools: metadata.allowedTools,
    }),
    ...(metadata.allowedResources !== undefined && {
      allowedResources: metadata.allowedResources,
    }),
    ...(metadata.roots !== undefined && { roots: metadata.roots }),
    ...(env !== undefined && { env }),
    metadata: {
      trustLevel: baseMetadata.trustLevel ?? "review-required",
      packageName: packageSpec,
      packagePinned: isPinnedPackage(packageSpec),
      requiredSecrets: Object.keys(env ?? {}),
      sideEffects: baseMetadata.sideEffects ?? ["external"],
      ...(baseMetadata.scopes !== undefined && { scopes: baseMetadata.scopes }),
    },
  });
}

export function httpMcp(
  name: string,
  url: string,
  headers?: Record<string, string>,
  metadata: McpServerMetadata & McpWrapperSecurityOptions = {},
): AgentAdapter {
  const baseMetadata = { ...getMcpWrapperMetadata(name), ...metadata };
  return MCPAdapter.connect({
    name,
    transport: "http",
    url,
    ...(headers !== undefined && { headers }),
    ...(metadata.allowedTools !== undefined && {
      allowedTools: metadata.allowedTools,
    }),
    ...(metadata.allowedResources !== undefined && {
      allowedResources: metadata.allowedResources,
    }),
    ...(metadata.roots !== undefined && { roots: metadata.roots }),
    metadata: {
      trustLevel: baseMetadata.trustLevel ?? "review-required",
      requiredSecrets: Object.keys(headers ?? {}),
      sideEffects: baseMetadata.sideEffects ?? ["external"],
      ...(baseMetadata.scopes !== undefined && { scopes: baseMetadata.scopes }),
    },
  });
}

function isPinnedPackage(packageName: string): boolean {
  if (packageName.startsWith("@")) return packageName.slice(1).includes("@");
  return packageName.includes("@");
}
