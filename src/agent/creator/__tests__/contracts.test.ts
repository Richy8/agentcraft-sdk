import { describe, expect, it } from 'vitest';
import type { AgentCacheController, CreatorPack } from '../types.js';
import {
  AudienceProfileSchema,
  CapabilityExpressionSchema,
  CreatorArtifactSchema,
  CreatorSkillManifestSchema,
  validateCreatorPack,
  validateCreatorSkillManifest,
} from '../types.js';
import { AgentCache } from '../../cache.js';
import { CreatorPacks } from '../../packs/index.js';

describe('creator contracts', () => {
  it('validates complete skill manifests and rejects incomplete ones', () => {
    const manifest = validateCreatorSkillManifest({
      name: 'blog-writer',
      directive: 'blog',
      category: 'creation',
      stage: 'creation',
      priority: 40,
      description: 'Write blog posts.',
      docsPath: 'docs/skills/creation.md#blog-writer',
      requiredCapabilities: [],
      optionalCapabilities: ['filesystem.read'],
      consumesArtifacts: ['ContentBrief'],
      producesArtifacts: ['Draft'],
      sideEffectRisk: 'none',
      outputOwner: 'primary-draft',
      composesWith: ['content-brief'],
      readiness: 'production-ready',
      promptVersion: '2026-05-11',
    });

    expect(manifest.name).toBe('blog-writer');
    expect(() => CreatorSkillManifestSchema.parse({ name: 'broken' })).toThrow();
  });

  it('validates base and specialized artifacts', () => {
    const artifact = {
      id: 'artifact-1',
      type: 'AudienceProfile',
      createdAt: '2026-05-11T00:00:00.000Z',
      sourceSkill: 'audience-research',
      provenance: [{ kind: 'user', ref: 'prompt' }],
      inputs: ['prompt'],
      status: 'draft',
      segments: ['indie hackers'],
      pains: ['token waste'],
      objections: ['setup complexity'],
      desiredOutcomes: ['better workflows'],
    };

    expect(CreatorArtifactSchema.parse(artifact).type).toBe('AudienceProfile');
    expect(AudienceProfileSchema.parse(artifact).segments).toEqual(['indie hackers']);
    expect(() => CreatorArtifactSchema.parse({ type: 'Draft' })).toThrow();
  });

  it('validates capability expression variants', () => {
    expect(CapabilityExpressionSchema.parse('web.search')).toBe('web.search');
    expect(CapabilityExpressionSchema.parse({ oneOf: ['web.search', 'web.scrape'] })).toEqual({
      oneOf: ['web.search', 'web.scrape'],
    });
    expect(CapabilityExpressionSchema.parse({ allOf: ['filesystem.read', 'source.save'] })).toEqual({
      allOf: ['filesystem.read', 'source.save'],
    });
    expect(() => CapabilityExpressionSchema.parse({ oneOf: [] })).toThrow();
  });

  it('keeps pack and cache contracts typed without wiring runtime behavior', () => {
    const pack: CreatorPack = CreatorPacks.blog({ contentRoot: 'content' });
    const cache: AgentCacheController = AgentCache.disabled();

    expect(validateCreatorPack(pack).manifest.skills).toContain('blog-writer');
    expect(cache.config.type).toBe('disabled');
  });
});
