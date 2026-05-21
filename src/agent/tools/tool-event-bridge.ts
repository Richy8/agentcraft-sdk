import type { AgentEventEmitter } from "../events.js";
import type { ToolAuditEvent, ToolPolicy } from "../adapters/tool-policy.js";

export function withAgentEventPolicy(
  policy: ToolPolicy | undefined,
  events: AgentEventEmitter | undefined,
): ToolPolicy | undefined {
  if (!policy && !events) return undefined;
  if (!events) return policy;
  const userAudit = policy?.onAuditEvent;
  return {
    ...(policy ?? {}),
    onAuditEvent: async (event: ToolAuditEvent) => {
      await userAudit?.(event);
      emitToolAuditEvent(events, event);
    },
  };
}

function emitToolAuditEvent(
  events: AgentEventEmitter,
  event: ToolAuditEvent,
): void {
  if (event.type === "approval_required") {
    events.emit("approval.requested", {
      toolName: event.toolName,
      ...(event.sideEffect !== undefined && { sideEffect: event.sideEffect }),
    });
  }
  if (event.type === "approval_granted") {
    events.emit("approval.granted", { toolName: event.toolName });
  }
  if (event.type === "approval_denied") {
    events.emit("approval.denied", { toolName: event.toolName });
  }
  if (event.type === "approval_queued") {
    events.emit("approval.queued", {
      toolName: event.toolName,
      requestId: event.requestId,
      ...(event.reviewer !== undefined && { reviewer: event.reviewer }),
      ...(event.expiresAt !== undefined && { expiresAt: event.expiresAt }),
    });
  }
  if (event.type === "approval_expired") {
    events.emit("approval.expired", {
      toolName: event.toolName,
      requestId: event.requestId,
    });
  }
}
