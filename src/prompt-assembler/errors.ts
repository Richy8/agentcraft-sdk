import { AgentCraftError } from '../errors/index.js';

export class PromptAssemblyError extends AgentCraftError {
  readonly code = 'PROMPT_ASSEMBLY_ERROR';
  readonly retryable = false;
}
