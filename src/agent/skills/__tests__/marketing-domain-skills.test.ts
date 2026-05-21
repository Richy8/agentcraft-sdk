import { describe, expect, it } from 'vitest';
import {
  MARKETING_ADS_SKILL_SPECS,
  MARKETING_CAMPAIGN_SKILL_SPECS,
  MARKETING_COMPETITOR_INTELLIGENCE_SKILL_SPECS,
  MARKETING_DIGITAL_MARKETING_SKILL_SPECS,
  MARKETING_DOMAIN_SKILL_SPECS,
  MARKETING_EMAIL_MARKETING_SKILL_SPECS,
  MARKETING_LANDING_PAGE_SKILL_SPECS,
  MARKETING_SEO_SKILL_SPECS,
} from '../domains/marketing/index.js';
import {
  createSkillByName,
  listSkillSpecs,
} from '../registries/skill-registry.js';
import { scoreSkillSpecQuality } from '../certification/scoring.js';

const expectedMarketingSkillNames = [
  'digital-marketing-strategy',
  'digital-channel-mix-planner',
  'digital-funnel-audit',
  'digital-attribution-review',
  'digital-growth-experiment-planner',
  'digital-marketing-performance-brief',
  'seo-keyword-research',
  'seo-serp-analysis',
  'seo-content-brief',
  'seo-technical-audit',
  'seo-internal-link-planner',
  'seo-content-refresh-review',
  'ad-audience-research',
  'ad-angle-generator',
  'ad-copywriter',
  'ad-creative-brief',
  'ad-compliance-review',
  'ad-variant-analysis',
  'campaign-strategy',
  'campaign-calendar',
  'campaign-brief',
  'campaign-asset-planner',
  'campaign-performance-review',
  'email-sequence-planner',
  'email-copywriter',
  'email-subject-line-review',
  'email-segmentation-analysis',
  'email-performance-review',
  'landing-page-positioning',
  'landing-page-copywriter',
  'landing-page-wireframe-brief',
  'landing-page-conversion-review',
  'landing-page-claim-risk-review',
  'competitor-content-analysis',
  'competitor-positioning-map',
  'competitor-offer-review',
  'competitor-gap-synthesis',
] as const;

describe('marketing domain skills', () => {
  it('exports one concrete skill spec for every planned marketing skill', () => {
    expect(MARKETING_DOMAIN_SKILL_SPECS.map((spec) => spec.name).sort()).toEqual(
      [...expectedMarketingSkillNames].sort(),
    );
    expect(MARKETING_DIGITAL_MARKETING_SKILL_SPECS).toHaveLength(6);
    expect(MARKETING_SEO_SKILL_SPECS).toHaveLength(6);
    expect(MARKETING_ADS_SKILL_SPECS).toHaveLength(6);
    expect(MARKETING_CAMPAIGN_SKILL_SPECS).toHaveLength(5);
    expect(MARKETING_EMAIL_MARKETING_SKILL_SPECS).toHaveLength(5);
    expect(MARKETING_LANDING_PAGE_SKILL_SPECS).toHaveLength(5);
    expect(MARKETING_COMPETITOR_INTELLIGENCE_SKILL_SPECS).toHaveLength(4);
  });

  it('registers marketing specs with domain intelligence and production prompt sections', () => {
    const registered = listSkillSpecs({ domain: 'marketing' }).filter((spec) =>
      expectedMarketingSkillNames.includes(spec.name as (typeof expectedMarketingSkillNames)[number]),
    );

    expect(registered).toHaveLength(expectedMarketingSkillNames.length);
    for (const spec of MARKETING_DOMAIN_SKILL_SPECS) {
      expect(spec.domain).toBe('marketing');
      expect(spec.category).toBeTruthy();
      expect(spec.domainIntelligence?.vocabulary?.length).toBeGreaterThanOrEqual(8);
      expect(spec.domainIntelligence?.metricsAndSignals?.length).toBeGreaterThanOrEqual(5);
      expect(spec.domainIntelligence?.antiStuffingNotes?.length ?? 0).toBeGreaterThan(0);
      expect([...(spec.prompt?.toolUsePolicy ?? []), ...(spec.prompt?.safetyNotes ?? [])].join(' ')).toMatch(
        /approval|untrusted|Do not follow|authorized|retrieved|legal|review/i,
      );
      expect([...(spec.prompt?.failureBehavior ?? []), ...(spec.prompt?.safetyNotes ?? [])].join(' ')).toMatch(
        /Failure mode to avoid|If .*missing|If .*not|If .*unavailable|If .*insufficient|failure mode/i,
      );
    }
  });

  it('keeps every marketing skill above the 9.5 production quality threshold', () => {
    for (const spec of MARKETING_DOMAIN_SKILL_SPECS) {
      const score = scoreSkillSpecQuality(spec);

      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(', ')}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });

  it('creates direct skills through the registry without requiring a pack', () => {
    const skill = createSkillByName('seo-keyword-research');
    const prompt =
      typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : skill.systemPromptExtension;

    expect(skill.name).toBe('seo-keyword-research');
    expect(skill.skillMetadata?.promptVersion).toBe('2026-05-18');
    expect(prompt).toContain('Tool Use Policy');
    expect(prompt).toContain('Output Format');
    expect(prompt).toMatch(/search intent/i);
  });
});
