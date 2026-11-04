import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { ArtifactRegistry } from "../artifact-registry/registry.js";

const TestSchema = z.object({
  type: z.literal("TestArtifact"),
  value: z.string(),
});

describe("ArtifactRegistry", () => {
  afterEach(() => {
    ArtifactRegistry.deregister("TestArtifact");
  });

  it("starts empty — no built-in schemas", () => {
    expect(ArtifactRegistry.list()).toHaveLength(0);
  });

  it("returns undefined for unknown schema names", () => {
    expect(ArtifactRegistry.lookup("NonExistent")).toBeUndefined();
  });

  it("registers and looks up a custom schema", () => {
    ArtifactRegistry.register("TestArtifact", TestSchema);
    expect(ArtifactRegistry.lookup("TestArtifact")).toBe(TestSchema);
  });

  it("throws on duplicate registration", () => {
    ArtifactRegistry.register("TestArtifact", TestSchema);
    expect(() => ArtifactRegistry.register("TestArtifact", z.any())).toThrow(
      /already registered/,
    );
  });

  it("lists only registered schemas", () => {
    ArtifactRegistry.register("TestArtifact", TestSchema);
    expect(ArtifactRegistry.list()).toContain("TestArtifact");
    expect(ArtifactRegistry.list()).toHaveLength(1);
  });

  it("deregisters a custom schema", () => {
    ArtifactRegistry.register("TestArtifact", TestSchema);
    expect(ArtifactRegistry.deregister("TestArtifact")).toBe(true);
    expect(ArtifactRegistry.lookup("TestArtifact")).toBeUndefined();
  });

  it("deregister returns false for unknown schema", () => {
    expect(ArtifactRegistry.deregister("NeverRegistered")).toBe(false);
  });

  it("can use a registered schema as a responseSchema source", () => {
    ArtifactRegistry.register("TestArtifact", TestSchema);
    const schema = ArtifactRegistry.lookup("TestArtifact");
    expect(schema?.parse({ type: "TestArtifact", value: "hello" }).type).toBe(
      "TestArtifact",
    );
  });
});
