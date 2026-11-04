import { describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Skill } from '../skill.js';
import { parseFrontmatter, validateSkillName, validateSkillDescription } from '../types.js';
import type { AgentRunParams } from '../../adapters/types.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeSkillDir(name: string, description: string, body?: string, extraFiles?: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'agentcraft-skill-'));
  const fm = `---\nname: ${name}\ndescription: ${description}\n---\n${body ?? ''}`;
  writeFileSync(join(dir, 'SKILL.md'), fm, 'utf8');
  for (const [filename, content] of Object.entries(extraFiles ?? {})) {
    writeFileSync(join(dir, filename), content, 'utf8');
  }
  return dir;
}

function makeSkillsDir(skills: Array<{ name: string; description: string; body?: string }>): string {
  const root = mkdtempSync(join(tmpdir(), 'agentcraft-skills-'));
  for (const skill of skills) {
    const skillDir = join(root, skill.name);
    mkdirSync(skillDir);
    const fm = `---\nname: ${skill.name}\ndescription: ${skill.description}\n---\n${skill.body ?? ''}`;
    writeFileSync(join(skillDir, 'SKILL.md'), fm, 'utf8');
  }
  return root;
}

// ── validation ───────────────────────────────────────────────────────────────

describe('skill validation', () => {
  it('accepts valid names', () => {
    expect(() => validateSkillName('code-reviewer')).not.toThrow();
    expect(() => validateSkillName('translator')).not.toThrow();
    expect(() => validateSkillName('data-analyst-v2')).not.toThrow();
  });

  it('rejects uppercase in name', () => {
    expect(() => validateSkillName('CodeReview')).toThrow(/invalid/);
  });

  it('rejects names exceeding 64 chars', () => {
    expect(() => validateSkillName('a'.repeat(65))).toThrow(/64/);
  });

  it('rejects empty descriptions', () => {
    expect(() => validateSkillDescription('')).toThrow(/empty/);
  });

  it('rejects descriptions with XML tags', () => {
    expect(() => validateSkillDescription('A skill for <b>bold</b> text')).toThrow(/XML/);
  });

  it('rejects descriptions exceeding 1024 chars', () => {
    expect(() => validateSkillDescription('x'.repeat(1025))).toThrow(/1024/);
  });
});

// ── parseFrontmatter ─────────────────────────────────────────────────────────

describe('parseFrontmatter', () => {
  it('parses valid frontmatter and returns body', () => {
    const raw = `---\nname: translator\ndescription: Translates text between languages\n---\nDo the translation.`;
    const { frontmatter, body } = parseFrontmatter(raw);
    expect(frontmatter.name).toBe('translator');
    expect(frontmatter.description).toBe('Translates text between languages');
    expect(body).toBe('Do the translation.');
  });

  it('uses version 1 when not specified', () => {
    const raw = `---\nname: test\ndescription: A test skill\n---\n`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.version).toBe(1);
  });

  it('parses optional version field', () => {
    const raw = `---\nname: test\ndescription: A test skill\nversion: 3\n---\n`;
    const { frontmatter } = parseFrontmatter(raw);
    expect(frontmatter.version).toBe(3);
  });

  it('throws on missing frontmatter block', () => {
    expect(() => parseFrontmatter('No frontmatter here')).toThrow(/frontmatter/);
  });

  it('throws when name is missing', () => {
    const raw = `---\ndescription: A skill\n---\n`;
    expect(() => parseFrontmatter(raw)).toThrow(/name/);
  });
});

// ── Skill.define ─────────────────────────────────────────────────────────────

