import { randomUUID } from "node:crypto";
import { redactSecrets } from "../adapters/tool-policy.js";
import type { ToolDefinition } from "../adapters/types.js";
import type { ArtifactStore } from "../../artifact-store/types.js";

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "denied"
  | "expired"
  | "executed"
  | "rolled-back";

export type ApprovalSideEffect =
  | "none"
  | "read"
  | "write"
  | "external"
  | "destructive";

export interface ApprovalDecision {
  readonly status: "approved" | "denied";
  readonly reviewer?: string;
  readonly reason?: string;
  readonly decidedAt: string;
}

export interface RollbackPlan {
  readonly available: boolean;
  readonly description?: string;
  readonly toolName?: string;
  readonly argsPreview?: unknown;
}

export interface ApprovalRequest {
  readonly id: string;
  readonly status: ApprovalStatus;
  readonly fingerprint: string;
  readonly toolName: string;
  readonly sideEffect: ApprovalSideEffect;
  readonly argsPreview: unknown;
  readonly riskReason?: string;
  readonly reviewer?: string;
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly decision?: ApprovalDecision;
  readonly rollback?: RollbackPlan;
}

export interface GovernanceQueueOptions {
  readonly defaultReviewer?: string;
  readonly reviewers?: readonly string[];
  readonly expiresInMs?: number;
  readonly requireReason?: boolean;
  readonly requirePreview?: boolean;
  readonly store?: ArtifactStore;
  readonly reviewerByTool?: Record<string, string>;
  readonly reviewerByRisk?: Partial<Record<ApprovalSideEffect, string>>;
  readonly riskPolicy?: {
    readonly write?: "queue" | "block" | "allow";
    readonly external?: "queue" | "block" | "allow";
    readonly destructive?: "queue" | "block";
  };
}

export interface ApprovalQueueRequestInput {
  readonly tool: ToolDefinition;
  readonly args?: Record<string, unknown>;
  readonly riskReason?: string;
  readonly rollback?: RollbackPlan;
}

export interface ApprovalQueueResult {
  readonly approved: boolean;
  readonly request: ApprovalRequest;
}

export interface ApprovalQueueController {
  requestApproval(input: ApprovalQueueRequestInput): Promise<ApprovalQueueResult>;
  approve(input: {
    readonly id: string;
    readonly reviewer?: string;
    readonly reason?: string;
  }): Promise<ApprovalRequest>;
  deny(input: {
    readonly id: string;
    readonly reviewer?: string;
    readonly reason?: string;
  }): Promise<ApprovalRequest>;
  list(filter?: {
    readonly status?: ApprovalStatus;
    readonly reviewer?: string;
    readonly toolName?: string;
  }): Promise<ApprovalRequest[]>;
  get(id: string): Promise<ApprovalRequest | undefined>;
  expire?(now?: Date): Promise<number>;
}

export const ApprovalQueue = {
  memory(options: GovernanceQueueOptions = {}): ApprovalQueueController {
    return new MemoryApprovalQueue(options);
  },

  artifactStore(
    store: ArtifactStore,
    options: Omit<GovernanceQueueOptions, "store"> = {},
  ): ApprovalQueueController {
    return new ArtifactStoreApprovalQueue({ ...options, store });
  },

  custom(controller: ApprovalQueueController): ApprovalQueueController {
    return controller;
  },
} as const;

class MemoryApprovalQueue implements ApprovalQueueController {
  protected readonly requests = new Map<string, ApprovalRequest>();

  constructor(protected readonly options: GovernanceQueueOptions = {}) {}

