/**
 * file mode reads a single prompt file and resolves any {{include ...}} partials it contains.
 */
export type AssemblyMode = 'file' | 'inline';

export interface AssemblyStats {
  mode: AssemblyMode;
  partialsCount: number;
  varsReplaced: number;
  configReplaced: number;
  charsBefore: number;
  charsAfter: number;
  estimatedTokens: number;
}

export interface AssemblyResult {
  prompt: string;
  stats: AssemblyStats;
}

export interface AssemblyOptions {
  mode: AssemblyMode;
  file?: string;
  content?: string;
  /**
   * Runtime {{var}} replacements. Arrays are formatted as markdown bullet lists.
   */
  vars?: Record<string, unknown>;
  strict?: boolean;
  config?: Record<string, unknown>;
  maxPartialDepth?: number;
  /**
   * Directory boundary for file and partial reads. Defaults to the prompt file's
   * directory, prompt dir, or process.cwd() for inline prompts.
   */
  rootDir?: string;
  /**
   * Allows {{include ...}} directives to resolve outside rootDir. Keep false
   * for untrusted prompt sources.
   */
  allowOutsideRoot?: boolean;
  minify?: boolean;
  measureTokens?: boolean;
  logStats?: boolean;
}
