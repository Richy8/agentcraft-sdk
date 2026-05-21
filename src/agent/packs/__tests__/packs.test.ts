import { describe, expect, it } from 'vitest';
import { Agent } from '../../agent.js';
import { Provider } from '../../provider-catalog.js';
import { DOMAIN_SKILL_ARCHITECTURE_CATALOG, createSkillByName } from '../../skills/index.js';
import {
  BusinessPacks,
  CreatorPacks,
  EngineeringPacks,
  FinancePacks,
  MarketingPacks,
  PackRegistry,
  PersonalProductivityPacks,
  ProductPacks,
  SupportPacks,
  createPackByName,
  createSkillPackByName,
  definePackSpec,
  inspectSkillPackByName,
  listSkillPackInspections,
  listSkillPackSpecs,
} from '../index.js';

describe('creator packs', () => {
  it('expands blog packs into normal agent skills and dedupes repeated attachments', () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });

    agent.use(CreatorPacks.blog()).use(CreatorPacks.blog()).use(createSkillByName('blog-writer'));

    const attached = agent.getAttachedAdapters().map((adapter) => adapter.name);
    expect(attached).toContain('blog-topic-research');
    expect(attached).toContain('blog-brief');
    expect(attached).toContain('blog-writer');
    expect(attached.filter((name) => name === 'blog-writer')).toHaveLength(1);
  });

  it('supports multiple packs and exposes pack manifests with relevant config fields', () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const blog = CreatorPacks.blog({ contentRoot: 'content', readOnlyByDefault: true });
    const seo = CreatorPacks.seo();

    agent.use(blog).use(seo);

    expect(blog.manifest.configFields).toEqual(
      expect.arrayContaining(['skillActivation', 'toolSelection', 'readOnlyByDefault', 'contentRoot']),
    );
    expect(blog.manifest.skills).toContain('blog-fact-check');
    expect(seo.manifest.skills).toContain('seo-keyword-research');
    expect(agent.getAttachedAdapters().map((adapter) => adapter.name)).toContain('seo-keyword-research');
  });

  it('exports multi-format, publishing, and analytics packs', () => {
    expect(CreatorPacks.social().manifest.skills).toContain('x-post-writer');
    expect(CreatorPacks.video().manifest.skills).toContain('youtube-scriptwriter');
    expect(CreatorPacks.book().manifest.skills).toContain('book-chapter-writer');
    expect(CreatorPacks.copy().manifest.skills).toContain('landing-page-copywriter');
    expect(CreatorPacks.publishing().manifest.skills).toContain('newsletter-writer');
    expect(CreatorPacks.analytics().manifest.skills).toContain('digital-marketing-performance-brief');
  });

  it('keeps direct skill-only usage available', () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] }).use(createSkillByName('blog-writer'));
    expect(agent.getAttachedAdapters().map((adapter) => adapter.name)).toEqual(['blog-writer']);
  });

  it('lists skill pack membership from specs without instantiating skills', () => {
    const blogSpec = listSkillPackSpecs({ domain: 'creator', category: 'blog' })[0];
    expect(blogSpec?.name).toBe('creator-blog-skills');
    expect(blogSpec?.skillIds).toContain('blog-writer');
    expect(listSkillPackSpecs({ domain: 'finance' }).map((spec) => spec.name)).toEqual(
      expect.arrayContaining(['finance-stock-research-skills', 'finance-market-research-skills', 'finance-portfolio-review-skills']),
    );
  });

  it('supports pack-level defaults and safe skill-level disable overrides', () => {
    const pack = CreatorPacks.blog({
      skillOverrides: {
        'blog-serp-research': { enabled: false },
      },
    });

    expect(pack.config?.skillActivation).toBe('auto');
    expect(pack.manifest.skills).not.toContain('blog-serp-research');
    expect(pack.attachments.map((skill) => skill.name)).not.toContain('blog-serp-research');
  });

  it('supports custom pack registries and createPackByName', () => {
    const registry = new PackRegistry([
      definePackSpec({
        name: 'custom-blog-lite',
        description: 'Small blog pack.',
        domain: 'creator',
        category: 'blog',
        skillIds: ['blog-writer'],
      }),
    ]);

    expect(registry.require('custom-blog-lite').skillIds).toEqual(['blog-writer']);
    expect(createPackByName('creator-x-twitter-skills').manifest.skills).toContain('x-post-writer');
  });

  it('exposes safe pack and extracted-skill inspections without prompt disclosure', () => {
    const pack = FinancePacks.stockResearch();
    const packInspection = pack.inspect();
    const stockScreeningInspection = pack.stockScreening.inspect();
    const directAccessorInspection = pack.getSkill('stock-screening').inspect();
    const camelAccessorInspection = pack.getSkill('stockScreening').inspect();

    expect(packInspection.name).toBe('finance-stock-research-skills');
    expect(packInspection.skillIds).toContain('stock-screening');
    expect(pack.listSkills().map((skill) => skill.name)).toContain('stock-screening');
    expect(directAccessorInspection.name).toBe('stock-screening');
    expect(camelAccessorInspection.name).toBe('stock-screening');
    expect(stockScreeningInspection).toMatchObject({
      name: 'stock-screening',
      domain: 'finance',
      category: 'stock-research',
      hasPrompt: true,
    });
    expect('prompt' in stockScreeningInspection).toBe(false);
    expect('examples' in stockScreeningInspection).toBe(false);
  });

  it('lists pack inspections by domain without instantiating the pack attachments', () => {
    const inspections = listSkillPackInspections({ domain: 'finance' });
    expect(inspections.map((pack) => pack.name)).toEqual(
      expect.arrayContaining(['finance-stock-research-skills', 'finance-market-research-skills']),
    );
    expect(inspectSkillPackByName('finance-stock-research-skills')?.skills.map((skill) => skill.name)).toContain(
      'stock-screening',
    );
  });

  it('exports high-value industry pack namespaces backed by spec skills', () => {
    const packs = [
      MarketingPacks.seo(),
      MarketingPacks.ads(),
      MarketingPacks.campaign(),
      FinancePacks.stockResearch(),
      FinancePacks.marketUpdate(),
      FinancePacks.portfolioReview(),
      ProductPacks.productResearch(),
      ProductPacks.prd(),
      ProductPacks.launch(),
      EngineeringPacks.codeReview(),
      EngineeringPacks.debugging(),
      EngineeringPacks.testing(),
      SupportPacks.customerSupport(),
      SupportPacks.knowledgeBase(),
      SupportPacks.customerSuccess(),
      BusinessPacks.investments(),
      BusinessPacks.strategy(),
      PersonalProductivityPacks.weeklyPlanning(),
    ];

    expect(packs).toHaveLength(18);
    for (const pack of packs) {
      expect(pack.attachments.length).toBeGreaterThanOrEqual(1);
      const promptVersion = pack.attachments[0]?.skillMetadata?.promptVersion;
      expect(promptVersion).toBe('2026-05-18');
    }
    // Domains should only cover planned verticals
    const allDomains = listSkillPackSpecs().map((spec) => spec.domain);
    expect(allDomains).not.toEqual(
      expect.arrayContaining([
        'agriculture',
        'tax-accounting',
        'banking-operations',
        'education',
        'hr',
        'insurance',
      ]),
    );
  });

  it('exports complete category-level skill packs for every active domain plan entry', () => {
    const skillPackSpecs = listSkillPackSpecs();

    expect(skillPackSpecs).toHaveLength(DOMAIN_SKILL_ARCHITECTURE_CATALOG.length);

    for (const plan of DOMAIN_SKILL_ARCHITECTURE_CATALOG) {
      const expectedName = `${plan.domain}-${plan.category}-skills`;
      const spec = listSkillPackSpecs({ domain: plan.domain, category: plan.category })[0];

      expect(spec?.name).toBe(expectedName);
      expect(spec?.skillIds).toEqual(plan.plannedSkills);
      expect(spec?.defaultConfig).toMatchObject({
        skillActivation: 'auto',
        toolSelection: 'auto',
        readOnlyByDefault: true,
      });
      expect(spec?.examples?.join(' ')).toContain(expectedName);
    }
  });

  it('creates full category skill packs and domain alias packs backed by same skills', () => {
    const aliasPack = MarketingPacks.seo();
    const categoryPack = createSkillPackByName('marketing-seo-skills');
    const financePack = createSkillPackByName('finance-stock-research-skills');

    expect(aliasPack.manifest.skills).toContain('seo-keyword-research');
    expect(aliasPack.attachments.length).toBeGreaterThanOrEqual(1);
    expect(categoryPack.name).toBe('marketing-seo-skills');
    expect(categoryPack.attachments.map((skill) => skill.name)).toEqual([
      'seo-keyword-research',
      'seo-serp-analysis',
      'seo-content-brief',
      'seo-technical-audit',
      'seo-internal-link-planner',
      'seo-content-refresh-review',
    ]);
    expect(financePack.manifest.skills).toContain('equity-research-brief');
    expect(financePack.manifest.sideEffectRisk).toBe('external');
  });
});
