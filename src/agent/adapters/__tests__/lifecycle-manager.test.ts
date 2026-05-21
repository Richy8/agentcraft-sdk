import { describe, expect, it, vi } from "vitest";
import type { AgentAdapter } from "../types.js";
import {
  cleanupAttachedAdapters,
  cleanupRunOnlyAdapters,
  initializeAttachedAdapters,
  initializeRunOnlyAdapters,
} from "../lifecycle-manager.js";

describe("adapter lifecycle manager", () => {
  it("initializes pending adapters, runs conflict checks, and drains queues", async () => {
    const init = vi.fn(async () => undefined);
    const conflict = vi.fn(async () => undefined);
    const pending = [{ adapter: adapter("a"), init }];
    const checks = [conflict];

    await initializeAttachedAdapters(pending, checks);

    expect(init).toHaveBeenCalledOnce();
    expect(conflict).toHaveBeenCalledOnce();
    expect(pending).toHaveLength(0);
    expect(checks).toHaveLength(0);
  });

  it("initializes and cleans run-only adapters in the expected order", async () => {
    const calls: string[] = [];
    const first = adapter("first", {
      init: async () => calls.push("init:first"),
      cleanup: async () => calls.push("cleanup:first"),
    });
    const second = adapter("second", {
      init: async () => calls.push("init:second"),
      cleanup: async () => calls.push("cleanup:second"),
    });

    await initializeRunOnlyAdapters([first, second]);
    await cleanupRunOnlyAdapters([first, second]);

    expect(calls).toEqual([
      "init:first",
      "init:second",
      "cleanup:second",
      "cleanup:first",
    ]);
  });

  it("skips externally managed adapters during attached cleanup", async () => {
    const internalCleanup = vi.fn(async () => undefined);
    const externalCleanup = vi.fn(async () => undefined);
    const internal = adapter("internal", { cleanup: internalCleanup });
    const external = adapter("external", { cleanup: externalCleanup });

    await cleanupAttachedAdapters({
      adapters: [internal, external],
      externallyManagedAdapters: new Set([external]),
    });

    expect(internalCleanup).toHaveBeenCalledOnce();
    expect(externalCleanup).not.toHaveBeenCalled();
  });
});

function adapter(name: string, overrides: Partial<AgentAdapter> = {}): AgentAdapter {
  return { name, ...overrides };
}
