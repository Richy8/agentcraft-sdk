import { describe, expect, it } from 'vitest';
import { Agent } from '../../agent.js';
import { Provider } from '../../provider-catalog.js';
import { BlogWriterSkill } from '../../skills/index.js';
import { CreatorPacks } from '../index.js';

describe('creator packs', () => {
  it('expands blog packs into normal agent skills and dedupes repeated attachments', () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });

    agent.use(CreatorPacks.blog()).use(CreatorPacks.blog()).use(BlogWriterSkill.create());

    const attached = agent.getAttachedAdapters().map((adapter) => adapter.name);
    expect(attached).toContain('audience-research');
    expect(attached).toContain('content-brief');
    expect(attached).toContain('blog-writer');
    expect(attached.filter((name) => name === 'blog-writer')).toHaveLength(1);
  });

  it('supports multiple packs and exposes pack manifests with relevant config fields', () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const blog = CreatorPacks.blog({ contentRoot: 'content', readOnlyByDefault: true });
    const seo = CreatorPacks.seo();

    agent.use(blog).use(seo);

    expect(blog.manifest.configFields).toEqual(['contentRoot', 'readOnlyByDefault']);
    expect(blog.manifest.skills).toContain('fact-check');
    expect(seo.manifest.skills).toContain('seo-strategy');
    expect(agent.getAttachedAdapters().map((adapter) => adapter.name)).toContain('serp-brief');
  });

  it('exports multi-format, publishing, and analytics packs', () => {
    expect(CreatorPacks.social().manifest.skills).toContain('social-writer');
    expect(CreatorPacks.video().manifest.skills).toContain('video-scriptwriter');
    expect(CreatorPacks.book().manifest.skills).toContain('book-writer');
    expect(CreatorPacks.copy().manifest.skills).toContain('copywriter');
    expect(CreatorPacks.publishing().manifest.skills).toContain('publish-qa');
    expect(CreatorPacks.analytics().manifest.skills).toContain('performance-analysis');
  });

  it('keeps direct skill-only usage available', () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] }).use(BlogWriterSkill.create());
    expect(agent.getAttachedAdapters().map((adapter) => adapter.name)).toEqual(['blog-writer']);
  });
});
