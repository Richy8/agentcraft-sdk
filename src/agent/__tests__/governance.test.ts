import { describe, expect, it } from 'vitest';
import { ApprovalQueue } from '../governance/index.js';
import type { ToolDefinition } from '../adapters/types.js';

function makeTool(
  name: string,
  sideEffect?: 'none' | 'read' | 'write' | 'external' | 'destructive',
  scopes?: string[],
): ToolDefinition {
  return {
    name,
    description: `${name} tool`,
    parameters: { type: 'object', properties: {} },
    ...(sideEffect !== undefined || scopes !== undefined
      ? { security: { ...(sideEffect !== undefined && { sideEffect }), ...(scopes !== undefined && { scopes }) } }
      : {}),
  };
}

describe('ApprovalQueue.memory', () => {
  it('queues an external tool and returns pending approval', async () => {
    const queue = ApprovalQueue.memory();
    const tool = makeTool('fetch-url', 'external');

    const result = await queue.requestApproval({ tool });

    expect(result.approved).toBe(false);
    expect(result.request.status).toBe('pending');
    expect(result.request.toolName).toBe('fetch-url');
    expect(result.request.sideEffect).toBe('external');
    expect(result.request.id).toBeTruthy();
    expect(result.request.fingerprint).toBeTruthy();
  });

  it('allows a write tool when riskPolicy.write is allow', async () => {
    const queue = ApprovalQueue.memory({ riskPolicy: { write: 'allow' } });
    const tool = makeTool('write-file', 'write');

    const result = await queue.requestApproval({ tool });

    expect(result.approved).toBe(true);
    expect(result.request.status).toBe('pending');
  });

  it('blocks a destructive tool when riskPolicy.destructive is block', async () => {
    const queue = ApprovalQueue.memory({ riskPolicy: { destructive: 'block' } });
    const tool = makeTool('drop-table', 'destructive');

    await expect(queue.requestApproval({ tool })).rejects.toThrow(/blocked/i);
  });

  it('detects destructive side effect from security scopes', async () => {
    const queue = ApprovalQueue.memory({ riskPolicy: { destructive: 'block' } });
    const tool = makeTool('cleanup', undefined, ['delete:data']);

    await expect(queue.requestApproval({ tool })).rejects.toThrow(/blocked/i);
  });

  it('approves a queued request and reflects the decision', async () => {
    const queue = ApprovalQueue.memory();
    const tool = makeTool('send-email', 'external');

    const { request } = await queue.requestApproval({ tool });
    const approved = await queue.approve({ id: request.id, reviewer: 'alice', reason: 'looks safe' });

    expect(approved.status).toBe('approved');
    expect(approved.decision?.reviewer).toBe('alice');
    expect(approved.decision?.reason).toBe('looks safe');
  });

  it('denies a queued request and persists denial', async () => {
    const queue = ApprovalQueue.memory();
    const tool = makeTool('send-email', 'external');

    const { request } = await queue.requestApproval({ tool });
    const denied = await queue.deny({ id: request.id, reviewer: 'bob', reason: 'not authorized' });

    expect(denied.status).toBe('denied');
    expect(denied.decision?.status).toBe('denied');
  });

  it('enforces requireReason on approve and deny', async () => {
    const queue = ApprovalQueue.memory({ requireReason: true });
    const tool = makeTool('send-email', 'external');

    const { request } = await queue.requestApproval({ tool });

    await expect(queue.approve({ id: request.id })).rejects.toThrow(/reason is required/i);
    await expect(queue.deny({ id: request.id })).rejects.toThrow(/reason is required/i);

    await expect(queue.approve({ id: request.id, reason: 'valid' })).resolves.toBeDefined();
  });

  it('routes reviewer by tool name', async () => {
    const queue = ApprovalQueue.memory({ reviewerByTool: { 'write-file': 'carol' } });
    const tool = makeTool('write-file', 'write');

    const { request } = await queue.requestApproval({ tool });

    expect(request.reviewer).toBe('carol');
  });

  it('routes reviewer by risk level', async () => {
    const queue = ApprovalQueue.memory({ reviewerByRisk: { destructive: 'security-team' } });
    const tool = makeTool('rm-rf', 'destructive');

    // block is default, so override to queue so request proceeds
    const queueWithPolicy = ApprovalQueue.memory({
      reviewerByRisk: { destructive: 'security-team' },
      riskPolicy: { destructive: 'queue' },
    });
    const { request } = await queueWithPolicy.requestApproval({ tool: makeTool('rm-rf', 'destructive') });

    expect(request.reviewer).toBe('security-team');
  });

  it('deduplicates requests with the same fingerprint', async () => {
    const queue = ApprovalQueue.memory();
    const tool = makeTool('fetch-url', 'external');
    const args = { url: 'https://example.com' };

    const first = await queue.requestApproval({ tool, args });
    const second = await queue.requestApproval({ tool, args });

    expect(first.request.id).toBe(second.request.id);
  });

  it('returns approved=true on second call when prior request was approved', async () => {
    const queue = ApprovalQueue.memory();
    const tool = makeTool('fetch-url', 'external');
    const args = { url: 'https://example.com' };

    const { request } = await queue.requestApproval({ tool, args });
    await queue.approve({ id: request.id, reason: 'ok' });

    const second = await queue.requestApproval({ tool, args });
    expect(second.approved).toBe(true);
  });

  it('filters list by status', async () => {
    const queue = ApprovalQueue.memory();
    const { request } = await queue.requestApproval({ tool: makeTool('t1', 'external') });
    await queue.requestApproval({ tool: makeTool('t2', 'external') });
    await queue.approve({ id: request.id });

    const pending = await queue.list({ status: 'pending' });
    const approved = await queue.list({ status: 'approved' });

    expect(pending.every((r) => r.status === 'pending')).toBe(true);
    expect(approved.every((r) => r.status === 'approved')).toBe(true);
    expect(approved).toHaveLength(1);
  });

  it('filters list by toolName', async () => {
    const queue = ApprovalQueue.memory();
    await queue.requestApproval({ tool: makeTool('tool-a', 'external') });
    await queue.requestApproval({ tool: makeTool('tool-b', 'external') });

    const results = await queue.list({ toolName: 'tool-a' });

    expect(results.every((r) => r.toolName === 'tool-a')).toBe(true);
  });

  it('expires pending requests past their deadline', async () => {
    const queue = ApprovalQueue.memory({ expiresInMs: 1 });
    await queue.requestApproval({ tool: makeTool('fetch-url', 'external') });

    const expiredCount = await queue.expire!(new Date(Date.now() + 5000));

    expect(expiredCount).toBe(1);
    const items = await queue.list({ status: 'expired' });
    expect(items).toHaveLength(1);
  });

  it('attaches rollback plan to the request', async () => {
    const queue = ApprovalQueue.memory();
    const rollback = { available: true, description: 'restore backup', toolName: 'restore-db' };

    const { request } = await queue.requestApproval({
      tool: makeTool('migrate-db', 'write'),
      rollback,
    });

    expect(request.rollback).toEqual(rollback);
  });

  it('get returns undefined for unknown id', async () => {
    const queue = ApprovalQueue.memory();
    const result = await queue.get('nonexistent-id');
    expect(result).toBeUndefined();
  });

  it('throws on approve/deny for unknown id', async () => {
    const queue = ApprovalQueue.memory();
    await expect(queue.approve({ id: 'ghost' })).rejects.toThrow(/not found/i);
    await expect(queue.deny({ id: 'ghost' })).rejects.toThrow(/not found/i);
  });
});
