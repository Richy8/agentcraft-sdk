import { ConfigurationError, ToolExecutionError } from '../../errors/index.js';
import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { createAdapter, tool } from './types.js';
import type { AgentAdapter } from './types.js';

export interface GitHubAdapterConfig {
  token: string;
  defaultOwner?: string;
  defaultRepo?: string;
  allowedRepos?: string[];
  apiBaseUrl?: string;
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export class GitHubAdapter {
  static readonly adapterName = 'github';

  static connect(config: GitHubAdapterConfig): AgentAdapter {
    const apiBaseUrl = config.apiBaseUrl ?? 'https://api.github.com';
    const run = <T>(toolName: string, operation: (signal: AbortSignal) => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, operation, {
        ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }),
        ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }),
      });
    const request = async (method: string, route: string, signal: AbortSignal, body?: unknown) => {
      const response = await fetch(`${apiBaseUrl}${route}`, {
        method,
        signal,
        headers: {
          accept: 'application/vnd.github+json',
          authorization: `Bearer ${config.token}`,
          'x-github-api-version': '2022-11-28',
          ...(body !== undefined && { 'content-type': 'application/json' }),
        },
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
      if (!response.ok) throw new ToolExecutionError(`GitHub request failed with HTTP ${response.status}`, { route });
      if (response.status === 204) return {};
      return response.json() as Promise<unknown>;
    };

    const repoRoute = (owner?: string, repo?: string) => {
      const selectedOwner = owner ?? config.defaultOwner;
      const selectedRepo = repo ?? config.defaultRepo;
      if (!selectedOwner || !selectedRepo) throw new ConfigurationError('GitHub owner and repo are required');
      assertRepoAllowed(selectedOwner, selectedRepo, config.allowedRepos);
      return { owner: selectedOwner, repo: selectedRepo, route: `/repos/${selectedOwner}/${selectedRepo}` };
    };

    return createAdapter({
      name: this.adapterName,
      metadata: {
        kind: 'native-sdk',
        auth: 'api-key',
        trustLevel: 'review-required',
        sideEffects: ['read', 'write', 'external'],
        scopes: ['repo'],
        requiredSecrets: ['GITHUB_TOKEN'],
        readOnly: false,
      },
      tools: [
        tool({
          name: 'get_repo',
          description: 'Get GitHub repository metadata.',
          security: { sideEffect: 'external', scopes: ['github:repo:read'] },
          params: repoParams(),
          run: async ({ owner, repo }) => run('get_repo', (signal) => request('GET', repoRoute(owner, repo).route, signal)),
        }),
        tool({
          name: 'list_issues',
          description: 'List GitHub issues for a repository.',
          security: { sideEffect: 'external', scopes: ['github:issues:read'] },
          params: { ...repoParams(), state: { type: 'string', description: 'Issue state.', required: false, options: ['open', 'closed', 'all'] } },
          run: async ({ owner, repo, state = 'open' }) =>
            run('list_issues', (signal) => request('GET', `${repoRoute(owner, repo).route}/issues?state=${state}`, signal)),
        }),
        tool({
          name: 'create_issue',
          description: 'Create a GitHub issue.',
          security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['github:issues:write'] },
          params: {
            ...repoParams(),
            title: { type: 'string', description: 'Issue title.' },
            body: { type: 'string', description: 'Issue body.', required: false },
          },
          run: async ({ owner, repo, title, body }) =>
            run('create_issue', (signal) => request('POST', `${repoRoute(owner, repo).route}/issues`, signal, { title, body })),
        }),
        tool({
          name: 'update_issue',
          description: 'Update a GitHub issue.',
          security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['github:issues:write'] },
          params: {
            ...repoParams(),
            issueNumber: { type: 'number', description: 'Issue number.' },
            title: { type: 'string', description: 'Issue title.', required: false },
            body: { type: 'string', description: 'Issue body.', required: false },
            state: { type: 'string', description: 'Issue state.', required: false, options: ['open', 'closed'] },
          },
          run: async ({ owner, repo, issueNumber, title, body, state }) =>
            run('update_issue', (signal) =>
              request('PATCH', `${repoRoute(owner, repo).route}/issues/${issueNumber}`, signal, compact({ title, body, state }))
            ),
        }),
        tool({
          name: 'list_prs',
          description: 'List pull requests for a repository.',
          security: { sideEffect: 'external', scopes: ['github:pulls:read'] },
          params: { ...repoParams(), state: { type: 'string', description: 'PR state.', required: false, options: ['open', 'closed', 'all'] } },
          run: async ({ owner, repo, state = 'open' }) =>
            run('list_prs', (signal) => request('GET', `${repoRoute(owner, repo).route}/pulls?state=${state}`, signal)),
        }),
        tool({
          name: 'get_pr',
          description: 'Get a pull request by number.',
          security: { sideEffect: 'external', scopes: ['github:pulls:read'] },
          params: { ...repoParams(), pullNumber: { type: 'number', description: 'Pull request number.' } },
          run: async ({ owner, repo, pullNumber }) =>
            run('get_pr', (signal) => request('GET', `${repoRoute(owner, repo).route}/pulls/${pullNumber}`, signal)),
        }),
        tool({
          name: 'create_pr',
          description: 'Create a pull request.',
          security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['github:pulls:write'] },
          params: {
            ...repoParams(),
            title: { type: 'string', description: 'Pull request title.' },
            head: { type: 'string', description: 'Head branch.' },
            base: { type: 'string', description: 'Base branch.' },
            body: { type: 'string', description: 'Pull request body.', required: false },
          },
          run: async ({ owner, repo, title, head, base, body }) =>
            run('create_pr', (signal) => request('POST', `${repoRoute(owner, repo).route}/pulls`, signal, { title, head, base, body })),
        }),
        tool({
          name: 'get_file_content',
          description: 'Read a file from a GitHub repository.',
          security: { sideEffect: 'external', scopes: ['github:contents:read'] },
          params: { ...repoParams(), path: { type: 'string', description: 'Repository file path.' }, ref: { type: 'string', description: 'Branch, tag, or SHA.', required: false } },
          run: async ({ owner, repo, path, ref }) =>
            run('get_file_content', (signal) =>
              request('GET', `${repoRoute(owner, repo).route}/contents/${encodePath(path)}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`, signal)
            ),
        }),
        tool({
          name: 'commit_file',
          description: 'Create or update a file in a GitHub repository.',
          security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['github:contents:write'] },
          params: {
            ...repoParams(),
            path: { type: 'string', description: 'Repository file path.' },
            message: { type: 'string', description: 'Commit message.' },
            content: { type: 'string', description: 'UTF-8 file content.' },
            branch: { type: 'string', description: 'Target branch.', required: false },
            sha: { type: 'string', description: 'Existing blob SHA for updates.', required: false },
          },
          run: async ({ owner, repo, path, message, content, branch, sha }) =>
            run('commit_file', (signal) =>
              request('PUT', `${repoRoute(owner, repo).route}/contents/${encodePath(path)}`, signal, {
                message,
                content: Buffer.from(content, 'utf8').toString('base64'),
                branch,
                sha,
              })
            ),
        }),
        tool({
          name: 'list_branches',
          description: 'List repository branches.',
          security: { sideEffect: 'external', scopes: ['github:branches:read'] },
          params: repoParams(),
          run: async ({ owner, repo }) => run('list_branches', (signal) => request('GET', `${repoRoute(owner, repo).route}/branches`, signal)),
        }),
      ],
    });
  }
}

function repoParams() {
  return {
    owner: { type: 'string' as const, description: 'Repository owner.', required: false },
    repo: { type: 'string' as const, description: 'Repository name.', required: false },
  };
}

function assertRepoAllowed(owner: string, repo: string, allowedRepos: string[] | undefined): void {
  if (!allowedRepos?.length) return;
  const fullName = `${owner}/${repo}`.toLowerCase();
  if (!allowedRepos.some((allowed) => allowed.toLowerCase() === fullName)) {
    throw new ConfigurationError(`GitHub repository '${owner}/${repo}' is not allowed`);
  }
}

function encodePath(filePath: string): string {
  return filePath.split('/').map(encodeURIComponent).join('/');
}

function compact(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
