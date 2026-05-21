export function assertAllowedRepo(repo: string, allowedRepos: readonly string[] | undefined): void {
  if (!allowedRepos?.length) return;
  const normalized = normalizeRepoUrl(repo);
  const allowed = allowedRepos.map(normalizeRepoUrl);
  if (!allowed.includes(normalized)) {
    throw new Error(`GitHubSkillLoader.load blocked repository '${repo}' because it is not in allowedRepos`);
  }
}

export function normalizeRepoUrl(repo: string): string {
  const match = repo.match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/?#].*)?$/);
  if (!match) {
    throw new Error('GitHubSkillLoader.load supports https://github.com/owner/repo URLs');
  }
  return `https://github.com/${match[1]!.toLowerCase()}/${match[2]!.toLowerCase()}`;
}

export function toGitHubRawBase(repo: string, ref: string, skillPath = ''): string {
  const match = repo.match(/^https:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:[/?#].*)?$/);
  if (!match) {
    throw new Error('GitHubSkillLoader.load supports https://github.com/owner/repo URLs');
  }
  const [, owner, name] = match;
  const cleanPath = skillPath.replace(/^\/+|\/+$/g, '');
  return ['https://raw.githubusercontent.com', owner, name, ref, cleanPath].filter(Boolean).join('/');
}
