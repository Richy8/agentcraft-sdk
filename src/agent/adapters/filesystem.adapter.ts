import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { ConfigurationError, ToolExecutionError } from '../../errors/index.js';
import { withAdapterRuntime, type AdapterAuditEvent } from './adapter-runtime.js';
import { createAdapter, tool } from './types.js';
import type { AgentAdapter, ToolDefinition } from './types.js';

export interface FileSystemAdapterConfig {
  rootPath: string;
  allowedExtensions?: string[];
  readOnly?: boolean;
  timeoutMs?: number;
  maxFileBytes?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

interface FileEntry {
  path: string;
  type: 'file' | 'directory';
}

export class FileSystemAdapter {
  static readonly adapterName = 'filesystem';

  static connect(config: FileSystemAdapterConfig): AgentAdapter {
    const rootPath = path.resolve(config.rootPath);
    const allowedExtensions = normalizeExtensions(config.allowedExtensions);
    const readOnly = config.readOnly ?? false;
    const maxFileBytes = config.maxFileBytes ?? 1_000_000;
    const runtime = {
      ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }),
      ...(config.onAuditEvent !== undefined && { onAuditEvent: config.onAuditEvent }),
    };
    const run = <T>(toolName: string, operation: () => Promise<T>) =>
      withAdapterRuntime(this.adapterName, toolName, async () => operation(), runtime);

    const tools: ToolDefinition[] = [
      tool({
        name: 'read_file',
        description: 'Read a UTF-8 text file from the configured filesystem sandbox.',
        security: { sideEffect: 'read', scopes: ['filesystem:read'] },
        params: { path: { type: 'string', description: 'Path relative to the configured root directory.' } },
        run: async ({ path: filePath }) =>
          run('read_file', async () => {
            const absolutePath = resolveSafePath(rootPath, filePath);
            assertAllowedExtension(absolutePath, allowedExtensions);
            const fileStat = await stat(absolutePath);
            if (!fileStat.isFile()) throw new ToolExecutionError(`'${filePath}' is not a file`);
            if (fileStat.size > maxFileBytes) {
              throw new ToolExecutionError(`File '${filePath}' exceeds the ${maxFileBytes} byte read limit`);
            }
            return readFile(absolutePath, 'utf8');
          }),
      }),
      tool({
        name: 'list_directory',
        description: 'List files and directories inside the configured filesystem sandbox.',
        security: { sideEffect: 'read', scopes: ['filesystem:read'] },
        params: {
          path: { type: 'string', description: 'Directory path relative to the configured root directory.', required: false },
        },
        run: async ({ path: directoryPath = '.' }) =>
          run('list_directory', async () => {
            const absolutePath = resolveSafePath(rootPath, directoryPath);
            const entries = await readdir(absolutePath, { withFileTypes: true });
            return entries.map((entry): FileEntry => ({
              path: path.posix.join(toPosixPath(directoryPath), entry.name),
              type: entry.isDirectory() ? 'directory' : 'file',
            }));
          }),
      }),
      tool({
        name: 'search_files',
        description: 'Search file names inside the configured filesystem sandbox.',
        security: { sideEffect: 'read', scopes: ['filesystem:read'] },
        params: {
          query: { type: 'string', description: 'Case-insensitive filename substring to search for.' },
          path: { type: 'string', description: 'Directory path relative to the configured root directory.', required: false },
        },
        run: async ({ query, path: directoryPath = '.' }) =>
          run('search_files', async () => {
            const root = resolveSafePath(rootPath, directoryPath);
            const matches: FileEntry[] = [];
            await walk(rootPath, root, async (absolutePath, isDirectory) => {
              if (path.basename(absolutePath).toLowerCase().includes(query.toLowerCase())) {
                matches.push({ path: toRelativePosixPath(rootPath, absolutePath), type: isDirectory ? 'directory' : 'file' });
              }
            });
            return matches;
          }),
      }),
      tool({
        name: 'write_file',
        description: 'Write UTF-8 text to a file inside the configured filesystem sandbox.',
        security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['filesystem:write'] },
        params: {
          path: { type: 'string', description: 'Path relative to the configured root directory.' },
          content: { type: 'string', description: 'UTF-8 content to write.' },
        },
        run: async ({ path: filePath, content }) =>
          run('write_file', async () => {
            assertWritable(readOnly);
            const absolutePath = resolveSafePath(rootPath, filePath);
            assertAllowedExtension(absolutePath, allowedExtensions);
            await mkdir(path.dirname(absolutePath), { recursive: true });
            await writeFile(absolutePath, content, 'utf8');
            return { path: toRelativePosixPath(rootPath, absolutePath), bytes: Buffer.byteLength(content, 'utf8') };
          }),
      }),
      tool({
        name: 'create_directory',
        description: 'Create a directory inside the configured filesystem sandbox.',
        security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['filesystem:write'] },
        params: { path: { type: 'string', description: 'Directory path relative to the configured root directory.' } },
        run: async ({ path: directoryPath }) =>
          run('create_directory', async () => {
            assertWritable(readOnly);
            const absolutePath = resolveSafePath(rootPath, directoryPath);
            await mkdir(absolutePath, { recursive: true });
            return { path: toRelativePosixPath(rootPath, absolutePath), created: true };
          }),
      }),
      tool({
        name: 'move_file',
        description: 'Move a file or directory inside the configured filesystem sandbox.',
        security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['filesystem:write'] },
        params: {
          from: { type: 'string', description: 'Source path relative to the configured root directory.' },
          to: { type: 'string', description: 'Destination path relative to the configured root directory.' },
        },
        run: async ({ from, to }) =>
          run('move_file', async () => {
            assertWritable(readOnly);
            const fromPath = resolveSafePath(rootPath, from);
            const toPath = resolveSafePath(rootPath, to);
            assertAllowedExtension(toPath, allowedExtensions);
            await mkdir(path.dirname(toPath), { recursive: true });
            await rename(fromPath, toPath);
            return { from: toRelativePosixPath(rootPath, fromPath), to: toRelativePosixPath(rootPath, toPath) };
          }),
      }),
      tool({
        name: 'delete_file',
        description: 'Delete a file or directory inside the configured filesystem sandbox.',
        security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['filesystem:write'] },
        params: { path: { type: 'string', description: 'Path relative to the configured root directory.' } },
        run: async ({ path: targetPath }) =>
          run('delete_file', async () => {
            assertWritable(readOnly);
            const absolutePath = resolveSafePath(rootPath, targetPath);
            await rm(absolutePath, { recursive: true, force: false });
            return { path: toRelativePosixPath(rootPath, absolutePath), deleted: true };
          }),
      }),
    ];

    return createAdapter({
      name: this.adapterName,
      tools,
      metadata: {
        kind: 'native-sdk',
        auth: 'none',
        trustLevel: 'trusted',
        sideEffects: readOnly ? ['read'] : ['read', 'write'],
        scopes: ['filesystem'],
        readOnly,
      },
    });
  }
}

