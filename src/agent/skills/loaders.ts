import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { validateCreatorSkillManifest } from "../creator/types.js";
import { defineSkill } from "./types.js";
import type { AgentSkill } from "./types.js";

export interface GitHubSkillLoaderConfig {
  readonly repo: string;
  readonly path?: string;
  readonly ref?: string;
  readonly trust?: "untrusted" | "reviewed" | "workspace" | "official";
  readonly token?: string;
  readonly allowedRepos?: readonly string[];
  readonly checksums?: ExternalSkillChecksums;
}

export interface ExternalSkillChecksums {
  readonly "skill.json"?: string;
  readonly "SKILL.md"?: string;
}

export interface LocalSkillLoaderOptions {
  readonly trust?: GitHubSkillLoaderConfig["trust"];
  readonly checksums?: ExternalSkillChecksums;
}

interface ExternalSkillManifest {
  readonly name: string;
  readonly description: string;
  readonly directive: string;
  readonly creator: Parameters<typeof validateCreatorSkillManifest>[0];
}

export const GitHubSkillLoader = {
  async loadLocal(
    directory: string,
    trustOrOptions:
      | GitHubSkillLoaderConfig["trust"]
      | LocalSkillLoaderOptions = "workspace",
  ): Promise<AgentSkill> {
    const options = normalizeLocalOptions(trustOrOptions);
    const manifestPath = path.join(directory, "skill.json");
    const skillPath = path.join(directory, "SKILL.md");
    const manifestText = await readFile(manifestPath, "utf8");
    const instructions = await readFile(skillPath, "utf8");
    verifyChecksum("skill.json", manifestText, options.checksums);
    verifyChecksum("SKILL.md", instructions, options.checksums);
    const manifest = JSON.parse(manifestText) as ExternalSkillManifest;
    const creator = validateCreatorSkillManifest(manifest.creator);

    if (
      options.trust === "untrusted" &&
      creator.sideEffectRisk !== "none" &&
      creator.sideEffectRisk !== "read"
    ) {
      throw new Error(
        `External skill '${manifest.name}' requires elevated trust for ${creator.sideEffectRisk} side effects`,
      );
    }

    return defineSkill({
      name: manifest.name,
      description: manifest.description,
      directive: manifest.directive,
      metadata: {
        requiredCapabilities: ["tools"],
        requiredAdapters: [],
        optionalAdapters: [],
        stateful: false,
        sideEffectRisk: creator.sideEffectRisk,
        promptVersion: creator.promptVersion,
        creator,
      },
      systemPromptExtension: instructions,
    });
  },

  async load(_config: GitHubSkillLoaderConfig): Promise<AgentSkill> {
    if (_config.repo.startsWith(".") || _config.repo.startsWith("/")) {
      return await this.loadLocal(
        path.resolve(_config.repo, _config.path ?? ""),
        {
          trust: _config.trust ?? "workspace",
          ...(_config.checksums !== undefined && {
            checksums: _config.checksums,
          }),
        },
      );
    }
    if (!_config.ref) {
      throw new Error(
        "GitHubSkillLoader.load requires a pinned ref for GitHub repositories",
      );
    }
    assertAllowedRepo(_config.repo, _config.allowedRepos);
    const base = toGitHubRawBase(_config.repo, _config.ref, _config.path);
    const manifestText = await fetchText(`${base}/skill.json`, _config.token);
    const instructions = await fetchText(`${base}/SKILL.md`, _config.token);
    verifyChecksum("skill.json", manifestText, _config.checksums);
    verifyChecksum("SKILL.md", instructions, _config.checksums);
    const manifest = JSON.parse(manifestText) as ExternalSkillManifest;
    const creator = validateCreatorSkillManifest(manifest.creator);
    if (
      _config.trust === "untrusted" &&
      creator.sideEffectRisk !== "none" &&
      creator.sideEffectRisk !== "read"
    ) {
      throw new Error(
        `External skill '${manifest.name}' requires elevated trust for ${creator.sideEffectRisk} side effects`,
      );
    }
    return defineSkill({
      name: manifest.name,
      description: manifest.description,
      directive: manifest.directive,
      metadata: {
        requiredCapabilities: ["tools"],
        requiredAdapters: [],
        optionalAdapters: [],
        stateful: false,
        sideEffectRisk: creator.sideEffectRisk,
        promptVersion: creator.promptVersion,
        creator,
      },
      systemPromptExtension: instructions,
    });
  },

  async loadManyLocal(directories: readonly string[]): Promise<AgentSkill[]> {
    const skills = await Promise.all(
      directories.map((directory) => this.loadLocal(directory)),
    );
    const names = new Set<string>();
    for (const skill of skills) {
      if (names.has(skill.name))
        throw new Error(`Duplicate external skill name '${skill.name}'`);
      names.add(skill.name);
    }
    return skills;
  },
} as const;

function normalizeLocalOptions(
  trustOrOptions: GitHubSkillLoaderConfig["trust"] | LocalSkillLoaderOptions,
): Required<Pick<LocalSkillLoaderOptions, "trust">> &
  Pick<LocalSkillLoaderOptions, "checksums"> {
  if (trustOrOptions === undefined) return { trust: "workspace" };
  if (typeof trustOrOptions === "string") return { trust: trustOrOptions };
  return {
    trust: trustOrOptions.trust ?? "workspace",
    ...(trustOrOptions.checksums !== undefined && {
      checksums: trustOrOptions.checksums,
    }),
  };
}

function assertAllowedRepo(
  repo: string,
  allowedRepos: readonly string[] | undefined,
): void {
  if (!allowedRepos?.length) return;
  const normalized = normalizeRepoUrl(repo);
  const allowed = allowedRepos.map(normalizeRepoUrl);
  if (!allowed.includes(normalized)) {
    throw new Error(
      `GitHubSkillLoader.load blocked repository '${repo}' because it is not in allowedRepos`,
    );
  }
}

function verifyChecksum(
  name: keyof ExternalSkillChecksums,
  content: string,
  checksums: ExternalSkillChecksums | undefined,
): void {
  const expected = checksums?.[name];
  if (!expected) return;
  const actual = createHash("sha256").update(content, "utf8").digest("hex");
  const normalizedExpected = expected.replace(/^sha256:/, "").toLowerCase();
  if (actual !== normalizedExpected) {
    throw new Error(`External skill asset '${name}' checksum mismatch`);
  }
}

function normalizeRepoUrl(repo: string): string {
  const match = repo.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/?#].*)?$/,
  );
  if (!match)
    throw new Error(
      "GitHubSkillLoader.load supports https://github.com/owner/repo URLs",
    );
  return `https://github.com/${match[1]!.toLowerCase()}/${match[2]!.toLowerCase()}`;
}

function toGitHubRawBase(repo: string, ref: string, skillPath = ""): string {
  const match = repo.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/?#].*)?$/,
  );
  if (!match)
    throw new Error(
      "GitHubSkillLoader.load supports https://github.com/owner/repo URLs",
    );
  const [, owner, name] = match;
  const cleanPath = skillPath.replace(/^\/+|\/+$/g, "");
  return ["https://raw.githubusercontent.com", owner, name, ref, cleanPath]
    .filter(Boolean)
    .join("/");
}

async function fetchText(url: string, token?: string): Promise<string> {
  const response = await fetch(
    url,
    token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  );
  if (!response.ok)
    throw new Error(
      `Failed to load external skill asset: ${response.status} ${response.statusText}`,
    );
  return await response.text();
}
