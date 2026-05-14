import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '../../../errors/index.js';
import type { IPromptLoader } from '../../../prompt-assembler/loaders/base.loader.js';
import { resolvePrompt } from '../resolve-prompt.js';

class InlineLoader implements IPromptLoader {
  async readFile(): Promise<string> {
    return '{{include ../secret.prompt}}';
  }

  async listFiles(): Promise<string[]> {
    return [];
  }
}

class MemoryLoader implements IPromptLoader {
  constructor(private readonly files: Record<string, string>) {}

  async readFile(filePath: string): Promise<string> {
    const content = this.files[filePath];
    if (content === undefined) throw new Error(`Missing file: ${filePath}`);
    return content;
  }

  async listFiles(dirPath: string): Promise<string[]> {
    return Object.keys(this.files)
      .filter(
        (filePath) =>
          filePath.startsWith(`${dirPath}/`) && !filePath.slice(dirPath.length + 1).includes('/')
      )
      .sort((a, b) => a.localeCompare(b));
  }
}

describe('resolvePrompt', () => {
  it('rejects conflicting file sources before loading', async () => {
    await expect(
      resolvePrompt({
        promptFile: 'a.prompt',
        promptDir: 'prompts',
        assembly: { loader: new InlineLoader() },
      })
    ).rejects.toThrow(ConfigurationError);
  });

  it('rejects promptDir because prompt composition needs an explicit entry file', async () => {
    await expect(
      resolvePrompt({
        promptDir: 'prompts',
        assembly: { loader: new InlineLoader() },
      })
    ).rejects.toThrow(/promptDir is ambiguous/);
  });

  it('returns plain prompts without assembly', async () => {
    await expect(resolvePrompt({ prompt: 'plain text' })).resolves.toBe('plain text');
  });

  it('assembles inline prompts that contain config directives', async () => {
    await expect(
      resolvePrompt({
        prompt: 'Hello {{config.name}}',
        assembly: { config: { name: 'AgentCraft' }, loader: new InlineLoader() },
      })
    ).resolves.toBe('Hello AgentCraft');
  });

  it('assembles inline prompts that contain variable placeholders when vars are provided', async () => {
    await expect(
      resolvePrompt({
        prompt: 'Write for {{audience}}',
        vars: { audience: 'senior engineers' },
        assembly: { loader: new InlineLoader() },
      })
    ).resolves.toBe('Write for senior engineers');
  });

  it('passes root sandbox options through to the assembler', async () => {
    await expect(
      resolvePrompt({
        promptFile: '/prompts/main.prompt',
        assembly: { loader: new InlineLoader(), rootDir: '/prompts' },
      })
    ).rejects.toThrow();
  });

  it('rejects inline include directives', async () => {
    await expect(
      resolvePrompt({
        prompt: 'Intro\n{{include shared.prompt}}',
        assembly: { loader: new InlineLoader() },
      })
    ).rejects.toThrow(/Inline prompts do not support/);
  });

  it('assembles prompt files with variables, config, and nested partials', async () => {
    await expect(
      resolvePrompt({
        promptFile: '/prompts/release-note/main.prompt',
        vars: {
          product: 'AgentCraft',
          audience: 'platform engineers',
        },
        assembly: {
          loader: new MemoryLoader({
            '/prompts/release-note/main.prompt':
              'Product: {{product}}\nVoice: {{config.brand.voice}}\n{{include partials/rules.prompt}}\nAudience: {{audience}}',
            '/prompts/release-note/partials/rules.prompt': 'Be concrete.',
          }),
          config: { brand: { voice: 'clear and pragmatic' } },
          strict: true,
        },
      })
    ).resolves.toBe(
      'Product: AgentCraft\nVoice: clear and pragmatic\nBe concrete.\nAudience: platform engineers'
    );
  });
});