describe('Skill.define', () => {
  it('returns an adapter with skill metadata', () => {
    const adapter = Skill.define({
      name: 'translator',
      description: 'Translates text between languages on request',
    });
    expect(adapter.name).toBe('skill:translator');
    expect(adapter.metadata?.kind).toBe('skill');
  });

  it('Level 1: injects a skills block into system via onBeforeRun', async () => {
    const adapter = Skill.define({
      name: 'translator',
      description: 'Translates text between languages',
    });
    const params = { prompt: 'Hello' } as AgentRunParams;
    const result = await adapter.onBeforeRun!(params);
    expect(result.system).toContain('[Skill available: translator:');
    expect(result.system).toContain('Translates text between languages');
  });

  it('Level 1: appends to existing system message without clobbering', async () => {
    const adapter = Skill.define({ name: 'coder', description: 'Writes clean code' });
    const params = { prompt: 'Hi', system: 'You are a helpful assistant.' } as AgentRunParams;
    const result = await adapter.onBeforeRun!(params);
    expect(result.system).toContain('You are a helpful assistant.');
    expect(result.system).toContain('[Skill available: coder:');
  });

  it('Level 1: does not inject twice on repeated calls', async () => {
    const adapter = Skill.define({ name: 'coder', description: 'Writes clean code' });
    const params1 = { prompt: 'Hi' } as AgentRunParams;
    const after1 = await adapter.onBeforeRun!(params1);
    const after2 = await adapter.onBeforeRun!(after1);
    const count = (after2.system ?? '').split('[Skill available: coder:').length - 1;
    expect(count).toBe(1);
  });

  it('Level 2: exposes load_skill_instructions tool when instructions provided', async () => {
    const adapter = Skill.define({
      name: 'translator',
      description: 'Translates text',
      instructions: 'Step 1: detect language. Step 2: translate.',
    });
    const tools = await adapter.getTools!();
    const instructionsTool = tools.find((t) => t.name === 'load_skill_instructions');
    expect(instructionsTool).toBeDefined();
    const result = await instructionsTool!.execute({ skill_name: 'translator' });
    expect(result).toContain('detect language');
  });

  it('Level 2: returns error for wrong skill name in load_skill_instructions', async () => {
    const adapter = Skill.define({ name: 'translator', description: 'Translates', instructions: 'Do it.' });
    const tools = await adapter.getTools!();
    const tool = tools.find((t) => t.name === 'load_skill_instructions')!;
    const result = await tool.execute({ skill_name: 'wrong-skill' });
    expect(String(result)).toContain('Unknown skill');
  });

  it('Level 3: exposes load_skill_file tool when files provided', async () => {
    const adapter = Skill.define({
      name: 'coder',
      description: 'Writes code',
      files: { 'style.md': 'Use 2-space indentation.', 'patterns.md': 'Prefer composition.' },
    });
    const tools = await adapter.getTools!();
    const fileTool = tools.find((t) => t.name === 'load_skill_file');
    expect(fileTool).toBeDefined();
    const result = await fileTool!.execute({ skill_name: 'coder', filename: 'style.md' });
    expect(result).toContain('2-space');
  });

  it('Level 3: returns error for unknown file in load_skill_file', async () => {
    const adapter = Skill.define({ name: 'coder', description: 'Writes code', files: { 'a.md': 'x' } });
    const tools = await adapter.getTools!();
    const fileTool = tools.find((t) => t.name === 'load_skill_file')!;
    const result = await fileTool!.execute({ skill_name: 'coder', filename: 'nonexistent.md' });
    expect(String(result)).toContain('not found');
  });

  it('emits no tools when no instructions and no files', async () => {
    const adapter = Skill.define({ name: 'minimal', description: 'A minimal skill' });
    expect(adapter.getTools).toBeUndefined();
  });

  it('validates name and description at define time', () => {
    expect(() => Skill.define({ name: 'INVALID', description: 'ok' })).toThrow(/invalid/i);
    expect(() => Skill.define({ name: 'valid', description: '' })).toThrow(/empty/);
  });
});

// ── Skill.from ───────────────────────────────────────────────────────────────

