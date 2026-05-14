import { describe, expect, it } from 'vitest';
import { PromptAssembler, PromptAssemblyError } from '../index.js';
import type { IPromptLoader } from '../loaders/base.loader.js';

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

describe('PromptAssembler', () => {
  it('assembles inline prompts with config values and variables but rejects includes', async () => {
    const assembler = new PromptAssembler(new MemoryLoader({}));

    const result = await assembler.assemble({
      mode: 'inline',
      content: 'Write for {{audience}} using {{config.release.tone}} tone.',
      vars: { audience: 'developers' },
      config: { release: { tone: 'practical' } },
    });

    expect(result.prompt).toBe('Write for developers using practical tone.');
    expect(result.stats).toMatchObject({ varsReplaced: 1, configReplaced: 1, partialsCount: 0 });
  });

  it('assembles partials, config values, variables, arrays, and stats', async () => {
    const assembler = new PromptAssembler(
      new MemoryLoader({
        '/prompts/main.prompt':
          'Title: {{config.book.title}}\n{{include partial.prompt}}\nItems:\n{{items}}',
        '/prompts/partial.prompt': 'Audience: {{audience}}',
      })
    );

    const result = await assembler.assemble({
      mode: 'file',
      file: '/prompts/main.prompt',
      config: { book: { title: 'AgentCraft' } },
      vars: { audience: 'engineers', items: ['fast', 'safe'] },
      measureTokens: true,
    });

    expect(result.prompt).toContain('Title: AgentCraft');
    expect(result.prompt).toContain('Audience: engineers');
    expect(result.prompt).toContain('- fast\n- safe');
    expect(result.stats).toMatchObject({
      partialsCount: 1,
      configReplaced: 1,
      varsReplaced: 2,
    });
    expect(result.stats.estimatedTokens).toBeGreaterThan(0);
  });

  it('rejects inline includes so composition always starts from an explicit promptFile entry', async () => {
    const assembler = new PromptAssembler(
      new MemoryLoader({
        '/prompts/partial.prompt': 'Nested',
      })
    );

    await expect(
      assembler.assemble({ mode: 'inline', content: '{{include /prompts/partial.prompt}}' })
    ).rejects.toThrow(PromptAssemblyError);
  });

  it('rejects partial includes outside the prompt root by default', async () => {
    const assembler = new PromptAssembler(
      new MemoryLoader({
        '/prompts/main.prompt': '{{include ../secret.prompt}}',
        '/secret.prompt': 'secret',
      })
    );

    await expect(
      assembler.assemble({ mode: 'file', file: '/prompts/main.prompt' })
    ).rejects.toThrow(PromptAssemblyError);
  });

  it('allows outside-root partials only when explicitly enabled', async () => {
    const assembler = new PromptAssembler(
      new MemoryLoader({
        '/prompts/main.prompt': '{{include ../shared/legal.prompt}}',
        '/shared/legal.prompt': 'Legal',
      })
    );

    await expect(
      assembler.assemble({ mode: 'file', file: '/prompts/main.prompt', allowOutsideRoot: true })
    ).resolves.toMatchObject({ prompt: 'Legal' });
  });

  it('throws when include recursion exceeds maxPartialDepth', async () => {
    const assembler = new PromptAssembler(
      new MemoryLoader({
        '/prompts/a.prompt': '{{include b.prompt}}',
        '/prompts/b.prompt': '{{include a.prompt}}',
      })
    );

    await expect(
      assembler.assemble({ mode: 'file', file: '/prompts/a.prompt', maxPartialDepth: 1 })
    ).rejects.toThrow(PromptAssemblyError);
  });

  it('throws a prompt assembly error when an included file is missing', async () => {
    const assembler = new PromptAssembler(
      new MemoryLoader({
        '/prompts/main.prompt': '{{include missing.prompt}}',
      })
    );

    await expect(
      assembler.assemble({ mode: 'file', file: '/prompts/main.prompt' })
    ).rejects.toThrow(/Prompt include not found: missing.prompt/);
  });
});
