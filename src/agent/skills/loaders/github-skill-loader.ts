import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { validateCreatorSkillManifest } from '../../creator/types.js';
import { defineSkill } from '../types.js';
import type { AgentSkill } from '../types.js';
import { verifyChecksum } from './checksums.js';
import { assertAllowedRepo, toGitHubRawBase } from './repo-url.js';
import type { ExternalSkillManifest, GitHubSkillLoaderConfig, LocalSkillLoaderOptions } from './types.js';

export const GitHubSkillLoader = {
  async loadLocal(
    directory: string,
    trustOrOptions: GitHubSkillLoaderConfig['trust'] | LocalSkillLoaderOptions = 'workspace',
  ): Promise<AgentSkill> {
    const options = normalizeLocalOptions(trustOrOptions);
    const manifestPath = path.join(directory, 'skill.json');
    const skillPath = path.join(directory, 'SKILL.md');
    const manifestText = await readFile(manifestPath, 'utf8');
    const instructions = await readFile(skillPath, 'utf8');
    verifyChecksum('skill.json', manifestText, options.checksums);
    verifyChecksum('SKILL.md', instructions, options.checksums);
    const manifest = JSON.parse(manifestText) as ExternalSkillManifest;
    const creator = validateCreatorSkillManifest(manifest.creator);

    if (options.trust === 'untrusted' && creator.sideEffectRisk !== 'none' && creator.sideEffectRisk !== 'read') {
      throw new Error(`External skill '${manifest.name}' requires elevated trust for ${creator.sideEffectRisk} side effects`);
    }

    return defineSkill({
      name: manifest.name,
      description: manifest.description,
      directive: manifest.directive,
      metadata: {
        requiredCapabilities: ['tools'],
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
    if (_config.repo.startsWith('.') || _config.repo.startsWith('/')) {
      return await this.loadLocal(path.resolve(_config.repo, _config.path ?? ''), {
        trust: _config.trust ?? 'workspace',
        ...(_config.checksums !== undefined && {
          checksums: _config.checksums,
        }),
      });
    }
    if (!_config.ref) {
      throw new Error('GitHubSkillLoader.load requires a pinned ref for GitHub repositories');
    }
    assertAllowedRepo(_config.repo, _config.allowedRepos);
    const base = toGitHubRawBase(_config.repo, _config.ref, _config.path);
    const manifestText = await fetchText(`${base}/skill.json`, _config.token);
    const instructions = await fetchText(`${base}/SKILL.md`, _config.token);
    verifyChecksum('skill.json', manifestText, _config.checksums);
    verifyChecksum('SKILL.md', instructions, _config.checksums);
    const manifest = JSON.parse(manifestText) as ExternalSkillManifest;
    const creator = validateCreatorSkillManifest(manifest.creator);
    if (_config.trust === 'untrusted' && creator.sideEffectRisk !== 'none' && creator.sideEffectRisk !== 'read') {
      throw new Error(`External skill '${manifest.name}' requires elevated trust for ${creator.sideEffectRisk} side effects`);
    }
    return defineSkill({
      name: manifest.name,
      description: manifest.description,
      directive: manifest.directive,
      metadata: {
        requiredCapabilities: ['tools'],
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
    const skills = await Promise.all(directories.map((directory) => this.loadLocal(directory)));
    const names = new Set<string>();
    for (const skill of skills) {
      if (names.has(skill.name)) throw new Error(`Duplicate external skill name '${skill.name}'`);
      names.add(skill.name);
    }
    return skills;
  },
} as const;

function normalizeLocalOptions(
  trustOrOptions: GitHubSkillLoaderConfig['trust'] | LocalSkillLoaderOptions,
): Required<Pick<LocalSkillLoaderOptions, 'trust'>> & Pick<LocalSkillLoaderOptions, 'checksums'> {
  if (trustOrOptions === undefined) return { trust: 'workspace' };
  if (typeof trustOrOptions === 'string') return { trust: trustOrOptions };
  return {
    trust: trustOrOptions.trust ?? 'workspace',
    ...(trustOrOptions.checksums !== undefined && {
      checksums: trustOrOptions.checksums,
    }),
  };
}

async function fetchText(url: string, token?: string): Promise<string> {
  const response = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  if (!response.ok) {
    throw new Error(`Failed to load external skill asset: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}