describe('Skill.from', () => {
  it('loads a skill from a directory with SKILL.md', () => {
    const dir = makeSkillDir('code-reviewer', 'Reviews TypeScript code for bugs');
    try {
      const adapter = Skill.from(dir);
      expect(adapter.name).toBe('skill:code-reviewer');
      expect(adapter.metadata?.kind).toBe('skill');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('parses instructions from SKILL.md body', async () => {
    const dir = makeSkillDir('doc-writer', 'Writes documentation', 'Write clear, concise docs.');
    try {
      const adapter = Skill.from(dir);
      const tools = await adapter.getTools!();
      const tool = tools.find((t) => t.name === 'load_skill_instructions')!;
      const result = await tool.execute({ skill_name: 'doc-writer' });
      expect(String(result)).toContain('clear, concise');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('indexes extra files as Level 3 resources', async () => {
    const dir = makeSkillDir('brand-voice', 'Maintains brand voice', undefined, {
      'tone.md': 'Always be friendly.',
    });
    try {
      const adapter = Skill.from(dir);
      const tools = await adapter.getTools!();
      const fileTool = tools.find((t) => t.name === 'load_skill_file')!;
      const result = await fileTool.execute({ skill_name: 'brand-voice', filename: 'tone.md' });
      expect(String(result)).toContain('friendly');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws when SKILL.md is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agentcraft-empty-'));
    try {
      expect(() => Skill.from(dir)).toThrow(/SKILL\.md/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── Skill.fromDir ────────────────────────────────────────────────────────────

describe('Skill.fromDir', () => {
  it('loads all skill subdirectories', () => {
    const root = makeSkillsDir([
      { name: 'translator', description: 'Translates languages' },
      { name: 'summarizer', description: 'Summarizes content' },
    ]);
    try {
      const adapters = Skill.fromDir(root);
      expect(adapters.length).toBe(2);
      const names = adapters.map((a) => a.name).sort();
      expect(names).toEqual(['skill:summarizer', 'skill:translator']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('skips subdirectories without SKILL.md', () => {
    const root = makeSkillsDir([{ name: 'valid-skill', description: 'A valid skill' }]);
    mkdirSync(join(root, 'not-a-skill'));
    try {
      const adapters = Skill.fromDir(root);
      expect(adapters.length).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws when directory does not exist', () => {
    expect(() => Skill.fromDir('/nonexistent/path/to/skills')).toThrow();
  });

  it('Level 1 injection is under 800 tokens for 10 skills', async () => {
    const skills = Array.from({ length: 10 }, (_, i) => ({
      name: `skill-${i + 1}`,
      description: `This skill does thing number ${i + 1} reliably and efficiently.`,
    }));
    const root = makeSkillsDir(skills);
    try {
      const adapters = Skill.fromDir(root);
      expect(adapters.length).toBe(10);
      let params = { prompt: 'test' } as AgentRunParams;
      for (const adapter of adapters) {
        params = await adapter.onBeforeRun!(params);
      }
      const tokenEstimate = Math.ceil((params.system ?? '').length / 4);
      expect(tokenEstimate).toBeLessThan(800);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// ── Skill.fromGitHub — unit tests (fetch mocked) ─────────────────────────────

describe('Skill.fromGitHub', () => {
  function makeFetchMock(responses: Record<string, { status: number; body: string | object }>) {
    return vi.fn(async (url: string) => {
      const entry = responses[url];
      if (!entry) {
        return { ok: false, status: 404, text: async () => 'not found', json: async () => ({}) };
      }
      const body = entry.body;
      return {
        ok: entry.status >= 200 && entry.status < 300,
        status: entry.status,
        text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
        json: async () => (typeof body === 'object' ? body : JSON.parse(body as string)),
      };
    });
  }

  const SKILL_MD = '---\nname: test-skill\ndescription: A test skill for unit tests.\n---\nDo things well.';
  const RAW_BASE = 'https://raw.githubusercontent.com/user/repo/HEAD';
  const API_BASE = 'https://api.github.com/repos/user/repo/contents';

  it('fromGitHub(url, skillName) fetches SKILL.md and companion files', async () => {
    const fetchMock = makeFetchMock({
      [`${RAW_BASE}/test-skill/SKILL.md`]: { status: 200, body: SKILL_MD },
      [`${API_BASE}/test-skill?ref=HEAD`]: {
        status: 200,
        body: [
          { name: 'SKILL.md', path: 'test-skill/SKILL.md', type: 'file' },
          { name: 'guide.txt', path: 'test-skill/guide.txt', type: 'file' },
        ],
      },
      [`${RAW_BASE}/test-skill/guide.txt`]: { status: 200, body: 'Use this guide.' },
    });

    vi.stubGlobal('fetch', fetchMock);
    try {
      const adapter = await Skill.fromGitHub('https://github.com/user/repo', 'test-skill');

      expect(adapter.metadata?.kind).toBe('skill');
      expect(adapter.name).toBe('skill:test-skill');
      const tools = await adapter.getTools?.();
      expect(tools?.map((t) => t.name)).toContain('load_skill_instructions');
      expect(tools?.map((t) => t.name)).toContain('load_skill_file');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fromGitHub(url, skillName) serves from in-process memory cache on second call', async () => {
    const fetchMock = makeFetchMock({
      [`${RAW_BASE}/cached-skill/SKILL.md`]: {
        status: 200,
        body: '---\nname: cached-skill\ndescription: Cached skill.\n---\nInstructions.',
      },
      [`${API_BASE}/cached-skill?ref=HEAD`]: {
        status: 200,
        body: [{ name: 'SKILL.md', path: 'cached-skill/SKILL.md', type: 'file' }],
      },
    });

    vi.stubGlobal('fetch', fetchMock);
    try {
      await Skill.fromGitHub('https://github.com/user/repo', 'cached-skill');
      await Skill.fromGitHub('https://github.com/user/repo', 'cached-skill');
      // SKILL.md fetch should only happen once — second call hits mem cache
      const skillMdCalls = fetchMock.mock.calls.filter(([url]: [string]) =>
        url.includes('SKILL.md'),
      );
      expect(skillMdCalls.length).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fromGitHub(url, skillName) writes to and reads from an external cache', async () => {
    const store = new Map<string, unknown>();
    const externalCache = {
      get: async (k: string) => store.get(k),
      set: async (k: string, v: unknown) => { store.set(k, v); },
    };

    const fetchMock = makeFetchMock({
      [`${RAW_BASE}/ext-cached/SKILL.md`]: {
        status: 200,
        body: '---\nname: ext-cached\ndescription: Externally cached skill.\n---',
      },
      [`${API_BASE}/ext-cached?ref=HEAD`]: {
        status: 200,
        body: [{ name: 'SKILL.md', path: 'ext-cached/SKILL.md', type: 'file' }],
      },
    });

    vi.stubGlobal('fetch', fetchMock);
    try {
      // First call — fetches from GitHub and writes to external cache
      await Skill.fromGitHub('https://github.com/user/repo', 'ext-cached', {
        cache: externalCache,
      });
      expect(store.size).toBe(1);
      const [cachedKey] = store.keys();
      expect(cachedKey).toContain('user/repo');
      expect(cachedKey).toContain('ext-cached');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fromGitHub(url) with no skillName loads all skills in the repo root', async () => {
    const fetchMock = makeFetchMock({
      [`${API_BASE}/?ref=HEAD`]: {
        status: 200,
        body: [
          { name: 'skill-a', path: 'skill-a', type: 'dir' },
          { name: 'skill-b', path: 'skill-b', type: 'dir' },
          { name: 'README.md', path: 'README.md', type: 'file' },
        ],
      },
      [`${RAW_BASE}/skill-a/SKILL.md`]: {
        status: 200,
        body: '---\nname: skill-a\ndescription: Skill A.\n---',
      },
      [`${API_BASE}/skill-a?ref=HEAD`]: { status: 200, body: [] },
      [`${RAW_BASE}/skill-b/SKILL.md`]: {
        status: 200,
        body: '---\nname: skill-b\ndescription: Skill B.\n---',
      },
      [`${API_BASE}/skill-b?ref=HEAD`]: { status: 200, body: [] },
    });

    vi.stubGlobal('fetch', fetchMock);
    try {
      const adapters = await Skill.fromGitHub('https://github.com/user/repo');
      expect(adapters).toHaveLength(2);
      const names = adapters.map((a) => a.name).sort();
      expect(names).toEqual(['skill:skill-a', 'skill:skill-b']);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fromGitHub(url) skips directories without a valid SKILL.md', async () => {
    const fetchMock = makeFetchMock({
      [`${API_BASE}/?ref=HEAD`]: {
        status: 200,
        body: [
          { name: 'valid-skill', path: 'valid-skill', type: 'dir' },
          { name: 'not-a-skill', path: 'not-a-skill', type: 'dir' },
        ],
      },
      [`${RAW_BASE}/valid-skill/SKILL.md`]: {
        status: 200,
        body: '---\nname: valid-skill\ndescription: Valid.\n---',
      },
      [`${API_BASE}/valid-skill?ref=HEAD`]: { status: 200, body: [] },
      [`${RAW_BASE}/not-a-skill/SKILL.md`]: { status: 404, body: 'not found' },
    });

    vi.stubGlobal('fetch', fetchMock);
    try {
      const adapters = await Skill.fromGitHub('https://github.com/user/repo');
      expect(adapters).toHaveLength(1);
      expect(adapters[0]!.name).toBe('skill:valid-skill');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fromGitHub respects options.ref for branch/tag targeting', async () => {
    const fetchMock = makeFetchMock({
      'https://raw.githubusercontent.com/user/repo/v2/my-skill/SKILL.md': {
        status: 200,
        body: '---\nname: my-skill\ndescription: Versioned skill.\n---',
      },
      'https://api.github.com/repos/user/repo/contents/my-skill?ref=v2': {
        status: 200,
        body: [],
      },
    });

    vi.stubGlobal('fetch', fetchMock);
    try {
      const adapter = await Skill.fromGitHub('https://github.com/user/repo', 'my-skill', { ref: 'v2' });
      expect(adapter.name).toBe('skill:my-skill');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fromGitHub respects options.subdir for monorepo layouts', async () => {
    const fetchMock = makeFetchMock({
      'https://raw.githubusercontent.com/user/mono/HEAD/packages/skills/my-skill/SKILL.md': {
        status: 200,
        body: '---\nname: my-skill\ndescription: In a monorepo.\n---',
      },
      'https://api.github.com/repos/user/mono/contents/packages/skills/my-skill?ref=HEAD': {
        status: 200,
        body: [],
      },
    });

    vi.stubGlobal('fetch', fetchMock);
    try {
      const adapter = await Skill.fromGitHub('https://github.com/user/mono', 'my-skill', {
        subdir: 'packages/skills',
      });
      expect(adapter.name).toBe('skill:my-skill');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fromGitHub throws a clear error when no SKILL.md is found', async () => {
    const fetchMock = makeFetchMock({
      [`${RAW_BASE}/missing/SKILL.md`]: { status: 404, body: 'not found' },
    });

    vi.stubGlobal('fetch', fetchMock);
    try {
      await expect(
        Skill.fromGitHub('https://github.com/user/repo', 'missing'),
      ).rejects.toThrow(/SKILL\.md/);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('fromGitHub throws a clear error for an invalid GitHub URL', async () => {
    await expect(
      Skill.fromGitHub('https://gitlab.com/user/repo', 'skill'),
    ).rejects.toThrow(/Cannot parse GitHub URL/);
  });
});

// ── skills entry point export ─────────────────────────────────────────────────

describe('skills barrel export', () => {
  it('exports Skill and SkillLevel from the skills barrel', async () => {
    const { Skill: SkillExport, SkillLevel } = await import('../../../skills.js');
    expect(SkillExport).toBeDefined();
    expect(SkillExport.define).toBeDefined();
    expect(SkillExport.from).toBeDefined();
    expect(SkillExport.fromDir).toBeDefined();
    expect(SkillExport.fromGitHub).toBeDefined();
    expect(SkillLevel.Metadata).toBe(1);
    expect(SkillLevel.Instructions).toBe(2);
    expect(SkillLevel.Files).toBe(3);
  });
});
