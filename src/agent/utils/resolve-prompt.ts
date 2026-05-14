import { ConfigurationError } from '../../errors/index.js';
import { PromptAssembler } from '../../prompt-assembler/index.js';
import { FileLoader } from '../../prompt-assembler/loaders/file.loader.js';
import type { IPromptLoader } from '../../prompt-assembler/loaders/base.loader.js';
import type { AgentRunParams } from '../types.js';

const INCLUDE_PATTERN = /\{\{\s*include\s+[^}]+?\s*\}\}/;
const CONFIG_PATTERN = /\{\{\s*config\.[^}]+?\s*\}\}/;
const VARIABLE_PATTERN = /\{\{\s*(?!config\.|include\s)[A-Za-z_][A-Za-z0-9_.-]*\s*\}\}/;

export async function resolvePrompt(params: AgentRunParams): Promise<string> {
  const { prompt, promptFile, promptDir, vars, assembly = {} } = params;

  if (promptFile && promptDir) {
    throw new ConfigurationError('Provide promptFile or promptDir, not both');
  }

  if (promptDir) {
    throw new ConfigurationError(
      'promptDir is ambiguous and is no longer supported. Use promptFile to point at an explicit entry prompt, then compose additional files with {{include path}} directives.'
    );
  }

  const loader: IPromptLoader = assembly.loader ?? new FileLoader();
  const assembler = new PromptAssembler(loader);
  const assemblyOptions = {
    minify: assembly.minify ?? true,
    maxPartialDepth: assembly.maxPartialDepth ?? 10,
    ...(assembly.rootDir !== undefined && { rootDir: assembly.rootDir }),
    ...(assembly.allowOutsideRoot !== undefined && { allowOutsideRoot: assembly.allowOutsideRoot }),
  };
  const optionalAssemblyOptions = {
    ...assemblyOptions,
    ...(vars !== undefined && { vars }),
    ...(assembly.config !== undefined && { config: assembly.config }),
    ...(assembly.strict !== undefined && { strict: assembly.strict }),
  };

  if (promptFile) {
    const result = await assembler.assemble({
      mode: 'file',
      file: promptFile,
      ...optionalAssemblyOptions,
    });
    return result.prompt;
  }

  if (!prompt) {
    throw new ConfigurationError('No prompt source provided - supply prompt or promptFile');
  }

  if (INCLUDE_PATTERN.test(prompt)) {
    throw new ConfigurationError(
      'Inline prompts do not support {{include ...}}. Use promptFile as the entry file.'
    );
  }

  if (CONFIG_PATTERN.test(prompt) || (vars !== undefined && VARIABLE_PATTERN.test(prompt))) {
    const result = await assembler.assemble({
      mode: 'inline',
      content: prompt,
      ...optionalAssemblyOptions,
    });
    return result.prompt;
  }

  return prompt;
}
