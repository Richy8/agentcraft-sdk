import { AdapterToolConflictError } from '../../errors/index.js';
import type { ToolDefinition } from '../../protocols/types.js';
import {
  mergeToolPolicies,
  runToolWithPolicy,
  type ToolAuditEvent,
  type ToolPolicy,
} from '../adapters/tool-policy.js';
import type { AgentAdapter } from '../adapters/types.js';
import type { RunTracer } from '../observability.js';
import type { AgentRunParams } from '../types.js';
import { executeToolWithCache, type ToolCacheExecutionContext } from './tool-cache-manager.js';
import type { ToolExecutionBudget } from './tool-budget.js';

export interface ToolTraceContext {
  readonly tracer: RunTracer;
  readonly parentSpanId: string;
}

export async function collectToolsForRun(input: {
  readonly params: AgentRunParams;
  readonly toolAdapters: readonly AgentAdapter[];
  readonly traceContext?: ToolTraceContext;
  readonly executionBudget: ToolExecutionBudget;
  readonly cacheContext: ToolCacheExecutionContext;
  readonly baseToolPolicy?: ToolPolicy;
  readonly applyEventPolicy: (policy: ToolPolicy | undefined) => ToolPolicy | undefined;
}): Promise<ToolDefinition[]> {
  const adapterTools: ToolDefinition[] = [];
  for (const adapter of input.toolAdapters) {
    const isMcp = adapter.metadata?.kind === 'mcp-backed';
    const mcpSpan =
      isMcp && input.traceContext
        ? input.traceContext.tracer.start(
            'mcp',
            `${adapter.name}.discoverTools`,
            { adapter: adapter.name },
            input.traceContext.parentSpanId
          )
        : undefined;
    try {
      const tools = await adapter.getTools!();
      adapterTools.push(
        ...tools.map((tool) =>
          isMcp && input.traceContext
            ? wrapMcpTool(tool, adapter.name, input.traceContext)
            : tool
        )
      );
      if (mcpSpan) input.traceContext!.tracer.end(mcpSpan);
    } catch (error) {
      if (mcpSpan) input.traceContext!.tracer.end(mcpSpan, error);
      throw error;
    }
  }

  const allTools = [...adapterTools, ...(input.params.tools ?? [])];
  assertUniqueToolDefinitions(allTools);
  const policy = input.applyEventPolicy(
    withTracePolicy(
      mergeToolPolicies(input.baseToolPolicy, input.params.toolPolicy),
      input.traceContext
    )
  );
  return allTools.map((tool) => {
    const executeWithPolicy =
      !tool.security?.requiresConfirmation && !policy
        ? tool.execute
        : (args: Record<string, unknown>) => runToolWithPolicy(tool, args, policy);
    const executeWithCache = async (args: Record<string, unknown>) =>
      await executeToolWithCache({
        context: input.cacheContext,
        tool,
        args,
        execute: executeWithPolicy,
        params: input.params,
        budget: input.executionBudget,
      });
    if (!input.traceContext) return { ...tool, execute: executeWithCache };
    return {
      ...tool,
      execute: async (args: Record<string, unknown>) => {
        const span = input.traceContext!.tracer.start(
          'tool',
          `tool.${tool.name}`,
          { toolName: tool.name },
          input.traceContext!.parentSpanId
        );
        try {
          const result = await executeWithCache(args);
          input.traceContext!.tracer.end(span);
          return result;
        } catch (error) {
          input.traceContext!.tracer.end(span, error);
          throw error;
        }
      },
    };
  });
}

function wrapMcpTool(
  tool: ToolDefinition,
  adapterName: string,
  traceContext: ToolTraceContext
): ToolDefinition {
  return {
    ...tool,
    execute: async (args) => {
      const span = traceContext.tracer.start(
        'mcp',
        `${adapterName}.${tool.name}`,
        { adapter: adapterName, toolName: tool.name },
        traceContext.parentSpanId
      );
      try {
        const result = await tool.execute(args);
        traceContext.tracer.end(span);
        return result;
      } catch (error) {
        traceContext.tracer.end(span, error);
        throw error;
      }
    },
  };
}

function withTracePolicy(
  policy: ToolPolicy | undefined,
  traceContext?: ToolTraceContext
): ToolPolicy | undefined {
  if (!traceContext) return policy;
  const base = policy ?? {};
  const userAudit = base.onAuditEvent;
  return {
    ...base,
    onAuditEvent: async (event: ToolAuditEvent) => {
      if (event.type === 'guardrail_blocked') {
        const span = traceContext.tracer.start(
          'guardrail',
          `guardrail.${event.phase}.${event.toolName}`,
          {
            toolName: event.toolName,
            phase: event.phase,
            reason: event.reason,
          },
          traceContext.parentSpanId
        );
        traceContext.tracer.end(span, base.guardrailMode === 'warn' ? undefined : event.reason);
      }
      await userAudit?.(event);
    },
  };
}

function assertUniqueToolDefinitions(tools: readonly ToolDefinition[]): void {
  const seen = new Set<string>();
  for (const tool of tools) {
    if (seen.has(tool.name)) {
      throw new AdapterToolConflictError(`Tool name conflict: '${tool.name}' is exposed more than once`);
    }
    seen.add(tool.name);
  }
}
