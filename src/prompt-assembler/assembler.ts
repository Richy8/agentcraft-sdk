import * as path from 'node:path';
import type { AssemblyOptions, AssemblyResult, AssemblyStats } from '../types/assembler.types.js';
import type { IPromptLoader } from './loaders/base.loader.js';
import { PromptAssemblyError } from './errors.js';
import { resolvePartials } from './partial-resolver.js';
import { injectConfig } from './config-injector.js';
import { injectVariables } from './variable-injector.js';
import { minifyPrompt } from './minifier.js';

const INCLUDE_PATTERN = /\{\{\s*include\s+[^}]+?\s*\}\}/;

export class PromptAssembler {
  constructor(private readonly loader: IPromptLoader) {}

  async assemble(options: AssemblyOptions): Promise<AssemblyResult> {
    const stats: AssemblyStats = {
      mode: options.mode,
      partialsCount: 0,
      varsReplaced: 0,
      configReplaced: 0,
      charsBefore: 0,
      charsAfter: 0,
      estimatedTokens: 0,
    };

    const loaded = await this.load(options);
    const rootDir = path.resolve(options.rootDir ?? loaded.rootDir);
    if (options.mode === 'inline' && INCLUDE_PATTERN.test(loaded.files[0]?.content ?? '')) {
      throw new PromptAssemblyError(
        'Inline prompts do not support {{include ...}}. Use promptFile as the entry file.'
      );
    }

    const resolvedFiles =
      options.mode === 'inline'
        ? loaded.files.map((file) => ({ content: file.content, partials: new Set<string>() }))
        : await Promise.all(
            loaded.files.map((file) =>
              resolvePartials(
                file.content,
                file.sourcePath,
                this.loader,
                options.maxPartialDepth ?? 10,
                0,
                new Set<string>(),
                rootDir,
                options.allowOutsideRoot ?? false
              )
            )
          );
    const partialSet = new Set(resolvedFiles.flatMap((item) => [...item.partials]));
    stats.partialsCount = partialSet.size;

    const content = resolvedFiles.map((item) => item.content).join('\n\n');
    const configured = injectConfig(content, options.config);
    stats.configReplaced = configured.count;

    const injected = injectVariables(configured.content, options.vars, options.strict ?? false);
    stats.varsReplaced = injected.count;

    const preMinifyContent = injected.content;
    stats.charsBefore = preMinifyContent.length;
    const result = (options.minify ?? true) ? minifyPrompt(preMinifyContent) : preMinifyContent;
    stats.charsAfter = result.length;

    if (options.measureTokens) {
      stats.estimatedTokens = Math.ceil(result.length / 4);
    }

    if (options.logStats) {
      console.debug('[agentcraft:assembler]', stats);
    }

    return { prompt: result, stats };
  }

  private async load(options: AssemblyOptions): Promise<{
    files: Array<{ content: string; sourcePath: string }>;
    rootDir: string;
  }> {
    if (options.mode === 'inline') {
      if (options.content === undefined)
        throw new PromptAssemblyError('Inline assembly requires content');
      return {
        files: [
          { content: options.content, sourcePath: path.join(process.cwd(), 'inline.prompt') },
        ],
        rootDir: process.cwd(),
      };
    }

    if (options.mode === 'file') {
      if (!options.file) throw new PromptAssemblyError('File assembly requires file');
      return {
        files: [{ content: await this.loader.readFile(options.file), sourcePath: options.file }],
        rootDir: path.dirname(path.resolve(options.file)),
      };
    }

    throw new PromptAssemblyError(
      `Unsupported prompt assembly mode: ${(options as { mode: string }).mode}`
    );
  }
}
