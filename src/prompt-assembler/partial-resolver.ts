import * as path from 'node:path';
import type { IPromptLoader } from './loaders/base.loader.js';
import { PromptAssemblyError } from './errors.js';

const INCLUDE_PATTERN = /\{\{\s*include\s+([^}]+?)\s*\}\}/g;

export interface PartialResolutionResult {
  content: string;
  partials: Set<string>;
}

export async function resolvePartials(
  content: string,
  basePath: string,
  loader: IPromptLoader,
  maxDepth = 10,
  depth = 0,
  partials = new Set<string>(),
  rootDir = path.dirname(basePath),
  allowOutsideRoot = false
): Promise<PartialResolutionResult> {
  if (depth > maxDepth) {
    throw new PromptAssemblyError(`Partial include depth exceeded (max: ${maxDepth})`);
  }

  let resolved = content;
  const matches = Array.from(content.matchAll(INCLUDE_PATTERN));

  for (const match of matches) {
    const directive = match[0];
    const includePath = match[1]?.trim();
    if (!includePath) continue;

    const partialPath = path.resolve(path.dirname(basePath), includePath);
    if (!allowOutsideRoot) {
      const relative = path.relative(rootDir, partialPath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new PromptAssemblyError(`Partial include escapes root directory: ${includePath}`);
      }
    }
    partials.add(partialPath);
    let partialContent: string;
    try {
      partialContent = await loader.readFile(partialPath);
    } catch (error) {
      throw new PromptAssemblyError(`Prompt include not found: ${includePath}`, { cause: error });
    }
    const nested = await resolvePartials(
      partialContent,
      partialPath,
      loader,
      maxDepth,
      depth + 1,
      partials,
      rootDir,
      allowOutsideRoot
    );
    resolved = resolved.replace(directive, nested.content);
  }

  return { content: resolved, partials };
}
