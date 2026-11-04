import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createAdapter } from '../adapters/types.js';
import type { AgentAdapter } from '../adapters/types.js';
import type { AgentRunParams } from '../types.js';
import type { ToolDefinition } from '../../protocols/types.js';
import { parseFrontmatter, validateSkillName, validateSkillDescription } from './types.js';
import type { SkillDefinition } from './types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEVEL2_TOKEN_WARN = 5_000;

// ---------------------------------------------------------------------------
// GitHub skill options — public API
// ---------------------------------------------------------------------------

export interface GitHubSkillOptions {
  /**
   * Branch, tag, or commit SHA to fetch from.
   * Defaults to the repo's default branch (resolved via GitHub API).
   */
  ref?: string;
  /** GitHub personal access token. Required for private repos; recommended to avoid rate limits. */
  token?: string;
  /**
   * Subdirectory within the repo where skills live (e.g. `'skills'`).
   * Overrides any subdir already present in the URL.
   */
  subdir?: string;
  /**
   * Cache store for persisting fetched skill definitions across process restarts.
   * Any AgentCache instance (memory, file, Redis, Postgres) satisfies this interface.
   */
  cache?: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown, ttlMs?: number): Promise<void>;
  };
  /**
   * How long to keep fetched skills in the provided cache store.
   * @default 3_600_000 (1 hour)
   */
  cacheTtlMs?: number;
}

// ---------------------------------------------------------------------------
// Module-level in-process memory cache (process lifetime)
// Keyed by "agentcraft:gh-skill:{owner}/{repo}@{ref}/{skillPath}"
// ---------------------------------------------------------------------------

const GITHUB_MEM_CACHE = new Map<string, SkillDefinition>();

// ---------------------------------------------------------------------------
// GitHub helper types
// ---------------------------------------------------------------------------

interface GitHubEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
}

// ---------------------------------------------------------------------------
// GitHub helper functions (module private)
// ---------------------------------------------------------------------------

function parseGitHubUrl(rawUrl: string): {
  owner: string;
  repo: string;
  ref: string;
  subdir: string;
} {
  const url = rawUrl.replace(/\.git$/, '').replace(/\/$/, '');
  // Matches:
  //   https://github.com/owner/repo
  //   https://github.com/owner/repo/tree/ref
  //   https://github.com/owner/repo/tree/ref/path/to/subdir
  const match = url.match(
    /github\.com\/([^/]+)\/([^/]+?)(?:\/tree\/([^/]+)(?:\/(.+))?)?$/,
  );
  if (!match) {
    throw new Error(
      `Cannot parse GitHub URL '${rawUrl}'. ` +
        `Expected: https://github.com/owner/repo[/tree/ref[/subdir]]`,
    );
  }
  return {
    owner: match[1]!,
    repo: match[2]!,
    ref: match[3] ?? 'HEAD',
    subdir: match[4] ?? '',
  };
}

function ghCacheKey(owner: string, repo: string, ref: string, skillPath: string): string {
  return `agentcraft:gh-skill:${owner}/${repo}@${ref}/${skillPath}`;
}

async function ghApiGet(url: string, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { headers });
}

async function listGitHubDir(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  token?: string,
): Promise<GitHubEntry[]> {
  const encoded = path ? path.split('/').map(encodeURIComponent).join('/') : '';
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(ref)}`;
  const res = await ghApiGet(url, token);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `GitHub API error ${res.status} listing '${path || '/'}' in ${owner}/${repo}@${ref}: ` +
        body.slice(0, 300),
    );
  }
  const data: unknown = await res.json();
  return Array.isArray(data) ? (data as GitHubEntry[]) : [];
}

async function fetchRawFile(
  owner: string,
  repo: string,
  filePath: string,
  ref: string,
  token?: string,
): Promise<string> {
  // raw.githubusercontent.com is faster than the Contents API (no base64 decoding)
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(ref)}/${filePath}`;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(
      `Failed to fetch '${filePath}' from ${owner}/${repo}@${ref}: HTTP ${res.status}`,
    );
  }
  return res.text();
}

async function loadGitHubSkillDef(
  owner: string,
  repo: string,
  skillPath: string,
  ref: string,
  token?: string,
): Promise<SkillDefinition> {
  // 1 — fetch SKILL.md
  const skillMdPath = skillPath ? `${skillPath}/SKILL.md` : 'SKILL.md';
  let raw: string;
  try {
    raw = await fetchRawFile(owner, repo, skillMdPath, ref, token);
  } catch {
    throw new Error(
      `No SKILL.md found at '${skillMdPath}' in ${owner}/${repo}@${ref}. ` +
        `Make sure the skill directory contains a SKILL.md with valid frontmatter.`,
    );
  }

  const { frontmatter, body } = parseFrontmatter(raw);
  if (body) warnIfInstructionsTooLong(frontmatter.name, body);

  // 2 — list directory for companion reference files (Level 3)
  let entries: GitHubEntry[] = [];
  try {
    entries = await listGitHubDir(owner, repo, skillPath, ref, token);
  } catch {
    // non-fatal — proceed without companion files
  }

  const files: Record<string, string> = {};
  await Promise.all(
    entries
      .filter((e) => e.type === 'file' && e.name !== 'SKILL.md')
      .map(async (e) => {
        try {
          files[e.name] = await fetchRawFile(owner, repo, e.path, ref, token);
        } catch {
          // skip unreadable companion files
        }
      }),
  );

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    version: frontmatter.version ?? 1,
    ...(body ? { instructions: body } : {}),
    ...(Object.keys(files).length > 0 && { files }),
  };
}