  async requestApproval(input: ApprovalQueueRequestInput): Promise<ApprovalQueueResult> {
    const sideEffect = sideEffectFor(input.tool);
    const action = riskAction(sideEffect, this.options);
    if (action === "block") {
      throw new Error(`ApprovalQueue blocked '${input.tool.name}' with ${sideEffect} side effect.`);
    }

    const fingerprint = approvalFingerprint(input);
    const existing = [...this.requests.values()]
      .filter((request) => request.fingerprint === fingerprint)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
    if (existing) {
      const refreshed = await this.refreshExpiry(existing);
      if (refreshed.status === "approved") return { approved: true, request: refreshed };
      if (refreshed.status === "denied") return { approved: false, request: refreshed };
      return { approved: action === "allow", request: refreshed };
    }

    const request = this.createRequest(input, fingerprint, sideEffect);
    await this.save(request);
    return { approved: action === "allow", request };
  }

  async approve(input: {
    readonly id: string;
    readonly reviewer?: string;
    readonly reason?: string;
  }): Promise<ApprovalRequest> {
    if (this.options.requireReason && !input.reason) {
      throw new Error("ApprovalQueue: approval reason is required.");
    }
    const request = await this.getRequired(input.id);
    const updated: ApprovalRequest = {
      ...request,
      status: "approved",
      decision: {
        status: "approved",
        decidedAt: new Date().toISOString(),
        ...(input.reviewer !== undefined && { reviewer: input.reviewer }),
        ...(input.reason !== undefined && { reason: input.reason }),
      },
    };
    await this.save(updated);
    return updated;
  }

  async deny(input: {
    readonly id: string;
    readonly reviewer?: string;
    readonly reason?: string;
  }): Promise<ApprovalRequest> {
    if (this.options.requireReason && !input.reason) {
      throw new Error("ApprovalQueue: denial reason is required.");
    }
    const request = await this.getRequired(input.id);
    const updated: ApprovalRequest = {
      ...request,
      status: "denied",
      decision: {
        status: "denied",
        decidedAt: new Date().toISOString(),
        ...(input.reviewer !== undefined && { reviewer: input.reviewer }),
        ...(input.reason !== undefined && { reason: input.reason }),
      },
    };
    await this.save(updated);
    return updated;
  }

  async list(filter: {
    readonly status?: ApprovalStatus;
    readonly reviewer?: string;
    readonly toolName?: string;
  } = {}): Promise<ApprovalRequest[]> {
    await this.expire();
    return [...this.requests.values()]
      .filter((request) => filter.status === undefined || request.status === filter.status)
      .filter((request) => filter.reviewer === undefined || request.reviewer === filter.reviewer)
      .filter((request) => filter.toolName === undefined || request.toolName === filter.toolName)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  async get(id: string): Promise<ApprovalRequest | undefined> {
    const request = this.requests.get(id);
    return request ? this.refreshExpiry(request) : undefined;
  }

  async expire(now = new Date()): Promise<number> {
    let count = 0;
    for (const request of this.requests.values()) {
      if (
        request.status === "pending" &&
        request.expiresAt !== undefined &&
        new Date(request.expiresAt).getTime() <= now.getTime()
      ) {
        await this.save({ ...request, status: "expired" });
        count++;
      }
    }
    return count;
  }

  protected createRequest(
    input: ApprovalQueueRequestInput,
    fingerprint: string,
    sideEffect: ApprovalSideEffect,
  ): ApprovalRequest {
    const createdAt = new Date();
    const reviewer =
      this.options.reviewerByTool?.[input.tool.name] ??
      this.options.reviewerByRisk?.[sideEffect] ??
      this.options.defaultReviewer;
    return {
      id: randomUUID(),
      status: "pending",
      fingerprint,
      toolName: input.tool.name,
      sideEffect,
      argsPreview: redactSecrets(input.args ?? {}),
      riskReason:
        input.riskReason ??
        `Tool '${input.tool.name}' requires approval for ${sideEffect} side effect.`,
      ...(reviewer !== undefined && { reviewer }),
      createdAt: createdAt.toISOString(),
      ...(this.options.expiresInMs !== undefined && {
        expiresAt: new Date(createdAt.getTime() + this.options.expiresInMs).toISOString(),
      }),
      ...(input.rollback !== undefined && { rollback: input.rollback }),
    };
  }

  protected async save(request: ApprovalRequest): Promise<void> {
    this.requests.set(request.id, request);
  }

  private async getRequired(id: string): Promise<ApprovalRequest> {
    const request = await this.get(id);
    if (!request) throw new Error(`ApprovalQueue: request '${id}' not found.`);
    return request;
  }

  private async refreshExpiry(request: ApprovalRequest): Promise<ApprovalRequest> {
    if (
      request.status === "pending" &&
      request.expiresAt !== undefined &&
      new Date(request.expiresAt).getTime() <= Date.now()
    ) {
      const expired = { ...request, status: "expired" as const };
      await this.save(expired);
      return expired;
    }
    return request;
  }
}

class ArtifactStoreApprovalQueue extends MemoryApprovalQueue {
  private readonly store: ArtifactStore;

