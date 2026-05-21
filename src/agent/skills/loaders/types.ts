import { validateCreatorSkillManifest } from '../../creator/types.js';

export interface GitHubSkillLoaderConfig {
  readonly repo: string;
  readonly path?: string;
  readonly ref?: string;
  readonly trust?: 'untrusted' | 'reviewed' | 'workspace' | 'official';
  readonly token?: string;
  readonly allowedRepos?: readonly string[];
  readonly checksums?: ExternalSkillChecksums;
}

export interface ExternalSkillChecksums {
  readonly 'skill.json'?: string;
  readonly 'SKILL.md'?: string;
}

export interface LocalSkillLoaderOptions {
  readonly trust?: GitHubSkillLoaderConfig['trust'];
  readonly checksums?: ExternalSkillChecksums;
}

export interface ExternalSkillManifest {
  readonly name: string;
  readonly description: string;
  readonly directive: string;
  readonly creator: Parameters<typeof validateCreatorSkillManifest>[0];
}