async function resolveSkillDef(
  owner: string,
  repo: string,
  skillPath: string,
  ref: string,
  opts: GitHubSkillOptions,
): Promise<SkillDefinition> {
  const key = ghCacheKey(owner, repo, ref, skillPath);

  // Layer 1 — in-process memory cache (process lifetime, zero cost)
  const memHit = GITHUB_MEM_CACHE.get(key);
  if (memHit) return memHit;

  // Layer 2 — external cache (AgentCache: file, Redis, Postgres, etc.)
  if (opts.cache) {
    try {
      const stored = await opts.cache.get(key);
      if (stored !== undefined && stored !== null && typeof stored === 'object' && 'name' in stored) {
        const def = stored as SkillDefinition;
        GITHUB_MEM_CACHE.set(key, def);
        return def;
      }
    } catch {
      // non-fatal — fall through to GitHub fetch
    }
  }

  // Layer 3 — fetch from GitHub
  const def = await loadGitHubSkillDef(owner, repo, skillPath, ref, opts.token);

  // Write back to both caches
  GITHUB_MEM_CACHE.set(key, def);
  if (opts.cache) {
    opts.cache.set(key, def, opts.cacheTtlMs ?? 3_600_000).catch(() => {});
  }

  return def;
}

// ---------------------------------------------------------------------------
// Core adapter builder
// ---------------------------------------------------------------------------

function buildSkillAdapter(def: SkillDefinition): AgentAdapter {
  const tools: ToolDefinition[] = [];

  if (def.instructions !== undefined) {
    const instructions = def.instructions;
    tools.push({
      name: 'load_skill_instructions',
      description: `Load the full instructions for the '${def.name}' skill. Call this when you are about to apply the skill.`,
      parameters: {
        type: 'object',
        properties: {
          skill_name: { type: 'string', description: 'The skill name to load instructions for' },
        },
        required: ['skill_name'],
      },
      execute: async (args) => {
        const requestedName = String(args['skill_name'] ?? '');
        if (requestedName !== def.name) {
          return `Unknown skill: '${requestedName}'. Available: '${def.name}'.`;
        }
        return instructions;
      },
    });
  }

  if (def.files && Object.keys(def.files).length > 0) {
    const files = def.files;
    const fileList = Object.keys(files);
    tools.push({
      name: 'load_skill_file',
      description: `Load a reference file for the '${def.name}' skill. Available files: ${fileList.join(', ')}.`,
      parameters: {
        type: 'object',
        properties: {
          skill_name: { type: 'string', description: 'The skill name' },
          filename: {
            type: 'string',
            description: `Filename to load. One of: ${fileList.join(', ')}`,
          },
        },
        required: ['skill_name', 'filename'],
      },
      execute: async (args) => {
        const requestedSkill = String(args['skill_name'] ?? '');
        const requestedFile = String(args['filename'] ?? '');
        if (requestedSkill !== def.name) {
          return `Unknown skill: '${requestedSkill}'.`;
        }
        if (!(requestedFile in files)) {
          return `File '${requestedFile}' not found in skill '${def.name}'. Available: ${fileList.join(', ')}.`;
        }
        return files[requestedFile];
      },
    });
  }

  // Level 1 — only name + description injected into system prompt at run time
  const level1Entry = `${def.name}: ${def.description}`;

  return createAdapter({
    name: `skill:${def.name}`,
    requires: [],
    metadata: { kind: 'skill' },
    ...(tools.length > 0 && { getTools: async () => tools }),
    onBeforeRun: async (params: AgentRunParams): Promise<AgentRunParams> => {
      const block = `[Skill available: ${level1Entry}]`;
      const existing = params.system ?? '';
      const alreadyInjected = existing.includes(`[Skill available: ${def.name}:`);
      if (alreadyInjected) return params;
      return {
        ...params,
        system: existing ? `${existing}\n${block}` : block,
      };
    },
  });
}

function warnIfInstructionsTooLong(name: string, instructions: string): void {
  const estimatedTokens = Math.ceil(instructions.length / 4);
  if (estimatedTokens > LEVEL2_TOKEN_WARN) {
    console.warn(
      `[agentcraft] Skill '${name}': instructions are approximately ${estimatedTokens} tokens ` +
        `(limit: ${LEVEL2_TOKEN_WARN}). Consider splitting into multiple skills or using Level 3 files.`,
    );
  }
}

// ---------------------------------------------------------------------------
// fromGitHub — standalone overloaded function (object literals cannot have
// overloaded async methods in TypeScript, so we define it outside)
// ---------------------------------------------------------------------------

