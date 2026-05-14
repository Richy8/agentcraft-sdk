import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { GitHubSkillLoader } from "../index.js";

const fixtures = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);

describe("external skill loader", () => {
  it("loads local external skills into the normal AgentSkill shape", async () => {
    const skill = await GitHubSkillLoader.loadLocal(
      path.join(fixtures, "external-skill"),
    );

    expect(skill.type).toBe("skill");
    expect(skill.name).toBe("external-medium-skill");
    expect(skill.skillMetadata?.creator?.producesArtifacts).toEqual(["Draft"]);
    expect(skill.systemPromptExtension).toContain("AgentCraft tool policy");
  });

  it("rejects invalid manifests and missing skill instructions", async () => {
    await expect(
      GitHubSkillLoader.loadLocal(path.join(fixtures, "invalid-skill")),
    ).rejects.toThrow();
    await expect(
      GitHubSkillLoader.loadLocal(path.join(fixtures, "missing-skill")),
    ).rejects.toThrow();
  });

  it("blocks untrusted write-capable external skills by default", async () => {
    await expect(
      GitHubSkillLoader.loadLocal(
        path.join(fixtures, "write-skill"),
        "untrusted",
      ),
    ).rejects.toThrow("requires elevated trust");
  });

  it("verifies local external skill checksums before loading", async () => {
    const fixture = path.join(fixtures, "external-skill");
    const manifest = await readFile(path.join(fixture, "skill.json"), "utf8");
    const instructions = await readFile(path.join(fixture, "SKILL.md"), "utf8");

    await expect(
      GitHubSkillLoader.loadLocal(fixture, {
        checksums: {
          "skill.json": sha256(manifest),
          "SKILL.md": `sha256:${sha256(instructions)}`,
        },
      }),
    ).resolves.toMatchObject({ name: "external-medium-skill" });

    await expect(
      GitHubSkillLoader.loadLocal(fixture, {
        checksums: { "SKILL.md": "sha256:bad" },
      }),
    ).rejects.toThrow("checksum mismatch");
  });

  it("detects duplicate external skill names in batch loading", async () => {
    const fixture = path.join(fixtures, "external-skill");
    await expect(
      GitHubSkillLoader.loadManyLocal([fixture, fixture]),
    ).rejects.toThrow("Duplicate external skill name");
  });

  it("keeps GitHub loading opt-in when network is required", async () => {
    await expect(
      GitHubSkillLoader.load({ repo: "https://github.com/acme/skills" }),
    ).rejects.toThrow("requires a pinned ref");
  });

  it("requires GitHub external skills to come from an allowed repository when allowlisted", async () => {
    await expect(
      GitHubSkillLoader.load({
        repo: "https://github.com/unknown/skills",
        ref: "0123456789abcdef",
        allowedRepos: ["https://github.com/acme/skills"],
      }),
    ).rejects.toThrow("not in allowedRepos");
  });
});

function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}