  constructor(options: GovernanceQueueOptions & { readonly store: ArtifactStore }) {
    super(options);
    this.store = options.store;
  }

  override async list(filter: Parameters<ApprovalQueueController["list"]>[0] = {}): Promise<ApprovalRequest[]> {
    await this.expire();
    const records = (await this.store.query("ApprovalRequest")).map(normalizeStoredRequest);
    return records
      .filter((request) => filter.status === undefined || request.status === filter.status)
      .filter((request) => filter.reviewer === undefined || request.reviewer === filter.reviewer)
      .filter((request) => filter.toolName === undefined || request.toolName === filter.toolName)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  override async get(id: string): Promise<ApprovalRequest | undefined> {
    const records = (await this.store.query("ApprovalRequest")).map(normalizeStoredRequest);
    const request = records.find((item) => item.id === id);
    return request ? this.refreshStoreExpiry(request) : undefined;
  }

  protected override async save(request: ApprovalRequest): Promise<void> {
    const existing = (await this.store.query("ApprovalRequest")).find(
      (item) => normalizeStoredRequest(item).id === request.id,
    ) as Record<string, unknown> | undefined;
    if (existing) {
      await this.store.updateByType("ApprovalRequest", String(existing.id), {
        ...request,
        approvalId: request.id,
      });
    } else {
      await this.store.put("ApprovalRequest", {
        ...request,
        approvalId: request.id,
      });
    }
    this.requests.set(request.id, request);
  }

  private async refreshStoreExpiry(request: ApprovalRequest): Promise<ApprovalRequest> {
    if (
      request.status === "pending" &&
      request.expiresAt !== undefined &&
      new Date(request.expiresAt).getTime() <= Date.now()
    ) {
      const expired = { ...request, status: "expired" as const };
      await this.save(expired);
      return expired;
    }
    return request;
  }
}

function normalizeStoredRequest(value: unknown): ApprovalRequest {
  const record = value as ApprovalRequest & { approvalId?: string };
  return {
    ...record,
    id: record.approvalId ?? record.id,
  };
}

function sideEffectFor(tool: ToolDefinition): ApprovalSideEffect {
  if (tool.security?.scopes?.some((scope) => /delete|destroy|drop|truncate|overwrite/i.test(scope))) {
    return "destructive";
  }
  return tool.security?.sideEffect ?? "external";
}

function riskAction(
  sideEffect: ApprovalSideEffect,
  options: GovernanceQueueOptions,
): "queue" | "block" | "allow" {
  if (sideEffect === "destructive") return options.riskPolicy?.destructive ?? "queue";
  if (sideEffect === "write") return options.riskPolicy?.write ?? "queue";
  if (sideEffect === "external") return options.riskPolicy?.external ?? "queue";
  return "allow";
}

function approvalFingerprint(input: ApprovalQueueRequestInput): string {
  return JSON.stringify({
    toolName: input.tool.name,
    args: stable(input.args ?? {}),
  });
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stable(item)]),
  );
}