/**
 * Fetch a single named skill from a GitHub repository.
 *
 * ```ts
 * const skill = await Skill.fromGitHub(
 *   'https://github.com/jimliu/baoyu-skills',
 *   'baoyu-infographic',
 * );
 * agent.use(skill);
 * ```
 *
 * Fetched skill definitions are cached in memory for the process lifetime.
 * Pass `options.cache` (any AgentCache instance) to also persist across restarts.
 */
async function fromGitHub(url: string, skillName: string, options?: GitHubSkillOptions): Promise<AgentAdapter>;
/**
 * Fetch all skills from a GitHub repository (every subdirectory that contains a SKILL.md).
 *
 * ```ts
 * const skills = await Skill.fromGitHub('https://github.com/jimliu/baoyu-skills');
 * for (const skill of skills) agent.use(skill);
 * ```
 */
async function fromGitHub(url: string, options?: GitHubSkillOptions): Promise<AgentAdapter[]>;
async function fromGitHub(
  url: string,
  skillNameOrOptions?: string | GitHubSkillOptions,
  options?: GitHubSkillOptions,
): Promise<AgentAdapter | AgentAdapter[]> {
  const skillName = typeof skillNameOrOptions === 'string' ? skillNameOrOptions : undefined;
  const opts: GitHubSkillOptions =
    (typeof skillNameOrOptions === 'object' ? skillNameOrOptions : options) ?? {};

  const parsed = parseGitHubUrl(url);
  const ref = opts.ref ?? parsed.ref;
  // opts.subdir overrides any subdir embedded in the URL
  const rootPath = opts.subdir !== undefined ? opts.subdir : parsed.subdir;

  if (skillName !== undefined) {
    // Single skill — resolve the exact directory path
    const skillPath = rootPath ? `${rootPath}/${skillName}` : skillName;
    const def = await resolveSkillDef(parsed.owner, parsed.repo, skillPath, ref, opts);
    return buildSkillAdapter(def);
  }

  // All skills — list root and load every subdirectory that has a SKILL.md
  const entries = await listGitHubDir(parsed.owner, parsed.repo, rootPath, ref, opts.token);
  const skillDirs = entries.filter((e) => e.type === 'dir');

  const results = await Promise.allSettled(
    skillDirs.map((dir) =>
      resolveSkillDef(parsed.owner, parsed.repo, dir.path, ref, opts).then(buildSkillAdapter),
    ),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<AgentAdapter> => r.status === 'fulfilled')
    .map((r) => r.value);
}

// ---------------------------------------------------------------------------
// Public Skill namespace
// ---------------------------------------------------------------------------

export const Skill = {
  /** Define a skill inline. Returns an adapter ready for agent.use(). */
  define(spec: {
    name: string;
    description: string;
    instructions?: string;
    files?: Record<string, string>;
    version?: number;
  }): AgentAdapter {
    validateSkillName(spec.name);
    validateSkillDescription(spec.description);
    if (spec.instructions) {
      warnIfInstructionsTooLong(spec.name, spec.instructions);
    }
    const def: SkillDefinition = {
      name: spec.name,
      description: spec.description,
      version: spec.version ?? 1,
      ...(spec.instructions !== undefined && { instructions: spec.instructions }),
      ...(spec.files !== undefined && { files: spec.files }),
    };
    return buildSkillAdapter(def);
  },

  /** Load a skill from a local directory containing a SKILL.md file. */
  from(dirPath: string): AgentAdapter {
    const skillMdPath = join(dirPath, 'SKILL.md');
    let raw: string;
    try {
      raw = readFileSync(skillMdPath, 'utf8');
    } catch {
      throw new Error(`No SKILL.md found in '${dirPath}'.`);
    }

    const { frontmatter, body } = parseFrontmatter(raw);
    if (body) warnIfInstructionsTooLong(frontmatter.name, body);

    const files: Record<string, string> = {};
    let entries: string[];
    try {
      entries = readdirSync(dirPath);
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      if (entry === 'SKILL.md') continue;
      const fullPath = join(dirPath, entry);
      try {
        if (statSync(fullPath).isFile()) {
          files[entry] = readFileSync(fullPath, 'utf8');
        }
      } catch {
        // skip unreadable files
      }
    }

    const def: SkillDefinition = {
      name: frontmatter.name,
      description: frontmatter.description,
      version: frontmatter.version ?? 1,
      ...(body ? { instructions: body } : {}),
      ...(Object.keys(files).length > 0 && { files }),
    };
    return buildSkillAdapter(def);
  },

  /** Scan a local directory and load every subdirectory that contains a SKILL.md. */
  fromDir(dirPath: string): AgentAdapter[] {
    let entries: string[];
    try {
      entries = readdirSync(dirPath);
    } catch {
      throw new Error(`Cannot read skills directory '${dirPath}'.`);
    }
    const adapters: AgentAdapter[] = [];
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      try {
        if (statSync(fullPath).isDirectory()) {
          const skillMdPath = join(fullPath, 'SKILL.md');
          try {
            readFileSync(skillMdPath);
            adapters.push(Skill.from(fullPath));
          } catch {
            // not a skill directory — skip
          }
        }
      } catch {
        // skip
      }
    }
    return adapters;
  },

  fromGitHub,
};