function normalizeExtensions(extensions: string[] | undefined): Set<string> | undefined {
  if (!extensions?.length) return undefined;
  return new Set(extensions.map((extension) => (extension.startsWith('.') ? extension : `.${extension}`).toLowerCase()));
}

function resolveSafePath(rootPath: string, requestedPath: string): string {
  if (!requestedPath || requestedPath.includes('\0')) throw new ConfigurationError('Filesystem path must be non-empty');
  const absolutePath = path.resolve(rootPath, requestedPath);
  const relative = path.relative(rootPath, absolutePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new ConfigurationError(`Filesystem path '${requestedPath}' escapes the configured root`);
  }
  return absolutePath;
}

function assertAllowedExtension(absolutePath: string, allowedExtensions: Set<string> | undefined): void {
  if (!allowedExtensions) return;
  const extension = path.extname(absolutePath).toLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new ConfigurationError(`File extension '${extension || '<none>'}' is not allowed`);
  }
}

function assertWritable(readOnly: boolean): void {
  if (readOnly) throw new ToolExecutionError('Filesystem adapter is configured as read-only');
}

async function walk(
  rootPath: string,
  currentPath: string,
  visit: (absolutePath: string, isDirectory: boolean) => Promise<void>
): Promise<void> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);
    const isDirectory = entry.isDirectory();
    await visit(absolutePath, isDirectory);
    if (isDirectory) await walk(rootPath, absolutePath, visit);
  }
}

function toRelativePosixPath(rootPath: string, absolutePath: string): string {
  return toPosixPath(path.relative(rootPath, absolutePath));
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).filter(Boolean).join('/') || '.';
}
